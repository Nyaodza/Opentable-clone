import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Restaurants - Browse & Book Tables',
  description: 'Discover and reserve tables at the best restaurants. Filter by cuisine, location, price range, and availability. Book instantly with real-time availability.',
  keywords: [
    'restaurants',
    'restaurant reservations',
    'book table',
    'dining',
    'restaurant finder',
    'table booking',
    'restaurant search',
  ],
  openGraph: {
    title: 'Find & Book Restaurants',
    description: 'Discover the best restaurants and book tables instantly',
    type: 'website',
    images: ['/og-restaurants.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find & Book Restaurants',
    description: 'Discover the best restaurants and book tables instantly',
  },
  alternates: {
    canonical: '/restaurants',
  },
};
