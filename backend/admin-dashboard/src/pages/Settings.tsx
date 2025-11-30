import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { FaCog, FaSave, FaKey, FaShield, FaBell, FaUser } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Settings {
  general: {
    siteName: string;
    siteUrl: string;
    adminEmail: string;
    timezone: string;
  };
  api: {
    providers: Record<string, {
      enabled: boolean;
      apiKey: string;
      maxListingsPerRequest: number;
      cacheTTL: number;
    }>;
  };
  security: {
    jwtExpiration: string;
    refreshTokenExpiration: string;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  notifications: {
    emailNotifications: boolean;
    slackWebhook: string;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
    };
  };
}

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');

  const { data: settings, isLoading } = useQuery<Settings>(
    'settings',
    async () => {
      const response = await axios.get(`${API_URL}/admin/settings`);
      return response.data;
    },
    {
      placeholderData: getPlaceholderSettings(),
    }
  );

  const updateSettingsMutation = useMutation(
    async (newSettings: Partial<Settings>) => {
      const response = await axios.put(`${API_URL}/admin/settings`, newSettings);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('settings');
        toast.success('Settings updated successfully');
      },
      onError: () => {
        toast.error('Failed to update settings');
      },
    }
  );

  const handleSave = (section: keyof Settings, data: any) => {
    updateSettingsMutation.mutate({ [section]: data });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', name: 'General', icon: FaCog },
    { id: 'api', name: 'API Providers', icon: FaKey },
    { id: 'security', name: 'Security', icon: FaShield },
    { id: 'notifications', name: 'Notifications', icon: FaBell },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your application configuration</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general' && (
            <GeneralSettings
              settings={settings?.general || getPlaceholderSettings().general}
              onSave={(data) => handleSave('general', data)}
              isLoading={updateSettingsMutation.isLoading}
            />
          )}

          {activeTab === 'api' && (
            <ApiSettings
              settings={settings?.api || getPlaceholderSettings().api}
              onSave={(data) => handleSave('api', data)}
              isLoading={updateSettingsMutation.isLoading}
            />
          )}

          {activeTab === 'security' && (
            <SecuritySettings
              settings={settings?.security || getPlaceholderSettings().security}
              onSave={(data) => handleSave('security', data)}
              isLoading={updateSettingsMutation.isLoading}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings
              settings={settings?.notifications || getPlaceholderSettings().notifications}
              onSave={(data) => handleSave('notifications', data)}
              isLoading={updateSettingsMutation.isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const GeneralSettings: React.FC<{
  settings: Settings['general'];
  onSave: (data: Settings['general']) => void;
  isLoading: boolean;
}> = ({ settings, onSave, isLoading }) => {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Site Name
          </label>
          <input
            type="text"
            value={formData.siteName}
            onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Site URL
          </label>
          <input
            type="url"
            value={formData.siteUrl}
            onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admin Email
          </label>
          <input
            type="email"
            value={formData.adminEmail}
            onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Timezone
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FaSave />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

const ApiSettings: React.FC<{
  settings: Settings['api'];
  onSave: (data: Settings['api']) => void;
  isLoading: boolean;
}> = ({ settings, onSave, isLoading }) => {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateProvider = (providerId: string, field: string, value: any) => {
    setFormData({
      ...formData,
      providers: {
        ...formData.providers,
        [providerId]: {
          ...formData.providers[providerId],
          [field]: value,
        },
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {Object.entries(formData.providers).map(([providerId, provider]) => (
          <div key={providerId} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg capitalize">{providerId.replace('_', ' ')}</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={provider.enabled}
                  onChange={(e) => updateProvider(providerId, 'enabled', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={provider.apiKey}
                  onChange={(e) => updateProvider(providerId, 'apiKey', e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter API key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Listings
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={provider.maxListingsPerRequest}
                  onChange={(e) => updateProvider(providerId, 'maxListingsPerRequest', parseInt(e.target.value))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cache TTL (seconds)
                </label>
                <input
                  type="number"
                  min="60"
                  max="3600"
                  value={provider.cacheTTL}
                  onChange={(e) => updateProvider(providerId, 'cacheTTL', parseInt(e.target.value))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FaSave />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

const SecuritySettings: React.FC<{
  settings: Settings['security'];
  onSave: (data: Settings['security']) => void;
  isLoading: boolean;
}> = ({ settings, onSave, isLoading }) => {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            JWT Expiration
          </label>
          <input
            type="text"
            value={formData.jwtExpiration}
            onChange={(e) => setFormData({ ...formData, jwtExpiration: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="15m"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refresh Token Expiration
          </label>
          <input
            type="text"
            value={formData.refreshTokenExpiration}
            onChange={(e) => setFormData({ ...formData, refreshTokenExpiration: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="7d"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Login Attempts
          </label>
          <input
            type="number"
            min="3"
            max="10"
            value={formData.maxLoginAttempts}
            onChange={(e) => setFormData({ ...formData, maxLoginAttempts: parseInt(e.target.value) })}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lockout Duration (minutes)
          </label>
          <input
            type="number"
            min="5"
            max="60"
            value={formData.lockoutDuration}
            onChange={(e) => setFormData({ ...formData, lockoutDuration: parseInt(e.target.value) })}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FaSave />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

const NotificationSettings: React.FC<{
  settings: Settings['notifications'];
  onSave: (data: Settings['notifications']) => void;
  isLoading: boolean;
}> = ({ settings, onSave, isLoading }) => {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.emailNotifications}
            onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
            className="mr-3"
          />
          <span className="text-sm font-medium">Enable Email Notifications</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slack Webhook URL
          </label>
          <input
            type="url"
            value={formData.slackWebhook}
            onChange={(e) => setFormData({ ...formData, slackWebhook: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="https://hooks.slack.com/services/..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Error Rate Threshold (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.alertThresholds.errorRate}
              onChange={(e) => setFormData({
                ...formData,
                alertThresholds: {
                  ...formData.alertThresholds,
                  errorRate: parseInt(e.target.value)
                }
              })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Response Time Threshold (ms)
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              value={formData.alertThresholds.responseTime}
              onChange={(e) => setFormData({
                ...formData,
                alertThresholds: {
                  ...formData.alertThresholds,
                  responseTime: parseInt(e.target.value)
                }
              })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FaSave />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

function getPlaceholderSettings(): Settings {
  return {
    general: {
      siteName: 'TravelSphere Admin',
      siteUrl: 'https://admin.travelsphere.com',
      adminEmail: 'admin@travelsphere.com',
      timezone: 'UTC',
    },
    api: {
      providers: {
        viator: {
          enabled: false,
          apiKey: '',
          maxListingsPerRequest: 4,
          cacheTTL: 600,
        },
        booking: {
          enabled: false,
          apiKey: '',
          maxListingsPerRequest: 4,
          cacheTTL: 900,
        },
        expedia: {
          enabled: false,
          apiKey: '',
          maxListingsPerRequest: 4,
          cacheTTL: 900,
        },
      },
    },
    security: {
      jwtExpiration: '15m',
      refreshTokenExpiration: '7d',
      maxLoginAttempts: 5,
      lockoutDuration: 15,
    },
    notifications: {
      emailNotifications: true,
      slackWebhook: '',
      alertThresholds: {
        errorRate: 5,
        responseTime: 2000,
      },
    },
  };
}