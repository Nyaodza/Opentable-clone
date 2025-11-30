import Script from 'next/script';
import { NextSeo, NextSeoProps } from 'next-seo';

interface SEOHeadProps extends NextSeoProps {
  structuredData?: object;
  breadcrumbs?: Array<{
    name: string;
    url: string;
  }>;
  restaurant?: {
    name: string;
    cuisine: string;
    priceRange: string;
    rating: number;
    address: string;
    phone: string;
  };
}

export function SEOHead({ 
  structuredData, 
  breadcrumbs, 
  restaurant,
  ...seoProps 
}: SEOHeadProps) {
  const generateStructuredData = () => {
    const baseData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'OpenTable Clone - Restaurant Reservations',
      url: process.env.NEXT_PUBLIC_SITE_URL || 'https://opentable-clone.vercel.app',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://opentable-clone.vercel.app'}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    const schemas: Record<string, unknown>[] = [baseData];

    // Add restaurant schema if provided
    if (restaurant) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name: restaurant.name,
        servesCuisine: restaurant.cuisine,
        priceRange: restaurant.priceRange,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: restaurant.rating,
          bestRating: 5,
          worstRating: 1,
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: restaurant.address,
        },
        telephone: restaurant.phone,
        acceptsReservations: true,
      });
    }

    // Add breadcrumb schema if provided
    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      });
    }

    // Add custom structured data
    if (structuredData) {
      schemas.push(structuredData as Record<string, unknown>);
    }

    return schemas;
  };

  const defaultSEO = {
    title: 'OpenTable Clone - Restaurant Reservations & Dining',
    description: 'Discover and book the best restaurants with our revolutionary platform featuring blockchain loyalty, VR dining experiences, and AI-powered concierge service.',
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: process.env.NEXT_PUBLIC_SITE_URL || 'https://opentable-clone.vercel.app',
      site_name: 'OpenTable Clone',
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://opentable-clone.vercel.app'}/images/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: 'OpenTable Clone - Restaurant Reservations',
        },
      ],
    },
    twitter: {
      handle: '@opentableclone',
      site: '@opentableclone',
      cardType: 'summary_large_image',
    },
    additionalMetaTags: [
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'theme-color',
        content: '#000000',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
      {
        name: 'format-detection',
        content: 'telephone=no',
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'msapplication-TileColor',
        content: '#000000',
      },
      {
        name: 'msapplication-tap-highlight',
        content: 'no',
      },
    ],
    additionalLinkTags: [
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        href: '/icons/apple-touch-icon.png',
        sizes: '180x180',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
    ],
  };

  const mergedSEO = {
    ...defaultSEO,
    ...seoProps,
    openGraph: {
      ...defaultSEO.openGraph,
      ...seoProps.openGraph,
    },
  };

  return (
    <>
      <NextSeo {...mergedSEO} />
      <Script
        id="seo-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData()),
        }}
      />
    </>
  );
}
