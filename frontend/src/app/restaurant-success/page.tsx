import React from 'react';
import Link from 'next/link';

const successStories = [
  {
    id: '1',
    restaurantName: 'Bella Vista Italian',
    ownerName: 'Maria Santos',
    location: 'San Francisco, CA',
    cuisine: 'Italian',
    image: '/images/restaurant-success-1.jpg',
    quote: 'OpenTable Clone helped us increase our reservations by 300% in just 6 months. The platform is easy to use and our customers love the convenience.',
    results: {
      reservationIncrease: '300%',
      revenueGrowth: '45%',
      noShowReduction: '60%',
      timeframe: '6 months'
    },
    challenges: [
      'Low online visibility',
      'High no-show rates',
      'Manual reservation management'
    ],
    solutions: [
      'Featured restaurant listings',
      'Automated confirmation system',
      'Integrated reservation management'
    ]
  },
  {
    id: '2',
    restaurantName: 'The Corner Bistro',
    ownerName: 'James Mitchell',
    location: 'New York, NY',
    cuisine: 'American',
    image: '/images/restaurant-success-2.jpg',
    quote: 'The analytics dashboard gives us incredible insights into our customers. We can now make data-driven decisions about our menu and operations.',
    results: {
      reservationIncrease: '200%',
      revenueGrowth: '35%',
      customerRetention: '80%',
      timeframe: '8 months'
    },
    challenges: [
      'Lack of customer data',
      'Inefficient table management',
      'Limited marketing reach'
    ],
    solutions: [
      'Customer analytics dashboard',
      'Smart table management',
      'Promotional tools and marketing'
    ]
  },
  {
    id: '3',
    restaurantName: 'Sakura Sushi',
    ownerName: 'Hiroshi Tanaka',
    location: 'Los Angeles, CA',
    cuisine: 'Japanese',
    image: '/images/restaurant-success-3.jpg',
    quote: 'As a small family restaurant, we needed help reaching new customers. OpenTable Clone connected us with food lovers who appreciate authentic Japanese cuisine.',
    results: {
      reservationIncrease: '250%',
      newCustomers: '70%',
      avgBookingValue: '+25%',
      timeframe: '4 months'
    },
    challenges: [
      'Limited customer base',
      'Competition from chains',
      'Language barriers'
    ],
    solutions: [
      'Diverse customer network',
      'Cuisine-based discovery',
      'Multilingual support'
    ]
  }
];

const metrics = [
  {
    title: 'Average Revenue Increase',
    value: '40%',
    description: 'Restaurant partners see significant revenue growth within the first year',
    icon: '📈'
  },
  {
    title: 'Reduction in No-Shows',
    value: '65%',
    description: 'Our confirmation system dramatically reduces no-show rates',
    icon: '✅'
  },
  {
    title: 'New Customer Discovery',
    value: '60%',
    description: 'Of reservations come from new customers finding restaurants through our platform',
    icon: '👥'
  },
  {
    title: 'Time Saved Weekly',
    value: '15 hrs',
    description: 'Restaurant staff save time on reservation management and admin tasks',
    icon: '⏰'
  }
];

const testimonials = [
  {
    quote: 'OpenTable Clone transformed our business. We went from struggling to fill tables to being booked solid most nights.',
    author: 'Carlos Rodriguez',
    restaurant: 'El Corazón Mexican Grill',
    location: 'Austin, TX'
  },
  {
    quote: 'The customer support team is amazing. They helped us optimize our profile and taught us how to use all the features.',
    author: 'Sarah Kim',
    restaurant: 'Seoul Kitchen',
    location: 'Seattle, WA'
  },
  {
    quote: 'We love the detailed analytics. Understanding our peak times and customer preferences has helped us improve service.',
    author: 'Tony Romano',
    restaurant: 'Romano\'s Pizzeria',
    location: 'Chicago, IL'
  }
];

export default function RestaurantSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Restaurant Success Stories</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover how restaurants of all sizes are growing their business with OpenTable Clone. 
            Real stories from real restaurant owners.
          </p>
        </div>

        {/* Key Metrics */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-center mb-8">Success by the Numbers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {metrics.map((metric, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl mb-3">{metric.icon}</div>
                  <div className="text-3xl font-bold text-red-600 mb-2">{metric.value}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{metric.title}</h3>
                  <p className="text-gray-600 text-sm">{metric.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Detailed Success Stories */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">Featured Success Stories</h2>
          <div className="space-y-12">
            {successStories.map((story, index) => (
              <div key={story.id} className={`grid lg:grid-cols-2 gap-8 bg-white rounded-lg shadow-sm overflow-hidden ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
                {/* Image */}
                <div className={`bg-gray-300 h-64 lg:h-auto flex items-center justify-center ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                  <span className="text-gray-500 text-4xl">🍽️</span>
                </div>
                
                {/* Content */}
                <div className={`p-8 ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{story.restaurantName}</h3>
                    <div className="text-gray-600 mb-4">
                      <p className="font-medium">{story.ownerName}, Owner</p>
                      <p>{story.cuisine} • {story.location}</p>
                    </div>
                    <blockquote className="text-lg italic text-gray-700 border-l-4 border-red-600 pl-4">
                      "{story.quote}"
                    </blockquote>
                  </div>

                  {/* Results */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">{story.results.reservationIncrease}</div>
                      <div className="text-sm text-gray-600">Reservation Increase</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">{story.results.revenueGrowth || story.results.newCustomers || story.results.customerRetention}</div>
                      <div className="text-sm text-gray-600">
                        {story.results.revenueGrowth ? 'Revenue Growth' : 
                         story.results.newCustomers ? 'New Customers' : 'Customer Retention'}
                      </div>
                    </div>
                  </div>

                  {/* Challenges & Solutions */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Challenges</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {story.challenges.map((challenge, i) => (
                          <li key={i}>• {challenge}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Solutions</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {story.solutions.map((solution, i) => (
                          <li key={i}>• {solution}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Testimonials */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">What Restaurant Owners Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <blockquote className="text-gray-700 mb-4 italic">
                  "{testimonial.quote}"
                </blockquote>
                <div className="border-t pt-4">
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-600">{testimonial.restaurant}</p>
                  <p className="text-sm text-gray-500">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Industry Breakdown */}
        <section className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-center mb-8">Success Across All Restaurant Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl mb-3">🍕</div>
              <h3 className="font-semibold mb-2">Casual Dining</h3>
              <p className="text-sm text-gray-600">Family restaurants and casual chains see 35% average growth</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-3">🍾</div>
              <h3 className="font-semibold mb-2">Fine Dining</h3>
              <p className="text-sm text-gray-600">Upscale restaurants reduce no-shows by 70%</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-3">☕</div>
              <h3 className="font-semibold mb-2">Cafés & Bistros</h3>
              <p className="text-sm text-gray-600">Small establishments gain 60% more visibility</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-3">🌮</div>
              <h3 className="font-semibold mb-2">Ethnic Cuisine</h3>
              <p className="text-sm text-gray-600">Specialty restaurants discover new customer segments</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-red-50 rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">Ready to Write Your Success Story?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join thousands of successful restaurants using OpenTable Clone to grow their business. 
            Start your free trial today and see results within the first month.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/for-restaurants"
              className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Start Free Trial
            </Link>
            <Link
              href="/restaurant-support"
              className="border border-red-600 text-red-600 px-8 py-3 rounded-lg hover:bg-red-50 transition-colors font-medium"
            >
              Learn More
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            No setup fees • Cancel anytime • 24/7 support
          </p>
        </section>
      </div>
    </div>
  );
}