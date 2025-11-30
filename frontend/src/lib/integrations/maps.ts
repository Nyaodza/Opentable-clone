import React from 'react';
import { geolocationService, type Location } from '../geolocation';

export interface MapLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'restaurant' | 'user' | 'delivery' | 'marker';
  metadata?: {
    phone?: string;
    website?: string;
    hours?: string;
    rating?: number;
    priceRange?: string;
    cuisineType?: string;
    photos?: string[];
  };
}

export interface MapConfig {
  center: Location;
  zoom: number;
  style: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  markers: MapLocation[];
  showUserLocation: boolean;
  enableClustering: boolean;
  maxZoom?: number;
  minZoom?: number;
}

export interface DirectionsRequest {
  origin: Location;
  destination: Location;
  mode: 'driving' | 'walking' | 'transit' | 'bicycling';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
}

export interface DirectionsResult {
  routes: Array<{
    summary: string;
    distance: {
      text: string;
      value: number;
    };
    duration: {
      text: string;
      value: number;
    };
    steps: Array<{
      instruction: string;
      distance: string;
      duration: string;
      polyline: string;
    }>;
    polyline: string;
  }>;
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'MAX_WAYPOINTS_EXCEEDED' | 'INVALID_REQUEST';
}

export interface PlaceSearchRequest {
  query?: string;
  location?: Location;
  radius?: number;
  type?: 'restaurant' | 'food' | 'meal_takeaway' | 'meal_delivery';
  minPrice?: number;
  maxPrice?: number;
  openNow?: boolean;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  vicinity: string;
  location: Location;
  rating?: number;
  priceLevel?: number;
  photos?: string[];
  openingHours?: {
    openNow: boolean;
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  types: string[];
}

class MapsService {
  private apiKey: string | null = null;
  private maps: any = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
  }

  // Initialize Google Maps API
  async initialize(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.loadGoogleMaps();
    await this.loadPromise;
  }

  private async loadGoogleMaps(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google Maps can only be loaded in browser environment'));
        return;
      }

      // Check if already loaded
      if (window.google && window.google.maps) {
        this.maps = window.google.maps;
        this.isLoaded = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,geometry&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      // Set up callback
      (window as any).initGoogleMaps = () => {
        this.maps = window.google.maps;
        this.isLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });
  }

  // Create a map instance
  async createMap(
    container: HTMLElement,
    config: Partial<MapConfig>
  ): Promise<any> {
    await this.initialize();

    const defaultConfig: MapConfig = {
      center: { latitude: 40.7128, longitude: -74.0060 }, // NYC
      zoom: 12,
      style: 'roadmap',
      markers: [],
      showUserLocation: true,
      enableClustering: false,
    };

    const mapConfig = { ...defaultConfig, ...config };

    const map = new this.maps.Map(container, {
      center: { lat: mapConfig.center.latitude, lng: mapConfig.center.longitude },
      zoom: mapConfig.zoom,
      mapTypeId: mapConfig.style,
      maxZoom: mapConfig.maxZoom,
      minZoom: mapConfig.minZoom,
      gestureHandling: 'cooperative',
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
    });

    // Add markers
    if (mapConfig.markers.length > 0) {
      this.addMarkers(map, mapConfig.markers, mapConfig.enableClustering);
    }

    // Show user location
    if (mapConfig.showUserLocation) {
      this.showUserLocation(map);
    }

    return map;
  }

  // Add markers to map
  private addMarkers(map: any, locations: MapLocation[], enableClustering: boolean): void {
    const markers = locations.map(location => {
      const marker = new this.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map,
        title: location.name,
        icon: this.getMarkerIcon(location.type),
      });

      // Add info window
      const infoWindow = new this.maps.InfoWindow({
        content: this.createInfoWindowContent(location),
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      return marker;
    });

    // Enable clustering if requested
    if (enableClustering && markers.length > 10) {
      // This would require the MarkerClusterer library
      // new MarkerClusterer(map, markers);
    }
  }

  private getMarkerIcon(type: string): any {
    const icons = {
      restaurant: {
        url: '/icons/restaurant-marker.png',
        scaledSize: new this.maps.Size(32, 32),
      },
      user: {
        url: '/icons/user-marker.png',
        scaledSize: new this.maps.Size(24, 24),
      },
      delivery: {
        url: '/icons/delivery-marker.png',
        scaledSize: new this.maps.Size(28, 28),
      },
      marker: null, // Default marker
    };

    return icons[type as keyof typeof icons] || null;
  }

  private createInfoWindowContent(location: MapLocation): string {
    const { name, address, metadata } = location;
    
    let content = `
      <div style="max-width: 300px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${name}</h3>
        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${address}</p>
    `;

    if (metadata) {
      if (metadata.rating) {
        content += `<p style="margin: 0 0 4px 0;"><span style="color: #ffa500;">★</span> ${metadata.rating}</p>`;
      }
      
      if (metadata.cuisineType) {
        content += `<p style="margin: 0 0 4px 0; font-size: 12px; color: #888;">${metadata.cuisineType}</p>`;
      }
      
      if (metadata.phone) {
        content += `<p style="margin: 0 0 4px 0;"><a href="tel:${metadata.phone}" style="color: #1a73e8; text-decoration: none;">${metadata.phone}</a></p>`;
      }
      
      if (metadata.website) {
        content += `<p style="margin: 0 0 4px 0;"><a href="${metadata.website}" target="_blank" style="color: #1a73e8; text-decoration: none;">Visit Website</a></p>`;
      }
    }

    content += `
        <div style="margin-top: 12px;">
          <button onclick="getDirections('${location.latitude}', '${location.longitude}')" 
                  style="background: #1a73e8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px;">
            Directions
          </button>
          <button onclick="shareLocation('${location.name}', '${location.latitude}', '${location.longitude}')"
                  style="background: #34a853; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
            Share
          </button>
        </div>
      </div>
    `;

    return content;
  }

  private async showUserLocation(map: any): Promise<void> {
    try {
      const userLocation = await geolocationService.getCurrentPosition();
      
      const userMarker = new this.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        title: 'Your Location',
        icon: {
          url: '/icons/user-location.png',
          scaledSize: new this.maps.Size(20, 20),
        },
      });

      // Add accuracy circle
      const accuracyCircle = new this.maps.Circle({
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        radius: userLocation.accuracy || 100,
        map,
        fillColor: '#4285f4',
        fillOpacity: 0.1,
        strokeColor: '#4285f4',
        strokeOpacity: 0.5,
        strokeWeight: 1,
      });

    } catch (error) {
      console.warn('Could not get user location for map:', error);
    }
  }

  // Get directions between two points
  async getDirections(request: DirectionsRequest): Promise<DirectionsResult> {
    await this.initialize();

    const directionsService = new this.maps.DirectionsService();

    return new Promise((resolve, reject) => {
      directionsService.route({
        origin: { lat: request.origin.latitude, lng: request.origin.longitude },
        destination: { lat: request.destination.latitude, lng: request.destination.longitude },
        travelMode: this.maps.TravelMode[request.mode.toUpperCase()],
        avoidTolls: request.avoidTolls || false,
        avoidHighways: request.avoidHighways || false,
      }, (result: any, status: any) => {
        if (status === 'OK') {
          resolve(this.parseDirectionsResult(result));
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  private parseDirectionsResult(result: any): DirectionsResult {
    return {
      routes: result.routes.map((route: any) => ({
        summary: route.summary,
        distance: {
          text: route.legs[0].distance.text,
          value: route.legs[0].distance.value,
        },
        duration: {
          text: route.legs[0].duration.text,
          value: route.legs[0].duration.value,
        },
        steps: route.legs[0].steps.map((step: any) => ({
          instruction: step.instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.text,
          duration: step.duration.text,
          polyline: step.polyline.points,
        })),
        polyline: route.overview_polyline.points,
      })),
      status: 'OK',
    };
  }

  // Search for places
  async searchPlaces(request: PlaceSearchRequest): Promise<PlaceSearchResult[]> {
    await this.initialize();

    const service = new this.maps.places.PlacesService(document.createElement('div'));

    return new Promise((resolve, reject) => {
      const searchRequest: any = {};

      if (request.query) {
        // Text search
        searchRequest.query = request.query;
        searchRequest.type = request.type || 'restaurant';
      } else if (request.location) {
        // Nearby search
        searchRequest.location = { lat: request.location.latitude, lng: request.location.longitude };
        searchRequest.radius = request.radius || 5000;
        searchRequest.type = request.type || 'restaurant';
      }

      if (request.minPrice !== undefined) searchRequest.minPriceLevel = request.minPrice;
      if (request.maxPrice !== undefined) searchRequest.maxPriceLevel = request.maxPrice;
      if (request.openNow) searchRequest.openNow = true;

      const searchMethod = request.query ? 'textSearch' : 'nearbySearch';

      service[searchMethod](searchRequest, (results: any[], status: any) => {
        if (status === this.maps.places.PlacesServiceStatus.OK) {
          resolve(results.map(this.parsePlaceResult.bind(this)));
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  private parsePlaceResult(place: any): PlaceSearchResult {
    return {
      placeId: place.place_id,
      name: place.name,
      vicinity: place.vicinity || place.formatted_address,
      location: {
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
      },
      rating: place.rating,
      priceLevel: place.price_level,
      photos: place.photos ? place.photos.map((photo: any) => 
        photo.getUrl({ maxWidth: 400, maxHeight: 300 })
      ) : [],
      openingHours: place.opening_hours ? {
        openNow: place.opening_hours.open_now,
        periods: place.opening_hours.periods || [],
      } : undefined,
      types: place.types,
    };
  }

  // Get place details
  async getPlaceDetails(placeId: string): Promise<any> {
    await this.initialize();

    const service = new this.maps.places.PlacesService(document.createElement('div'));

    return new Promise((resolve, reject) => {
      service.getDetails({
        placeId,
        fields: [
          'name', 'formatted_address', 'geometry', 'rating', 'reviews',
          'formatted_phone_number', 'website', 'opening_hours', 'photos',
          'price_level', 'types', 'url'
        ],
      }, (place: any, status: any) => {
        if (status === this.maps.places.PlacesServiceStatus.OK) {
          resolve(place);
        } else {
          reject(new Error(`Place details request failed: ${status}`));
        }
      });
    });
  }

  // Calculate distance matrix
  async calculateDistanceMatrix(
    origins: Location[],
    destinations: Location[],
    mode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving'
  ): Promise<any> {
    await this.initialize();

    const service = new this.maps.DistanceMatrixService();

    return new Promise((resolve, reject) => {
      service.getDistanceMatrix({
        origins: origins.map(loc => ({ lat: loc.latitude, lng: loc.longitude })),
        destinations: destinations.map(loc => ({ lat: loc.latitude, lng: loc.longitude })),
        travelMode: this.maps.TravelMode[mode.toUpperCase()],
        unitSystem: this.maps.UnitSystem.METRIC,
      }, (result: any, status: any) => {
        if (status === 'OK') {
          resolve(result);
        } else {
          reject(new Error(`Distance matrix request failed: ${status}`));
        }
      });
    });
  }

  // Geocoding
  async geocodeAddress(address: string): Promise<Location[]> {
    await this.initialize();

    const geocoder = new this.maps.Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results: any[], status: any) => {
        if (status === 'OK') {
          resolve(results.map(result => ({
            latitude: result.geometry.location.lat(),
            longitude: result.geometry.location.lng(),
          })));
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  async reverseGeocode(location: Location): Promise<string[]> {
    await this.initialize();

    const geocoder = new this.maps.Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({
        location: { lat: location.latitude, lng: location.longitude }
      }, (results: any[], status: any) => {
        if (status === 'OK') {
          resolve(results.map(result => result.formatted_address));
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`));
        }
      });
    });
  }

  // Utility methods
  calculateDistance(loc1: Location, loc2: Location): number {
    return geolocationService.calculateDistance(loc1, loc2);
  }

  isLoaded(): boolean {
    return this.isLoaded;
  }
}

// Singleton instance
export const mapsService = new MapsService();

// React hooks
export function useGoogleMap() {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    mapsService.initialize()
      .then(() => setIsLoaded(true))
      .catch(err => setError(err.message));
  }, []);

  return { isLoaded, error, mapsService };
}

export function useDirections(request: DirectionsRequest | null) {
  const [directions, setDirections] = React.useState<DirectionsResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!request) return;

    setLoading(true);
    setError(null);

    mapsService.getDirections(request)
      .then(setDirections)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [request]);

  return { directions, loading, error };
}

export function usePlaceSearch(request: PlaceSearchRequest | null) {
  const [results, setResults] = React.useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const search = React.useCallback(async (searchRequest: PlaceSearchRequest) => {
    setLoading(true);
    setError(null);
    try {
      const searchResults = await mapsService.searchPlaces(searchRequest);
      setResults(searchResults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (request) {
      search(request);
    }
  }, [request, search]);

  return { results, loading, error, search };
}

// Global functions for info window buttons
if (typeof window !== 'undefined') {
  (window as any).getDirections = (lat: string, lng: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  (window as any).shareLocation = (name: string, lat: string, lng: string) => {
    if (navigator.share) {
      navigator.share({
        title: name,
        text: `Check out ${name}`,
        url: `https://www.google.com/maps/@${lat},${lng},15z`,
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${name}: https://www.google.com/maps/@${lat},${lng},15z`);
    }
  };
}

export default mapsService;