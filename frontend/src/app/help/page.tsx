'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Reservations',
    question: 'How do I make a reservation?',
    answer: 'To make a reservation, search for restaurants in your area, select your preferred date, time, and party size, then choose from available time slots. Create an account or sign in to complete your booking.'
  },
  {
    category: 'Reservations',
    question: 'Can I modify or cancel my reservation?',
    answer: 'Yes! You can modify or cancel your reservation up to 2 hours before your scheduled time. Visit "My Reservations" in your account to make changes. Some restaurants may have specific cancellation policies.'
  },
  {
    category: 'Reservations',
    question: 'Is there a fee for making reservations?',
    answer: 'No, making reservations through OpenTable Clone is completely free for diners. Some special experiences or events may require deposits.'
  },
  {
    category: 'Account',
    question: 'How do I create an account?',
    answer: 'Click "Sign Up" in the top navigation bar. You can register with your email address or use social login options like Google, Facebook, or Apple.'
  },
  {
    category: 'Account',
    question: 'I forgot my password. How can I reset it?',
    answer: 'Click "Sign In" then "Forgot your password?" Enter your email address and we\'ll send you a link to reset your password.'
  },
  {
    category: 'Account',
    question: 'How do I update my profile information?',
    answer: 'Sign in to your account and go to "Account Settings" where you can update your personal information, dining preferences, and notification settings.'
  },
  {
    category: 'Restaurants',
    question: 'How are restaurants rated?',
    answer: 'Restaurant ratings are based on verified diner reviews. Only diners who have honored their reservations can leave reviews, ensuring authentic feedback.'
  },
  {
    category: 'Restaurants',
    question: 'Can I request special accommodations?',
    answer: 'Yes! When making a reservation, you can add special requests in the notes section. This might include dietary restrictions, accessibility needs, or celebration occasions.'
  },
  {
    category: 'Payment',
    question: 'When do I pay for my meal?',
    answer: 'You pay for your meal directly at the restaurant. OpenTable Clone only handles reservations. Some special events may require prepayment or deposits.'
  },
  {
    category: 'Payment',
    question: 'Are deposits refundable?',
    answer: 'Deposit policies vary by restaurant and event. Generally, deposits are refundable if you cancel within the restaurant\'s cancellation window.'
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const categories = ['All', ...Array.from(new Set(faqs.map(faq => faq.category)))];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-lg text-gray-600">Find answers to common questions or contact our support team</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
              <nav className="space-y-2">
                <Link href="/help" className="block text-red-600 hover:text-red-700">
                  FAQs
                </Link>
                <Link href="/contact" className="block text-red-600 hover:text-red-700">
                  Contact Support
                </Link>
                <Link href="/privacy" className="block text-red-600 hover:text-red-700">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="block text-red-600 hover:text-red-700">
                  Terms of Service
                </Link>
              </nav>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Need More Help?</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-gray-600">support@opentableclone.com</p>
                </div>
                <div>
                  <p className="font-medium">Phone Support</p>
                  <p className="text-gray-600">1-800-DINE-OUT</p>
                  <p className="text-gray-500">Mon-Fri 9AM-6PM EST</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Search for help..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
                {filteredFAQs.length > 0 ? (
                  <div className="space-y-4">
                    {filteredFAQs.map((faq, index) => (
                      <div key={index} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                        <button
                          onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                          className="w-full text-left flex items-start justify-between py-2"
                        >
                          <div>
                            <span className="text-xs text-red-600 font-medium">{faq.category}</span>
                            <h3 className="font-medium text-gray-900">{faq.question}</h3>
                          </div>
                          <span className="ml-4 flex-shrink-0">
                            {openFAQ === index ? '−' : '+'}
                          </span>
                        </button>
                        {openFAQ === index && (
                          <p className="mt-2 text-gray-600 text-sm">{faq.answer}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No FAQs found matching your search.</p>
                )}
              </div>
            </div>

            {/* Still Need Help */}
            <div className="mt-8 bg-red-50 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Still need help?</h3>
              <p className="text-gray-600 mb-4">
                Our support team is here to assist you with any questions or issues.
              </p>
              <Link
                href="/contact"
                className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}