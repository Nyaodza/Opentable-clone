'use client';

import React from 'react';

/**
 * Skeleton loading component for RestaurantCard
 * Provides visual feedback during data loading
 */
export const RestaurantCardSkeleton: React.FC = () => {
  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse"
      aria-hidden="true"
      role="presentation"
    >
      {/* Image placeholder */}
      <div className="relative h-48 bg-gray-200">
        {/* Badge placeholders */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <div className="h-6 w-16 bg-gray-300 rounded-full" />
          <div className="h-6 w-12 bg-gray-300 rounded-full" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Title and price */}
        <div className="flex justify-between items-start">
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="h-5 w-12 bg-gray-200 rounded" />
        </div>

        {/* Cuisine and location */}
        <div className="h-4 w-48 bg-gray-200 rounded" />

        {/* Rating */}
        <div className="flex items-center space-x-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>

        {/* Loyalty tokens */}
        <div className="h-4 w-28 bg-gray-200 rounded" />

        {/* Buttons */}
        <div className="flex space-x-2 pt-2">
          <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
          <div className="h-10 w-16 bg-gray-200 rounded-lg" />
        </div>

        {/* Bottom info */}
        <div className="flex justify-between pt-2">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
};

/**
 * Grid of skeleton cards for loading states
 */
interface SkeletonGridProps {
  count?: number;
  className?: string;
}

export const RestaurantCardSkeletonGrid: React.FC<SkeletonGridProps> = ({
  count = 6,
  className = '',
}) => {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${className}`}
      role="status"
      aria-label="Loading restaurants"
    >
      {Array.from({ length: count }).map((_, index) => (
        <RestaurantCardSkeleton key={index} />
      ))}
      <span className="sr-only">Loading restaurant listings...</span>
    </div>
  );
};

export default RestaurantCardSkeleton;
