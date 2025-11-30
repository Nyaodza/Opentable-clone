import { POSIntegration, POSProvider, IntegrationStatus } from '../models/POSIntegration';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { encrypt, decrypt } from '../utils/encryption';
import { Queue } from 'bull';
import Redis from 'ioredis';

interface POSAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  syncReservations(): Promise<void>;
  syncTables(): Promise<void>;
  syncMenus(): Promise<void>;
  syncAvailability(): Promise<void>;
  syncCustomers(): Promise<void>;
  pushReservation(reservation: any): Promise<void>;
  updateReservation(reservationId: string, data: any): Promise<void>;
  cancelReservation(reservationId: string): Promise<void>;
  getTableStatus(): Promise<any[]>;
  updateTableStatus(tableId: string, status: string): Promise<void>;
}

// Base adapter class for all POS integrations
abstract class BasePOSAdapter implements POSAdapter {
  protected client: AxiosInstance;
  protected integration: POSIntegration;
  protected redis: Redis;

  constructor(integration: POSIntegration) {
    this.integration = integration;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.client = axios.create({
      baseURL: integration.apiEndpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract syncReservations(): Promise<void>;
  abstract syncTables(): Promise<void>;
  abstract syncMenus(): Promise<void>;
  abstract syncAvailability(): Promise<void>;
  abstract syncCustomers(): Promise<void>;
  abstract pushReservation(reservation: any): Promise<void>;
  abstract updateReservation(reservationId: string, data: any): Promise<void>;
  abstract cancelReservation(reservationId: string): Promise<void>;
  abstract getTableStatus(): Promise<any[]>;
  abstract updateTableStatus(tableId: string, status: string): Promise<void>;

  protected async handleError(error: any): Promise<void> {
    logger.error(`POS Integration Error [${this.integration.provider}]:`, error);
    await this.integration.update({
      status: IntegrationStatus.ERROR,
      lastError: error.message,
      lastErrorAt: new Date(),
      failedSyncs: this.integration.failedSyncs + 1,
    });
  }

  protected async handleSuccess(): Promise<void> {
    await this.integration.update({
      status: IntegrationStatus.ACTIVE,
      lastSyncAt: new Date(),
      successfulSyncs: this.integration.successfulSyncs + 1,
    });
  }
}

// Toast POS Adapter
class ToastPOSAdapter extends BasePOSAdapter {
  async connect(): Promise<void> {
    try {
      const token = decrypt(this.integration.accessToken!);
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Test connection
      const response = await this.client.get('/restaurants');
      if (response.status === 200) {
        await this.handleSuccess();
      }
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    delete this.client.defaults.headers.common['Authorization'];
  }

  async syncReservations(): Promise<void> {
    try {
      const response = await this.client.get('/reservations', {
        params: {
          locationId: this.integration.providerLocationId,
          startDate: new Date().toISOString(),
        },
      });

      // Process and sync reservations
      const reservations = response.data;
      for (const reservation of reservations) {
        await this.processReservation(reservation);
      }

      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async syncTables(): Promise<void> {
    try {
      const response = await this.client.get('/tables', {
        params: { locationId: this.integration.providerLocationId },
      });

      // Process and sync tables
      const tables = response.data;
      await this.processTables(tables);

      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async syncMenus(): Promise<void> {
    try {
      const response = await this.client.get('/menus', {
        params: { locationId: this.integration.providerLocationId },
      });

      // Process and sync menus
      const menus = response.data;
      await this.processMenus(menus);

      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async syncAvailability(): Promise<void> {
    try {
      const response = await this.client.get('/availability', {
        params: {
          locationId: this.integration.providerLocationId,
          date: new Date().toISOString(),
        },
      });

      // Process and sync availability
      const availability = response.data;
      await this.processAvailability(availability);

      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async syncCustomers(): Promise<void> {
    try {
      const response = await this.client.get('/customers', {
        params: { locationId: this.integration.providerLocationId },
      });

      // Process and sync customers
      const customers = response.data;
      await this.processCustomers(customers);

      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async pushReservation(reservation: any): Promise<void> {
    try {
      const mappedReservation = this.mapReservationToPOS(reservation);
      await this.client.post('/reservations', mappedReservation);
      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  async updateReservation(reservationId: string, data: any): Promise<void> {
    try {
      const mappedData = this.mapReservationToPOS(data);
      await this.client.put(`/reservations/${reservationId}`, mappedData);
      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  async cancelReservation(reservationId: string): Promise<void> {
    try {
      await this.client.delete(`/reservations/${reservationId}`);
      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  async getTableStatus(): Promise<any[]> {
    try {
      const response = await this.client.get('/tables/status', {
        params: { locationId: this.integration.providerLocationId },
      });
      return response.data;
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  async updateTableStatus(tableId: string, status: string): Promise<void> {
    try {
      await this.client.put(`/tables/${tableId}/status`, { status });
      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  // Helper methods
  private mapReservationToPOS(reservation: any): any {
    const mapping = this.integration.fieldMapping || {};
    const mapped: any = {};

    for (const [ourField, posField] of Object.entries(mapping)) {
      if (reservation[ourField] !== undefined) {
        mapped[posField as string] = reservation[ourField];
      }
    }

    return mapped;
  }

  private async processReservation(reservation: any): Promise<void> {
    // Implement reservation processing logic
    await this.redis.set(
      `pos:reservation:${reservation.id}`,
      JSON.stringify(reservation),
      'EX',
      3600
    );
  }

  private async processTables(tables: any[]): Promise<void> {
    // Implement table processing logic
    await this.redis.set(
      `pos:tables:${this.integration.restaurantId}`,
      JSON.stringify(tables),
      'EX',
      3600
    );
  }

  private async processMenus(menus: any[]): Promise<void> {
    // Implement menu processing logic
    await this.redis.set(
      `pos:menus:${this.integration.restaurantId}`,
      JSON.stringify(menus),
      'EX',
      3600
    );
  }

  private async processAvailability(availability: any): Promise<void> {
    // Implement availability processing logic
    await this.redis.set(
      `pos:availability:${this.integration.restaurantId}`,
      JSON.stringify(availability),
      'EX',
      3600
    );
  }

  private async processCustomers(customers: any[]): Promise<void> {
    // Implement customer processing logic
    await this.redis.set(
      `pos:customers:${this.integration.restaurantId}`,
      JSON.stringify(customers),
      'EX',
      3600
    );
  }
}

// Square POS Adapter
class SquarePOSAdapter extends BasePOSAdapter {
  async connect(): Promise<void> {
    try {
      const token = decrypt(this.integration.accessToken!);
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Test connection with Square API
      const response = await this.client.get('/v2/locations');
      if (response.status === 200) {
        await this.handleSuccess();
      }
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    delete this.client.defaults.headers.common['Authorization'];
  }

  async syncReservations(): Promise<void> {
    // Square-specific implementation
    try {
      const response = await this.client.get('/v2/bookings/list', {
        params: {
          location_id: this.integration.providerLocationId,
          start_at_min: new Date().toISOString(),
        },
      });

      const bookings = response.data.bookings || [];
      for (const booking of bookings) {
        await this.processSquareBooking(booking);
      }

      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async syncTables(): Promise<void> {
    // Square doesn't have direct table management, implement custom logic
    logger.info('Square POS does not support direct table sync');
  }

  async syncMenus(): Promise<void> {
    try {
      const response = await this.client.get('/v2/catalog/list', {
        params: {
          types: 'ITEM',
        },
      });

      const items = response.data.objects || [];
      await this.processSquareMenuItems(items);

      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async syncAvailability(): Promise<void> {
    try {
      const response = await this.client.get('/v2/bookings/availability/search', {
        params: {
          location_id: this.integration.providerLocationId,
        },
      });

      await this.processSquareAvailability(response.data);
      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async syncCustomers(): Promise<void> {
    try {
      const response = await this.client.get('/v2/customers');
      const customers = response.data.customers || [];

      await this.processSquareCustomers(customers);
      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async pushReservation(reservation: any): Promise<void> {
    try {
      const booking = this.mapToSquareBooking(reservation);
      await this.client.post('/v2/bookings', { booking });
      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  async updateReservation(reservationId: string, data: any): Promise<void> {
    try {
      const booking = this.mapToSquareBooking(data);
      await this.client.put(`/v2/bookings/${reservationId}`, { booking });
      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  async cancelReservation(reservationId: string): Promise<void> {
    try {
      await this.client.post(`/v2/bookings/${reservationId}/cancel`);
      await this.handleSuccess();
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  async getTableStatus(): Promise<any[]> {
    // Square doesn't have direct table status
    return [];
  }

  async updateTableStatus(tableId: string, status: string): Promise<void> {
    // Square doesn't have direct table status
    logger.info('Square POS does not support table status updates');
  }

  // Square-specific helper methods
  private mapToSquareBooking(reservation: any): any {
    return {
      location_id: this.integration.providerLocationId,
      customer_id: reservation.customerId,
      start_at: reservation.dateTime,
      appointment_segments: [{
        duration_minutes: reservation.duration || 90,
        service_variation_id: reservation.serviceId,
        team_member_id: reservation.staffId,
      }],
    };
  }

  private async processSquareBooking(booking: any): Promise<void> {
    await this.redis.set(
      `square:booking:${booking.id}`,
      JSON.stringify(booking),
      'EX',
      3600
    );
  }

  private async processSquareMenuItems(items: any[]): Promise<void> {
    await this.redis.set(
      `square:menu:${this.integration.restaurantId}`,
      JSON.stringify(items),
      'EX',
      3600
    );
  }

  private async processSquareAvailability(availability: any): Promise<void> {
    await this.redis.set(
      `square:availability:${this.integration.restaurantId}`,
      JSON.stringify(availability),
      'EX',
      3600
    );
  }

  private async processSquareCustomers(customers: any[]): Promise<void> {
    await this.redis.set(
      `square:customers:${this.integration.restaurantId}`,
      JSON.stringify(customers),
      'EX',
      3600
    );
  }
}

// Main POS Integration Service
export class POSIntegrationService {
  private adapters: Map<string, POSAdapter> = new Map();
  private syncQueue: Queue;

  constructor() {
    this.syncQueue = new Queue('pos-sync', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.setupQueueProcessors();
  }

  private setupQueueProcessors(): void {
    this.syncQueue.process('sync-all', async (job) => {
      const { integrationId } = job.data;
      await this.syncAll(integrationId);
    });

    this.syncQueue.process('sync-reservations', async (job) => {
      const { integrationId } = job.data;
      await this.syncReservations(integrationId);
    });
  }

  async createAdapter(integration: POSIntegration): Promise<POSAdapter> {
    let adapter: POSAdapter;

    switch (integration.provider) {
      case POSProvider.TOAST:
        adapter = new ToastPOSAdapter(integration);
        break;
      case POSProvider.SQUARE:
        adapter = new SquarePOSAdapter(integration);
        break;
      // Add more adapters here
      default:
        throw new Error(`Unsupported POS provider: ${integration.provider}`);
    }

    await adapter.connect();
    this.adapters.set(`${integration.restaurantId}-${integration.provider}`, adapter);
    return adapter;
  }

  async getAdapter(restaurantId: number, provider: POSProvider): Promise<POSAdapter> {
    const key = `${restaurantId}-${provider}`;
    let adapter = this.adapters.get(key);

    if (!adapter) {
      const integration = await POSIntegration.findOne({
        where: { restaurantId, provider },
      });

      if (!integration) {
        throw new Error(`No POS integration found for restaurant ${restaurantId} with provider ${provider}`);
      }

      adapter = await this.createAdapter(integration);
    }

    return adapter;
  }

  async syncAll(integrationId: number): Promise<void> {
    const integration = await POSIntegration.findByPk(integrationId);
    if (!integration) throw new Error('Integration not found');

    const adapter = await this.createAdapter(integration);

    try {
      if (integration.syncReservations) await adapter.syncReservations();
      if (integration.syncTables) await adapter.syncTables();
      if (integration.syncMenus) await adapter.syncMenus();
      if (integration.syncAvailability) await adapter.syncAvailability();
      if (integration.syncCustomers) await adapter.syncCustomers();

      await integration.update({
        status: IntegrationStatus.ACTIVE,
        lastSyncAt: new Date(),
        nextSyncAt: new Date(Date.now() + integration.syncInterval * 60 * 1000),
      });
    } catch (error) {
      logger.error('Sync all failed:', error);
      throw error;
    }
  }

  async syncReservations(integrationId: number): Promise<void> {
    const integration = await POSIntegration.findByPk(integrationId);
    if (!integration) throw new Error('Integration not found');

    const adapter = await this.createAdapter(integration);
    await adapter.syncReservations();
  }

  async pushReservation(restaurantId: number, provider: POSProvider, reservation: any): Promise<void> {
    const adapter = await this.getAdapter(restaurantId, provider);
    await adapter.pushReservation(reservation);
  }

  async scheduleSyncJobs(): Promise<void> {
    const integrations = await POSIntegration.findAll({
      where: { status: IntegrationStatus.ACTIVE },
    });

    for (const integration of integrations) {
      await this.syncQueue.add(
        'sync-all',
        { integrationId: integration.id },
        {
          repeat: {
            every: integration.syncInterval * 60 * 1000,
          },
        }
      );
    }
  }
}

export default new POSIntegrationService();