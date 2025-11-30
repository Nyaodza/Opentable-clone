import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import Geolocation from '@react-native-community/geolocation';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { restaurantService } from '../../services/api';

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  distance: number;
  priceRange: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface AROverlay {
  restaurant: Restaurant;
  x: number;
  y: number;
  bearing: number;
}

const ARRestaurantScreen: React.FC = () => {
  const navigation = useNavigation();
  const cameraRef = useRef<RNCamera>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<Restaurant[]>([]);
  const [arOverlays, setArOverlays] = useState<AROverlay[]>([]);

  useEffect(() => {
    requestPermissions();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      fetchNearbyRestaurants();
    }
  }, [currentLocation]);

  useEffect(() => {
    if (nearbyRestaurants.length > 0 && currentLocation) {
      calculateAROverlays();
    }
  }, [nearbyRestaurants, deviceHeading, currentLocation]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        const cameraGranted = granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
        const locationGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
        
        setHasPermission(cameraGranted && locationGranted);
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    } else {
      setHasPermission(true); // iOS permissions handled in Info.plist
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Location error:', error);
        Alert.alert('Location Error', 'Unable to get your current location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const fetchNearbyRestaurants = async () => {
    if (!currentLocation) return;

    try {
      const restaurants = await restaurantService.getNearbyRestaurants(
        currentLocation.latitude,
        currentLocation.longitude,
        1000 // 1km radius
      );
      setNearbyRestaurants(restaurants);
    } catch (error) {
      console.error('Error fetching nearby restaurants:', error);
    }
  };

  const calculateAROverlays = () => {
    if (!currentLocation) return;

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const fieldOfView = 60; // degrees

    const overlays: AROverlay[] = nearbyRestaurants.map((restaurant) => {
      // Calculate bearing from current location to restaurant
      const bearing = calculateBearing(
        currentLocation.latitude,
        currentLocation.longitude,
        restaurant.latitude,
        restaurant.longitude
      );

      // Calculate relative bearing (difference from device heading)
      let relativeBearing = bearing - deviceHeading;
      if (relativeBearing < -180) relativeBearing += 360;
      if (relativeBearing > 180) relativeBearing -= 360;

      // Only show restaurants within field of view
      if (Math.abs(relativeBearing) > fieldOfView / 2) {
        return null;
      }

      // Calculate screen position
      const x = screenWidth / 2 + (relativeBearing / fieldOfView) * screenWidth;
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        restaurant.latitude,
        restaurant.longitude
      );

      // Y position based on distance (closer = lower on screen)
      const y = screenHeight * 0.3 + (distance / 1000) * screenHeight * 0.4;

      return {
        restaurant: { ...restaurant, distance },
        x,
        y,
        bearing: relativeBearing,
      };
    }).filter(Boolean) as AROverlay[];

    setArOverlays(overlays);
  };

  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Distance in meters
  };

  const handleRestaurantTap = (restaurant: Restaurant) => {
    navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id });
  };

  const startScanning = async () => {
    setIsScanning(true);
    
    // Simulate restaurant recognition via image processing
    setTimeout(() => {
      setIsScanning(false);
      Alert.alert(
        'Restaurant Recognized!',
        'Found "Bella Vista Italian" in camera view. Would you like to view details?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'View Details', 
            onPress: () => {
              // Navigate to restaurant details
              if (nearbyRestaurants.length > 0) {
                handleRestaurantTap(nearbyRestaurants[0]);
              }
            }
          }
        ]
      );
    }, 2000);
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-alt" size={64} color="#ccc" />
        <Text style={styles.permissionText}>
          Camera and location permissions are required for AR features
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
          <Text style={styles.permissionButtonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RNCamera
        ref={cameraRef}
        style={styles.camera}
        type={RNCamera.Constants.Type.back}
        flashMode={RNCamera.Constants.FlashMode.off}
        androidCameraPermissionOptions={{
          title: 'Permission to use camera',
          message: 'We need your permission to use your camera',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancel',
        }}
      />

      {/* AR Overlays */}
      {arOverlays.map((overlay, index) => (
        <TouchableOpacity
          key={`${overlay.restaurant.id}-${index}`}
          style={[
            styles.arOverlay,
            {
              left: overlay.x - 75,
              top: overlay.y - 40,
            },
          ]}
          onPress={() => handleRestaurantTap(overlay.restaurant)}
        >
          <View style={styles.restaurantCard}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {overlay.restaurant.name}
            </Text>
            <Text style={styles.restaurantInfo}>
              {overlay.restaurant.cuisine} • {overlay.restaurant.priceRange}
            </Text>
            <View style={styles.restaurantMeta}>
              <Icon name="star" size={12} color="#FFD700" />
              <Text style={styles.rating}>{overlay.restaurant.rating.toFixed(1)}</Text>
              <Text style={styles.distance}>
                {overlay.restaurant.distance < 1000 
                  ? `${Math.round(overlay.restaurant.distance)}m`
                  : `${(overlay.restaurant.distance / 1000).toFixed(1)}km`
                }
              </Text>
            </View>
          </View>
          <View style={styles.pointer} />
        </TouchableOpacity>
      ))}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonActive]}
          onPress={startScanning}
          disabled={isScanning}
        >
          <Icon 
            name={isScanning ? "search" : "camera-alt"} 
            size={24} 
            color="white" 
          />
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Scan Restaurant'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchNearbyRestaurants}
        >
          <Icon name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoPanelText}>
          Point your camera at restaurants to see information
        </Text>
        <Text style={styles.infoPanelSubtext}>
          {nearbyRestaurants.length} restaurants nearby
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  arOverlay: {
    position: 'absolute',
    width: 150,
    alignItems: 'center',
  },
  restaurantCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  restaurantName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  restaurantInfo: {
    color: '#ccc',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    color: 'white',
    fontSize: 10,
    marginLeft: 2,
    marginRight: 8,
  },
  distance: {
    color: '#ccc',
    fontSize: 10,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.8)',
    marginTop: -1,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 25,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonActive: {
    backgroundColor: '#FF6B35',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 25,
  },
  infoPanel: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 8,
  },
  infoPanelText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  infoPanelSubtext: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default ARRestaurantScreen;
