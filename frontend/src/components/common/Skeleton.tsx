'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  lines = 1,
}) => {
  const baseClasses = 'bg-gray-200';
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const singleSkeleton = (index: number = 0) => (
    <div
      key={index}
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={{
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : '100%'),
      }}
      role="status"
      aria-label="Loading"
      aria-live="polite"
    />
  );

  if (lines > 1 && variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => singleSkeleton(index))}
      </div>
    );
  }

  return singleSkeleton();
};

/**
 * Pre-built skeleton components for common use cases
 */

export const RestaurantCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Skeleton variant="rectangular" height="12rem" />
      <div className="p-4 space-y-3">
        <Skeleton variant="text" width="70%" height="1.5rem" />
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="text" width="40%" />
        <div className="flex justify-between items-center mt-4">
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="rectangular" width="80px" height="32px" />
        </div>
      </div>
    </div>
  );
};

export const RestaurantDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Hero Image */}
      <Skeleton variant="rectangular" height="24rem" className="w-full" />
      
      {/* Title and Info */}
      <div className="space-y-3">
        <Skeleton variant="text" width="60%" height="2rem" />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="30%" />
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rectangular" width="100px" height="40px" />
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Skeleton lines={8} variant="text" />
        </div>
        <div className="space-y-4">
          <Skeleton variant="rectangular" height="300px" />
        </div>
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-6 py-3">
                <Skeleton variant="text" width="100%" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <Skeleton variant="text" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const DashboardCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="circular" width="40px" height="40px" />
      </div>
      <Skeleton variant="text" width="60%" height="2rem" />
      <div className="mt-4">
        <Skeleton variant="text" width="50%" />
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-4 mb-6">
        <Skeleton variant="circular" width="80px" height="80px" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height="1.5rem" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="rectangular" height="40px" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow">
          <Skeleton variant="circular" width="48px" height="48px" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
          </div>
          <Skeleton variant="rectangular" width="80px" height="32px" />
        </div>
      ))}
    </div>
  );
};

export const GridSkeleton: React.FC<{ items?: number; columns?: number }> = ({ 
  items = 6, 
  columns = 3 
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-6`}>
      {Array.from({ length: items }).map((_, index) => (
        <RestaurantCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default Skeleton;
