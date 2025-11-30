import React from 'react';
import Link from 'next/link';

const features = [
  {
    title: 'Easy Reservation Management',
    description: 'Manage all your reservations in one place with our intuitive dashboard',
    icon: '📅'
  },
  {
    title: 'Real-time Analytics',
    description: 'Get insights into your restaurant performance with detailed analytics',
    icon: '📊'
  },
  {
    title: 'Customer Reviews',
    description: 'Build your reputation with authentic customer reviews and ratings',
    icon: '⭐'
  },
  {
    title: 'Mobile Optimization',
    description: 'Manage your restaurant on-the-go with our mobile-optimized platform',
    icon: '📱'
  },
  {
    title: 'Marketing Tools',
    description: 'Promote your restaurant with special offers and featured listings',
    icon: '📢'
  },
  {
    title: '24/7 Support',
    description: 'Get help when you need it with our dedicated restaurant support team',
    icon: '🎧'
  }
];

const plans = [
  {
    name: 'Starter',
    price: 49,
    description: 'Perfect for small restaurants',
    features: [
      'Up to 100 reservations/month',
      'Basic analytics dashboard',
      'Email support',
      'Online reservation widget'
    ]
  },
  {
    name: 'Professional',
    price: 99,
    description: 'Ideal for growing businesses',
    features: [
      'Up to 500 reservations/month',
      'Advanced analytics & reporting',
      'Priority support',
      'Custom restaurant page',
      'Marketing tools',
      'Review management'
    ],
    popular: true
  },
  {
    name: 'Enterprise',
    price: 199,
    description: 'For high-volume restaurants',
    features: [
      'Unlimited reservations',
      'Full analytics suite',
      'Dedicated account manager',
      'Custom integrations',
      'API access',
      'White-label solutions'
    ]
  }
];

const testimonials = [
  {
    name: 'Maria Santos',
    restaurant: 'Bella Vista Italian',
    quote: 'OpenTable Clone has transformed how we manage reservations. Our no-show rate decreased by 40%!',
    rating: 5
  },
  {
    name: 'Chef David Kim',
    restaurant: 'Seoul Kitchen',
    quote: 'The analytics help us understand our customers better and optimize our operations.',
    rating: 5
  },
  {
    name: 'Jennifer Walsh',
    restaurant: 'The Garden Bistro',
    quote: 'Customer support is amazing. They helped us set up everything in just one day.',
    rating: 5
  }
];

export default function ForRestaurantsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">Grow Your Restaurant Business</h1>
            <p className="text-xl text-red-100 mb-8 max-w-3xl mx-auto">
              Join thousands of restaurants using OpenTable Clone to manage reservations, 
              attract new customers, and increase revenue.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/restaurant-signup"
                className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Get Started Free
              </Link>
              <Link
                href="#demo"
                className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Features Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need to Succeed</h2>
            <p className="text-lg text-gray-600">
              Powerful tools designed specifically for restaurant owners
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white rounded-lg shadow-sm mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Join a Growing Network</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">5,000+</div>
              <p className="text-gray-600">Partner Restaurants</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">2M+</div>
              <p className="text-gray-600">Monthly Diners</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">95%</div>
              <p className="text-gray-600">Customer Satisfaction</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">$50M+</div>
              <p className="text-gray-600">Revenue Generated</p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-gray-600">
              Choose the plan that fits your restaurant's needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-lg shadow-lg p-8 relative ${
                  plan.popular ? 'ring-2 ring-red-600' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                    <span className="text-lg font-normal text-gray-600">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Start Free Trial
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Restaurant Owners Say</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.restaurant}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-red-600 rounded-lg text-white text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-red-100 mb-8">
            Join thousands of restaurants already using OpenTable Clone
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/restaurant-signup"
              className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Your Free Trial
            </Link>
            <Link
              href="/contact"
              className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How quickly can I get set up?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Most restaurants are up and running within 24 hours. Our onboarding team will help you every step of the way.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is there a setup fee?</h3>
              <p className="text-gray-600 text-sm mb-4">
                No setup fees. We believe in transparent pricing with no hidden costs.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Yes, you can cancel your subscription at any time. No long-term contracts required.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Do you integrate with POS systems?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Yes, we integrate with most major POS systems. Contact us for specific integration details.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}