import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInfiniteQuery } from 'react-query';
import axios from 'axios';
import { UnifiedListingCard } from './UnifiedListingCard';
import { 
  SearchParams, 
  CombinedListingsResponse,
  NormalizedListing,
  ServiceType 
} from '../../types/unified-listings.types';
import { FaSpinner, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
import { useInView } from 'react-intersection-observer';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface UnifiedListingsGridProps {
  searchParams: SearchParams;
  layout?: 'grid' | 'list';
  showFilters?: boolean;
  onListingClick?: (listing: NormalizedListing) => void;
}

export const UnifiedListingsGrid: React.FC<UnifiedListingsGridProps> = ({
  searchParams,
  layout = 'grid',
  showFilters = true,
  onListingClick,
}) => {
  const [localSearchParams, setLocalSearchParams] = useState(searchParams);
  const { ref: loadMoreRef, inView } = useInView();

  const fetchListings = async ({ pageParam = 1 }) => {
    const response = await axios.get<CombinedListingsResponse>(
      `${API_URL}/listings/search`,
      {
        params: {
          ...localSearchParams,
          page: pageParam,
        },
      }
    );
    return response.data;
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery(
    ['unifiedListings', localSearchParams],
    fetchListings,
    {
      getNextPageParam: (lastPage) => {
        if (lastPage.hasMore) {
          return lastPage.page + 1;
        }
        return undefined;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Load more when scrolling to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleListingClick = useCallback((listing: NormalizedListing) => {
    // Track view
    axios.post(`${API_URL}/listings/${listing.id}/track`, { action: 'view' });
    
    if (onListingClick) {
      onListingClick(listing);
    }
  }, [onListingClick]);

  const handleBookingClick = useCallback((listing: NormalizedListing) => {
    // Track click and booking intent
    axios.post(`${API_URL}/listings/${listing.id}/track`, { action: 'click' });
    window.open(listing.url, '_blank');
  }, []);

  const allListings = data?.pages.flatMap(page => page.items) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;
  const sources = data?.pages[0]?.sources || { local: 0, api: {} };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Searching for the best {searchParams.serviceType.replace('_', ' ')}...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">Oops! Something went wrong</p>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Failed to load listings'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (allListings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FaSearch className="text-4xl text-gray-400 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">No listings found</p>
          <p className="text-gray-600">
            Try adjusting your search filters or location
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Results summary */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {totalCount} {searchParams.serviceType.replace('_', ' ')} found
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {localSearchParams.location.city && `in ${localSearchParams.location.city}, `}
              {localSearchParams.location.country}
            </p>
          </div>
          
          {showFilters && (
            <div className="flex gap-2">
              <select
                value={localSearchParams.sortBy || 'popularity'}
                onChange={(e) => setLocalSearchParams({
                  ...localSearchParams,
                  sortBy: e.target.value as any,
                })}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="popularity">Most Popular</option>
                <option value="price">Price: Low to High</option>
                <option value="rating">Highest Rated</option>
                <option value="distance">Nearest First</option>
              </select>
              
              <button
                onClick={() => setLocalSearchParams({
                  ...localSearchParams,
                  layout: layout === 'grid' ? 'list' : 'grid',
                } as any)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                {layout === 'grid' ? 'List View' : 'Grid View'}
              </button>
            </div>
          )}
        </div>
        
        {/* Source breakdown (for debugging, hidden in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-500">
            Sources: {sources.local} local
            {Object.entries(sources.api).map(([source, count]) => (
              <span key={source}>, {count} from {source}</span>
            ))}
          </div>
        )}
      </div>

      {/* Listings grid/list */}
      <div className={
        layout === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
      }>
        {allListings.map((listing, index) => (
          <UnifiedListingCard
            key={`${listing.source}-${listing.id}-${index}`}
            listing={listing}
            onCardClick={handleListingClick}
            onBookingClick={handleBookingClick}
            showBadges={true}
            layout={layout}
          />
        ))}
      </div>

      {/* Load more indicator */}
      <div ref={loadMoreRef} className="py-8 text-center">
        {isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2">
            <FaSpinner className="animate-spin" />
            <span>Loading more...</span>
          </div>
        )}
        {!hasNextPage && allListings.length > 0 && (
          <p className="text-gray-500">You've reached the end of the results</p>
        )}
      </div>
    </div>
  );
};