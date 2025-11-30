'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Restaurant, restaurantService, AvailabilitySlot } from '@/lib/api/restaurant';
import { CreateReservationDto, reservationService } from '@/lib/api/reservation';
import { userService } from '@/lib/api/user';
import { LoadingSpinner, LoadingOverlay, Skeleton } from '@/components/common/loading';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { sanitize, validate } from '@/lib/security';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  rating: number;
  comment: string;
  photos?: string[];
  createdAt: string;
  helpfulCount: number;
  isHelpful?: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  allergens?: string[];
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  image?: string;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  // State
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isReservationLoading, setIsReservationLoading] = useState(false);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [occasionType, setOccasionType] = useState<'birthday' | 'anniversary' | 'business' | 'date' | 'celebration' | 'other'>('other');
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('');
  const [reservationError, setReservationError] = useState('');

  // Fallback restaurant data for when API is unavailable
  const getFallbackRestaurant = (id: string): Restaurant | null => {
    const fallbackRestaurants: { [key: string]: Restaurant } = {
      'fallback-1': {
        id: 'fallback-1',
        name: 'The Modern Bistro',
        description: 'Modern French cuisine in an elegant setting with a focus on seasonal ingredients and innovative techniques.',
        cuisineType: 'French',
        priceRange: '$$$',
        address: '123 Main Street',
        city: 'Downtown',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        phone: '(555) 123-4567',
        email: 'info@modernbistro.com',
        website: 'https://modernbistro.example.com',
        images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'],
        features: ['Fine Dining', 'Private Dining', 'Full Bar'],
        amenities: ['WiFi', 'Outdoor Seating', 'Valet Parking'],
        dietaryRestrictions: ['Vegetarian Options', 'Gluten-Free Options'],
        averageRating: 4.8,
        totalReviews: 234,
        totalReservations: 5420,
        isActive: true,
        isVerified: true,
        operatingHours: {
          monday: { openTime: '17:00', closeTime: '22:00', isClosed: false },
          tuesday: { openTime: '17:00', closeTime: '22:00', isClosed: false },
          wednesday: { openTime: '17:00', closeTime: '22:00', isClosed: false },
          thursday: { openTime: '17:00', closeTime: '23:00', isClosed: false },
          friday: { openTime: '17:00', closeTime: '23:30', isClosed: false },
          saturday: { openTime: '17:00', closeTime: '23:30', isClosed: false },
          sunday: { openTime: '17:00', closeTime: '21:00', isClosed: false }
        }
      },
      'fallback-2': {
        id: 'fallback-2',
        name: 'Sakura Sushi House',
        description: 'Authentic Japanese sushi and sashimi prepared by master chefs using the freshest ingredients.',
        cuisineType: 'Japanese',
        priceRange: '$$$$',
        address: '456 Sushi Lane',
        city: 'Midtown',
        state: 'NY',
        zipCode: '10022',
        country: 'USA',
        phone: '(555) 234-5678',
        email: 'info@sakurasushi.com',
        images: ['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800', 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800'],
        features: ['Omakase', 'Sushi Bar', 'Private Rooms'],
        amenities: ['WiFi', 'Wheelchair Accessible'],
        dietaryRestrictions: ['Gluten-Free Options'],
        averageRating: 4.9,
        totalReviews: 567,
        totalReservations: 8920,
        isActive: true,
        isVerified: true,
        operatingHours: {
          monday: { openTime: '11:30', closeTime: '22:00', isClosed: false },
          tuesday: { openTime: '11:30', closeTime: '22:00', isClosed: false },
          wednesday: { openTime: '11:30', closeTime: '22:00', isClosed: false },
          thursday: { openTime: '11:30', closeTime: '23:00', isClosed: false },
          friday: { openTime: '11:30', closeTime: '23:00', isClosed: false },
          saturday: { openTime: '12:00', closeTime: '23:00', isClosed: false },
          sunday: { openTime: '12:00', closeTime: '21:00', isClosed: false }
        }
      },
      'fallback-3': {
        id: 'fallback-3',
        name: 'Pasta Paradise',
        description: 'Traditional Italian pasta and pizza made with imported ingredients and family recipes.',
        cuisineType: 'Italian',
        priceRange: '$$',
        address: '789 Italy Street',
        city: 'Little Italy',
        state: 'NY',
        zipCode: '10013',
        country: 'USA',
        phone: '(555) 345-6789',
        email: 'info@pastaparadise.com',
        images: ['https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800', 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=800'],
        features: ['Family Style', 'Wood-Fired Pizza', 'Full Bar'],
        amenities: ['WiFi', 'Outdoor Seating', 'Takeout'],
        dietaryRestrictions: ['Vegetarian Options', 'Vegan Options'],
        averageRating: 4.6,
        totalReviews: 892,
        totalReservations: 12450,
        isActive: true,
        isVerified: true,
        operatingHours: {
          monday: { openTime: '11:00', closeTime: '22:00', isClosed: false },
          tuesday: { openTime: '11:00', closeTime: '22:00', isClosed: false },
          wednesday: { openTime: '11:00', closeTime: '22:00', isClosed: false },
          thursday: { openTime: '11:00', closeTime: '23:00', isClosed: false },
          friday: { openTime: '11:00', closeTime: '23:30', isClosed: false },
          saturday: { openTime: '11:00', closeTime: '23:30', isClosed: false },
          sunday: { openTime: '11:00', closeTime: '21:00', isClosed: false }
        }
      }
    };
    return fallbackRestaurants[id] || null;
  };

  // Fallback reviews
  const getFallbackReviews = (): Review[] => [
    { id: 'r1', userId: 'u1', userName: 'John D.', rating: 5, comment: 'Absolutely amazing! The food was incredible and the service was impeccable.', createdAt: new Date().toISOString(), helpfulCount: 24 },
    { id: 'r2', userId: 'u2', userName: 'Sarah M.', rating: 4, comment: 'Great atmosphere and delicious food. Will definitely return.', createdAt: new Date().toISOString(), helpfulCount: 12 },
    { id: 'r3', userId: 'u3', userName: 'Mike R.', rating: 5, comment: 'Perfect for a special occasion. Highly recommend!', createdAt: new Date().toISOString(), helpfulCount: 18 }
  ];

  // Fallback menu items
  const getFallbackMenu = (): MenuItem[] => [
    { id: 'm1', name: 'Signature Appetizer', description: 'Chef special starter', price: 18, category: 'Appetizers' },
    { id: 'm2', name: 'House Salad', description: 'Fresh greens with house vinaigrette', price: 14, category: 'Appetizers', isVegetarian: true },
    { id: 'm3', name: 'Main Course Special', description: 'Chef daily selection', price: 42, category: 'Entrees' },
    { id: 'm4', name: 'Vegetarian Delight', description: 'Seasonal vegetables', price: 28, category: 'Entrees', isVegetarian: true, isVegan: true },
    { id: 'm5', name: 'Chocolate Fondant', description: 'Rich chocolate dessert', price: 16, category: 'Desserts' }
  ];

  // Load restaurant data
  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        setIsLoading(true);
        const id = params?.id as string;
        
        // Check if this is a fallback ID or try API first
        if (id.startsWith('fallback-')) {
          const fallbackData = getFallbackRestaurant(id);
          if (fallbackData) {
            setRestaurant(fallbackData);
            setReviews(getFallbackReviews());
            setMenu(getFallbackMenu());
            setSelectedMenuCategory('Appetizers');
            return;
          }
        }
        
        try {
          const restaurantData = await restaurantService.getRestaurant(id);
          setRestaurant(restaurantData);
          
          // Load additional data in parallel
          const [reviewsData, menuData, favoritesData] = await Promise.allSettled([
            restaurantService.getRestaurantReviews(id, 1, 5),
            restaurantService.getRestaurantMenu(id),
            session ? userService.getFavoriteRestaurants() : Promise.resolve([])
          ]);

          if (reviewsData.status === 'fulfilled') {
            setReviews((reviewsData.value as any)?.reviews || []);
          }
          
          if (menuData.status === 'fulfilled') {
            const menuValue = menuData.value as any;
            setMenu(menuValue?.items || []);
            if (menuValue?.items?.length > 0) {
              const categories = [...new Set(menuValue.items.map((item: MenuItem) => item.category))];
              setSelectedMenuCategory(categories[0]);
            }
          }
          
          if (favoritesData.status === 'fulfilled' && session) {
            setIsFavorite(favoritesData.value.some((fav: any) => fav.id === id));
          }
        } catch (apiError) {
          // API failed, try fallback data
          console.warn('API error, trying fallback:', apiError);
          const fallbackData = getFallbackRestaurant(id);
          if (fallbackData) {
            setRestaurant(fallbackData);
            setReviews(getFallbackReviews());
            setMenu(getFallbackMenu());
            setSelectedMenuCategory('Appetizers');
          }
        }
      } catch (error) {
        console.error('Error loading restaurant:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params?.id) {
      loadRestaurant();
    }
  }, [params?.id, session]);

  // Load availability when date/party size changes
  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedDate || !restaurant) return;
      
      try {
        setIsAvailabilityLoading(true);
        const slots = await restaurantService.getAvailableSlots(
          restaurant.id, 
          selectedDate, 
          partySize
        );
        setAvailableSlots(slots);
        setSelectedTime(''); // Reset selected time
      } catch (error) {
        console.error('Error loading availability:', error);
        setAvailableSlots([]);
      } finally {
        setIsAvailabilityLoading(false);
      }
    };

    loadAvailability();
  }, [selectedDate, partySize, restaurant]);

  const handleReservation = async () => {
    if (!restaurant) {
      return;
    }

    if (!selectedDate || !selectedTime) {
      setReservationError('Please select a date and time');
      return;
    }

    // Navigate to booking page with pre-filled parameters
    const params = new URLSearchParams({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      date: selectedDate,
      time: selectedTime,
      partySize: partySize.toString(),
    });
    
    router.push(`/booking/new?${params.toString()}`);
    return;

  };

  const handleFavoriteToggle = async () => {
    if (!restaurant) return;
    
    if (!session) {
      // Show alert for non-authenticated users
      alert('Please sign in to save favorites');
      router.push('/auth/login?callbackUrl=' + encodeURIComponent(window.location.href));
      return;
    }

    try {
      if (isFavorite) {
        await userService.removeFavoriteRestaurant(restaurant.id);
        setIsFavorite(false);
      } else {
        await userService.addFavoriteRestaurant(restaurant.id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Toggle locally even if API fails for better UX
      setIsFavorite(!isFavorite);
    }
  };

  const handleReviewHelpful = async (reviewId: string) => {
    // Implement review helpful functionality
    console.log('Mark review helpful:', reviewId);
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg'
    };

    return (
      <div className={`flex items-center ${sizeClasses[size]}`}>
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400">★</span>
        ))}
        {hasHalfStar && <span className="text-yellow-400">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300">★</span>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Skeleton className="h-96 w-full" />
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton lines={3} />
              <Skeleton lines={2} />
              <Skeleton lines={4} />
            </div>
            <div>
              <Skeleton className="h-96" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant not found</h1>
          <p className="text-gray-600 mb-4">The restaurant you're looking for doesn't exist.</p>
          <Link 
            href="/restaurants" 
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Browse Restaurants
          </Link>
        </div>
      </div>
    );
  }

  const menuCategories = Array.from(new Set(menu.map(item => item.category)));
  const filteredMenu = selectedMenuCategory 
    ? menu.filter(item => item.category === selectedMenuCategory)
    : menu;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Image Gallery */}
        <div className="relative h-96 bg-gray-900">
          {restaurant.images.length > 0 ? (
            <>
              <Image
                src={restaurant.images[currentImageIndex] || '/placeholder-restaurant.jpg'}
                alt={restaurant.name}
                fill
                className="object-cover"
                priority
                onError={() => {
                  // Fallback to next image or placeholder
                  if (currentImageIndex < restaurant.images.length - 1) {
                    setCurrentImageIndex(currentImageIndex + 1);
                  }
                }}
              />
              <div className="absolute inset-0 bg-black/20" />
              
              {restaurant.images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex(
                      currentImageIndex === 0 ? restaurant.images.length - 1 : currentImageIndex - 1
                    )}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors"
                    aria-label="Previous image"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(
                      (currentImageIndex + 1) % restaurant.images.length
                    )}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors"
                    aria-label="Next image"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                    {restaurant.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`h-2 w-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? 'w-8 bg-white'
                            : 'bg-white/50 hover:bg-white/70'
                        }`}
                        aria-label={`View image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-white">
              <div className="text-center">
                <div className="text-8xl mb-4">🍽️</div>
                <p>No images available</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div className="mb-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h1 className="mb-2 text-3xl font-bold text-gray-900">{restaurant.name}</h1>
                    <div className="flex items-center gap-4 text-gray-600">
                      <span className="font-medium">{restaurant.cuisineType}</span>
                      <span>•</span>
                      <span>{restaurant.priceRange}</span>
                      <span>•</span>
                      <span>{restaurant.city}, {restaurant.state}</span>
                      {restaurant.isVerified && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-green-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleFavoriteToggle}
                      className={`p-3 border rounded-lg transition-colors ${
                        isFavorite 
                          ? 'border-red-300 bg-red-50 text-red-600' 
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <button className="p-3 border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {renderStars(restaurant.averageRating)}
                    <span className="font-semibold text-gray-900">{restaurant.averageRating}</span>
                  </div>
                  <span className="text-gray-600">
                    ({restaurant.totalReviews.toLocaleString()} reviews)
                  </span>
                  <span className="text-gray-600">
                    • {restaurant.totalReservations.toLocaleString()} reservations
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <div className="flex space-x-8">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'menu', label: `Menu (${menu.length})` },
                    { id: 'reviews', label: `Reviews (${reviews.length})` },
                    { id: 'photos', label: `Photos (${restaurant.images.length})` }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-red-600 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Description */}
                  <div>
                    <h3 className="mb-3 text-xl font-semibold text-gray-900">About {restaurant.name}</h3>
                    <p className="text-gray-700 leading-relaxed">{restaurant.description}</p>
                  </div>

                  {/* Features & Amenities Grid */}
                  <div className="grid md:grid-cols-2 gap-8">
                    {restaurant.features.length > 0 && (
                      <div>
                        <h3 className="mb-3 text-lg font-semibold text-gray-900">Features</h3>
                        <div className="space-y-2">
                          {restaurant.features.map((feature) => (
                            <div key={feature} className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-gray-700">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {restaurant.amenities.length > 0 && (
                      <div>
                        <h3 className="mb-3 text-lg font-semibold text-gray-900">Amenities</h3>
                        <div className="space-y-2">
                          {restaurant.amenities.map((amenity) => (
                            <div key={amenity} className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-gray-700">{amenity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dietary Options */}
                  {restaurant.dietaryRestrictions.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-gray-900">Dietary Options</h3>
                      <div className="flex flex-wrap gap-2">
                        {restaurant.dietaryRestrictions.map((diet) => (
                          <span key={diet} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                            {diet}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact & Location */}
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-gray-900">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <p className="text-gray-900 font-medium">Address</p>
                            <p className="text-gray-600">{restaurant.address}</p>
                            <p className="text-gray-600">{restaurant.city}, {restaurant.state} {restaurant.zipCode}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <div>
                            <p className="text-gray-900 font-medium">Phone</p>
                            <a href={`tel:${restaurant.phone}`} className="text-red-600 hover:text-red-700">
                              {restaurant.phone}
                            </a>
                          </div>
                        </div>

                        {restaurant.website && (
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                            <div>
                              <p className="text-gray-900 font-medium">Website</p>
                              <a
                                href={restaurant.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-600 hover:text-red-700"
                              >
                                Visit Website
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Operating Hours */}
                    {restaurant.operatingHours && (
                      <div>
                        <h3 className="mb-3 text-lg font-semibold text-gray-900">Hours</h3>
                        <div className="space-y-2">
                          {Object.entries(restaurant.operatingHours).map(([day, hours]) => {
                            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                            const isToday = day === today;
                            
                            return (
                              <div key={day} className={`flex justify-between ${isToday ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                <span>{day}</span>
                                <span>
                                  {hours.isClosed ? (
                                    <span className="text-red-600">Closed</span>
                                  ) : (
                                    `${hours.openTime} - ${hours.closeTime}`
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'menu' && (
                <div className="space-y-6">
                  {menu.length > 0 ? (
                    <>
                      {menuCategories.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                          {menuCategories.map((category) => (
                            <button
                              key={category}
                              onClick={() => setSelectedMenuCategory(category)}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                selectedMenuCategory === category
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div className="space-y-6">
                        {filteredMenu.map((item) => (
                          <div key={item.id} className="border-b border-gray-200 pb-6">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-lg font-semibold text-gray-900">{item.name}</h4>
                                  <div className="flex gap-1">
                                    {item.isVegetarian && (
                                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">V</span>
                                    )}
                                    {item.isVegan && (
                                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">VG</span>
                                    )}
                                    {item.isGlutenFree && (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">GF</span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-gray-600 mb-2">{item.description}</p>
                                {item.allergens && item.allergens.length > 0 && (
                                  <p className="text-sm text-gray-500">
                                    Contains: {item.allergens.join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-lg font-semibold text-gray-900">
                                  ${item.price.toFixed(2)}
                                </p>
                                {item.image && (
                                  <div className="mt-2 w-20 h-20 relative">
                                    <Image
                                      src={item.image}
                                      alt={item.name}
                                      fill
                                      className="object-cover rounded-lg"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📋</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Menu not available</h3>
                      <p className="text-gray-600">Please contact the restaurant for menu information.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {reviews.length > 0 ? (
                    <>
                      {/* Reviews Summary */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-gray-900 mb-2">
                              {restaurant.averageRating}
                            </div>
                            <div className="flex justify-center mb-2">
                              {renderStars(restaurant.averageRating, 'lg')}
                            </div>
                            <p className="text-gray-600">
                              Based on {restaurant.totalReviews} reviews
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            {[5, 4, 3, 2, 1].map((rating) => {
                              const count = reviews.filter(r => Math.floor(r.rating) === rating).length;
                              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                              
                              return (
                                <div key={rating} className="flex items-center gap-2">
                                  <span className="w-4 text-sm text-gray-600">{rating}</span>
                                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="w-8 text-sm text-gray-600">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Individual Reviews */}
                      <div className="space-y-6">
                        {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => (
                          <div key={review.id} className="border border-gray-200 rounded-lg p-6">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                                {review.userImage ? (
                                  <Image
                                    src={review.userImage}
                                    alt={review.userName}
                                    width={48}
                                    height={48}
                                    className="rounded-full"
                                  />
                                ) : (
                                  <span className="text-gray-600 font-semibold">
                                    {review.userName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{review.userName}</h4>
                                    <div className="flex items-center gap-2">
                                      {renderStars(review.rating, 'sm')}
                                      <span className="text-sm text-gray-500">
                                        {new Date(review.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <p className="text-gray-700 mb-3">{review.comment}</p>
                                
                                {review.photos && review.photos.length > 0 && (
                                  <div className="flex gap-2 mb-3">
                                    {review.photos.slice(0, 3).map((photo, index) => (
                                      <div key={index} className="w-20 h-20 relative">
                                        <Image
                                          src={photo}
                                          alt={`Review photo ${index + 1}`}
                                          fill
                                          className="object-cover rounded-lg"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-4 text-sm">
                                  <button
                                    onClick={() => handleReviewHelpful(review.id)}
                                    className={`flex items-center gap-1 ${
                                      review.isHelpful ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                    </svg>
                                    Helpful ({review.helpfulCount})
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {reviews.length > 3 && !showAllReviews && (
                          <button
                            onClick={() => setShowAllReviews(true)}
                            className="w-full py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Show all {reviews.length} reviews
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">💭</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
                      <p className="text-gray-600">Be the first to leave a review!</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'photos' && (
                <div className="space-y-6">
                  {restaurant.images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {restaurant.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className="aspect-square relative group overflow-hidden rounded-lg"
                        >
                          <Image
                            src={image}
                            alt={`${restaurant.name} photo ${index + 1}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📸</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No photos available</h3>
                      <p className="text-gray-600">Photos will be added soon.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reservation Card */}
            <div className="lg:sticky lg:top-4">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-6 text-gray-900">Make a Reservation</h2>
                
                <LoadingOverlay isLoading={isReservationLoading} message="Creating reservation...">
                  <div className="space-y-4">
                    {/* Party Size */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Party Size</label>
                      <select
                        value={partySize}
                        onChange={(e) => setPartySize(parseInt(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((size) => (
                          <option key={size} value={size}>
                            {size} {size === 1 ? 'person' : 'people'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        min={new Date().toISOString().split('T')[0]}
                        max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // 90 days ahead
                      />
                    </div>

                    {/* Time */}
                    {selectedDate && (
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">
                          Available Times
                          {isAvailabilityLoading && (
                            <LoadingSpinner size="sm" className="ml-2" />
                          )}
                        </label>
                        
                        {availableSlots.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {availableSlots.map((slot) => (
                              <button
                                key={slot.time}
                                onClick={() => setSelectedTime(slot.time)}
                                disabled={!slot.available}
                                className={`py-2 px-3 text-sm rounded-lg border transition-colors ${
                                  !slot.available
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : selectedTime === slot.time
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {slot.time}
                                {slot.seatsAvailable && slot.seatsAvailable < 5 && (
                                  <div className="text-xs">
                                    {slot.seatsAvailable} left
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : isAvailabilityLoading ? (
                          <div className="grid grid-cols-3 gap-2">
                            {[...Array(6)].map((_, i) => (
                              <Skeleton key={i} className="h-12" />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-500">No available times for this date</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Occasion Type */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Occasion (Optional)</label>
                      <select
                        value={occasionType}
                        onChange={(e) => setOccasionType(e.target.value as any)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      >
                        <option value="other">General Dining</option>
                        <option value="birthday">Birthday</option>
                        <option value="anniversary">Anniversary</option>
                        <option value="business">Business Meal</option>
                        <option value="date">Date Night</option>
                        <option value="celebration">Celebration</option>
                      </select>
                    </div>

                    {/* Dietary Restrictions */}
                    {restaurant.dietaryRestrictions.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Dietary Restrictions</label>
                        <div className="space-y-2">
                          {restaurant.dietaryRestrictions.map((restriction) => (
                            <label key={restriction} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={dietaryRestrictions.includes(restriction)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setDietaryRestrictions([...dietaryRestrictions, restriction]);
                                  } else {
                                    setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
                                  }
                                }}
                                className="rounded border-gray-300 text-red-600 focus:ring-red-600"
                              />
                              <span className="ml-2 text-sm text-gray-700">{restriction}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Special Requests */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        rows={3}
                        placeholder="Allergies, seating preferences, celebrations, etc."
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {specialRequests.length}/500 characters
                      </p>
                    </div>

                    {/* Error Display */}
                    {reservationError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{reservationError}</p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      onClick={handleReservation}
                      disabled={!selectedDate || !selectedTime || isReservationLoading}
                      className={`w-full py-3 rounded-lg font-medium transition-colors ${
                        selectedDate && selectedTime && !isReservationLoading
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isReservationLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <LoadingSpinner size="sm" color="white" />
                          Creating Reservation...
                        </div>
                      ) : (
                        'Reserve Now'
                      )}
                    </button>

                    {/* Login prompt for non-authenticated users */}
                    {!session && (
                      <p className="text-xs text-center text-gray-600">
                        <Link href="/auth/login" className="text-red-600 hover:text-red-700 font-medium">
                          Sign in
                        </Link>
                        {' '}or{' '}
                        <Link href="/auth/register" className="text-red-600 hover:text-red-700 font-medium">
                          create an account
                        </Link>
                        {' '}to make a reservation
                      </p>
                    )}

                    {/* Terms */}
                    <p className="text-xs text-gray-500 text-center">
                      By booking, you agree to our{' '}
                      <Link href="/terms" className="text-red-600 hover:text-red-700">
                        terms and conditions
                      </Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-red-600 hover:text-red-700">
                        privacy policy
                      </Link>
                    </p>
                  </div>
                </LoadingOverlay>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}