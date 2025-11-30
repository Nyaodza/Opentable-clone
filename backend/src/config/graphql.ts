import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { Application } from 'express';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Tenant } from '../models/tenant.model';
import { RestaurantLoader } from '../graphql/loaders/restaurant.loader';
import { UserLoader } from '../graphql/loaders/user.loader';
import { ReservationLoader } from '../graphql/loaders/reservation.loader';
import { typeDefs } from '../graphql/schema';
import { resolvers } from '../graphql/resolvers';
import { logger } from '../utils/logger';

export interface GraphQLContext {
  user?: User;
  tenant?: Tenant;
  loaders: {
    restaurant: RestaurantLoader;
    user: UserLoader;
    reservation: ReservationLoader;
  };
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

export const initializeGraphQL = async (app: Application, httpServer: Server): Promise<ApolloServer> => {
  // Create schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Set up WebSocket server
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        // Get auth token from connection params
        const token = ctx.connectionParams?.authorization as string;
        
        if (token) {
          try {
            const decoded = jwt.verify(
              token.replace('Bearer ', ''),
              process.env.JWT_SECRET!
            ) as any;
            
            const user = await User.findByPk(decoded.id);
            const tenant = user ? await Tenant.findByPk(user.tenantId) : null;
            
            return {
              user,
              tenant,
              loaders: createDataLoaders(),
            };
          } catch (error) {
            logger.error('WebSocket authentication error:', error);
          }
        }
        
        return {
          loaders: createDataLoaders(),
        };
      },
    },
    wsServer
  );

  // Create Apollo Server
  const apolloServer = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [
      // Proper shutdown for HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Proper shutdown for WebSocket server
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
      logger.error('GraphQL error:', error);
      
      // Remove stack trace in production
      if (process.env.NODE_ENV === 'production') {
        delete error.extensions?.exception;
      }
      
      return error;
    },
  });

  // Start Apollo Server
  await apolloServer.start();

  // Apply middleware
  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => {
        // Get auth token
        const token = req.headers.authorization;
        let user: User | undefined;
        let tenant: Tenant | undefined;
        
        if (token) {
          try {
            const decoded = jwt.verify(
              token.replace('Bearer ', ''),
              process.env.JWT_SECRET!
            ) as any;
            
            user = await User.findByPk(decoded.id);
            tenant = user ? await Tenant.findByPk(user.tenantId) : null;
          } catch (error) {
            // Invalid token - continue without user
          }
        }
        
        // Get user location from headers
        const userLocation = req.headers['x-user-location'] 
          ? JSON.parse(req.headers['x-user-location'] as string)
          : undefined;
        
        return {
          req,
          res,
          user,
          tenant,
          userLocation,
          loaders: createDataLoaders(),
        };
      },
    })
  );

  logger.info('GraphQL server initialized at /graphql');
  
  return apolloServer;
};

const createDataLoaders = () => ({
  restaurant: new RestaurantLoader(),
  user: new UserLoader(),
  reservation: new ReservationLoader(),
});