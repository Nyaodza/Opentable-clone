'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useGoogleMap, usePlaceSearch, useDirections, mapsService, type MapLocation, type MapConfig } from '@/lib/integrations/maps';

interface GoogleMapProps {
  config: Partial<MapConfig>;
  onMarkerClick?: (location: MapLocation) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export function GoogleMapComponent({ config, onMarkerClick, onMapClick, className = '' }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const { isLoaded, error } = useGoogleMap();

  useEffect(() => {
    if (isLoaded && mapRef.current && !map) {
      mapsService.createMap(mapRef.current, config).then(mapInstance => {
        setMap(mapInstance);
        
        // Add click listener if provided
        if (onMapClick) {
          mapInstance.addListener('click', (event: any) => {
            onMapClick(event.latLng.lat(), event.latLng.lng());
          });
        }
      });
    }
  }, [isLoaded, map, config, onMapClick]);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center text-red-600">
          <p className="font-medium">Failed to load map</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 rounded-lg animate-pulse ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🗺️</div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={`w-full h-64 rounded-lg ${className}`} />;
}

interface RestaurantFinderProps {
  onRestaurantSelect?: (restaurant: any) => void;
  className?: string;
}

export function RestaurantFinder({ onRestaurantSelect, className = '' }: RestaurantFinderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchRequest, setSearchRequest] = useState<any>(null);
  const { results, loading, search } = usePlaceSearch(searchRequest);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Could not get location:', error);
          // Default to New York City
          setLocation({ latitude: 40.7128, longitude: -74.0060 });
        }
      );
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !location) return;

    setSearchRequest({
      query: searchQuery,
      location,
      radius: 5000, // 5km radius
      type: 'restaurant',
    });
  };

  const handleNearbySearch = () => {
    if (!location) return;

    setSearchRequest({
      location,
      radius: 2000, // 2km radius
      type: 'restaurant',
      openNow: true,
    });
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Find Restaurants</h2>
        
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for restaurants..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <button
          onClick={handleNearbySearch}
          disabled={loading || !location}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Find Nearby Restaurants
        </button>
      </div>

      <div className="p-6">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Searching for restaurants...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((restaurant, index) => (
              <RestaurantCard
                key={index}
                restaurant={restaurant}
                onSelect={() => onRestaurantSelect?.(restaurant)}
              />
            ))}
          </div>
        )}

        {!loading && results.length === 0 && searchRequest && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <p>No restaurants found. Try a different search term or location.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface RestaurantCardProps {
  restaurant: any;
  onSelect: () => void;
}

function RestaurantCard({ restaurant, onSelect }: RestaurantCardProps) {
  const [directions, setDirections] = useState<any>(null);
  const [loadingDirections, setLoadingDirections] = useState(false);

  const getDirections = async () => {
    if (!navigator.geolocation) return;

    setLoadingDirections(true);
    try {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const directionsResult = await mapsService.getDirections({
            origin: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            destination: restaurant.location,
            mode: 'driving',
          });
          setDirections(directionsResult.routes[0]);
        } catch (error) {
          console.error('Failed to get directions:', error);
        } finally {
          setLoadingDirections(false);
        }
      });
    } catch (error) {
      setLoadingDirections(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
        {restaurant.rating && (
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">⭐</span>
            <span className="text-sm text-gray-600">{restaurant.rating}</span>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-2">{restaurant.vicinity}</p>

      {restaurant.priceLevel && (
        <div className="mb-2">
          <span className="text-sm text-gray-500">
            {'$'.repeat(restaurant.priceLevel)}
          </span>
        </div>
      )}

      {restaurant.openingHours && (
        <div className="mb-3">
          <span className={`text-xs px-2 py-1 rounded ${
            restaurant.openingHours.openNow 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {restaurant.openingHours.openNow ? 'Open Now' : 'Closed'}
          </span>
        </div>
      )}

      {directions && (
        <div className="mb-3 p-2 bg-blue-50 rounded">
          <p className="text-xs text-blue-700">
            {directions.distance.text} • {directions.duration.text}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSelect}
          className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Select
        </button>
        <button
          onClick={getDirections}
          disabled={loadingDirections}
          className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {loadingDirections ? '...' : '🗺️'}
        </button>
      </div>
    </div>
  );
}

interface DirectionsViewProps {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  mode?: 'driving' | 'walking' | 'transit' | 'bicycling';
  className?: string;
}

export function DirectionsView({ origin, destination, mode = 'driving', className = '' }: DirectionsViewProps) {
  const { directions, loading, error } = useDirections({
    origin,
    destination,
    mode,
  });

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-red-600">
          <p className="font-medium">Unable to get directions</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!directions) return null;

  const route = directions.routes[0];

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Directions</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>📍 {route.distance.text}</span>
          <span>⏱️ {route.duration.text}</span>
          <span className="capitalize">🚗 {mode}</span>
        </div>
      </div>

      <div className="p-6">
        <h4 className="font-medium text-gray-900 mb-3">Step-by-step directions:</h4>
        <div className="space-y-3">
          {route.steps.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{step.instruction}</p>
                <p className="text-xs text-gray-500">{step.distance} • {step.duration}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=${mode}`;
              window.open(url, '_blank');
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Open in Google Maps
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Directions',
                  text: `Directions: ${route.distance.text}, ${route.duration.text}`,
                  url: `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}`,
                });
              }
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  initialLocation?: { latitude: number; longitude: number };
  className?: string;
}

export function LocationPicker({ onLocationSelect, initialLocation, className = '' }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLocation({ latitude: lat, longitude: lng });
    setLoading(true);

    try {
      const addresses = await mapsService.reverseGeocode({ latitude: lat, longitude: lng });
      const selectedAddress = addresses[0] || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(selectedAddress);
      onLocationSelect({ latitude: lat, longitude: lng, address: selectedAddress });
    } catch (error) {
      console.error('Failed to get address:', error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setLoading(false);
    }
  };

  const mapConfig: Partial<MapConfig> = {
    center: selectedLocation || { latitude: 40.7128, longitude: -74.0060 },
    zoom: 15,
    markers: selectedLocation ? [{
      id: 'selected',
      name: 'Selected Location',
      address: address || 'Selected location',
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      type: 'marker',
    }] : [],
    showUserLocation: true,
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Location</h3>
        <p className="text-sm text-gray-600">Click on the map to select a location</p>
      </div>

      <div className="p-6">
        <GoogleMapComponent
          config={mapConfig}
          onMapClick={handleMapClick}
          className="h-64 mb-4"
        />

        {selectedLocation && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900 mb-1">Selected Location:</p>
            {loading ? (
              <p className="text-sm text-gray-600">Getting address...</p>
            ) : (
              <p className="text-sm text-gray-600">{address}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}