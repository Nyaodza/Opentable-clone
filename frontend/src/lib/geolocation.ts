export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formattedAddress?: string;
}

export interface LocationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export interface GeocodingResult {
  location: Location;
  address: Address;
  placeId?: string;
  types?: string[];
  confidence?: number;
}

class GeolocationService {
  private watchId: number | null = null;
  private lastKnownPosition: Location | null = null;
  private locationCallbacks: Array<(location: Location) => void> = [];
  private errorCallbacks: Array<(error: GeolocationPositionError) => void> = [];

  constructor() {
    // Try to get last known position from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lastKnownPosition');
      if (stored) {
        try {
          this.lastKnownPosition = JSON.parse(stored);
        } catch (error) {
          console.warn('Failed to parse stored location:', error);
        }
      }
    }
  }

  // Permission Management
  async checkPermission(): Promise<LocationPermissionStatus> {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation is not supported by this browser');
    }

    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return {
        granted: permission.state === 'granted',
        denied: permission.state === 'denied',
        prompt: permission.state === 'prompt',
      };
    }

    // Fallback for browsers without Permissions API
    return { granted: false, denied: false, prompt: true };
  }

  // Location Retrieval
  async getCurrentPosition(options: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
    useCache?: boolean;
  } = {}): Promise<Location> {
    const {
      enableHighAccuracy = true,
      timeout = 15000,
      maximumAge = 300000, // 5 minutes
      useCache = true,
    } = options;

    // Return cached position if available and not too old
    if (useCache && this.lastKnownPosition) {
      const age = Date.now() - (this.lastKnownPosition.timestamp || 0);
      if (age < maximumAge) {
        return this.lastKnownPosition;
      }
    }

    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };

          this.lastKnownPosition = location;
          this.storePosition(location);
          resolve(location);
        },
        (error) => {
          console.error('Geolocation error:', error);
          
          // Try to return cached position as fallback
          if (this.lastKnownPosition) {
            console.warn('Using cached position due to geolocation error');
            resolve(this.lastKnownPosition);
          } else {
            reject(this.handleGeolocationError(error));
          }
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    });
  }

  async getPositionWithFallback(): Promise<Location> {
    try {
      return await this.getCurrentPosition();
    } catch (error) {
      console.warn('Geolocation failed, trying IP-based location');
      return await this.getIPBasedLocation();
    }
  }

  // Watch Position
  startWatching(
    onLocation: (location: Location) => void,
    onError?: (error: GeolocationPositionError) => void,
    options: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    } = {}
  ): number {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const {
      enableHighAccuracy = true,
      timeout = 30000,
      maximumAge = 60000, // 1 minute
    } = options;

    this.locationCallbacks.push(onLocation);
    if (onError) {
      this.errorCallbacks.push(onError);
    }

    if (this.watchId === null) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };

          this.lastKnownPosition = location;
          this.storePosition(location);
          this.locationCallbacks.forEach(callback => callback(location));
        },
        (error) => {
          console.error('Watch position error:', error);
          this.errorCallbacks.forEach(callback => callback(error));
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    }

    return this.watchId;
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.locationCallbacks = [];
    this.errorCallbacks = [];
  }

  // IP-based Location Fallback
  async getIPBasedLocation(): Promise<Location> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        const location: Location = {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: 10000, // IP-based is less accurate
          timestamp: Date.now(),
        };
        
        this.lastKnownPosition = location;
        this.storePosition(location);
        return location;
      } else {
        throw new Error('Unable to determine location from IP');
      }
    } catch (error) {
      console.error('IP-based location failed:', error);
      // Return default location (e.g., New York City)
      return {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 50000,
        timestamp: Date.now(),
      };
    }
  }

  // Distance Calculations
  calculateDistance(
    location1: Location,
    location2: Location,
    unit: 'miles' | 'kilometers' = 'miles'
  ): number {
    const R = unit === 'miles' ? 3959 : 6371; // Earth's radius in miles or kilometers
    
    const lat1Rad = this.toRadians(location1.latitude);
    const lat2Rad = this.toRadians(location2.latitude);
    const deltaLatRad = this.toRadians(location2.latitude - location1.latitude);
    const deltaLngRad = this.toRadians(location2.longitude - location1.longitude);

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  calculateBearing(location1: Location, location2: Location): number {
    const lat1Rad = this.toRadians(location1.latitude);
    const lat2Rad = this.toRadians(location2.latitude);
    const deltaLngRad = this.toRadians(location2.longitude - location1.longitude);

    const y = Math.sin(deltaLngRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLngRad);

    const bearingRad = Math.atan2(y, x);
    return (this.toDegrees(bearingRad) + 360) % 360;
  }

  findNearestLocations<T extends { latitude: number; longitude: number }>(
    userLocation: Location,
    locations: T[],
    maxDistance?: number,
    limit?: number
  ): Array<T & { distance: number; bearing: number }> {
    const locationsWithDistance = locations.map(location => ({
      ...location,
      distance: this.calculateDistance(userLocation, location),
      bearing: this.calculateBearing(userLocation, location),
    }));

    let filtered = locationsWithDistance;
    
    // Filter by max distance if specified
    if (maxDistance) {
      filtered = filtered.filter(loc => loc.distance <= maxDistance);
    }

    // Sort by distance
    filtered.sort((a, b) => a.distance - b.distance);

    // Limit results if specified
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  // Geocoding
  async geocodeAddress(address: string): Promise<GeocodingResult[]> {
    try {
      // Using a mock implementation - replace with actual geocoding service
      const response = await fetch(`/api/geocoding?address=${encodeURIComponent(address)}`);
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }

  async reverseGeocode(location: Location): Promise<Address> {
    try {
      // Using a mock implementation - replace with actual reverse geocoding service
      const response = await fetch(`/api/reverse-geocoding?lat=${location.latitude}&lng=${location.longitude}`);
      const data = await response.json();
      return data.address || {};
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {};
    }
  }

  // Geofencing
  isWithinRadius(
    center: Location,
    target: Location,
    radius: number,
    unit: 'miles' | 'kilometers' = 'miles'
  ): boolean {
    const distance = this.calculateDistance(center, target, unit);
    return distance <= radius;
  }

  createGeofence(
    center: Location,
    radius: number,
    onEnter?: (location: Location) => void,
    onExit?: (location: Location) => void
  ): {
    id: string;
    isInside: (location: Location) => boolean;
    destroy: () => void;
  } {
    const id = `geofence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let wasInside = false;

    const checkLocation = (location: Location) => {
      const isInside = this.isWithinRadius(center, location, radius);
      
      if (isInside && !wasInside) {
        // Entered geofence
        wasInside = true;
        onEnter?.(location);
      } else if (!isInside && wasInside) {
        // Exited geofence
        wasInside = false;
        onExit?.(location);
      }
    };

    // Add to location callbacks
    this.locationCallbacks.push(checkLocation);

    return {
      id,
      isInside: (location: Location) => this.isWithinRadius(center, location, radius),
      destroy: () => {
        const index = this.locationCallbacks.indexOf(checkLocation);
        if (index > -1) {
          this.locationCallbacks.splice(index, 1);
        }
      },
    };
  }

  // Utility Methods
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  private storePosition(location: Location): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lastKnownPosition', JSON.stringify(location));
      } catch (error) {
        console.warn('Failed to store location:', error);
      }
    }
  }

  private handleGeolocationError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('Location access denied by user');
      case error.POSITION_UNAVAILABLE:
        return new Error('Location information unavailable');
      case error.TIMEOUT:
        return new Error('Location request timed out');
      default:
        return new Error(`Unknown geolocation error: ${error.message}`);
    }
  }

  // Public getters
  getLastKnownPosition(): Location | null {
    return this.lastKnownPosition;
  }

  isWatching(): boolean {
    return this.watchId !== null;
  }
}

// Singleton instance
export const geolocationService = new GeolocationService();

// React hooks
export function useGeolocation(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}) {
  const [location, setLocation] = React.useState<Location | null>(
    geolocationService.getLastKnownPosition()
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [permission, setPermission] = React.useState<LocationPermissionStatus | null>(null);

  React.useEffect(() => {
    const initializeLocation = async () => {
      try {
        const permissionStatus = await geolocationService.checkPermission();
        setPermission(permissionStatus);

        if (permissionStatus.granted || permissionStatus.prompt) {
          const currentLocation = await geolocationService.getCurrentPosition(options);
          setLocation(currentLocation);
        } else {
          // Try IP-based location as fallback
          const ipLocation = await geolocationService.getIPBasedLocation();
          setLocation(ipLocation);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeLocation();

    // Set up watching if enabled
    if (options?.watch) {
      const watchId = geolocationService.startWatching(
        setLocation,
        (err) => setError(err.message)
      );

      return () => {
        geolocationService.stopWatching();
      };
    }
  }, [options?.watch]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newLocation = await geolocationService.getCurrentPosition({
        ...options,
        useCache: false,
      });
      setLocation(newLocation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { location, loading, error, permission, refresh };
}

export function useNearbySearch<T extends { latitude: number; longitude: number }>(
  items: T[],
  maxDistance?: number,
  limit?: number
) {
  const { location } = useGeolocation();
  const [nearbyItems, setNearbyItems] = React.useState<Array<T & { distance: number; bearing: number }>>([]);

  React.useEffect(() => {
    if (location && items.length > 0) {
      const nearby = geolocationService.findNearestLocations(
        location,
        items,
        maxDistance,
        limit
      );
      setNearbyItems(nearby);
    }
  }, [location, items, maxDistance, limit]);

  return nearbyItems;
}

export function useGeofence(
  center: Location,
  radius: number,
  onEnter?: (location: Location) => void,
  onExit?: (location: Location) => void
) {
  const [isInside, setIsInside] = React.useState(false);
  const geofenceRef = React.useRef<any>(null);

  React.useEffect(() => {
    geofenceRef.current = geolocationService.createGeofence(
      center,
      radius,
      (location) => {
        setIsInside(true);
        onEnter?.(location);
      },
      (location) => {
        setIsInside(false);
        onExit?.(location);
      }
    );

    return () => {
      geofenceRef.current?.destroy();
    };
  }, [center.latitude, center.longitude, radius]);

  return { isInside, geofence: geofenceRef.current };
}

export default geolocationService;