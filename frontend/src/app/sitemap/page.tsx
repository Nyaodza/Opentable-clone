import React from 'react';
import Link from 'next/link';

const sitemapSections = [
  {
    title: 'Main Pages',
    links: [
      { href: '/', label: 'Home' },
      { href: '/restaurants', label: 'Browse Restaurants' },
      { href: '/cities', label: 'Popular Cities' },
      { href: '/cuisines', label: 'Browse by Cuisine' },
      { href: '/deals', label: 'Special Offers' },
      { href: '/gift-cards', label: 'Gift Cards' },
    ]
  },
  {
    title: 'User Account',
    links: [
      { href: '/auth/login', label: 'Sign In' },
      { href: '/auth/register', label: 'Sign Up' },
      { href: '/reservations', label: 'My Reservations' },
      { href: '/favorites', label: 'Favorite Restaurants' },
    ]
  },
  {
    title: 'Company Information',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/careers', label: 'Careers' },
      { href: '/press', label: 'Press & Media' },
      { href: '/contact', label: 'Contact Us' },
      { href: '/blog', label: 'Blog' },
    ]
  },
  {
    title: 'Restaurant Partners',
    links: [
      { href: '/for-restaurants', label: 'Join OpenTable' },
      { href: '/restaurant-login', label: 'Restaurant Login' },
      { href: '/restaurant-support', label: 'Restaurant Support' },
      { href: '/restaurant-success', label: 'Success Stories' },
    ]
  },
  {
    title: 'Support & Help',
    links: [
      { href: '/help', label: 'Help Center' },
      { href: '/contact', label: 'Contact Support' },
    ]
  },
  {
    title: 'Legal & Privacy',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/cookies', label: 'Cookie Policy' },
    ]
  },
  {
    title: 'Popular Cities',
    links: [
      { href: '/restaurants?city=new-york', label: 'New York Restaurants' },
      { href: '/restaurants?city=los-angeles', label: 'Los Angeles Restaurants' },
      { href: '/restaurants?city=chicago', label: 'Chicago Restaurants' },
      { href: '/restaurants?city=san-francisco', label: 'San Francisco Restaurants' },
      { href: '/restaurants?city=boston', label: 'Boston Restaurants' },
      { href: '/restaurants?city=seattle', label: 'Seattle Restaurants' },
      { href: '/restaurants?city=miami', label: 'Miami Restaurants' },
      { href: '/restaurants?city=atlanta', label: 'Atlanta Restaurants' },
    ]
  },
  {
    title: 'Popular Cuisines',
    links: [
      { href: '/restaurants?cuisine=italian', label: 'Italian Restaurants' },
      { href: '/restaurants?cuisine=mexican', label: 'Mexican Restaurants' },
      { href: '/restaurants?cuisine=chinese', label: 'Chinese Restaurants' },
      { href: '/restaurants?cuisine=japanese', label: 'Japanese Restaurants' },
      { href: '/restaurants?cuisine=french', label: 'French Restaurants' },
      { href: '/restaurants?cuisine=indian', label: 'Indian Restaurants' },
      { href: '/restaurants?cuisine=thai', label: 'Thai Restaurants' },
      { href: '/restaurants?cuisine=american', label: 'American Restaurants' },
    ]
  }
];

export default function SitemapPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Sitemap</h1>
          <p className="text-lg text-gray-600">
            Find all pages and sections of OpenTable Clone in one place
          </p>
        </div>

        {/* Search */}
        <div className="max-w-lg mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Search pages..."
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Sitemap Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sitemapSections.map((section, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      href={link.href}
                      className="text-gray-700 hover:text-red-600 transition-colors text-sm block py-1"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Site Statistics</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Pages:</span>
                <span className="font-medium text-gray-900">25+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Restaurant Pages:</span>
                <span className="font-medium text-gray-900">Dynamic</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">City Pages:</span>
                <span className="font-medium text-gray-900">100+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cuisine Categories:</span>
                <span className="font-medium text-gray-900">30+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium text-gray-900">January 2025</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-gray-600 mb-4">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="space-y-3">
              <div>
                <Link
                  href="/help"
                  className="text-red-600 hover:text-red-700 font-medium block"
                >
                  Visit Help Center →
                </Link>
              </div>
              <div>
                <Link
                  href="/contact"
                  className="text-red-600 hover:text-red-700 font-medium block"
                >
                  Contact Support →
                </Link>
              </div>
              <div>
                <a
                  href="mailto:support@opentableclone.com"
                  className="text-red-600 hover:text-red-700 font-medium block"
                >
                  Email: support@opentableclone.com
                </a>
              </div>
              <div>
                <a
                  href="tel:1-800-DINE-OUT"
                  className="text-red-600 hover:text-red-700 font-medium block"
                >
                  Phone: 1-800-DINE-OUT
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* XML Sitemap */}
        <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">For Search Engines</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-2">
                Looking for our XML sitemap for search engine indexing?
              </p>
              <p className="text-sm text-gray-500">
                This file helps search engines like Google understand our site structure.
              </p>
            </div>
            <a
              href="/sitemap.xml"
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              View XML Sitemap
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            This sitemap is updated regularly to reflect new content and features.
            Last updated: January 19, 2025
          </p>
        </div>
      </div>
    </div>
  );
}