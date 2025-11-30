import React from 'react';
import Link from 'next/link';

const supportCategories = [
  {
    title: 'Getting Started',
    description: 'New to OpenTable Clone? Learn the basics',
    icon: '🚀',
    articles: [
      'Setting up your restaurant profile',
      'Adding your menu and photos',
      'Configuring reservation settings',
      'Understanding your dashboard'
    ]
  },
  {
    title: 'Reservation Management',
    description: 'Manage bookings and customer requests',
    icon: '📅',
    articles: [
      'Handling reservation requests',
      'Managing no-shows and cancellations',
      'Setting availability and capacity',
      'Using the reservation calendar'
    ]
  },
  {
    title: 'Customer Reviews',
    description: 'Respond to and manage customer feedback',
    icon: '⭐',
    articles: [
      'Responding to customer reviews',
      'Encouraging positive reviews',
      'Handling negative feedback',
      'Review response best practices'
    ]
  },
  {
    title: 'Analytics & Reports',
    description: 'Understand your restaurant performance',
    icon: '📊',
    articles: [
      'Reading your analytics dashboard',
      'Understanding booking trends',
      'Tracking customer demographics',
      'Exporting reports and data'
    ]
  },
  {
    title: 'Account & Billing',
    description: 'Manage your subscription and payments',
    icon: '💳',
    articles: [
      'Updating payment information',
      'Understanding your bill',
      'Changing subscription plans',
      'Managing multiple locations'
    ]
  },
  {
    title: 'Technical Support',
    description: 'Troubleshoot technical issues',
    icon: '🔧',
    articles: [
      'Common login issues',
      'Browser compatibility',
      'Mobile app support',
      'API integration help'
    ]
  }
];

const quickActions = [
  {
    title: 'Submit a Support Ticket',
    description: 'Get personalized help from our support team',
    icon: '🎫',
    action: 'Create Ticket',
    link: '/restaurant-support/ticket'
  },
  {
    title: 'Schedule a Call',
    description: 'Book a one-on-one session with our experts',
    icon: '📞',
    action: 'Book Call',
    link: '/restaurant-support/schedule'
  },
  {
    title: 'Live Chat Support',
    description: 'Chat with our team in real-time',
    icon: '💬',
    action: 'Start Chat',
    link: '#chat'
  },
  {
    title: 'Video Tutorials',
    description: 'Watch step-by-step guides',
    icon: '🎥',
    action: 'Watch Now',
    link: '/restaurant-support/videos'
  }
];

const faqs = [
  {
    question: 'How do I add my restaurant to OpenTable Clone?',
    answer: 'You can sign up for a restaurant account on our "For Restaurants" page. Our onboarding team will guide you through the setup process.'
  },
  {
    question: 'What are the fees for using OpenTable Clone?',
    answer: 'We offer transparent pricing with no hidden fees. View our pricing plans on the For Restaurants page.'
  },
  {
    question: 'Can I manage multiple restaurant locations?',
    answer: 'Yes, our Enterprise plan supports multiple locations with centralized management and individual location analytics.'
  },
  {
    question: 'How do I handle no-shows and cancellations?',
    answer: 'You can set cancellation policies and no-show fees in your restaurant settings. Our system helps track and manage these automatically.'
  },
  {
    question: 'Is there 24/7 support available?',
    answer: 'Yes, we offer 24/7 support for urgent reservation-related issues. General support is available during business hours.'
  }
];

export default function RestaurantSupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Restaurant Support Center</h1>
          <p className="text-lg text-gray-600">
            Get the help you need to succeed with OpenTable Clone
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for help articles, guides, and FAQs..."
              className="w-full px-6 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
              Search
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Get Help Fast</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.link}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-center"
              >
                <div className="text-4xl mb-3">{action.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{action.description}</p>
                <span className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  {action.action}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Support Categories */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Browse Help Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supportCategories.map((category, index) => (
              <div key={index} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">{category.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {category.articles.map((article, articleIndex) => (
                    <li key={articleIndex}>
                      <Link
                        href={`/restaurant-support/article/${article.toLowerCase().replace(/\s+/g, '-')}`}
                        className="text-sm text-red-600 hover:text-red-700 hover:underline"
                      >
                        {article}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Information */}
        <section className="mb-16 bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold mb-6">Contact Our Support Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl mb-3">📞</div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
              <p className="text-gray-600 text-sm mb-2">Monday - Friday, 6 AM - 10 PM PST</p>
              <a href="tel:1-800-RESTAURANT" className="text-red-600 hover:text-red-700 font-medium">
                1-800-RESTAURANT
              </a>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">✉️</div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
              <p className="text-gray-600 text-sm mb-2">We respond within 2 hours</p>
              <a href="mailto:restaurants@opentableclone.com" className="text-red-600 hover:text-red-700 font-medium">
                restaurants@opentableclone.com
              </a>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
              <p className="text-gray-600 text-sm mb-2">Available 24/7 for urgent issues</p>
              <button className="text-red-600 hover:text-red-700 font-medium">
                Start Live Chat
              </button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
          <div className="bg-white rounded-lg shadow">
            {faqs.map((faq, index) => (
              <div key={index} className={`p-6 ${index !== faqs.length - 1 ? 'border-b border-gray-200' : ''}`}>
                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Resources */}
        <section className="mb-16 bg-red-50 rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Additional Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">📚 Restaurant Best Practices Guide</h3>
              <p className="text-gray-600 text-sm mb-3">
                Learn industry best practices for managing reservations and customer experience.
              </p>
              <Link href="/resources/best-practices" className="text-red-600 hover:text-red-700 text-sm font-medium">
                Download Guide →
              </Link>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">🎯 Marketing Toolkit</h3>
              <p className="text-gray-600 text-sm mb-3">
                Access marketing materials and tips to promote your restaurant online.
              </p>
              <Link href="/resources/marketing" className="text-red-600 hover:text-red-700 text-sm font-medium">
                Get Marketing Kit →
              </Link>
            </div>
          </div>
        </section>

        {/* Community */}
        <section className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Join the Restaurant Community</h2>
          <p className="text-gray-600 mb-6">
            Connect with other restaurant owners and share experiences in our community forum.
          </p>
          <Link
            href="/restaurant-community"
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Join Community Forum
          </Link>
        </section>
      </div>
    </div>
  );
}