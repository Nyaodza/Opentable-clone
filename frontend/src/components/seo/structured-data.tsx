import Script from 'next/script';
import React from 'react';

// Organization structured data
export const OrganizationStructuredData = () => {
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "OpenTable Clone",
    "description": "Find and book restaurant reservations instantly with our revolutionary dining platform",
    "url": "https://opentable-clone.vercel.app",
    "logo": "https://opentable-clone.vercel.app/icons/icon-192x192.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-555-123-4567",
      "contactType": "customer service",
      "availableLanguage": ["English"]
    },
    "sameAs": [
      "https://twitter.com/opentableclone",
      "https://facebook.com/opentableclone",
      "https://instagram.com/opentableclone"
    ]
  };

  return (
    <Script
      id="organization-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(organizationData, null, 2)
      }}
    />
  );
};

// Website structured data
export const WebsiteStructuredData = () => {
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "OpenTable Clone",
    "url": "https://opentable-clone.vercel.app",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://opentable-clone.vercel.app/search?query={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Script
      id="website-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(websiteData, null, 2)
      }}
    />
  );
};

// Restaurant structured data
interface RestaurantStructuredDataProps {
  restaurant: {
    id: string;
    name: string;
    description?: string;
    cuisine: string;
    address?: string;
    phone?: string;
    rating?: number;
    priceRange: string;
    images?: string[];
    coordinates?: {
      lat: number;
      lng: number;
    };
    hours?: {
      [key: string]: string;
    };
  };
}

export const RestaurantStructuredData: React.FC<RestaurantStructuredDataProps> = ({ restaurant }) => {
  const priceRangeMap: { [key: string]: string } = {
    '$': '$',
    '$$': '$$',
    '$$$': '$$$',
    '$$$$': '$$$$'
  };

  const restaurantData = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": restaurant.name,
    "description": restaurant.description || `${restaurant.cuisine} restaurant offering exceptional dining experience`,
    "servesCuisine": restaurant.cuisine,
    "priceRange": priceRangeMap[restaurant.priceRange] || restaurant.priceRange,
    "url": `https://opentable-clone.vercel.app/restaurants/${restaurant.id}`,
    ...(restaurant.address && {
      "address": {
        "@type": "PostalAddress",
        "streetAddress": restaurant.address
      }
    }),
    ...(restaurant.phone && {
      "telephone": restaurant.phone
    }),
    ...(restaurant.coordinates && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": restaurant.coordinates.lat,
        "longitude": restaurant.coordinates.lng
      }
    }),
    ...(restaurant.rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": restaurant.rating,
        "bestRating": 5,
        "worstRating": 1
      }
    }),
    ...(restaurant.images && restaurant.images.length > 0 && {
      "image": restaurant.images
    }),
    ...(restaurant.hours && {
      "openingHoursSpecification": Object.entries(restaurant.hours).map(([day, hours]) => ({
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": day,
        "opens": hours.split('-')[0],
        "closes": hours.split('-')[1]
      }))
    })
  };

  return (
    <Script
      id={`restaurant-structured-data-${restaurant.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(restaurantData, null, 2)
      }}
    />
  );
};

// Review structured data
interface ReviewStructuredDataProps {
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    author: string;
    date: string;
    restaurantName: string;
  }>;
}

export const ReviewStructuredData: React.FC<ReviewStructuredDataProps> = ({ reviews }) => {
  const reviewsData = reviews.map(review => ({
    "@context": "https://schema.org",
    "@type": "Review",
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": review.rating,
      "bestRating": 5,
      "worstRating": 1
    },
    "reviewBody": review.comment,
    "author": {
      "@type": "Person",
      "name": review.author
    },
    "datePublished": review.date,
    "itemReviewed": {
      "@type": "Restaurant",
      "name": review.restaurantName
    }
  }));

  return (
    <>
      {reviewsData.map((review, index) => (
        <Script
          key={index}
          id={`review-structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(review, null, 2)
          }}
        />
      ))}
    </>
  );
};

// Software Application structured data (platform, not physical business)
export const LocalBusinessStructuredData = () => {
  const applicationData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "OpenTable Clone",
    "description": "Revolutionary restaurant reservation platform with blockchain loyalty, VR experiences, and AI-powered concierge",
    "url": "https://opentable-clone.vercel.app",
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Web, iOS, Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "10000",
      "bestRating": "5",
      "worstRating": "1"
    },
    "author": {
      "@type": "Organization",
      "name": "OpenTable Clone Team",
      "url": "https://opentable-clone.vercel.app"
    },
    "sameAs": [
      "https://twitter.com/opentableclone",
      "https://facebook.com/opentableclone"
    ]
  };

  return (
    <Script
      id="software-application-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(applicationData, null, 2)
      }}
    />
  );
};

// Breadcrumb structured data
interface BreadcrumbStructuredDataProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export const BreadcrumbStructuredData: React.FC<BreadcrumbStructuredDataProps> = ({ items }) => {
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <Script
      id="breadcrumb-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbData, null, 2)
      }}
    />
  );
};
