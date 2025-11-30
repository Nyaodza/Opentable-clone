'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StarIcon, MapPinIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

interface RestaurantCardProps {
  restaurant: {
    id: number;
    name: string;
    slug: string;
    cuisine: string;
    description: string;
    imageUrl: string;
    rating: number;
    totalReviews: number;
    priceRange: number;
    address: string;
    city: string;
    availableSlots?: string[];
    isLiked?: boolean;
    loyaltyPoints?: number;
    distance?: number;
  };
  onLikeToggle?: (id: number) => void;
}

export default function RestaurantCard({ restaurant, onLikeToggle }: RestaurantCardProps) {
  const [isLiked, setIsLiked] = useState(restaurant.isLiked || false);
  const [imageError, setImageError] = useState(false);

  const handleLikeToggle = () => {
    setIsLiked(!isLiked);
    onLikeToggle?.(restaurant.id);
  };

  const renderPriceRange = () => {
    return Array.from({ length: 4 }, (_, i) => (
      <CurrencyDollarIcon
        key={i}
        className={`h-4 w-4 ${i < restaurant.priceRange ? 'text-gray-900' : 'text-gray-300'}`}
      />
    ));
  };

  const renderRating = () => {
    const fullStars = Math.floor(restaurant.rating);
    const hasHalfStar = restaurant.rating % 1 >= 0.5;

    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon
            key={i}
            className={`h-4 w-4 ${
              i < fullStars
                ? 'text-yellow-400'
                : i === fullStars && hasHalfStar
                ? 'text-yellow-400 opacity-50'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {restaurant.rating.toFixed(1)} ({restaurant.totalReviews})
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      <Link href={`/restaurants/${restaurant.slug}`}>
        <div className="relative h-48 w-full">
          {!imageError ? (
            <Image
              src={restaurant.imageUrl}
              alt={restaurant.name}
              fill
              className="object-cover rounded-t-lg"
              onError={() => setImageError(true)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-t-lg flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}

          {/* Like button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              handleLikeToggle();
            }}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
            aria-label={isLiked ? 'Unlike restaurant' : 'Like restaurant'}
          >
            {isLiked ? (
              <HeartSolid className="h-5 w-5 text-red-500" />
            ) : (
              <HeartOutline className="h-5 w-5 text-gray-600" />
            )}
          </button>

          {/* Loyalty points badge */}
          {restaurant.loyaltyPoints && (
            <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
              +{restaurant.loyaltyPoints} pts
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/restaurants/${restaurant.slug}`}>
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            {restaurant.name}
          </h3>
        </Link>

        <div className="mt-2 space-y-1">
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium">{restaurant.cuisine}</span>
            <span className="mx-2">•</span>
            <div className="flex items-center">{renderPriceRange()}</div>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <MapPinIcon className="h-4 w-4 mr-1" />
            <span>{restaurant.city}</span>
            {restaurant.distance && (
              <>
                <span className="mx-2">•</span>
                <span>{restaurant.distance.toFixed(1)} km away</span>
              </>
            )}
          </div>

          {renderRating()}

          <p className="text-sm text-gray-600 line-clamp-2 mt-2">
            {restaurant.description}
          </p>
        </div>

        {/* Available time slots */}
        {restaurant.availableSlots && restaurant.availableSlots.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>Available today</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {restaurant.availableSlots.slice(0, 4).map((slot) => (
                <Link
                  key={slot}
                  href={`/restaurants/${restaurant.slug}?time=${slot}`}
                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  {slot}
                </Link>
              ))}
              {restaurant.availableSlots.length > 4 && (
                <span className="px-3 py-1 text-gray-500 text-xs">
                  +{restaurant.availableSlots.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}