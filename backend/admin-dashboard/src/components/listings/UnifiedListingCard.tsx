import React from 'react';
import { FaStar, FaMapMarkerAlt, FaClock, FaCheck, FaExternalLinkAlt } from 'react-icons/fa';
import { NormalizedListing } from '../../types/unified-listings.types';
import { format } from 'date-fns';

interface UnifiedListingCardProps {
  listing: NormalizedListing;
  onCardClick?: (listing: NormalizedListing) => void;
  onBookingClick?: (listing: NormalizedListing) => void;
  showBadges?: boolean;
  layout?: 'grid' | 'list';
}

export const UnifiedListingCard: React.FC<UnifiedListingCardProps> = ({
  listing,
  onCardClick,
  onBookingClick,
  showBadges = false,
  layout = 'grid',
}) => {
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(listing);
    }
  };

  const handleBookingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBookingClick) {
      onBookingClick(listing);
    } else {
      // Track click and open in new window
      fetch(`/api/listings/${listing.id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'click' }),
      });
      window.open(listing.url, '_blank');
    }
  };

  const formatPrice = () => {
    if (!listing.price) return null;
    const price = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: listing.currency || 'USD',
    }).format(listing.price);
    
    return listing.priceUnit ? `${price} ${listing.priceUnit}` : price;
  };

  const getBadges = () => {
    const badges = [];
    
    if (listing.metadata?.instantConfirmation) {
      badges.push({ icon: FaCheck, text: 'Instant Confirmation', color: 'green' });
    }
    
    if (listing.metadata?.mobileTicket) {
      badges.push({ icon: FaCheck, text: 'Mobile Ticket', color: 'blue' });
    }
    
    if (listing.metadata?.duration) {
      badges.push({ icon: FaClock, text: listing.metadata.duration, color: 'gray' });
    }
    
    return badges;
  };

  if (layout === 'list') {
    return (
      <div 
        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer border border-gray-200"
        onClick={handleCardClick}
      >
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <img
              src={listing.thumbnailUrl || listing.images[0] || '/placeholder.jpg'}
              alt={listing.title}
              className="w-48 h-32 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.jpg';
              }}
            />
          </div>
          
          <div className="flex-grow">
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {listing.title}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <FaMapMarkerAlt />
                    <span>{listing.location.city}, {listing.location.country}</span>
                  </div>
                  
                  {listing.rating && (
                    <div className="flex items-center gap-1">
                      <FaStar className="text-yellow-400" />
                      <span>{listing.rating.toFixed(1)}</span>
                      {listing.reviewCount > 0 && (
                        <span className="text-gray-500">({listing.reviewCount})</span>
                      )}
                    </div>
                  )}
                </div>
                
                {listing.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {listing.description}
                  </p>
                )}
                
                {showBadges && getBadges().length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {getBadges().map((badge, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full
                          ${badge.color === 'green' ? 'bg-green-100 text-green-700' :
                            badge.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'}`}
                      >
                        <badge.icon className="text-xs" />
                        {badge.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="text-right ml-4">
                {formatPrice() && (
                  <p className="text-xl font-bold text-gray-900">
                    {formatPrice()}
                  </p>
                )}
                
                <button
                  onClick={handleBookingClick}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  Book Now
                  <FaExternalLinkAlt className="text-xs" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div 
      className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow overflow-hidden cursor-pointer border border-gray-200"
      onClick={handleCardClick}
    >
      <div className="aspect-w-16 aspect-h-10 relative">
        <img
          src={listing.thumbnailUrl || listing.images[0] || '/placeholder.jpg'}
          alt={listing.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.jpg';
          }}
        />
        {listing.metadata?.eventDate && (
          <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded-md shadow">
            <p className="text-xs font-semibold">
              {format(new Date(listing.metadata.eventDate), 'MMM dd')}
            </p>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {listing.title}
        </h3>
        
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
          <FaMapMarkerAlt />
          <span>{listing.location.city}, {listing.location.country}</span>
        </div>
        
        {listing.rating && (
          <div className="flex items-center gap-1 mb-3">
            <FaStar className="text-yellow-400" />
            <span className="font-medium">{listing.rating.toFixed(1)}</span>
            {listing.reviewCount > 0 && (
              <span className="text-sm text-gray-500">({listing.reviewCount} reviews)</span>
            )}
          </div>
        )}
        
        {showBadges && getBadges().length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {getBadges().slice(0, 3).map((badge, index) => (
              <span
                key={index}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full
                  ${badge.color === 'green' ? 'bg-green-100 text-green-700' :
                    badge.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'}`}
              >
                <badge.icon className="text-xs" />
                {badge.text}
              </span>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          {formatPrice() ? (
            <p className="text-lg font-bold text-gray-900">
              {formatPrice()}
            </p>
          ) : (
            <span />
          )}
          
          <button
            onClick={handleBookingClick}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            Book Now
            <FaExternalLinkAlt className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
};