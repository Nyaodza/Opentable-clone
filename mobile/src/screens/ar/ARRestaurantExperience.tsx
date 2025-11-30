import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';

interface Restaurant {
    id: string;
    name: string;
    cuisine: string;
    rating: number;
    distance: number;
    priceRange: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
}

const ARRestaurantExperience: React.FC = () => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        requestPermissions();
        getUserLocation();
        loadNearbyRestaurants();
    }, []);

    const requestPermissions = async () => {
        const cameraStatus = await Camera.requestCameraPermissionsAsync();
        const locationStatus = await Location.requestForegroundPermissionsAsync();
        
        setHasPermission(cameraStatus.status === 'granted' && locationStatus.status === 'granted');
    };

    const getUserLocation = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation(location);
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const loadNearbyRestaurants = () => {
        // Mock restaurant data - in production, this would come from the API
        const mockRestaurants: Restaurant[] = [
            {
                id: '1',
                name: 'Blockchain Bistro',
                cuisine: 'Modern American',
                rating: 4.8,
                distance: 0.2,
                priceRange: '$$$',
                coordinates: { latitude: 37.7749, longitude: -122.4194 }
            },
            {
                id: '2',
                name: 'Virtual Vineyard',
                cuisine: 'French',
                rating: 4.6,
                distance: 0.5,
                priceRange: '$$$$',
                coordinates: { latitude: 37.7849, longitude: -122.4094 }
            },
            {
                id: '3',
                name: 'Smart Kitchen',
                cuisine: 'Asian Fusion',
                rating: 4.7,
                distance: 0.8,
                priceRange: '$$',
                coordinates: { latitude: 37.7649, longitude: -122.4294 }
            }
        ];
        setRestaurants(mockRestaurants);
    };

    const startARScanning = () => {
        setIsScanning(true);
        // Simulate AR restaurant detection after 2 seconds
        setTimeout(() => {
            const randomRestaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
            setSelectedRestaurant(randomRestaurant);
            setIsScanning(false);
            Alert.alert(
                'Restaurant Detected!',
                `Found ${randomRestaurant.name} - ${randomRestaurant.cuisine}`,
                [
                    { text: 'View Details', onPress: () => showRestaurantDetails(randomRestaurant) },
                    { text: 'Book Table', onPress: () => bookTable(randomRestaurant) },
                    { text: 'Close', style: 'cancel' }
                ]
            );
        }, 2000);
    };

    const showRestaurantDetails = (restaurant: Restaurant) => {
        Alert.alert(
            restaurant.name,
            `Cuisine: ${restaurant.cuisine}\nRating: ${restaurant.rating}/5\nDistance: ${restaurant.distance} miles\nPrice: ${restaurant.priceRange}`,
            [
                { text: 'Book Now', onPress: () => bookTable(restaurant) },
                { text: 'Close', style: 'cancel' }
            ]
        );
    };

    const bookTable = (restaurant: Restaurant) => {
        Alert.alert(
            'Book Table',
            `Would you like to make a reservation at ${restaurant.name}?`,
            [
                { 
                    text: 'Yes', 
                    onPress: () => {
                        Alert.alert('Success', 'Reservation request sent! You\'ll receive a confirmation shortly.');
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const toggleVRMode = () => {
        Alert.alert(
            'VR Mode',
            'Experience a virtual tour of the restaurant!',
            [
                { 
                    text: 'Start VR Tour', 
                    onPress: () => {
                        Alert.alert('VR Started', 'Virtual restaurant tour is now active. Use your VR headset for the full experience.');
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <Text>Requesting permissions...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Camera and location permissions are required for AR features</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermissions}>
                    <Text style={styles.buttonText}>Grant Permissions</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView 
                ref={cameraRef}
                style={styles.camera}
                facing="back"
            >
                {/* AR Overlay */}
                <View style={styles.overlay}>
                    <View style={styles.header}>
                        <Text style={styles.title}>🥽 AR Restaurant Finder</Text>
                        <Text style={styles.subtitle}>Point camera at restaurants to discover</Text>
                    </View>

                    {/* AR Scanning Indicator */}
                    {isScanning && (
                        <View style={styles.scanningContainer}>
                            <View style={styles.scanningBox}>
                                <Text style={styles.scanningText}>Scanning for restaurants...</Text>
                                <View style={styles.scanningLine} />
                            </View>
                        </View>
                    )}

                    {/* Restaurant Info Overlay */}
                    {selectedRestaurant && !isScanning && (
                        <View style={styles.restaurantOverlay}>
                            <Text style={styles.restaurantName}>{selectedRestaurant.name}</Text>
                            <Text style={styles.restaurantInfo}>
                                {selectedRestaurant.cuisine} • {selectedRestaurant.rating}⭐ • {selectedRestaurant.distance} mi
                            </Text>
                            <View style={styles.restaurantActions}>
                                <TouchableOpacity 
                                    style={styles.actionButton} 
                                    onPress={() => showRestaurantDetails(selectedRestaurant)}
                                >
                                    <Text style={styles.actionButtonText}>Details</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.actionButton} 
                                    onPress={() => bookTable(selectedRestaurant)}
                                >
                                    <Text style={styles.actionButtonText}>Book</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Bottom Controls */}
                    <View style={styles.controls}>
                        <TouchableOpacity 
                            style={styles.scanButton} 
                            onPress={startARScanning}
                            disabled={isScanning}
                        >
                            <Text style={styles.scanButtonText}>
                                {isScanning ? 'Scanning...' : '🔍 Scan Area'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.vrButton} onPress={toggleVRMode}>
                            <Text style={styles.vrButtonText}>🥽 VR Mode</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Nearby Restaurants List */}
                    <View style={styles.nearbyContainer}>
                        <Text style={styles.nearbyTitle}>Nearby Restaurants:</Text>
                        {restaurants.slice(0, 3).map((restaurant) => (
                            <TouchableOpacity 
                                key={restaurant.id}
                                style={styles.nearbyItem}
                                onPress={() => setSelectedRestaurant(restaurant)}
                            >
                                <Text style={styles.nearbyName}>{restaurant.name}</Text>
                                <Text style={styles.nearbyDistance}>{restaurant.distance} mi</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </CameraView>
        </View>
    );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    subtitle: {
        fontSize: 14,
        color: 'white',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        marginTop: 5,
    },
    scanningContainer: {
        position: 'absolute',
        top: '40%',
        left: '20%',
        right: '20%',
        alignItems: 'center',
    },
    scanningBox: {
        borderWidth: 2,
        borderColor: '#8B5CF6',
        borderRadius: 10,
        padding: 20,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        alignItems: 'center',
    },
    scanningText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    scanningLine: {
        width: 100,
        height: 2,
        backgroundColor: '#8B5CF6',
        opacity: 0.8,
    },
    restaurantOverlay: {
        position: 'absolute',
        top: '30%',
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
    },
    restaurantName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    restaurantInfo: {
        fontSize: 14,
        color: '#ccc',
        marginBottom: 15,
    },
    restaurantActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    controls: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    scanButton: {
        backgroundColor: 'rgba(139, 92, 246, 0.9)',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        flex: 0.6,
        alignItems: 'center',
    },
    scanButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    vrButton: {
        backgroundColor: 'rgba(34, 197, 94, 0.9)',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 25,
        flex: 0.35,
        alignItems: 'center',
    },
    vrButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    nearbyContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 10,
        padding: 10,
    },
    nearbyTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    nearbyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
    },
    nearbyName: {
        color: '#ccc',
        fontSize: 12,
    },
    nearbyDistance: {
        color: '#8B5CF6',
        fontSize: 12,
        fontWeight: 'bold',
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        margin: 20,
        color: '#666',
    },
    button: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        alignSelf: 'center',
        margin: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ARRestaurantExperience;
