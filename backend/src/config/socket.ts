import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';

interface SocketWithAuth extends Socket {
  userId?: string;
  userRole?: string;
  restaurantIds?: string[];
}

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await User.findByPk(decoded.id);
      
      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      
      // If restaurant owner, get their restaurant IDs
      if (decoded.role === 'restaurant_owner') {
        const restaurants = await Restaurant.findAll({
          where: { ownerId: user.id },
          attributes: ['id']
        });
        socket.restaurantIds = restaurants.map(r => r.id);
      }
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: any) => {
    console.log(`User ${socket.userId} connected`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // If restaurant owner, join restaurant rooms
    if (socket.restaurantIds) {
      socket.restaurantIds.forEach((restaurantId: string) => {
        socket.join(`restaurant:${restaurantId}`);
      });
    }

    // Handle joining specific restaurant room (for real-time availability)
    socket.on('join-restaurant', (restaurantId: string) => {
      socket.join(`restaurant-public:${restaurantId}`);
    });

    socket.on('leave-restaurant', (restaurantId: string) => {
      socket.leave(`restaurant-public:${restaurantId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  return io;
};

// Helper functions to emit events
export const emitToUser = (io: Server, userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToRestaurant = (io: Server, restaurantId: string, event: string, data: any) => {
  io.to(`restaurant:${restaurantId}`).emit(event, data);
};

export const emitToRestaurantPublic = (io: Server, restaurantId: string, event: string, data: any) => {
  io.to(`restaurant-public:${restaurantId}`).emit(event, data);
};