import React from 'react';
import { unifiedApiClient } from '../api/unified-client';

export interface SmartDevice {
  id: string;
  name: string;
  type: 'display' | 'speaker' | 'thermostat' | 'lighting' | 'pos' | 'tablet' | 'kiosk';
  status: 'online' | 'offline' | 'maintenance';
  location: string;
  restaurantId: string;
  lastSeen: string;
  capabilities: string[];
  metadata: Record<string, any>;
}

export interface IoTSensor {
  id: string;
  type: 'temperature' | 'humidity' | 'occupancy' | 'noise' | 'air_quality' | 'motion';
  location: string;
  restaurantId: string;
  value: number;
  unit: string;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
  thresholds: {
    min?: number;
    max?: number;
    warning?: number;
    critical?: number;
  };
}

export interface SmartTableSystem {
  tableId: string;
  restaurantId: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  capacity: number;
  currentOccupancy: number;
  reservationId?: string;
  sensors: {
    pressure: boolean;
    rfid: boolean;
    sound: boolean;
  };
  features: {
    orderingTablet: boolean;
    wirelessCharging: boolean;
    callButton: boolean;
    paymentTerminal: boolean;
  };
  lastActivity: string;
}

export interface DigitalMenuBoard {
  id: string;
  restaurantId: string;
  location: string;
  status: 'active' | 'standby' | 'error';
  content: {
    menuItems: Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      image?: string;
      availability: boolean;
      promotions?: string[];
    }>;
    promotions: Array<{
      id: string;
      title: string;
      description: string;
      image?: string;
      validUntil: string;
    }>;
    waitTime: number;
  };
  schedule: {
    breakfast: { start: string; end: string };
    lunch: { start: string; end: string };
    dinner: { start: string; end: string };
  };
}

export interface SmartKitchenDisplay {
  id: string;
  restaurantId: string;
  station: 'prep' | 'grill' | 'salad' | 'dessert' | 'expo';
  orders: Array<{
    orderId: string;
    items: Array<{
      name: string;
      quantity: number;
      modifications: string[];
      cookTime: number;
      status: 'pending' | 'cooking' | 'ready';
    }>;
    priority: 'normal' | 'high' | 'rush';
    orderTime: string;
    estimatedCompletion: string;
    tableNumber?: string;
    customerName?: string;
  }>;
  averageCookTime: number;
  queueLength: number;
}

export interface VoiceAssistantIntegration {
  platform: 'alexa' | 'google' | 'siri';
  enabled: boolean;
  skills: Array<{
    name: string;
    description: string;
    commands: string[];
    enabled: boolean;
  }>;
  responses: {
    welcome: string;
    reservation: string;
    menu: string;
    hours: string;
    location: string;
    contact: string;
  };
}

class SmartTechService {
  // Device Management
  async getDevices(restaurantId: string): Promise<SmartDevice[]> {
    return await unifiedApiClient.get(`/smart-tech/devices`, { restaurantId });
  }

  async getDevice(deviceId: string): Promise<SmartDevice> {
    return await unifiedApiClient.get(`/smart-tech/devices/${deviceId}`);
  }

  async updateDevice(deviceId: string, updates: Partial<SmartDevice>): Promise<SmartDevice> {
    return await unifiedApiClient.put(`/smart-tech/devices/${deviceId}`, updates);
  }

  async restartDevice(deviceId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/smart-tech/devices/${deviceId}/restart`);
  }

  async registerDevice(device: Omit<SmartDevice, 'id' | 'lastSeen'>): Promise<SmartDevice> {
    return await unifiedApiClient.post('/smart-tech/devices', device);
  }

  // IoT Sensors
  async getSensorData(
    restaurantId: string,
    sensorType?: IoTSensor['type'],
    timeRange?: { start: string; end: string }
  ): Promise<IoTSensor[]> {
    return await unifiedApiClient.get('/smart-tech/sensors', {
      restaurantId,
      type: sensorType,
      ...timeRange,
    });
  }

  async getSensorAlerts(restaurantId: string): Promise<Array<{
    sensorId: string;
    type: string;
    location: string;
    message: string;
    severity: 'warning' | 'critical';
    timestamp: string;
    acknowledged: boolean;
  }>> {
    return await unifiedApiClient.get(`/smart-tech/sensors/alerts`, { restaurantId });
  }

  async acknowledgeSensorAlert(alertId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/smart-tech/sensors/alerts/${alertId}/acknowledge`);
  }

  // Smart Table Management
  async getSmartTables(restaurantId: string): Promise<SmartTableSystem[]> {
    return await unifiedApiClient.get('/smart-tech/tables', { restaurantId });
  }

  async updateTableStatus(
    tableId: string,
    status: SmartTableSystem['status']
  ): Promise<SmartTableSystem> {
    return await unifiedApiClient.put(`/smart-tech/tables/${tableId}`, { status });
  }

  async getTableOccupancy(restaurantId: string): Promise<{
    total: number;
    occupied: number;
    available: number;
    reserved: number;
    cleaning: number;
    occupancyRate: number;
  }> {
    return await unifiedApiClient.get(`/smart-tech/tables/occupancy`, { restaurantId });
  }

  async sendTableAlert(tableId: string, type: 'service' | 'payment' | 'assistance'): Promise<{
    success: boolean;
    notifiedStaff: string[];
  }> {
    return await unifiedApiClient.post(`/smart-tech/tables/${tableId}/alert`, { type });
  }

  // Digital Menu Boards
  async getMenuBoards(restaurantId: string): Promise<DigitalMenuBoard[]> {
    return await unifiedApiClient.get('/smart-tech/menu-boards', { restaurantId });
  }

  async updateMenuBoard(
    boardId: string,
    content: Partial<DigitalMenuBoard['content']>
  ): Promise<DigitalMenuBoard> {
    return await unifiedApiClient.put(`/smart-tech/menu-boards/${boardId}`, { content });
  }

  async scheduleMenuChange(
    boardId: string,
    schedule: {
      time: string;
      content: Partial<DigitalMenuBoard['content']>;
    }
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/smart-tech/menu-boards/${boardId}/schedule`, schedule);
  }

  async syncMenuWithPOS(restaurantId: string): Promise<{ success: boolean; updated: number }> {
    return await unifiedApiClient.post(`/smart-tech/menu-boards/sync`, { restaurantId });
  }

  // Kitchen Display System
  async getKitchenDisplays(restaurantId: string): Promise<SmartKitchenDisplay[]> {
    return await unifiedApiClient.get('/smart-tech/kitchen-displays', { restaurantId });
  }

  async updateOrderStatus(
    displayId: string,
    orderId: string,
    itemId: string,
    status: 'pending' | 'cooking' | 'ready'
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.put(`/smart-tech/kitchen-displays/${displayId}/orders/${orderId}/items/${itemId}`, {
      status,
    });
  }

  async markOrderComplete(displayId: string, orderId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/smart-tech/kitchen-displays/${displayId}/orders/${orderId}/complete`);
  }

  async getKitchenMetrics(restaurantId: string): Promise<{
    averageCookTime: number;
    orderAccuracy: number;
    onTimeDelivery: number;
    queueLength: number;
    stationUtilization: Record<string, number>;
  }> {
    return await unifiedApiClient.get(`/smart-tech/kitchen-displays/metrics`, { restaurantId });
  }

  // Voice Assistant Integration
  async getVoiceAssistantConfig(restaurantId: string): Promise<VoiceAssistantIntegration[]> {
    return await unifiedApiClient.get('/smart-tech/voice-assistant', { restaurantId });
  }

  async updateVoiceAssistant(
    restaurantId: string,
    platform: VoiceAssistantIntegration['platform'],
    config: Partial<VoiceAssistantIntegration>
  ): Promise<VoiceAssistantIntegration> {
    return await unifiedApiClient.put(`/smart-tech/voice-assistant/${restaurantId}/${platform}`, config);
  }

  async testVoiceCommand(
    restaurantId: string,
    platform: VoiceAssistantIntegration['platform'],
    command: string
  ): Promise<{
    success: boolean;
    response: string;
    responseTime: number;
  }> {
    return await unifiedApiClient.post(`/smart-tech/voice-assistant/${restaurantId}/${platform}/test`, {
      command,
    });
  }

  // Ambient Intelligence
  async getAmbientData(restaurantId: string): Promise<{
    lighting: {
      zones: Array<{
        id: string;
        name: string;
        brightness: number;
        color: string;
        temperature: number;
        occupancy: boolean;
      }>;
      schedule: 'auto' | 'manual';
      energySaving: boolean;
    };
    music: {
      currentPlaylist: string;
      volume: number;
      mood: 'energetic' | 'relaxed' | 'romantic' | 'casual';
      autoAdjust: boolean;
    };
    climate: {
      temperature: number;
      humidity: number;
      airQuality: number;
      zones: Array<{
        id: string;
        name: string;
        temperature: number;
        targetTemperature: number;
        occupancy: number;
      }>;
    };
  }> {
    return await unifiedApiClient.get(`/smart-tech/ambient`, { restaurantId });
  }

  async updateAmbientSettings(
    restaurantId: string,
    settings: {
      lighting?: any;
      music?: any;
      climate?: any;
    }
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.put(`/smart-tech/ambient/${restaurantId}`, settings);
  }

  async createAmbientScene(
    restaurantId: string,
    scene: {
      name: string;
      schedule?: {
        start: string;
        end: string;
        days: string[];
      };
      lighting: {
        brightness: number;
        color: string;
        temperature: number;
      };
      music: {
        playlist: string;
        volume: number;
      };
      climate: {
        temperature: number;
      };
    }
  ): Promise<{ success: boolean; sceneId: string }> {
    return await unifiedApiClient.post(`/smart-tech/ambient/${restaurantId}/scenes`, scene);
  }

  // Payment Terminal Integration
  async getPaymentTerminals(restaurantId: string): Promise<Array<{
    id: string;
    tableNumber?: string;
    location: string;
    status: 'online' | 'offline' | 'busy' | 'maintenance';
    type: 'fixed' | 'portable' | 'tablet';
    capabilities: string[];
    lastTransaction?: string;
    dailyTotal: number;
  }>> {
    return await unifiedApiClient.get('/smart-tech/payment-terminals', { restaurantId });
  }

  async processTablePayment(
    terminalId: string,
    amount: number,
    splitMethod?: 'equal' | 'custom' | 'items'
  ): Promise<{
    success: boolean;
    transactionId: string;
    status: 'pending' | 'completed' | 'failed';
  }> {
    return await unifiedApiClient.post(`/smart-tech/payment-terminals/${terminalId}/process`, {
      amount,
      splitMethod,
    });
  }

  // Digital Ordering Kiosks
  async getOrderingKiosks(restaurantId: string): Promise<Array<{
    id: string;
    location: string;
    status: 'active' | 'offline' | 'maintenance';
    currentOrder?: {
      orderId: string;
      items: number;
      total: number;
      timeStarted: string;
    };
    dailyOrders: number;
    averageOrderTime: number;
    screenBrightness: number;
    language: string;
  }>> {
    return await unifiedApiClient.get('/smart-tech/kiosks', { restaurantId });
  }

  async updateKioskContent(
    kioskId: string,
    content: {
      menu?: any;
      promotions?: any;
      language?: string;
      theme?: string;
    }
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.put(`/smart-tech/kiosks/${kioskId}/content`, content);
  }

  // Analytics and Insights
  async getSmartTechAnalytics(
    restaurantId: string,
    dateRange: { start: string; end: string }
  ): Promise<{
    deviceUptime: Record<string, number>;
    sensorData: {
      averageTemperature: number;
      averageOccupancy: number;
      peakHours: string[];
      alerts: number;
    };
    tableUtilization: {
      averageOccupancy: number;
      turnoverRate: number;
      peakUtilization: number;
      customerSatisfaction: number;
    };
    energyConsumption: {
      total: number;
      lighting: number;
      climate: number;
      kitchen: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
    recommendations: Array<{
      category: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      estimatedSavings?: number;
    }>;
  }> {
    return await unifiedApiClient.get(`/smart-tech/analytics/${restaurantId}`, dateRange);
  }

  // Predictive Maintenance
  async getMaintenanceSchedule(restaurantId: string): Promise<Array<{
    deviceId: string;
    deviceName: string;
    type: string;
    nextMaintenance: string;
    status: 'due' | 'overdue' | 'scheduled' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedDowntime: number;
    parts?: Array<{
      name: string;
      partNumber: string;
      inStock: boolean;
    }>;
  }>> {
    return await unifiedApiClient.get(`/smart-tech/maintenance/${restaurantId}`);
  }

  async scheduleMaintenace(
    deviceId: string,
    maintenance: {
      type: 'routine' | 'repair' | 'upgrade';
      scheduledDate: string;
      technician?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; maintenanceId: string }> {
    return await unifiedApiClient.post(`/smart-tech/maintenance/${deviceId}/schedule`, maintenance);
  }

  // Integration APIs
  async integrateWithPOS(
    restaurantId: string,
    posSystem: {
      provider: 'square' | 'toast' | 'resy' | 'clover' | 'lightspeed';
      apiKey: string;
      endpoint: string;
      features: string[];
    }
  ): Promise<{ success: boolean; integrationId: string }> {
    return await unifiedApiClient.post(`/smart-tech/integrations/pos`, {
      restaurantId,
      ...posSystem,
    });
  }

  async testIntegration(integrationId: string): Promise<{
    success: boolean;
    latency: number;
    features: Record<string, boolean>;
    errors?: string[];
  }> {
    return await unifiedApiClient.post(`/smart-tech/integrations/${integrationId}/test`);
  }

  // Real-time Updates
  subscribeToDeviceUpdates(
    restaurantId: string,
    callback: (update: {
      deviceId: string;
      type: string;
      data: any;
      timestamp: string;
    }) => void
  ): () => void {
    // This would integrate with WebSocket service
    const eventSource = new EventSource(`/api/smart-tech/stream/${restaurantId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Failed to parse smart tech update:', error);
      }
    };

    return () => {
      eventSource.close();
    };
  }
}

// Singleton instance
export const smartTechService = new SmartTechService();

// React hooks
export function useSmartDevices(restaurantId: string) {
  const [devices, setDevices] = React.useState<SmartDevice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!restaurantId) return;

    smartTechService
      .getDevices(restaurantId)
      .then(setDevices)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const refreshDevices = React.useCallback(async () => {
    try {
      const updatedDevices = await smartTechService.getDevices(restaurantId);
      setDevices(updatedDevices);
    } catch (err: any) {
      setError(err.message);
    }
  }, [restaurantId]);

  return { devices, loading, error, refresh: refreshDevices };
}

export function useSmartTables(restaurantId: string) {
  const [tables, setTables] = React.useState<SmartTableSystem[]>([]);
  const [occupancy, setOccupancy] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!restaurantId) return;

    Promise.all([
      smartTechService.getSmartTables(restaurantId),
      smartTechService.getTableOccupancy(restaurantId),
    ])
      .then(([tablesData, occupancyData]) => {
        setTables(tablesData);
        setOccupancy(occupancyData);
      })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  return { tables, occupancy, loading };
}

export function useIoTSensors(restaurantId: string, sensorType?: IoTSensor['type']) {
  const [sensors, setSensors] = React.useState<IoTSensor[]>([]);
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!restaurantId) return;

    Promise.all([
      smartTechService.getSensorData(restaurantId, sensorType),
      smartTechService.getSensorAlerts(restaurantId),
    ])
      .then(([sensorData, alertData]) => {
        setSensors(sensorData);
        setAlerts(alertData);
      })
      .finally(() => setLoading(false));
  }, [restaurantId, sensorType]);

  return { sensors, alerts, loading };
}

export function useKitchenDisplays(restaurantId: string) {
  const [displays, setDisplays] = React.useState<SmartKitchenDisplay[]>([]);
  const [metrics, setMetrics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!restaurantId) return;

    Promise.all([
      smartTechService.getKitchenDisplays(restaurantId),
      smartTechService.getKitchenMetrics(restaurantId),
    ])
      .then(([displaysData, metricsData]) => {
        setDisplays(displaysData);
        setMetrics(metricsData);
      })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  return { displays, metrics, loading };
}

export function useSmartTechUpdates(restaurantId: string) {
  const [updates, setUpdates] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!restaurantId) return;

    const unsubscribe = smartTechService.subscribeToDeviceUpdates(
      restaurantId,
      (update) => {
        setUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates
      }
    );

    return unsubscribe;
  }, [restaurantId]);

  return updates;
}

export default smartTechService;