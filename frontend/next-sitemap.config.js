/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://opentable-clone.vercel.app',
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  sitemapSize: 7000,
  changefreq: 'daily',
  priority: 0.7,
  exclude: [
    '/api/*',
    '/admin/*',
    '/dashboard/*',
    '/restaurant-owner/*',
    '/auth/*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/profile/*',
    '/reservations/*',
    '/favorites/*',
    '/server-sitemap.xml', // Excluded as it's generated dynamically
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/restaurant-owner/',
          '/auth/',
          '/login',
          '/register',
          '/profile/',
          '/reservations/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        crawlDelay: 0,
      },
      {
        userAgent: ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot'],
        disallow: '/',
      },
    ],
    additionalSitemaps: [
      `${process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://opentable-clone.vercel.app'}/server-sitemap.xml`, // Dynamic routes
      `${process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://opentable-clone.vercel.app'}/restaurant-sitemap.xml`, // Restaurant-specific
    ],
  },
  transform: async (config, path) => {
    // Custom priority and change frequency for specific pages
    const customConfig = {
      '/': { priority: 1.0, changefreq: 'daily' },
      '/restaurants': { priority: 0.9, changefreq: 'daily' },
      '/search': { priority: 0.9, changefreq: 'hourly' },
      '/cuisines': { priority: 0.8, changefreq: 'weekly' },
      '/cities': { priority: 0.8, changefreq: 'weekly' },
      '/deals': { priority: 0.7, changefreq: 'daily' },
      '/about': { priority: 0.5, changefreq: 'monthly' },
      '/contact': { priority: 0.5, changefreq: 'monthly' },
      '/help': { priority: 0.6, changefreq: 'monthly' },
      '/privacy': { priority: 0.4, changefreq: 'yearly' },
      '/terms': { priority: 0.4, changefreq: 'yearly' },
    };

    const custom = customConfig[path];
    
    return {
      loc: path,
      changefreq: custom?.changefreq || config.changefreq,
      priority: custom?.priority || config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    };
  },
  additionalPaths: async (config) => {
    const result = [];

    try {
      const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Fetch restaurants for dynamic sitemap
      try {
        const restaurantsResponse = await fetch(`${API_URL}/api/restaurants?limit=1000`);
        if (restaurantsResponse.ok) {
          const data = await restaurantsResponse.json();
          const restaurants = data.data?.restaurants || data.restaurants || [];
          
          restaurants.forEach(restaurant => {
            result.push({
              loc: `/restaurants/${restaurant.id}`,
              changefreq: 'daily',
              priority: 0.9,
              lastmod: restaurant.updatedAt || new Date().toISOString(),
            });
          });
        }
      } catch (error) {
        console.warn('Failed to fetch restaurants for sitemap:', error);
      }

      // Add popular cuisine categories
      const cuisines = [
        'italian', 'french', 'japanese', 'american', 'indian', 'mexican', 
        'chinese', 'thai', 'mediterranean', 'seafood', 'steakhouse', 'pizza'
      ];
      
      cuisines.forEach(cuisine => {
        result.push({
          loc: `/cuisines/${cuisine}`,
          changefreq: 'weekly',
          priority: 0.8,
        });
      });

      // Add major cities
      const cities = [
        'new-york', 'los-angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
        'san-antonio', 'san-diego', 'dallas', 'san-jose', 'austin', 'jacksonville',
        'fort-worth', 'columbus', 'charlotte', 'san-francisco', 'indianapolis',
        'seattle', 'denver', 'washington-dc', 'boston', 'nashville', 'detroit',
        'oklahoma-city', 'portland', 'las-vegas', 'memphis', 'louisville', 'baltimore'
      ];
      
      cities.forEach(city => {
        result.push({
          loc: `/cities/${city}`,
          changefreq: 'weekly',
          priority: 0.8,
        });
      });

      // Add special pages
      const specialPages = [
        { loc: '/deals', priority: 0.7, changefreq: 'daily' },
        { loc: '/gift-cards', priority: 0.6, changefreq: 'monthly' },
        { loc: '/for-restaurants', priority: 0.7, changefreq: 'monthly' },
        { loc: '/careers', priority: 0.5, changefreq: 'monthly' },
        { loc: '/press', priority: 0.4, changefreq: 'yearly' }
      ];
      
      specialPages.forEach(page => {
        result.push(page);
      });

    } catch (error) {
      console.warn('Error generating additional sitemap paths:', error);
    }

    return result;
  },
};
