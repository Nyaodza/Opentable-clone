// Toast POS Integration Provider
import axios, { AxiosInstance } from 'axios';
import { POSProvider } from '../index';
import WebSocket from 'ws';

export default class ToastPOSProvider implements POSProvider {
  name = 'toast';
  private client: AxiosInstance;
  private config: any;
  private ws: WebSocket | null = null;
  private restaurantGuid: string;

  constructor(config: any) {
    this.config = config;
    const baseURL = config.sandbox 
      ? 'https://api.sandbox.toasttab.com'
      : 'https://api.toasttab.com';
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Toast-Restaurant-External-ID': config.restaurantId,
        'Content-Type': 'application/json'
      }
    });
  }

  async connect(config: any): Promise<void> {
    try {
      // Get restaurant info
      const response = await this.client.get('/restaurants/v1/restaurants');
      this.restaurantGuid = response.data[0].guid;
      
      // Set up real-time connection
      await this.setupWebSocket();
      
      // Initialize menu sync
      await this.syncMenu();
      
      console.log('Connected to Toast POS successfully');
    } catch (error: any) {
      throw new Error(`Toast connection failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private async setupWebSocket(): Promise<void> {
    const wsUrl = this.config.sandbox
      ? 'wss://ws.sandbox.toasttab.com/orders'
      : 'wss://ws.toasttab.com/orders';

    this.ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    this.ws.on('open', () => {
      console.log('Toast WebSocket connected');
      // Subscribe to order updates
      this.ws?.send(JSON.stringify({
        type: 'subscribe',
        restaurantGuid: this.restaurantGuid,
        events: ['orders', 'payments', 'tables']
      }));
    });

    this.ws.on('message', (data: string) => {
      const message = JSON.parse(data);
      this.handleRealtimeUpdate(message);
    });

    this.ws.on('error', (error) => {
      console.error('Toast WebSocket error:', error);
    });
  }

  private handleRealtimeUpdate(message: any): void {
    switch (message.type) {
      case 'orderUpdate':
        console.log('Order updated:', message.order);
        break;
      case 'tableUpdate':
        console.log('Table updated:', message.table);
        break;
      case 'paymentUpdate':
        console.log('Payment updated:', message.payment);
        break;
    }
  }

  private async syncMenu(): Promise<void> {
    try {
      const response = await this.client.get(`/menus/v2/menus`);
      console.log(`Synced ${response.data.length} menu items from Toast`);
    } catch (error) {
      console.error('Failed to sync Toast menu:', error);
    }
  }

  async syncInventory(): Promise<any> {
    try {
      // Get menu items
      const menuResponse = await this.client.get('/menus/v2/menus');
      
      // Get current tables status
      const tablesResponse = await this.client.get('/tables/v1/tables');
      
      // Get active orders
      const ordersResponse = await this.client.get('/orders/v2/orders', {
        params: {
          businessDate: new Date().toISOString().split('T')[0],
          pageSize: 100
        }
      });

      // Get inventory levels
      const inventoryResponse = await this.client.get('/inventory/v1/stock');

      return {
        menu: menuResponse.data,
        tables: tablesResponse.data,
        activeOrders: ordersResponse.data,
        inventory: inventoryResponse.data
      };
    } catch (error: any) {
      console.error('Failed to sync Toast inventory:', error);
      throw error;
    }
  }

  async syncOrders(): Promise<any> {
    try {
      const response = await this.client.get('/orders/v2/orders', {
        params: {
          businessDate: new Date().toISOString().split('T')[0],
          pageSize: 100,
          page: 1
        }
      });

      const orders = response.data || [];
      
      // Transform Toast orders to our format
      return orders.map((order: any) => ({
        id: order.guid,
        tableNumber: order.table?.name || order.tabName || 'Unknown',
        status: this.mapOrderStatus(order.orderState),
        items: order.selections?.map((item: any) => ({
          name: item.item.name,
          quantity: item.quantity,
          price: item.price / 100,
          modifiers: item.modifiers?.map((m: any) => m.name)
        })),
        total: order.amounts.total / 100,
        createdAt: order.createdDate,
        updatedAt: order.modifiedDate,
        serverName: order.server?.name,
        guestCount: order.numberOfGuests
      }));
    } catch (error) {
      console.error('Failed to sync Toast orders:', error);
      throw error;
    }
  }

  private mapOrderStatus(toastStatus: string): string {
    const statusMap: Record<string, string> = {
      'Open': 'active',
      'Closed': 'completed',
      'Void': 'cancelled',
      'Future': 'pending'
    };
    return statusMap[toastStatus] || 'unknown';
  }

  async updateTableStatus(tableId: string, status: string): Promise<void> {
    try {
      // In Toast, we update the table service period
      const tableUpdate = {
        tableGuid: tableId,
        status: this.mapTableStatusToToast(status),
        servicePeriod: {
          status: status === 'available' ? 'AVAILABLE' : 'OCCUPIED'
        }
      };

      await this.client.put(`/tables/v1/tables/${tableId}`, tableUpdate);
    } catch (error) {
      console.error('Failed to update table status in Toast:', error);
      throw error;
    }
  }

  private mapTableStatusToToast(status: string): string {
    const statusMap: Record<string, string> = {
      'available': 'AVAILABLE',
      'occupied': 'OCCUPIED',
      'reserved': 'RESERVED',
      'cleaning': 'CLEANING',
      'completed': 'AVAILABLE'
    };
    return statusMap[status] || 'AVAILABLE';
  }

  async processPayment(amount: number, orderId: string): Promise<any> {
    try {
      const payment = {
        orderGuid: orderId,
        paymentType: 'CREDIT',
        tipAmount: 0,
        amount: Math.round(amount * 100), // Convert to cents
        cardInfo: {
          processor: 'EXTERNAL',
          transactionId: `opentable-${Date.now()}`
        }
      };

      const response = await this.client.post('/orders/v2/orders/' + orderId + '/payments', payment);
      
      return {
        success: response.data.status === 'APPROVED',
        transactionId: response.data.guid,
        amount: response.data.amount / 100,
        status: response.data.status,
        approvalCode: response.data.approvalCode
      };
    } catch (error: any) {
      console.error('Failed to process Toast payment:', error);
      throw new Error(`Payment failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getReports(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Get sales summary
      const salesResponse = await this.client.get('/reports/v1/sales', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      // Get labor report
      const laborResponse = await this.client.get('/labor/v1/timeEntries', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      // Get payment report
      const paymentsResponse = await this.client.get('/payments/v1/payments', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      // Calculate analytics
      const salesData = salesResponse.data;
      const laborData = laborResponse.data;
      const paymentsData = paymentsResponse.data;

      return {
        sales: {
          totalRevenue: salesData.netSales / 100,
          totalOrders: salesData.orderCount,
          averageCheck: salesData.averageCheck / 100,
          guestCount: salesData.guestCount
        },
        labor: {
          totalHours: laborData.totalHours,
          laborCost: laborData.totalLaborCost / 100,
          employees: laborData.employeeCount
        },
        payments: {
          cash: paymentsData.cashTotal / 100,
          credit: paymentsData.creditTotal / 100,
          other: paymentsData.otherTotal / 100
        },
        menuItemPerformance: await this.getMenuItemPerformance(startDate, endDate),
        hourlyBreakdown: salesData.hourlyBreakdown
      };
    } catch (error) {
      console.error('Failed to get Toast reports:', error);
      throw error;
    }
  }

  private async getMenuItemPerformance(startDate: Date, endDate: Date): Promise<any> {
    try {
      const response = await this.client.get('/reports/v1/menuItemPerformance', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      return response.data.items?.slice(0, 10).map((item: any) => ({
        name: item.name,
        quantitySold: item.quantitySold,
        revenue: item.revenue / 100,
        costOfGoodsSold: item.cogs / 100,
        profit: (item.revenue - item.cogs) / 100
      }));
    } catch (error) {
      console.error('Failed to get menu item performance:', error);
      return [];
    }
  }

  // Additional Toast-specific features
  async createCheck(tableId: string, serverId: string): Promise<string> {
    try {
      const check = {
        tableGuid: tableId,
        serverGuid: serverId,
        numberOfGuests: 1,
        openedDate: new Date().toISOString()
      };

      const response = await this.client.post('/orders/v2/orders', check);
      return response.data.guid;
    } catch (error) {
      console.error('Failed to create Toast check:', error);
      throw error;
    }
  }

  async addItemToCheck(checkId: string, itemId: string, quantity: number): Promise<void> {
    try {
      const item = {
        itemGuid: itemId,
        quantity: quantity,
        modifiers: []
      };

      await this.client.post(`/orders/v2/orders/${checkId}/selections`, item);
    } catch (error) {
      console.error('Failed to add item to Toast check:', error);
      throw error;
    }
  }

  async closeCheck(checkId: string): Promise<void> {
    try {
      await this.client.post(`/orders/v2/orders/${checkId}/close`);
    } catch (error) {
      console.error('Failed to close Toast check:', error);
      throw error;
    }
  }
}