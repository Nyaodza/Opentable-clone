import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { logInfo, logError } from '../utils/logger';

interface Context {
  user?: User;
  isAuthenticated: boolean;
}

export async function createGraphQLServer(httpServer: Server) {
  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Setup subscription server
  const serverCleanup = useServer({
    schema,
    context: async (ctx) => {
      // Get token from connection params
      const token = ctx.connectionParams?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return { isAuthenticated: false };
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findByPk(decoded.id);
        
        return {
          user,
          isAuthenticated: !!user,
        };
      } catch (error) {
        logError('GraphQL subscription authentication error:', error);
        return { isAuthenticated: false };
      }
    },
    onConnect: (ctx) => {
      logInfo('GraphQL subscription client connected');
    },
    onDisconnect: (ctx) => {
      logInfo('GraphQL subscription client disconnected');
    },
  }, wsServer);

  // Create Apollo Server
  const server = new ApolloServer<Context>({
    schema,
    plugins: [
      // Proper shutdown for the HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),
      
      // Proper shutdown for the WebSocket server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    formatError: (error) => {
      logError('GraphQL error:', error);
      
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        return new Error('Internal server error');
      }
      
      return error;
    },
    introspection: process.env.NODE_ENV !== 'production',
    csrfPrevention: true,
  });

  await server.start();

  // Create context function for HTTP requests
  const contextFunction = async ({ req }: { req: any }): Promise<Context> => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return { isAuthenticated: false };
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await User.findByPk(decoded.id);
      
      return {
        user,
        isAuthenticated: !!user,
      };
    } catch (error) {
      return { isAuthenticated: false };
    }
  };

  // Return middleware
  return expressMiddleware(server, {
    context: contextFunction,
  });
}

// GraphQL Playground configuration for development
export const graphqlPlaygroundConfig = {
  settings: {
    'request.credentials': 'include',
    'schema.polling.enable': false,
  },
  tabs: [
    {
      endpoint: '/graphql',
      query: `# Welcome to GraphQL Playground
# 
# Example queries:

query GetRestaurants {
  restaurants(input: { limit: 10, city: "San Francisco" }) {
    restaurants {
      id
      name
      cuisine
      rating
      priceRange
      address
    }
    total
    hasMore
  }
}

query GetMyReservations {
  myReservations(limit: 5) {
    id
    date
    time
    partySize
    status
    restaurant {
      name
      address
    }
  }
}

mutation CreateReservation {
  createReservation(input: {
    restaurantId: "1"
    date: "2024-01-15"
    time: "19:00"
    partySize: 2
  }) {
    id
    status
    restaurant {
      name
    }
  }
}

subscription ReservationUpdates {
  reservationUpdated(restaurantId: "1") {
    id
    status
    user {
      firstName
      lastName
    }
  }
}`,
    },
  ],
};
