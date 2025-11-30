// POS Integration Hub - Central management for all POS system integrations
import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { createLogger } from '../../utils/logger';

export interface POSProvider {
  name: string;
  connect(config: any): Promise<void>;
  disconnect(): Promise<void>;
  syncInventory(): Promise<any>;
  syncOrders(): Promise<any>;
  updateTableStatus(tableId: string, status: string): Promise<void>;
  processPayment(amount: number, orderId: string): Promise<any>;
  getReports(startDate: Date, endDate: Date): Promise<any>;
}

export interface POSConfig {
  provider: 'square' | 'toast' | 'clover' | 'revel' | 'lightspeed' | 'upserve' | 'aloha' | 'micros';
  apiKey?: string;
  apiSecret?: string;
  merchantId?: string;
  locationId?: string;
  webhookUrl?: string;
  sandbox?: boolean;
}

export class POSIntegrationHub extends EventEmitter {
  private providers: Map<string, POSProvider> = new Map();
  private logger: Logger;
  private activeConnections: Map<string, POSProvider> = new Map();

  constructor() {
    super();
    this.logger = createLogger('POS-Integration');
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Register all POS providers
    this.registerProvider('square', () => import('./providers/square'));
    this.registerProvider('toast', () => import('./providers/toast'));
    this.registerProvider('clover', () => import('./providers/clover'));
    this.registerProvider('revel', () => import('./providers/revel'));
    this.registerProvider('lightspeed', () => import('./providers/lightspeed'));
    this.registerProvider('upserve', () => import('./providers/upserve'));
    this.registerProvider('aloha', () => import('./providers/aloha'));
    this.registerProvider('micros', () => import('./providers/micros'));
  }

  private registerProvider(name: string, loader: () => Promise<any>): void {
    this.providers.set(name, {
      name,
      loader,
      instance: null
    } as any);
  }

  async connect(restaurantId: string, config: POSConfig): Promise<void> {
    try {
      const providerData = this.providers.get(config.provider);
      if (!providerData) {
        throw new Error(`POS provider ${config.provider} not supported`);
      }

      // Lazy load the provider
      const ProviderModule = await (providerData as any).loader();
      const provider = new ProviderModule.default(config);
      
      await provider.connect(config);
      this.activeConnections.set(restaurantId, provider);
      
      // Set up real-time sync
      this.setupRealtimeSync(restaurantId, provider);
      
      this.logger.info(`Connected to ${config.provider} for restaurant ${restaurantId}`);
      this.emit('connected', { restaurantId, provider: config.provider });
    } catch (error) {
      this.logger.error(`Failed to connect to POS: ${error}`);
      throw error;
    }
  }

  private setupRealtimeSync(restaurantId: string, provider: POSProvider): void {
    // Set up webhooks and polling for real-time updates
    setInterval(async () => {
      try {
        // Sync table status
        const tables = await provider.syncInventory();
        this.emit('tablesUpdated', { restaurantId, tables });
        
        // Sync orders
        const orders = await provider.syncOrders();
        this.emit('ordersUpdated', { restaurantId, orders });
      } catch (error) {
        this.logger.error(`Sync error for restaurant ${restaurantId}: ${error}`);
      }
    }, 30000); // Sync every 30 seconds
  }

  async updateTableStatus(restaurantId: string, tableId: string, status: string): Promise<void> {
    const provider = this.activeConnections.get(restaurantId);
    if (!provider) {
      throw new Error(`No POS connection for restaurant ${restaurantId}`);
    }
    
    await provider.updateTableStatus(tableId, status);
    this.emit('tableStatusUpdated', { restaurantId, tableId, status });
  }

  async processPayment(restaurantId: string, amount: number, orderId: string): Promise<any> {
    const provider = this.activeConnections.get(restaurantId);
    if (!provider) {
      throw new Error(`No POS connection for restaurant ${restaurantId}`);
    }
    
    const result = await provider.processPayment(amount, orderId);
    this.emit('paymentProcessed', { restaurantId, orderId, amount, result });
    return result;
  }

  async getAnalytics(restaurantId: string, startDate: Date, endDate: Date): Promise<any> {
    const provider = this.activeConnections.get(restaurantId);
    if (!provider) {
      throw new Error(`No POS connection for restaurant ${restaurantId}`);
    }
    
    return provider.getReports(startDate, endDate);
  }

  async disconnect(restaurantId: string): Promise<void> {
    const provider = this.activeConnections.get(restaurantId);
    if (provider) {
      await provider.disconnect();
      this.activeConnections.delete(restaurantId);
      this.emit('disconnected', { restaurantId });
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [restaurantId, provider] of this.activeConnections) {
      await provider.disconnect();
    }
    this.activeConnections.clear();
  }
}

export const posHub = new POSIntegrationHub();