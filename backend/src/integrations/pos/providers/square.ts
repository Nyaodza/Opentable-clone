// Square POS Integration Provider
import axios, { AxiosInstance } from 'axios';
import { POSProvider } from '../index';
import crypto from 'crypto';

export default class SquarePOSProvider implements POSProvider {
  name = 'square';
  private client: AxiosInstance;
  private config: any;
  private webhookSignatureKey: string;
  private catalogVersion: string;

  constructor(config: any) {
    this.config = config;
    const baseURL = config.sandbox 
      ? 'https://connect.squareupsandbox.com/v2'
      : 'https://connect.squareup.com/v2';
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Square-Version': '2024-01-15',
        'Content-Type': 'application/json'
      }
    });
  }

  async connect(config: any): Promise<void> {
    try {
      // Verify connection by fetching merchant info
      const response = await this.client.get('/merchants/me');
      
      // Set up webhooks
      await this.setupWebhooks();
      
      // Initialize catalog sync
      await this.initializeCatalog();
      
      console.log('Connected to Square POS successfully');
    } catch (error: any) {
      throw new Error(`Square connection failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    // Clean up webhooks
    await this.removeWebhooks();
  }

  private async setupWebhooks(): Promise<void> {
    const webhookSubscription = {
      subscription: {
        name: 'OpenTable Integration',
        notification_url: this.config.webhookUrl,
        event_types: [
          'order.created',
          'order.updated', 
          'order.fulfillment.updated',
          'payment.created',
          'payment.updated',
          'inventory.count.updated',
          'catalog.version.updated'
        ]
      }
    };

    try {
      const response = await this.client.post('/webhooks/subscriptions', webhookSubscription);
      this.webhookSignatureKey = response.data.subscription.signature_key;
    } catch (error) {
      console.error('Failed to setup Square webhooks:', error);
    }
  }

  private async removeWebhooks(): Promise<void> {
    try {
      const { data } = await this.client.get('/webhooks/subscriptions');
      for (const subscription of data.subscriptions || []) {
        await this.client.delete(`/webhooks/subscriptions/${subscription.id}`);
      }
    } catch (error) {
      console.error('Failed to remove webhooks:', error);
    }
  }

  private async initializeCatalog(): Promise<void> {
    try {
      const { data } = await this.client.get('/catalog/info');
      this.catalogVersion = data.catalog_info.version;
    } catch (error) {
      console.error('Failed to initialize catalog:', error);
    }
  }

  async syncInventory(): Promise<any> {
    try {
      // Get catalog items (menu items)
      const catalogResponse = await this.client.post('/catalog/search', {
        object_types: ['ITEM', 'ITEM_VARIATION'],
        include_related_objects: true
      });

      // Get inventory counts
      const inventoryResponse = await this.client.post('/inventory/counts/batch-retrieve', {
        location_ids: [this.config.locationId],
        limit: 1000
      });

      // Get current orders to determine table status
      const ordersResponse = await this.client.post('/orders/search', {
        location_ids: [this.config.locationId],
        query: {
          filter: {
            state_filter: {
              states: ['OPEN', 'COMPLETED']
            },
            date_time_filter: {
              created_at: {
                start_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
              }
            }
          }
        }
      });

      return {
        items: catalogResponse.data.objects || [],
        inventory: inventoryResponse.data.counts || [],
        activeOrders: ordersResponse.data.orders || []
      };
    } catch (error: any) {
      console.error('Failed to sync Square inventory:', error);
      throw error;
    }
  }

  async syncOrders(): Promise<any> {
    try {
      const response = await this.client.post('/orders/search', {
        location_ids: [this.config.locationId],
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // Last hour
              }
            }
          },
          sort: {
            sort_field: 'CREATED_AT',
            sort_order: 'DESC'
          }
        },
        limit: 100
      });

      const orders = response.data.orders || [];
      
      // Transform Square orders to our format
      return orders.map((order: any) => ({
        id: order.id,
        tableNumber: order.fulfillments?.[0]?.pickup_details?.note || 'Unknown',
        status: this.mapOrderStatus(order.state),
        items: order.line_items?.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.base_price_money?.amount / 100,
          modifiers: item.modifiers
        })),
        total: order.total_money?.amount / 100,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }));
    } catch (error) {
      console.error('Failed to sync Square orders:', error);
      throw error;
    }
  }

  private mapOrderStatus(squareStatus: string): string {
    const statusMap: Record<string, string> = {
      'OPEN': 'active',
      'COMPLETED': 'completed',
      'CANCELED': 'cancelled',
      'DRAFT': 'pending'
    };
    return statusMap[squareStatus] || 'unknown';
  }

  async updateTableStatus(tableId: string, status: string): Promise<void> {
    try {
      // In Square, we update the order fulfillment status
      // First, find the order associated with this table
      const searchResponse = await this.client.post('/orders/search', {
        location_ids: [this.config.locationId],
        query: {
          filter: {
            fulfillment_filter: {
              fulfillment_types: ['PICKUP'],
              fulfillment_states: ['PROPOSED', 'RESERVED', 'PREPARED']
            }
          }
        }
      });

      const order = searchResponse.data.orders?.find((o: any) => 
        o.fulfillments?.[0]?.pickup_details?.note === tableId
      );

      if (order) {
        // Update the fulfillment status based on table status
        const fulfillmentUpdate = {
          fulfillment: {
            uid: order.fulfillments[0].uid,
            state: this.mapTableStatusToFulfillment(status)
          }
        };

        await this.client.put(
          `/orders/${order.id}`,
          { 
            order: {
              version: order.version,
              fulfillments: [fulfillmentUpdate.fulfillment]
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to update table status in Square:', error);
      throw error;
    }
  }

  private mapTableStatusToFulfillment(status: string): string {
    const statusMap: Record<string, string> = {
      'available': 'PROPOSED',
      'occupied': 'RESERVED',
      'reserved': 'RESERVED',
      'cleaning': 'PREPARED',
      'completed': 'COMPLETED'
    };
    return statusMap[status] || 'PROPOSED';
  }

  async processPayment(amount: number, orderId: string): Promise<any> {
    try {
      const payment = {
        source_id: this.config.sourceId || 'EXTERNAL', // Card nonce or external
        idempotency_key: crypto.randomUUID(),
        amount_money: {
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'USD'
        },
        order_id: orderId,
        location_id: this.config.locationId,
        reference_id: `opentable-${orderId}`,
        note: 'Payment via OpenTable integration'
      };

      const response = await this.client.post('/payments', payment);
      
      return {
        success: response.data.payment.status === 'COMPLETED',
        transactionId: response.data.payment.id,
        amount: response.data.payment.amount_money.amount / 100,
        status: response.data.payment.status,
        receipt_url: response.data.payment.receipt_url
      };
    } catch (error: any) {
      console.error('Failed to process Square payment:', error);
      throw new Error(`Payment failed: ${error.response?.data?.errors?.[0]?.detail || error.message}`);
    }
  }

  async getReports(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Get sales report
      const salesResponse = await this.client.post('/orders/search', {
        location_ids: [this.config.locationId],
        query: {
          filter: {
            state_filter: {
              states: ['COMPLETED']
            },
            date_time_filter: {
              closed_at: {
                start_at: startDate.toISOString(),
                end_at: endDate.toISOString()
              }
            }
          }
        },
        limit: 1000
      });

      // Get payment report
      const paymentsResponse = await this.client.post('/payments/list', {
        location_id: this.config.locationId,
        begin_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        sort_order: 'DESC'
      });

      // Calculate analytics
      const orders = salesResponse.data.orders || [];
      const payments = paymentsResponse.data.payments || [];

      const totalRevenue = orders.reduce((sum: number, order: any) => 
        sum + (order.total_money?.amount || 0), 0) / 100;

      const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

      const itemSales: Record<string, number> = {};
      orders.forEach((order: any) => {
        order.line_items?.forEach((item: any) => {
          itemSales[item.name] = (itemSales[item.name] || 0) + parseInt(item.quantity);
        });
      });

      const topItems = Object.entries(itemSales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, quantity]) => ({ name, quantity }));

      return {
        summary: {
          totalRevenue,
          totalOrders: orders.length,
          averageOrderValue,
          totalPayments: payments.length
        },
        topItems,
        hourlyBreakdown: this.calculateHourlyBreakdown(orders),
        paymentMethods: this.analyzePaymentMethods(payments)
      };
    } catch (error) {
      console.error('Failed to get Square reports:', error);
      throw error;
    }
  }

  private calculateHourlyBreakdown(orders: any[]): any {
    const hourly: Record<number, { count: number; revenue: number }> = {};
    
    orders.forEach((order: any) => {
      const hour = new Date(order.created_at).getHours();
      if (!hourly[hour]) {
        hourly[hour] = { count: 0, revenue: 0 };
      }
      hourly[hour].count++;
      hourly[hour].revenue += (order.total_money?.amount || 0) / 100;
    });

    return hourly;
  }

  private analyzePaymentMethods(payments: any[]): any {
    const methods: Record<string, number> = {};
    
    payments.forEach((payment: any) => {
      const method = payment.card_details?.card?.card_brand || 'OTHER';
      methods[method] = (methods[method] || 0) + 1;
    });

    return methods;
  }

  // Webhook verification
  verifyWebhookSignature(body: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.webhookSignatureKey);
    hmac.update(body);
    const expectedSignature = hmac.digest('base64');
    return signature === expectedSignature;
  }
}