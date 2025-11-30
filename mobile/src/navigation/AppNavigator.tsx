import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import DiscoverScreen from '../screens/main/DiscoverScreen';
import SearchScreen from '../screens/main/SearchScreen';
import ReservationsScreen from '../screens/main/ReservationsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import RestaurantDetailsScreen from '../screens/restaurant/RestaurantDetailsScreen';
import BookReservationScreen from '../screens/reservation/BookReservationScreen';
import ReservationConfirmationScreen from '../screens/reservation/ReservationConfirmationScreen';
import EditReservationScreen from '../screens/reservation/EditReservationScreen';
import WriteReviewScreen from '../screens/review/WriteReviewScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import PaymentMethodsScreen from '../screens/profile/PaymentMethodsScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import LoyaltyProgramScreen from '../screens/loyalty/LoyaltyProgramScreen';
import RewardsStoreScreen from '../screens/loyalty/RewardsStoreScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import SupportScreen from '../screens/profile/SupportScreen';
import WaitlistStatusScreen from '../screens/waitlist/WaitlistStatusScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AuthStack = () => (
  <Stack.Navigator
    initialRouteName="Login"
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#ffffff' },
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: string;

        switch (route.name) {
          case 'Discover':
            iconName = focused ? 'explore' : 'explore';
            break;
          case 'Search':
            iconName = focused ? 'search' : 'search';
            break;
          case 'Reservations':
            iconName = focused ? 'event' : 'event';
            break;
          case 'Profile':
            iconName = focused ? 'person' : 'person';
            break;
          default:
            iconName = 'circle';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#e91e63',
      tabBarInactiveTintColor: '#757575',
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
      headerShown: false,
    })}
  >
    <Tab.Screen 
      name="Discover" 
      component={DiscoverScreen}
      options={{ tabBarLabel: 'Discover' }}
    />
    <Tab.Screen 
      name="Search" 
      component={SearchScreen}
      options={{ tabBarLabel: 'Search' }}
    />
    <Tab.Screen 
      name="Reservations" 
      component={ReservationsScreen}
      options={{ tabBarLabel: 'Reservations' }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ tabBarLabel: 'Profile' }}
    />
  </Tab.Navigator>
);

const MainStack = () => (
  <Stack.Navigator
    initialRouteName="MainTabs"
    screenOptions={{
      headerStyle: {
        backgroundColor: '#ffffff',
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
      },
      headerTintColor: '#333333',
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
      },
    }}
  >
    <Stack.Screen 
      name="MainTabs" 
      component={MainTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="RestaurantDetails" 
      component={RestaurantDetailsScreen}
      options={{ 
        title: 'Restaurant Details',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="BookReservation" 
      component={BookReservationScreen}
      options={{ 
        title: 'Book Reservation',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="ReservationConfirmation" 
      component={ReservationConfirmationScreen}
      options={{ 
        title: 'Confirmation',
        headerBackTitleVisible: false,
        headerLeft: () => null, // Prevent going back
      }}
    />
    <Stack.Screen 
      name="EditReservation" 
      component={EditReservationScreen}
      options={{ 
        title: 'Edit Reservation',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="WriteReview" 
      component={WriteReviewScreen}
      options={{ 
        title: 'Write Review',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ 
        title: 'Profile',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="EditProfile" 
      component={EditProfileScreen}
      options={{ 
        title: 'Edit Profile',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="PaymentMethods" 
      component={PaymentMethodsScreen}
      options={{ 
        title: 'Payment Methods',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="Notifications" 
      component={NotificationsScreen}
      options={{ 
        title: 'Notifications',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="LoyaltyProgram" 
      component={LoyaltyProgramScreen}
      options={{ 
        title: 'Loyalty Program',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="RewardsStore" 
      component={RewardsStoreScreen}
      options={{ 
        title: 'Rewards Store',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{ 
        title: 'Settings',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="Support" 
      component={SupportScreen}
      options={{ 
        title: 'Support',
        headerBackTitleVisible: false,
      }}
    />
    <Stack.Screen 
      name="WaitlistStatus" 
      component={WaitlistStatusScreen}
      options={{ 
        title: 'Waitlist Status',
        headerBackTitleVisible: false,
      }}
    />
  </Stack.Navigator>
);

export const AppNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // You could return a loading screen here
    return null;
  }

  return user ? <MainStack /> : <AuthStack />;
};