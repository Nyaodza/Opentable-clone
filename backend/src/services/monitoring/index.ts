import { ProviderHealthMonitor } from './ProviderHealthMonitor';
import { AlertManager } from './AlertManager';
import { logger } from '../../utils/logger';

// Initialize monitoring services
export class MonitoringService {
  private static instance: MonitoringService;
  private healthMonitor: ProviderHealthMonitor;
  private alertManager: AlertManager;
  private initialized = false;

  private constructor() {
    this.healthMonitor = ProviderHealthMonitor.getInstance();
    this.alertManager = AlertManager.getInstance();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Set monitoring start time for uptime calculation
      process.env.MONITORING_START_TIME = Date.now().toString();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Log successful initialization
      logger.info('Monitoring services initialized successfully', {
        healthMonitor: 'running',
        alertManager: 'running',
        startTime: new Date(),
      });

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize monitoring services:', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = () => {
      logger.info('Shutting down monitoring services...');
      
      try {
        this.healthMonitor.destroy();
        logger.info('Monitoring services shut down successfully');
      } catch (error) {
        logger.error('Error during monitoring shutdown:', error);
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGUSR2', shutdown); // For nodemon
  }

  getHealthMonitor(): ProviderHealthMonitor {
    return this.healthMonitor;
  }

  getAlertManager(): AlertManager {
    return this.alertManager;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export instances for easy access
export const monitoringService = MonitoringService.getInstance();
export const healthMonitor = ProviderHealthMonitor.getInstance();
export const alertManager = AlertManager.getInstance();

// Auto-initialize if in production or when explicitly requested
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_MONITORING === 'true') {
  monitoringService.initialize().catch(error => {
    logger.error('Failed to auto-initialize monitoring:', error);
  });
}