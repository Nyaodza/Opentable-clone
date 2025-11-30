'use client';

import React, { useState } from 'react';
import { 
  useSmartDevices, 
  useSmartTables, 
  useIoTSensors, 
  useKitchenDisplays,
  useSmartTechUpdates,
  smartTechService 
} from '@/lib/integrations/smart-tech';

interface SmartTechDashboardProps {
  restaurantId: string;
  className?: string;
}

export function SmartTechDashboard({ restaurantId, className = '' }: SmartTechDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'tables' | 'sensors' | 'kitchen'>('overview');
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'devices', label: 'Devices', icon: '📱' },
    { id: 'tables', label: 'Smart Tables', icon: '🍽️' },
    { id: 'sensors', label: 'IoT Sensors', icon: '📡' },
    { id: 'kitchen', label: 'Kitchen', icon: '👨‍🍳' },
  ] as const;

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Technology Dashboard</h1>
          <p className="text-gray-600">Monitor and control your restaurant's smart technology</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && <OverviewTab restaurantId={restaurantId} />}
        {activeTab === 'devices' && <DevicesTab restaurantId={restaurantId} />}
        {activeTab === 'tables' && <SmartTablesTab restaurantId={restaurantId} />}
        {activeTab === 'sensors' && <IoTSensorsTab restaurantId={restaurantId} />}
        {activeTab === 'kitchen' && <KitchenTab restaurantId={restaurantId} />}
      </div>
    </div>
  );
}

function OverviewTab({ restaurantId }: { restaurantId: string }) {
  const { devices } = useSmartDevices(restaurantId);
  const { occupancy } = useSmartTables(restaurantId);
  const { sensors, alerts } = useIoTSensors(restaurantId);
  const updates = useSmartTechUpdates(restaurantId);

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const totalDevices = devices.length;
  const activeAlerts = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Device Status"
          value={`${onlineDevices}/${totalDevices}`}
          subtitle="Online"
          icon="📱"
          color="blue"
        />
        <MetricCard
          title="Table Occupancy"
          value={occupancy ? `${Math.round(occupancy.occupancyRate)}%` : 'N/A'}
          subtitle={occupancy ? `${occupancy.occupied}/${occupancy.total} tables` : ''}
          icon="🍽️"
          color="green"
        />
        <MetricCard
          title="Sensor Alerts"
          value={activeAlerts.toString()}
          subtitle="Active alerts"
          icon="⚠️"
          color={activeAlerts > 0 ? 'red' : 'green'}
        />
        <MetricCard
          title="System Health"
          value="98%"
          subtitle="Uptime this month"
          icon="💚"
          color="green"
        />
      </div>

      {/* Real-time Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealTimeUpdates updates={updates.slice(0, 10)} />
        <SystemAlerts alerts={alerts.slice(0, 5)} />
      </div>

      {/* Device Status Grid */}
      <DeviceStatusGrid devices={devices} />
    </div>
  );
}

function DevicesTab({ restaurantId }: { restaurantId: string }) {
  const { devices, loading, error, refresh } = useSmartDevices(restaurantId);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);

  if (loading) {
    return <LoadingGrid />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Connected Devices</h2>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onSelect={() => setSelectedDevice(device)}
          />
        ))}
      </div>

      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onUpdate={refresh}
        />
      )}
    </div>
  );
}

function SmartTablesTab({ restaurantId }: { restaurantId: string }) {
  const { tables, occupancy, loading } = useSmartTables(restaurantId);

  if (loading) {
    return <LoadingGrid />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Tables"
          value={occupancy?.total.toString() || '0'}
          subtitle="Smart tables"
          icon="🍽️"
          color="blue"
        />
        <MetricCard
          title="Occupied"
          value={occupancy?.occupied.toString() || '0'}
          subtitle="Currently in use"
          icon="👥"
          color="green"
        />
        <MetricCard
          title="Available"
          value={occupancy?.available.toString() || '0'}
          subtitle="Ready for guests"
          icon="✅"
          color="blue"
        />
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Table Layout</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map((table) => (
            <TableStatus key={table.tableId} table={table} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IoTSensorsTab({ restaurantId }: { restaurantId: string }) {
  const { sensors, alerts, loading } = useIoTSensors(restaurantId);

  if (loading) {
    return <LoadingGrid />;
  }

  const sensorsByType = sensors.reduce((acc, sensor) => {
    if (!acc[sensor.type]) acc[sensor.type] = [];
    acc[sensor.type].push(sensor);
    return acc;
  }, {} as Record<string, typeof sensors>);

  return (
    <div className="space-y-6">
      {/* Sensor Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(sensorsByType).map(([type, typeSensors]) => {
          const avgValue = typeSensors.reduce((sum, s) => sum + s.value, 0) / typeSensors.length;
          const alertCount = typeSensors.filter(s => s.status !== 'normal').length;
          
          return (
            <div key={type} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{getSensorIcon(type)}</span>
                {alertCount > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                    {alertCount} alerts
                  </span>
                )}
              </div>
              <h3 className="font-medium text-gray-900 capitalize">{type}</h3>
              <p className="text-2xl font-bold text-gray-900">
                {avgValue.toFixed(1)}
                <span className="text-sm text-gray-500 ml-1">
                  {getSensorUnit(type)}
                </span>
              </p>
              <p className="text-sm text-gray-600">{typeSensors.length} sensors</p>
            </div>
          );
        })}
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <SensorAlert key={index} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Sensor Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(sensorsByType).map(([type, typeSensors]) => (
          <SensorTypeCard key={type} type={type} sensors={typeSensors} />
        ))}
      </div>
    </div>
  );
}

function KitchenTab({ restaurantId }: { restaurantId: string }) {
  const { displays, metrics, loading } = useKitchenDisplays(restaurantId);

  if (loading) {
    return <LoadingGrid />;
  }

  return (
    <div className="space-y-6">
      {/* Kitchen Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Avg Cook Time"
            value={`${metrics.averageCookTime}m`}
            subtitle="Minutes"
            icon="⏱️"
            color="blue"
          />
          <MetricCard
            title="Order Accuracy"
            value={`${metrics.orderAccuracy}%`}
            subtitle="Correct orders"
            icon="🎯"
            color="green"
          />
          <MetricCard
            title="On-Time Delivery"
            value={`${metrics.onTimeDelivery}%`}
            subtitle="Within target time"
            icon="✅"
            color="green"
          />
          <MetricCard
            title="Queue Length"
            value={metrics.queueLength.toString()}
            subtitle="Orders waiting"
            icon="📋"
            color="orange"
          />
        </div>
      )}

      {/* Kitchen Displays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displays.map((display) => (
          <KitchenDisplayCard key={display.id} display={display} />
        ))}
      </div>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'red' | 'orange';
}

function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
    </div>
  );
}

function DeviceCard({ device, onSelect }: { device: any; onSelect: () => void }) {
  const statusColors = {
    online: 'bg-green-100 text-green-800',
    offline: 'bg-red-100 text-red-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer" onClick={onSelect}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{getDeviceIcon(device.type)}</span>
        <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[device.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
          {device.status}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{device.name}</h3>
      <p className="text-sm text-gray-600 mb-2">{device.location}</p>
      <p className="text-xs text-gray-500">
        Last seen: {new Date(device.lastSeen).toLocaleString()}
      </p>
    </div>
  );
}

function TableStatus({ table }: { table: any }) {
  const statusColors = {
    available: 'bg-green-100 border-green-300 text-green-800',
    occupied: 'bg-blue-100 border-blue-300 text-blue-800',
    reserved: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    cleaning: 'bg-gray-100 border-gray-300 text-gray-800',
    maintenance: 'bg-red-100 border-red-300 text-red-800',
  };

  return (
    <div className={`p-4 rounded-lg border-2 text-center ${statusColors[table.status as keyof typeof statusColors] || 'bg-gray-100 border-gray-300 text-gray-800'}`}>
      <div className="text-2xl mb-2">🍽️</div>
      <p className="font-medium">Table {table.tableId}</p>
      <p className="text-sm">{table.capacity} seats</p>
      <p className="text-xs capitalize">{table.status}</p>
    </div>
  );
}

function RealTimeUpdates({ updates }: { updates: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <h3 className="text-lg font-semibold text-gray-900">Real-time Updates</h3>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {updates.map((update, index) => (
          <div key={index} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
            <span className="text-lg">{getDeviceIcon(update.type)}</span>
            <div className="flex-1">
              <p className="text-sm text-gray-900">{update.deviceId}</p>
              <p className="text-xs text-gray-600">
                {new Date(update.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemAlerts({ alerts }: { alerts: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <SensorAlert key={index} alert={alert} />
        ))}
      </div>
    </div>
  );
}

function SensorAlert({ alert }: { alert: any }) {
  const severityColors = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`p-3 rounded-lg border ${severityColors[alert.severity as keyof typeof severityColors] || 'bg-gray-50 border-gray-200 text-gray-800'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium">{alert.message}</p>
          <p className="text-sm opacity-75">{alert.location}</p>
        </div>
        <button
          onClick={() => smartTechService.acknowledgeSensorAlert(alert.id)}
          className="text-sm bg-white bg-opacity-50 px-2 py-1 rounded hover:bg-opacity-75"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}

// Utility functions
function getDeviceIcon(type: string): string {
  const icons = {
    display: '📺',
    speaker: '🔊',
    thermostat: '🌡️',
    lighting: '💡',
    pos: '💳',
    tablet: '📱',
    kiosk: '🖥️',
  };
  return icons[type as keyof typeof icons] || '📱';
}

function getSensorIcon(type: string): string {
  const icons = {
    temperature: '🌡️',
    humidity: '💧',
    occupancy: '👥',
    noise: '🔊',
    air_quality: '🌬️',
    motion: '🏃',
  };
  return icons[type as keyof typeof icons] || '📡';
}

function getSensorUnit(type: string): string {
  const units = {
    temperature: '°C',
    humidity: '%',
    occupancy: 'people',
    noise: 'dB',
    air_quality: 'AQI',
    motion: 'events',
  };
  return units[type as keyof typeof units] || '';
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <p>{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try Again
      </button>
    </div>
  );
}

function DeviceStatusGrid({ devices }: { devices: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Status Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {devices.map((device) => (
          <div key={device.id} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-2">{getDeviceIcon(device.type)}</div>
            <p className="text-sm font-medium text-gray-900 truncate">{device.name}</p>
            <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${
              device.status === 'online' ? 'bg-green-500' : 
              device.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeviceDetailModal({ device, onClose, onUpdate }: { 
  device: any; 
  onClose: () => void; 
  onUpdate: () => void; 
}) {
  const [isRestarting, setIsRestarting] = useState(false);

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await smartTechService.restartDevice(device.id);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to restart device:', error);
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{device.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <p className={`text-lg font-semibold ${
                device.status === 'online' ? 'text-green-600' : 
                device.status === 'offline' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Location</label>
              <p className="text-gray-900">{device.location}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <p className="text-gray-900 capitalize">{device.type}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Last Seen</label>
              <p className="text-gray-900">{new Date(device.lastSeen).toLocaleString()}</p>
            </div>

            {device.capabilities && device.capabilities.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Capabilities</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {device.capabilities.map((capability: string) => (
                    <span key={capability} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {capability}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleRestart}
              disabled={isRestarting || device.status === 'offline'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRestarting ? 'Restarting...' : 'Restart Device'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SensorTypeCard({ type, sensors }: { type: string; sensors: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{getSensorIcon(type)}</span>
        <h3 className="text-lg font-semibold text-gray-900 capitalize">{type} Sensors</h3>
      </div>
      
      <div className="space-y-3">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium text-gray-900">{sensor.location}</p>
              <p className="text-sm text-gray-600">
                {sensor.value} {getSensorUnit(sensor.type)}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              sensor.status === 'normal' ? 'bg-green-500' :
              sensor.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KitchenDisplayCard({ display }: { display: any }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 capitalize">{display.station} Station</h3>
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
          {display.orders.length} orders
        </span>
      </div>

      <div className="space-y-3 mb-4">
        {display.orders.slice(0, 3).map((order: any) => (
          <div key={order.orderId} className="p-3 bg-gray-50 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Order #{order.orderId}</span>
              <span className={`px-2 py-1 text-xs rounded ${
                order.priority === 'rush' ? 'bg-red-100 text-red-800' :
                order.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.priority}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {order.items.length} items • Est. {order.estimatedCompletion}
            </p>
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600">
        <p>Avg cook time: {display.averageCookTime} minutes</p>
        <p>Queue length: {display.queueLength} orders</p>
      </div>
    </div>
  );
}