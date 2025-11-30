interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOSInstallable: boolean;
  isStandalone: boolean;
  promptEvent: BeforeInstallPromptEvent | null;
}

class PWAInstallService {
  private state: PWAInstallState = {
    isInstallable: false,
    isInstalled: false,
    isIOSInstallable: false,
    isStandalone: false,
    promptEvent: null,
  };

  private listeners: Array<(state: PWAInstallState) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize(): void {
    // Check if app is already installed
    this.checkInstallationStatus();

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt.bind(this));

    // Listen for app installation
    window.addEventListener('appinstalled', this.handleAppInstalled.bind(this));

    // Check for iOS installation possibility
    this.checkIOSInstallability();

    // Listen for standalone mode changes
    this.checkStandaloneMode();
    window.addEventListener('resize', this.checkStandaloneMode.bind(this));
  }

  private handleBeforeInstallPrompt(event: Event): void {
    // Prevent the mini-infobar from appearing on mobile
    event.preventDefault();
    
    this.state.promptEvent = event as BeforeInstallPromptEvent;
    this.state.isInstallable = true;
    this.notifyListeners();
  }

  private handleAppInstalled(): void {
    this.state.isInstalled = true;
    this.state.isInstallable = false;
    this.state.promptEvent = null;
    this.notifyListeners();
  }

  private checkInstallationStatus(): void {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.state.isInstalled = true;
      this.state.isStandalone = true;
    }

    // Check if installed via other means
    if ((window.navigator as any).standalone === true) {
      this.state.isInstalled = true;
      this.state.isStandalone = true;
    }
  }

  private checkIOSInstallability(): void {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = (window.navigator as any).standalone;
    const isInWebAppsCapableMode = window.matchMedia('(display-mode: standalone)').matches;

    this.state.isIOSInstallable = isIOS && !isInStandaloneMode && !isInWebAppsCapableMode;
  }

  private checkStandaloneMode(): void {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    
    if (isStandalone !== this.state.isStandalone) {
      this.state.isStandalone = isStandalone;
      this.notifyListeners();
    }
  }

  // Public API
  public async install(): Promise<{ outcome: 'accepted' | 'dismissed'; platform: string } | null> {
    if (!this.state.promptEvent) {
      throw new Error('Install prompt is not available');
    }

    try {
      // Show the install prompt
      await this.state.promptEvent.prompt();
      
      // Wait for the user to respond to the prompt
      const result = await this.state.promptEvent.userChoice;
      
      if (result.outcome === 'accepted') {
        this.state.isInstallable = false;
        this.state.promptEvent = null;
        this.notifyListeners();
      }
      
      return result;
    } catch (error) {
      console.error('Error during app installation:', error);
      throw error;
    }
  }

  public getInstallInstructions(): {
    platform: string;
    instructions: string[];
  } | null {
    const userAgent = navigator.userAgent.toLowerCase();

    if (this.state.isIOSInstallable) {
      return {
        platform: 'iOS',
        instructions: [
          'Tap the Share button at the bottom of the screen',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to install the app',
        ],
      };
    }

    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return {
        platform: 'Chrome',
        instructions: [
          'Click the menu button (three dots) in the top right',
          'Select "Install OpenTable Clone"',
          'Click "Install" in the dialog',
        ],
      };
    }

    if (userAgent.includes('firefox')) {
      return {
        platform: 'Firefox',
        instructions: [
          'Click the menu button (three lines) in the top right',
          'Select "Install this site as an app"',
          'Click "Install" to add to your desktop',
        ],
      };
    }

    if (userAgent.includes('edg')) {
      return {
        platform: 'Edge',
        instructions: [
          'Click the menu button (three dots) in the top right',
          'Select "Apps" > "Install this site as an app"',
          'Click "Install" in the dialog',
        ],
      };
    }

    if (userAgent.includes('safari')) {
      return {
        platform: 'Safari',
        instructions: [
          'Click the Share button in the toolbar',
          'Select "Add to Dock" or "Add to Home Screen"',
          'Click "Add" to install the app',
        ],
      };
    }

    return null;
  }

  public canInstall(): boolean {
    return this.state.isInstallable || this.state.isIOSInstallable;
  }

  public isInstalled(): boolean {
    return this.state.isInstalled;
  }

  public isStandalone(): boolean {
    return this.state.isStandalone;
  }

  public getState(): PWAInstallState {
    return { ...this.state };
  }

  // Event handling
  public subscribe(callback: (state: PWAInstallState) => void): () => void {
    this.listeners.push(callback);
    
    // Immediately call with current state
    callback(this.getState());
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Utility methods
  public async checkForUpdates(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          return registration.waiting !== null;
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
    return false;
  }

  public async skipWaiting(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  }

  public getPlatformInfo(): {
    platform: string;
    version: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  } {
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*Mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    let platform = 'Unknown';
    let version = '';

    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      platform = 'iOS';
      const match = userAgent.match(/OS (\d+_\d+)/);
      if (match) {
        version = match[1].replace('_', '.');
      }
    } else if (/Android/i.test(userAgent)) {
      platform = 'Android';
      const match = userAgent.match(/Android (\d+\.\d+)/);
      if (match) {
        version = match[1];
      }
    } else if (/Windows/i.test(userAgent)) {
      platform = 'Windows';
    } else if (/Mac/i.test(userAgent)) {
      platform = 'macOS';
    } else if (/Linux/i.test(userAgent)) {
      platform = 'Linux';
    }

    return {
      platform,
      version,
      isMobile,
      isTablet,
      isDesktop,
    };
  }

  public getCapabilities(): {
    notifications: boolean;
    geolocation: boolean;
    camera: boolean;
    microphone: boolean;
    backgroundSync: boolean;
    pushMessaging: boolean;
    paymentRequest: boolean;
  } {
    return {
      notifications: 'Notification' in window,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      pushMessaging: 'serviceWorker' in navigator && 'PushManager' in window,
      paymentRequest: 'PaymentRequest' in window,
    };
  }

  // Storage usage
  public async getStorageUsage(): Promise<{
    used: number;
    available: number;
    quota: number;
    percentage: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const available = quota - used;
        const percentage = quota > 0 ? Math.round((used / quota) * 100) : 0;

        return {
          used,
          available,
          quota,
          percentage,
        };
      } catch (error) {
        console.error('Error getting storage estimate:', error);
      }
    }

    return {
      used: 0,
      available: 0,
      quota: 0,
      percentage: 0,
    };
  }

  // Network information
  public getNetworkInfo(): {
    online: boolean;
    type?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  } {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    return {
      online: navigator.onLine,
      type: connection?.type,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };
  }
}

// Singleton instance
export const pwaInstallService = new PWAInstallService();

// React hooks
export function usePWAInstall() {
  const [state, setState] = React.useState<PWAInstallState>(() => 
    pwaInstallService.getState()
  );

  React.useEffect(() => {
    const unsubscribe = pwaInstallService.subscribe(setState);
    return unsubscribe;
  }, []);

  const install = React.useCallback(async () => {
    try {
      const result = await pwaInstallService.install();
      return result;
    } catch (error) {
      console.error('Installation failed:', error);
      throw error;
    }
  }, []);

  const getInstructions = React.useCallback(() => {
    return pwaInstallService.getInstallInstructions();
  }, []);

  return {
    ...state,
    install,
    getInstructions,
    canInstall: pwaInstallService.canInstall(),
    isInstalled: pwaInstallService.isInstalled(),
    isStandalone: pwaInstallService.isStandalone(),
  };
}

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);

  React.useEffect(() => {
    const checkForUpdates = async () => {
      const hasUpdate = await pwaInstallService.checkForUpdates();
      setUpdateAvailable(hasUpdate);
    };

    checkForUpdates();

    // Check for updates periodically
    const interval = setInterval(checkForUpdates, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const applyUpdate = React.useCallback(async () => {
    setInstalling(true);
    try {
      await pwaInstallService.skipWaiting();
      window.location.reload();
    } catch (error) {
      console.error('Failed to apply update:', error);
      setInstalling(false);
    }
  }, []);

  return {
    updateAvailable,
    installing,
    applyUpdate,
  };
}

export function usePWACapabilities() {
  const [capabilities] = React.useState(() => pwaInstallService.getCapabilities());
  const [platformInfo] = React.useState(() => pwaInstallService.getPlatformInfo());
  const [networkInfo, setNetworkInfo] = React.useState(() => pwaInstallService.getNetworkInfo());

  React.useEffect(() => {
    const updateNetworkInfo = () => {
      setNetworkInfo(pwaInstallService.getNetworkInfo());
    };

    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  return {
    capabilities,
    platformInfo,
    networkInfo,
  };
}

export default pwaInstallService;