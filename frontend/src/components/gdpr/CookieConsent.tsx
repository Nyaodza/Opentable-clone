'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const COOKIE_CONSENT_KEY = 'opentable-cookie-consent';
const COOKIE_PREFERENCES_KEY = 'opentable-cookie-preferences';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    const hasConsented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsented) {
      // Delay showing banner to improve UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Load existing preferences
      const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
        loadAnalyticsScript(JSON.parse(savedPreferences));
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    
    saveConsent(allAccepted);
    loadAnalyticsScript(allAccepted);
    setIsVisible(false);
  };

  const handleAcceptNecessary = () => {
    const necessaryOnly: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    
    saveConsent(necessaryOnly);
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
    loadAnalyticsScript(preferences);
    setIsVisible(false);
    setShowDetails(false);
  };

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    
    // Send consent data to analytics
    if (typeof gtag !== 'undefined') {
      gtag('consent', 'update', {
        analytics_storage: prefs.analytics ? 'granted' : 'denied',
        ad_storage: prefs.marketing ? 'granted' : 'denied',
        functionality_storage: prefs.functional ? 'granted' : 'denied',
      });
    }

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { 
      detail: prefs 
    }));
  };

  const loadAnalyticsScript = (prefs: CookiePreferences) => {
    if (prefs.analytics && typeof gtag === 'undefined') {
      // Load Google Analytics
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
      script.async = true;
      document.head.appendChild(script);

      script.onload = () => {
        window.gtag = function() {
          (window.gtag as any).dataLayer = (window.gtag as any).dataLayer || [];
          (window.gtag as any).dataLayer.push(arguments);
        };

        gtag('js', new Date());
        gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
          anonymize_ip: true,
          cookie_flags: 'secure;samesite=strict',
        });
      };
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" />
      
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-6">
            {!showDetails ? (
              // Simple Banner
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">We use cookies</h3>
                  <p className="text-sm text-gray-600">
                    We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. 
                    You can manage your preferences or learn more in our{' '}
                    <a href="/privacy-policy" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 min-w-0 sm:min-w-max">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetails(true)}
                  >
                    Manage Preferences
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptNecessary}
                  >
                    Accept Necessary Only
                  </Button>
                  <Button size="sm" onClick={handleAcceptAll}>
                    Accept All
                  </Button>
                </div>
              </div>
            ) : (
              // Detailed Preferences
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Cookie Preferences</h3>
                  <p className="text-sm text-gray-600">
                    Choose which cookies you want to accept. You can change these settings at any time.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Necessary Cookies */}
                  <div className="flex items-start justify-between p-4 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <h4 className="font-medium">Necessary Cookies</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Required for basic site functionality. These cannot be disabled.
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className="rounded"
                      />
                      <span className="ml-2 text-sm text-gray-500">Always Active</span>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">Analytics Cookies</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Help us understand how visitors interact with our website by collecting anonymous data.
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          analytics: e.target.checked
                        })}
                        className="rounded"
                      />
                    </div>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">Marketing Cookies</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Used to track visitors across websites to display relevant advertisements.
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          marketing: e.target.checked
                        })}
                        className="rounded"
                      />
                    </div>
                  </div>

                  {/* Functional Cookies */}
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">Functional Cookies</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Enable enhanced functionality like chat widgets, social media features, and personalization.
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.functional}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          functional: e.target.checked
                        })}
                        className="rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetails(false)}
                  >
                    Back
                  </Button>
                  <Button onClick={handleSavePreferences}>
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Hook to get current cookie preferences
export function useCookiePreferences(): CookiePreferences | null {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const loadPreferences = () => {
      const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    };

    loadPreferences();

    // Listen for preference updates
    const handleUpdate = (event: CustomEvent) => {
      setPreferences(event.detail);
    };

    window.addEventListener('cookieConsentUpdated', handleUpdate as EventListener);
    
    return () => {
      window.removeEventListener('cookieConsentUpdated', handleUpdate as EventListener);
    };
  }, []);

  return preferences;
}

// Utility to check if a specific cookie type is allowed
export function isCookieAllowed(type: keyof CookiePreferences): boolean {
  if (typeof window === 'undefined') return false;
  
  const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
  if (!saved) return false;
  
  const preferences: CookiePreferences = JSON.parse(saved);
  return preferences[type] || false;
}

// Component to manage cookie preferences after initial consent
export function CookiePreferencesManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
    
    if (typeof gtag !== 'undefined') {
      gtag('consent', 'update', {
        analytics_storage: preferences.analytics ? 'granted' : 'denied',
        ad_storage: preferences.marketing ? 'granted' : 'denied',
        functionality_storage: preferences.functional ? 'granted' : 'denied',
      });
    }

    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { 
      detail: preferences 
    }));
    
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        Cookie Preferences
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Manage Cookie Preferences</h3>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">Analytics Cookies</div>
                <div className="text-sm text-gray-600">Website usage analytics</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({
                  ...preferences,
                  analytics: e.target.checked
                })}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">Marketing Cookies</div>
                <div className="text-sm text-gray-600">Personalized advertisements</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => setPreferences({
                  ...preferences,
                  marketing: e.target.checked
                })}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">Functional Cookies</div>
                <div className="text-sm text-gray-600">Enhanced website features</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.functional}
                onChange={(e) => setPreferences({
                  ...preferences,
                  functional: e.target.checked
                })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}
