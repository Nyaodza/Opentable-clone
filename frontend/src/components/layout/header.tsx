'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

// Mock user for demo - in production, this would come from auth context
const useMockAuth = () => {
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);
  
  useEffect(() => {
    // Check localStorage for demo login state
    const savedUser = localStorage.getItem('demo_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);
  
  const login = (userData: { name: string; email: string }) => {
    localStorage.setItem('demo_user', JSON.stringify(userData));
    setUser(userData);
  };
  
  const logout = () => {
    localStorage.removeItem('demo_user');
    setUser(null);
  };
  
  return { user, login, logout };
};

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useMockAuth();

  const navLinks = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/restaurants', label: 'Restaurants', icon: '🍽️' },
    { href: '/delivery', label: 'Delivery', icon: '🛵' },
    { href: '/reservations', label: 'Reservations', icon: '📅' },
    { href: '/favorites', label: 'Favorites', icon: '❤️' },
  ];

  const userMenuLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/profile', label: 'My Profile', icon: '👤' },
    { href: '/reservations', label: 'My Reservations', icon: '📅' },
    { href: '/favorites', label: 'Favorites', icon: '❤️' },
    { href: '/rewards', label: 'Rewards', icon: '🎁' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSearchResults([]);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mock search functionality
  useEffect(() => {
    if (searchQuery.length > 2) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setSearchResults([
          { id: '1', name: 'The Modern Bistro', type: 'restaurant', cuisine: 'French' },
          { id: '2', name: 'Sakura Sushi House', type: 'restaurant', cuisine: 'Japanese' },
          { id: '3', name: 'Italian cuisine', type: 'cuisine' },
        ].filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        ));
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const isActive = (href: string) => pathname === href;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/restaurants?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-red-600">OpenTable</span>
              <span className="text-2xl font-light text-gray-600 ml-1 hidden sm:inline">Clone</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-red-600 flex items-center gap-1.5 py-1 ${
                  isActive(link.href)
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-700'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            {/* Search Button / Search Bar */}
            <div ref={searchRef} className="relative">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Search Dropdown */}
              {isSearchOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-fadeIn">
                  <form onSubmit={handleSearch} className="p-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search restaurants, cuisines..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        autoFocus
                      />
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </form>

                  {/* Search Results */}
                  {isSearching && (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                      <div className="animate-spin w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                  )}

                  {searchResults.length > 0 && !isSearching && (
                    <div className="border-t border-gray-100">
                      {searchResults.map((result) => (
                        <Link
                          key={result.id}
                          href={result.type === 'restaurant' ? `/restaurants/${result.id}` : `/restaurants?cuisine=${result.name}`}
                          className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          <span className="text-xl mr-3">
                            {result.type === 'restaurant' ? '🍽️' : '🏷️'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{result.name}</p>
                            <p className="text-xs text-gray-500">{result.cuisine || 'Browse cuisine'}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Quick Links */}
                  <div className="border-t border-gray-100 p-3 bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 mb-2">Popular Searches</p>
                    <div className="flex flex-wrap gap-2">
                      {['Italian', 'Japanese', 'Mexican', 'Brunch'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            router.push(`/restaurants?cuisine=${tag}`);
                            setIsSearchOpen(false);
                          }}
                          className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications - Only show if logged in */}
            {user && (
              <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors relative hidden sm:block">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
            )}

            {/* User Menu or Auth Buttons */}
            {user ? (
              <div ref={userMenuRef} className="relative hidden md:block">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden lg:inline">{user.name.split(' ')[0]}</span>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-fadeIn">
                    <div className="p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-white/80">{user.email}</p>
                    </div>
                    
                    <div className="p-2">
                      {userMenuLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <span className="mr-3 text-base">{link.icon}</span>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-100 p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <span className="mr-3">🚪</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm hover:shadow"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-700 hover:text-red-600 hover:bg-gray-100 transition-colors"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 animate-fadeIn">
            {/* Mobile Search */}
            <div className="p-4 border-b border-gray-100">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </form>
            </div>

            {/* User Info - Mobile */}
            {user && (
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="px-2 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive(link.href)
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mr-3 text-lg">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>

            {/* User Menu Links - Mobile */}
            {user && (
              <div className="px-2 py-3 border-t border-gray-100">
                <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Account</p>
                {userMenuLinks.slice(0, 4).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="mr-3 text-lg">{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Auth Buttons - Mobile */}
            <div className="p-4 border-t border-gray-100 space-y-2">
              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-lg text-base font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <span className="mr-2">🚪</span>
                  Sign Out
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block w-full text-center px-4 py-3 rounded-lg text-base font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="block w-full text-center px-4 py-3 rounded-lg text-base font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}