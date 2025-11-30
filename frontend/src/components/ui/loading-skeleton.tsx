import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className = "h-4 bg-gray-200 rounded", 
  lines = 1 
}) => {
  if (lines === 1) {
    return <div className={`animate-pulse ${className}`}></div>;
  }

  return (
    <div className="animate-pulse space-y-2">
      {[...Array(lines)].map((_, index) => (
        <div 
          key={index} 
          className={`${className} ${index === lines - 1 ? 'w-3/4' : ''}`}
        ></div>
      ))}
    </div>
  );
};

// Specialized skeleton components
export const RestaurantCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200"></div>
    <div className="p-4">
      <div className="h-6 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded mb-3 w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded mb-3"></div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded w-16"></div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  </div>
);

export const SearchResultsSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(count)].map((_, index) => (
      <RestaurantCardSkeleton key={index} />
    ))}
  </div>
);
