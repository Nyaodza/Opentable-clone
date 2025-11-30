import { getServerSideSitemap } from 'next-sitemap';

export async function GET() {
  const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://opentable-clone.vercel.app';

  const fields: { loc: string; lastmod: string; changefreq?: string; priority?: number }[] = [];

  try {
    // Fetch restaurants for dynamic sitemap
    const response = await fetch(`${API_URL}/api/restaurants?limit=1000`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (response.ok) {
      const data = await response.json();
      const restaurants = data.data?.restaurants || data.restaurants || [];

      restaurants.forEach((restaurant: { id: string; updatedAt?: string }) => {
        fields.push({
          loc: `${SITE_URL}/restaurants/${restaurant.id}`,
          lastmod: restaurant.updatedAt || new Date().toISOString(),
          changefreq: 'daily',
          priority: 0.9,
        });
      });
    }
  } catch (error) {
    console.warn('Failed to fetch restaurants for sitemap:', error);
  }

  // Add static popular pages
  const staticPages = [
    { path: '/', priority: 1.0, changefreq: 'daily' },
    { path: '/restaurants', priority: 0.9, changefreq: 'daily' },
    { path: '/cuisines', priority: 0.8, changefreq: 'weekly' },
    { path: '/cities', priority: 0.8, changefreq: 'weekly' },
    { path: '/deals', priority: 0.7, changefreq: 'daily' },
    { path: '/about', priority: 0.5, changefreq: 'monthly' },
    { path: '/contact', priority: 0.5, changefreq: 'monthly' },
    { path: '/help', priority: 0.6, changefreq: 'monthly' },
    { path: '/for-restaurants', priority: 0.7, changefreq: 'monthly' },
    { path: '/gift-cards', priority: 0.6, changefreq: 'monthly' },
    { path: '/careers', priority: 0.5, changefreq: 'monthly' },
  ];

  staticPages.forEach((page) => {
    fields.push({
      loc: `${SITE_URL}${page.path}`,
      lastmod: new Date().toISOString(),
      changefreq: page.changefreq,
      priority: page.priority,
    });
  });

  // Add cuisine pages
  const cuisines = [
    'italian', 'french', 'japanese', 'american', 'indian', 'mexican',
    'chinese', 'thai', 'mediterranean', 'seafood', 'steakhouse', 'pizza'
  ];

  cuisines.forEach((cuisine) => {
    fields.push({
      loc: `${SITE_URL}/cuisines/${cuisine}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
    });
  });

  // Add city pages
  const cities = [
    'new-york', 'los-angeles', 'chicago', 'san-francisco', 'miami',
    'seattle', 'boston', 'austin', 'denver', 'philadelphia'
  ];

  cities.forEach((city) => {
    fields.push({
      loc: `${SITE_URL}/cities/${city}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
    });
  });

  return getServerSideSitemap(fields);
}


