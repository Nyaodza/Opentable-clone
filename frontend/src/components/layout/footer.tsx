'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubscribing(true);
    
    // Simulate newsletter subscription
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubscriptionStatus('success');
      setEmail('');
      setTimeout(() => setSubscriptionStatus('idle'), 3000);
    } catch (error) {
      setSubscriptionStatus('error');
      setTimeout(() => setSubscriptionStatus('idle'), 3000);
    } finally {
      setIsSubscribing(false);
    }
  };
  const footerSections = [
    {
      title: 'Discover',
      links: [
        { href: '/restaurants', label: 'Browse Restaurants' },
        { href: '/delivery', label: 'Food Delivery' },
        { href: '/cities', label: 'Popular Cities' },
        { href: '/cuisines', label: 'Browse by Cuisine' },
        { href: '/deals', label: 'Special Offers' },
        { href: '/gift-cards', label: 'Gift Cards' },
      ],
    },
    {
      title: 'OpenTable',
      links: [
        { href: '/about', label: 'About Us' },
        { href: '/careers', label: 'Careers' },
        { href: '/press', label: 'Press' },
        { href: '/contact', label: 'Contact Us' },
        { href: '/blog', label: 'Blog' },
      ],
    },
    {
      title: 'Restaurants',
      links: [
        { href: '/for-restaurants', label: 'Join OpenTable' },
        { href: '/restaurant-login', label: 'Restaurant Login' },
        { href: '/restaurant-support', label: 'Restaurant Support' },
        { href: '/restaurant-success', label: 'Success Stories' },
      ],
    },
    {
      title: 'Drivers',
      links: [
        { href: '/driver', label: 'Driver Dashboard' },
        { href: '/driver/apply', label: 'Become a Driver' },
        { href: '/driver/support', label: 'Driver Support' },
        { href: '/driver/earnings', label: 'Driver Earnings' },
      ],
    },
    {
      title: 'More',
      links: [
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Use' },
        { href: '/cookies', label: 'Cookie Policy' },
        { href: '/help', label: 'Help Center' },
        { href: '/sitemap', label: 'Sitemap' },
      ],
    },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Footer sections */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter signup */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-white font-semibold mb-2">Subscribe to our newsletter</h3>
              <p className="text-sm">Get the latest deals and updates from OpenTable Clone</p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-600 text-white"
              />
              <button
                type="submit"
                disabled={isSubscribing}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isSubscribing
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isSubscribing ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
            {subscriptionStatus === 'success' && (
              <p className="text-green-400 text-sm mt-2">✓ Successfully subscribed to our newsletter!</p>
            )}
            {subscriptionStatus === 'error' && (
              <p className="text-red-400 text-sm mt-2">✗ Something went wrong. Please try again.</p>
            )}
          </div>
        </div>

        {/* Social links and bottom info */}
        <div className="border-t border-gray-800 pt-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-bold text-white">OpenTable</span>
                <span className="text-2xl font-light text-gray-400 ml-1">Clone</span>
              </Link>
            </div>
            
            {/* Social Media Links */}
            <div className="flex space-x-4 mb-4 md:mb-0">
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors cursor-pointer" aria-label="Facebook" title="Coming soon">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors cursor-pointer" aria-label="Twitter" title="Coming soon">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors cursor-pointer" aria-label="Instagram" title="Coming soon">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                </svg>
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors cursor-pointer" aria-label="LinkedIn" title="Coming soon">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
          
          {/* Language selector and copyright */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-gray-300 focus:outline-none focus:border-red-600">
                <option>English</option>
                <option>Español</option>
                <option>Français</option>
                <option>Deutsch</option>
                <option>日本語</option>
              </select>
              <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-gray-300 focus:outline-none focus:border-red-600">
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>GBP (£)</option>
                <option>JPY (¥)</option>
              </select>
            </div>
            <div>
              <p>© 2025 OpenTable Clone. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}