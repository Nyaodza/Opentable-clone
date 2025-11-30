'use client';

import Script from 'next/script';

/**
 * Restaurant Structured Data Component
 * Generates JSON-LD schema markup for restaurant pages
 * Improves SEO and enables rich snippets in search results
 */

export interface RestaurantStructuredDataProps {
  restaurant: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    images?: string[];
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    phone: string;
    email?: string;
    website?: string;
    priceRange: '$' | '$$' | '$$$' | '$$$$';
    cuisineTypes: string[];
    rating: number;
    reviewCount: number;
    openingHours: OpeningHours[];
    features?: string[];
    acceptsReservations?: boolean;
    reservationUrl?: string;
    menuUrl?: string;
    orderUrl?: string;
    paymentAccepted?: string[];
    parkingInfo?: string;
  };
}

interface OpeningHours {
  dayOfWeek: string | string[];
  opens: string;
  closes: string;
}

export function RestaurantStructuredData({ restaurant }: RestaurantStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `https://opentable-clone.vercel.app/restaurants/${restaurant.id}`,
    name: restaurant.name,
    description: restaurant.description,
    image: restaurant.images?.length ? restaurant.images : restaurant.imageUrl,
    url: `https://opentable-clone.vercel.app/restaurants/${restaurant.id}`,
    telephone: restaurant.phone,
    email: restaurant.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant.address.street,
      addressLocality: restaurant.address.city,
      addressRegion: restaurant.address.state,
      postalCode: restaurant.address.zipCode,
      addressCountry: restaurant.address.country,
    },
    ...(restaurant.coordinates && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: restaurant.coordinates.latitude,
        longitude: restaurant.coordinates.longitude,
      },
    }),
    priceRange: restaurant.priceRange,
    servesCuisine: restaurant.cuisineTypes,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: restaurant.rating.toFixed(1),
      bestRating: '5',
      worstRating: '1',
      reviewCount: restaurant.reviewCount,
    },
    openingHoursSpecification: restaurant.openingHours.map((hours) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: hours.dayOfWeek,
      opens: hours.opens,
      closes: hours.closes,
    })),
    acceptsReservations: restaurant.acceptsReservations ?? true,
    ...(restaurant.reservationUrl && {
      potentialAction: {
        '@type': 'ReserveAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: restaurant.reservationUrl,
          actionPlatform: [
            'http://schema.org/DesktopWebPlatform',
            'http://schema.org/MobileWebPlatform',
          ],
        },
        result: {
          '@type': 'Reservation',
          name: 'Table Reservation',
        },
      },
    }),
    ...(restaurant.menuUrl && {
      hasMenu: {
        '@type': 'Menu',
        url: restaurant.menuUrl,
      },
    }),
    ...(restaurant.paymentAccepted && {
      paymentAccepted: restaurant.paymentAccepted.join(', '),
    }),
    ...(restaurant.features && {
      amenityFeature: restaurant.features.map((feature) => ({
        '@type': 'LocationFeatureSpecification',
        name: feature,
        value: true,
      })),
    }),
    ...(restaurant.parkingInfo && {
      publicAccess: true,
      smokingAllowed: false,
    }),
  };

  return (
    <Script
      id={`restaurant-schema-${restaurant.id}`}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Breadcrumb Structured Data
 * For restaurant detail pages
 */
export interface BreadcrumbStructuredDataProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export function BreadcrumbStructuredData({ items }: BreadcrumbStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Review Structured Data
 * For individual review items
 */
export interface ReviewStructuredDataProps {
  review: {
    id: string;
    authorName: string;
    datePublished: string;
    rating: number;
    reviewBody: string;
    restaurantName: string;
    restaurantId: string;
  };
}

export function ReviewStructuredData({ review }: ReviewStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    '@id': `https://opentable-clone.vercel.app/restaurants/${review.restaurantId}/reviews/${review.id}`,
    author: {
      '@type': 'Person',
      name: review.authorName,
    },
    datePublished: review.datePublished,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.reviewBody,
    itemReviewed: {
      '@type': 'Restaurant',
      name: review.restaurantName,
      '@id': `https://opentable-clone.vercel.app/restaurants/${review.restaurantId}`,
    },
  };

  return (
    <Script
      id={`review-schema-${review.id}`}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * FAQ Structured Data
 * For restaurant FAQ sections
 */
export interface FAQStructuredDataProps {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export function FAQStructuredData({ questions }: FAQStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Event Structured Data
 * For restaurant events (wine tastings, special dinners, etc.)
 */
export interface EventStructuredDataProps {
  event: {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate?: string;
    location: {
      name: string;
      address: string;
      city: string;
      state: string;
    };
    imageUrl?: string;
    price?: number;
    currency?: string;
    url: string;
    availableSeats?: number;
    organizer?: string;
  };
}

export function EventStructuredData({ event }: EventStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FoodEvent',
    '@id': event.url,
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    ...(event.endDate && { endDate: event.endDate }),
    location: {
      '@type': 'Restaurant',
      name: event.location.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location.address,
        addressLocality: event.location.city,
        addressRegion: event.location.state,
      },
    },
    ...(event.imageUrl && { image: event.imageUrl }),
    ...(event.price && {
      offers: {
        '@type': 'Offer',
        price: event.price,
        priceCurrency: event.currency || 'USD',
        availability: event.availableSeats
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
        url: event.url,
      },
    }),
    ...(event.organizer && {
      organizer: {
        '@type': 'Organization',
        name: event.organizer,
      },
    }),
  };

  return (
    <Script
      id={`event-schema-${event.id}`}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Menu Structured Data
 * For restaurant menus
 */
export interface MenuStructuredDataProps {
  menu: {
    restaurantId: string;
    restaurantName: string;
    sections: Array<{
      name: string;
      description?: string;
      items: Array<{
        name: string;
        description?: string;
        price: number;
        currency?: string;
        image?: string;
        dietaryInfo?: string[];
      }>;
    }>;
  };
}

export function MenuStructuredData({ menu }: MenuStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `https://opentable-clone.vercel.app/restaurants/${menu.restaurantId}/menu`,
    name: `${menu.restaurantName} Menu`,
    hasMenuSection: menu.sections.map((section) => ({
      '@type': 'MenuSection',
      name: section.name,
      description: section.description,
      hasMenuItem: section.items.map((item) => ({
        '@type': 'MenuItem',
        name: item.name,
        description: item.description,
        offers: {
          '@type': 'Offer',
          price: item.price,
          priceCurrency: item.currency || 'USD',
        },
        ...(item.image && { image: item.image }),
        ...(item.dietaryInfo && {
          suitableForDiet: item.dietaryInfo.map((diet) => `https://schema.org/${diet}`),
        }),
      })),
    })),
  };

  return (
    <Script
      id={`menu-schema-${menu.restaurantId}`}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Search Action Structured Data
 * Enables sitelinks search box in Google
 */
export function SearchActionStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: 'https://opentable-clone.vercel.app',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://opentable-clone.vercel.app/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Script
      id="search-action-schema"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Reservation Action Structured Data
 * For reservation confirmation pages
 */
export interface ReservationStructuredDataProps {
  reservation: {
    id: string;
    confirmationNumber: string;
    restaurantName: string;
    restaurantId: string;
    dateTime: string;
    partySize: number;
    customerName: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled';
  };
}

export function ReservationStructuredData({ reservation }: ReservationStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishmentReservation',
    reservationId: reservation.confirmationNumber,
    reservationStatus: `https://schema.org/Reservation${reservation.status}`,
    underName: {
      '@type': 'Person',
      name: reservation.customerName,
    },
    reservationFor: {
      '@type': 'FoodEstablishment',
      name: reservation.restaurantName,
      '@id': `https://opentable-clone.vercel.app/restaurants/${reservation.restaurantId}`,
    },
    startTime: reservation.dateTime,
    partySize: reservation.partySize,
  };

  return (
    <Script
      id={`reservation-schema-${reservation.id}`}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

