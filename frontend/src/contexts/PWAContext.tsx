'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Workbox } from 'workbox-window';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAContextType {
  isSupported: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  canInstall: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  install: () => Promise<void>;
  skipWaiting: () => void;
  checkForUpdates: () => void;
  dismissInstallPrompt: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

interface PWAProviderProps {
  children: React.ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [wb, setWb] = useState<Workbox | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if PWA is supported
      setIsSupported('serviceWorker' in navigator);

      // Check if app is installed
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebKitStandaloneMode = (window.navigator as any).standalone === true;
      setIsInstalled(isInStandaloneMode || isInWebKitStandaloneMode);

      // Set initial online status
      setIsOnline(navigator.onLine);

      // Register service worker
      if ('serviceWorker' in navigator) {
        const workbox = new Workbox('/sw.js');
        setWb(workbox);

        // Listen for waiting service worker
        workbox.addEventListener('waiting', () => {
          setUpdateAvailable(true);
        });

        // Listen for controlling service worker
        workbox.addEventListener('controlling', () => {
          window.location.reload();
        });

        // Register the service worker
        workbox.register();
      }

      // Listen for install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        const beforeInstallPrompt = e as BeforeInstallPromptEvent;
        setInstallPrompt(beforeInstallPrompt);
        setCanInstall(true);
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Listen for app installed
      const handleAppInstalled = () => {
        setIsInstalled(true);
        setCanInstall(false);
        setInstallPrompt(null);
      };

      window.addEventListener('appinstalled', handleAppInstalled);

      // Listen for online/offline events
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Cleanup
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const install = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setCanInstall(false);
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const skipWaiting = () => {
    if (wb) {
      wb.addEventListener('controlling', () => {
        window.location.reload();
      });
      wb.messageSW({ type: 'SKIP_WAITING' });
    }
  };

  const checkForUpdates = () => {
    if (wb) {
      wb.update();
    }
  };

  const dismissInstallPrompt = () => {
    setCanInstall(false);
    setInstallPrompt(null);
  };

  const value: PWAContextType = {
    isSupported,
    isInstalled,
    isInstallable,
    canInstall,
    isOnline,
    updateAvailable,
    installPrompt,
    install,
    skipWaiting,
    checkForUpdates,
    dismissInstallPrompt,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
};