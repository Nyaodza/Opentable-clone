'use client';

import React, { useState } from 'react';
import { usePWAInstall, usePWAUpdate, usePWACapabilities } from '@/lib/pwa/install';

interface InstallPromptProps {
  className?: string;
}

export function InstallPrompt({ className = '' }: InstallPromptProps) {
  const { 
    isInstallable, 
    isInstalled, 
    isIOSInstallable, 
    isStandalone,
    install, 
    getInstructions 
  } = usePWAInstall();
  
  const [showInstructions, setShowInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Don't show if already installed or in standalone mode
  if (isInstalled || isStandalone || (!isInstallable && !isIOSInstallable)) {
    return null;
  }

  const handleInstall = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        const result = await install();
        if (result?.outcome === 'dismissed') {
          // User dismissed the prompt, show manual instructions
          setShowInstructions(true);
        }
      } catch (error) {
        console.error('Installation failed:', error);
        setShowInstructions(true);
      } finally {
        setInstalling(false);
      }
    } else {
      // Show instructions for browsers that don't support the API
      setShowInstructions(true);
    }
  };

  const instructions = getInstructions();

  if (showInstructions && instructions) {
    return (
      <div className={`fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 max-w-md mx-auto ${className}`}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">📱</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">
              Install App - {instructions.platform}
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 mb-4">
              {instructions.instructions.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
            <div className="flex gap-2">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={() => setShowInstructions(false)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowInstructions(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-lg shadow-lg p-4 z-50 max-w-md mx-auto ${className}`}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">📱</div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Install OpenTable Clone</h3>
          <p className="text-sm text-blue-100">
            Get the full app experience with offline access and notifications
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="px-4 py-2 bg-white text-blue-600 rounded font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {installing ? 'Installing...' : 'Install'}
          </button>
          <button
            onClick={() => setShowInstructions(false)}
            className="p-2 text-blue-200 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

interface UpdatePromptProps {
  className?: string;
}

export function UpdatePrompt({ className = '' }: UpdatePromptProps) {
  const { updateAvailable, installing, applyUpdate } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-4 right-4 bg-green-600 text-white rounded-lg shadow-lg p-4 z-50 max-w-md mx-auto ${className}`}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">🔄</div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Update Available</h3>
          <p className="text-sm text-green-100">
            A new version of the app is ready to install
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={applyUpdate}
            disabled={installing}
            className="px-4 py-2 bg-white text-green-600 rounded font-medium hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {installing ? 'Updating...' : 'Update'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 text-green-200 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

interface PWAStatusProps {
  className?: string;
}

export function PWAStatus({ className = '' }: PWAStatusProps) {
  const { isInstalled, isStandalone } = usePWAInstall();
  const { capabilities, platformInfo, networkInfo } = usePWACapabilities();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">App Status</h2>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Installation Status */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Installation</h3>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isInstalled ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-700">
              {isInstalled ? 'App is installed' : 'Running in browser'}
            </span>
          </div>
          {isStandalone && (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-700">Running in standalone mode</span>
            </div>
          )}
        </div>

        {/* Network Status */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Network</h3>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              networkInfo.online ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-700">
              {networkInfo.online ? 'Online' : 'Offline'}
            </span>
          </div>
          {networkInfo.effectiveType && (
            <div className="text-sm text-gray-600 mt-1">
              Connection: {networkInfo.effectiveType}
              {networkInfo.downlink && ` (${networkInfo.downlink} Mbps)`}
            </div>
          )}
        </div>

        {showDetails && (
          <>
            {/* Platform Info */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Platform</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Platform: {platformInfo.platform} {platformInfo.version}</div>
                <div>Device: {
                  platformInfo.isMobile ? 'Mobile' : 
                  platformInfo.isTablet ? 'Tablet' : 'Desktop'
                }</div>
              </div>
            </div>

            {/* Capabilities */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Features</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(capabilities).map(([feature, supported]) => (
                  <div key={feature} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      supported ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-700 capitalize">
                      {feature.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className = '' }: OfflineBannerProps) {
  const { networkInfo } = usePWACapabilities();
  const [dismissed, setDismissed] = useState(false);

  if (networkInfo.online || dismissed) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 bg-yellow-600 text-white p-3 z-50 ${className}`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="font-medium">You're offline</span>
          <span className="text-yellow-200">Some features may be limited</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-200 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface PWAFeaturesProps {
  className?: string;
}

export function PWAFeatures({ className = '' }: PWAFeaturesProps) {
  const { isInstalled, isStandalone } = usePWAInstall();
  const { capabilities } = usePWACapabilities();

  const features = [
    {
      icon: '📱',
      title: 'Native App Experience',
      description: 'Works like a native app with fast loading and smooth interactions',
      available: isInstalled || isStandalone,
    },
    {
      icon: '🔔',
      title: 'Push Notifications',
      description: 'Get notified about reservation confirmations and special offers',
      available: capabilities.notifications,
    },
    {
      icon: '📍',
      title: 'Location Services',
      description: 'Find restaurants near you and get personalized recommendations',
      available: capabilities.geolocation,
    },
    {
      icon: '💳',
      title: 'Quick Payments',
      description: 'Fast and secure payments with saved payment methods',
      available: capabilities.paymentRequest,
    },
    {
      icon: '🔄',
      title: 'Background Sync',
      description: 'Your actions sync when you come back online',
      available: capabilities.backgroundSync,
    },
    {
      icon: '📷',
      title: 'Camera Access',
      description: 'Share photos of your dining experiences',
      available: capabilities.camera,
    },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">App Features</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg border-2 transition-colors ${
              feature.available 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{feature.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900">{feature.title}</h3>
                  <div className={`w-2 h-2 rounded-full ${
                    feature.available ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isInstalled && !isStandalone && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-lg">💡</div>
            <h3 className="font-medium text-blue-900">Install for the best experience</h3>
          </div>
          <p className="text-sm text-blue-700">
            Install the app to unlock all features and get the full native experience
          </p>
        </div>
      )}
    </div>
  );
}