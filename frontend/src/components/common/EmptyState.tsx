'use client';

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
  illustration?: 'no-results' | 'no-data' | 'error' | 'coming-soon' | 'empty-cart' | 'no-reservations';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  illustration,
}) => {
  const renderIllustration = () => {
    if (icon) return icon;

    switch (illustration) {
      case 'no-results':
        return (
          <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      
      case 'no-data':
        return (
          <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      
      case 'error':
        return (
          <svg className="w-24 h-24 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      
      case 'coming-soon':
        return (
          <svg className="w-24 h-24 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      
      case 'empty-cart':
        return (
          <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      
      case 'no-reservations':
        return (
          <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      
      default:
        return (
          <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        );
    }
  };

  const renderAction = () => {
    if (actionHref) {
      return (
        <Link
          href={actionHref}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
        >
          {actionLabel}
        </Link>
      );
    }

    if (onAction) {
      return (
        <button
          onClick={onAction}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
        >
          {actionLabel}
        </button>
      );
    }

    return null;
  };

  const renderSecondaryAction = () => {
    if (secondaryActionHref) {
      return (
        <Link
          href={secondaryActionHref}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
        >
          {secondaryActionLabel}
        </Link>
      );
    }

    if (onSecondaryAction) {
      return (
        <button
          onClick={onSecondaryAction}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
        >
          {secondaryActionLabel}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-6">
        {renderIllustration()}
      </div>
      
      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-8 max-w-md">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {renderAction()}
          {renderSecondaryAction()}
        </div>
      )}
    </div>
  );
};

/**
 * Pre-built empty states for common scenarios
 */

export const NoRestaurantsFound: React.FC<{ onClearFilters?: () => void }> = ({ onClearFilters }) => {
  return (
    <EmptyState
      illustration="no-results"
      title="No restaurants found"
      description="We couldn't find any restaurants matching your criteria. Try adjusting your filters or search in a different area."
      actionLabel="Clear Filters"
      onAction={onClearFilters}
      secondaryActionLabel="Browse All Restaurants"
      secondaryActionHref="/restaurants"
    />
  );
};

export const NoReservations: React.FC = () => {
  return (
    <EmptyState
      illustration="no-reservations"
      title="No reservations yet"
      description="You haven't made any reservations. Start exploring restaurants and book your next dining experience."
      actionLabel="Find Restaurants"
      actionHref="/restaurants"
    />
  );
};

export const NoFavorites: React.FC = () => {
  return (
    <EmptyState
      icon={
        <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      }
      title="No favorites yet"
      description="Save your favorite restaurants to easily find and book them later."
      actionLabel="Explore Restaurants"
      actionHref="/restaurants"
    />
  );
};

export const NoSearchResults: React.FC<{ searchQuery: string; onReset?: () => void }> = ({ 
  searchQuery, 
  onReset 
}) => {
  return (
    <EmptyState
      illustration="no-results"
      title={`No results for "${searchQuery}"`}
      description="We couldn't find what you're looking for. Try a different search term or browse all restaurants."
      actionLabel="Clear Search"
      onAction={onReset}
      secondaryActionLabel="Browse All"
      secondaryActionHref="/restaurants"
    />
  );
};

export const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <EmptyState
      illustration="error"
      title="Oops! Something went wrong"
      description="We encountered an error loading this page. Please try again or contact support if the problem persists."
      actionLabel="Try Again"
      onAction={onRetry}
      secondaryActionLabel="Go Home"
      secondaryActionHref="/"
    />
  );
};

export const ComingSoon: React.FC = () => {
  return (
    <EmptyState
      illustration="coming-soon"
      title="Coming Soon"
      description="We're working on something exciting! This feature will be available soon. Stay tuned for updates."
      actionLabel="Notify Me"
      onAction={() => {
        // Implement notification signup
        alert('We\'ll notify you when this feature is available!');
      }}
      secondaryActionLabel="Back to Home"
      secondaryActionHref="/"
    />
  );
};

export default EmptyState;
