/**
 * Graceful Shutdown Handler
 * Ensures clean server shutdown with connection draining
 */

import { Server } from 'http';
import { Server as HttpsServer } from 'https';
import { logInfo, logError, logWarn } from './logger';

type ServerType = Server | HttpsServer;

interface ShutdownOptions {
  timeout?: number;          // Max time to wait for connections to close (ms)
  signals?: NodeJS.Signals[]; // Signals to listen for
  forceExitCode?: number;    // Exit code on forced shutdown
  onShutdown?: () => Promise<void>;  // Custom cleanup function
  onTimeout?: () => Promise<void>;   // Called if timeout exceeded
  healthCheckPath?: string;  // Path to health check endpoint
}

interface ConnectionTracker {
  total: number;
  active: number;
  idle: number;
}

const defaultOptions: ShutdownOptions = {
  timeout: 30000,
  signals: ['SIGTERM', 'SIGINT', 'SIGUSR2'],
  forceExitCode: 1,
  healthCheckPath: '/health',
};

/**
 * Connection tracking for graceful shutdown
 */
class ConnectionManager {
  private connections: Map<number, { socket: any; isIdle: boolean }> = new Map();
  private connectionId = 0;
  private isShuttingDown = false;

  /**
   * Track a new connection
   */
  track(socket: any): number {
    const id = ++this.connectionId;
    
    this.connections.set(id, { socket, isIdle: true });

    socket.on('close', () => {
      this.connections.delete(id);
    });

    return id;
  }

  /**
   * Mark connection as active (processing request)
   */
  setActive(id: number): void {
    const conn = this.connections.get(id);
    if (conn) {
      conn.isIdle = false;
    }
  }

  /**
   * Mark connection as idle
   */
  setIdle(id: number): void {
    const conn = this.connections.get(id);
    if (conn) {
      conn.isIdle = true;
      
      // If shutting down, close idle connections
      if (this.isShuttingDown) {
        this.closeConnection(id);
      }
    }
  }

  /**
   * Close a specific connection
   */
  closeConnection(id: number): void {
    const conn = this.connections.get(id);
    if (conn) {
      conn.socket.destroy();
      this.connections.delete(id);
    }
  }

  /**
   * Close all idle connections
   */
  closeIdleConnections(): number {
    let closed = 0;
    
    for (const [id, conn] of this.connections) {
      if (conn.isIdle) {
        conn.socket.destroy();
        this.connections.delete(id);
        closed++;
      }
    }

    return closed;
  }

  /**
   * Force close all connections
   */
  forceCloseAll(): void {
    for (const [id, conn] of this.connections) {
      conn.socket.destroy();
      this.connections.delete(id);
    }
  }

  /**
   * Start shutdown mode
   */
  startShutdown(): void {
    this.isShuttingDown = true;
  }

  /**
   * Get connection stats
   */
  getStats(): ConnectionTracker {
    let active = 0;
    let idle = 0;

    for (const conn of this.connections.values()) {
      if (conn.isIdle) {
        idle++;
      } else {
        active++;
      }
    }

    return {
      total: this.connections.size,
      active,
      idle,
    };
  }

  /**
   * Wait for all connections to close
   */
  async waitForConnectionsToClose(timeout: number): Promise<boolean> {
    const startTime = Date.now();

    while (this.connections.size > 0) {
      if (Date.now() - startTime > timeout) {
        return false; // Timeout exceeded
      }

      // Close idle connections
      this.closeIdleConnections();

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return true;
  }
}

/**
 * Graceful shutdown manager
 */
export class GracefulShutdown {
  private server: ServerType;
  private options: Required<ShutdownOptions>;
  private connectionManager: ConnectionManager;
  private isShuttingDown = false;
  private shutdownPromise?: Promise<void>;
  private cleanupTasks: Array<() => Promise<void>> = [];

  constructor(server: ServerType, options: ShutdownOptions = {}) {
    this.server = server;
    this.options = { ...defaultOptions, ...options } as Required<ShutdownOptions>;
    this.connectionManager = new ConnectionManager();
    
    this.setupConnectionTracking();
    this.setupSignalHandlers();
  }

  /**
   * Set up connection tracking
   */
  private setupConnectionTracking(): void {
    this.server.on('connection', (socket) => {
      const id = this.connectionManager.track(socket);

      // Track request start/end
      socket.on('data', () => {
        this.connectionManager.setActive(id);
      });
    });

    // For HTTP keep-alive, track when request/response cycle ends
    this.server.on('request', (req, res) => {
      res.on('finish', () => {
        // Mark connection as idle after response
        const socket = req.socket as any;
        if (socket._connectionId) {
          this.connectionManager.setIdle(socket._connectionId);
        }
      });
    });
  }

  /**
   * Set up signal handlers
   */
  private setupSignalHandlers(): void {
    for (const signal of this.options.signals) {
      process.on(signal, () => {
        logInfo(`Received ${signal}, starting graceful shutdown...`);
        this.shutdown();
      });
    }
  }

  /**
   * Register a cleanup task to run during shutdown
   */
  registerCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Start graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Prevent multiple shutdown attempts
    if (this.isShuttingDown) {
      return this.shutdownPromise;
    }

    this.isShuttingDown = true;
    this.connectionManager.startShutdown();

    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  /**
   * Perform the actual shutdown
   */
  private async performShutdown(): Promise<void> {
    const startTime = Date.now();
    
    logInfo('Graceful shutdown initiated');
    logInfo(`Connection stats: ${JSON.stringify(this.connectionManager.getStats())}`);

    // Step 1: Stop accepting new connections
    logInfo('Stopping server from accepting new connections...');
    await new Promise<void>((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          logError('Error closing server:', err);
          reject(err);
        } else {
          logInfo('Server stopped accepting new connections');
          resolve();
        }
      });
    });

    // Step 2: Close idle connections immediately
    const idleClosed = this.connectionManager.closeIdleConnections();
    logInfo(`Closed ${idleClosed} idle connections`);

    // Step 3: Wait for active connections to finish
    const remainingTimeout = this.options.timeout - (Date.now() - startTime);
    logInfo(`Waiting up to ${remainingTimeout}ms for active connections to close...`);
    
    const allClosed = await this.connectionManager.waitForConnectionsToClose(remainingTimeout);

    if (!allClosed) {
      const stats = this.connectionManager.getStats();
      logWarn(`Timeout waiting for connections. Forcing close of ${stats.total} remaining connections.`);
      
      if (this.options.onTimeout) {
        await this.options.onTimeout();
      }
      
      this.connectionManager.forceCloseAll();
    }

    // Step 4: Run cleanup tasks
    logInfo(`Running ${this.cleanupTasks.length} cleanup tasks...`);
    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (error) {
        logError('Cleanup task error:', error);
      }
    }

    // Step 5: Run custom onShutdown handler
    if (this.options.onShutdown) {
      logInfo('Running custom shutdown handler...');
      try {
        await this.options.onShutdown();
      } catch (error) {
        logError('Custom shutdown handler error:', error);
      }
    }

    const duration = Date.now() - startTime;
    logInfo(`Graceful shutdown completed in ${duration}ms`);

    // Exit process
    process.exit(0);
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDownNow(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionTracker {
    return this.connectionManager.getStats();
  }
}

/**
 * Create graceful shutdown handler
 */
export function createGracefulShutdown(
  server: ServerType,
  options?: ShutdownOptions
): GracefulShutdown {
  return new GracefulShutdown(server, options);
}

/**
 * Common cleanup tasks
 */
export const CleanupTasks = {
  /**
   * Close database connections
   */
  closeDatabase: (sequelize: any) => async (): Promise<void> => {
    logInfo('Closing database connections...');
    try {
      await sequelize.close();
      logInfo('Database connections closed');
    } catch (error) {
      logError('Error closing database:', error);
    }
  },

  /**
   * Close Redis connections
   */
  closeRedis: (redisClient: any) => async (): Promise<void> => {
    logInfo('Closing Redis connections...');
    try {
      await redisClient.quit();
      logInfo('Redis connections closed');
    } catch (error) {
      logError('Error closing Redis:', error);
    }
  },

  /**
   * Stop cron jobs
   */
  stopCronJobs: (cronService: any) => async (): Promise<void> => {
    logInfo('Stopping cron jobs...');
    try {
      cronService.stop();
      logInfo('Cron jobs stopped');
    } catch (error) {
      logError('Error stopping cron jobs:', error);
    }
  },

  /**
   * Close message broker connections
   */
  closeMessageBroker: (broker: any) => async (): Promise<void> => {
    logInfo('Closing message broker connections...');
    try {
      await broker.disconnect();
      logInfo('Message broker disconnected');
    } catch (error) {
      logError('Error closing message broker:', error);
    }
  },

  /**
   * Flush logs
   */
  flushLogs: (logger: any) => async (): Promise<void> => {
    logInfo('Flushing logs...');
    try {
      if (logger.flush) {
        await logger.flush();
      }
      logInfo('Logs flushed');
    } catch (error) {
      logError('Error flushing logs:', error);
    }
  },

  /**
   * Complete pending queue jobs
   */
  drainQueues: (queues: any[]) => async (): Promise<void> => {
    logInfo('Draining job queues...');
    try {
      await Promise.all(queues.map(q => q.close()));
      logInfo('Job queues drained');
    } catch (error) {
      logError('Error draining queues:', error);
    }
  },
};

/**
 * Health check middleware that respects shutdown state
 */
export function createShutdownAwareHealthCheck(
  gracefulShutdown: GracefulShutdown
) {
  return (req: any, res: any): void => {
    if (gracefulShutdown.isShuttingDownNow()) {
      res.status(503).json({
        status: 'shutting_down',
        message: 'Server is shutting down',
        connections: gracefulShutdown.getConnectionStats(),
      });
    } else {
      res.status(200).json({
        status: 'healthy',
        connections: gracefulShutdown.getConnectionStats(),
      });
    }
  };
}

export default GracefulShutdown;

