import React from 'react';
import Link from 'next/link';

const pressReleases = [
  {
    id: '1',
    date: '2025-01-15',
    title: 'OpenTable Clone Expands to 50 New Cities Across North America',
    excerpt: 'Platform now serves over 10,000 restaurants and 5 million active diners',
    category: 'Expansion'
  },
  {
    id: '2',
    date: '2025-01-08',
    title: 'OpenTable Clone Introduces AI-Powered Restaurant Recommendations',
    excerpt: 'New machine learning features help diners discover perfect restaurants based on preferences',
    category: 'Product'
  },
  {
    id: '3',
    date: '2024-12-20',
    title: 'OpenTable Clone Raises $50M Series B to Accelerate Growth',
    excerpt: 'Funding will support international expansion and product development',
    category: 'Funding'
  },
  {
    id: '4',
    date: '2024-12-10',
    title: 'OpenTable Clone Partners with Major Restaurant Chains',
    excerpt: 'New partnerships bring popular restaurant brands to the platform',
    category: 'Partnership'
  },
  {
    id: '5',
    date: '2024-11-28',
    title: 'OpenTable Clone Reports Record Thanksgiving Week Bookings',
    excerpt: 'Platform processed over 1 million reservations during holiday week',
    category: 'Milestone'
  }
];

const mediaKit = [
  {
    title: 'Company Logos',
    description: 'High-resolution logos in various formats',
    downloadLink: '#'
  },
  {
    title: 'Executive Photos',
    description: 'Professional headshots of leadership team',
    downloadLink: '#'
  },
  {
    title: 'Product Screenshots',
    description: 'Screenshots of our platform and mobile app',
    downloadLink: '#'
  },
  {
    title: 'Brand Guidelines',
    description: 'Complete brand style guide and usage guidelines',
    downloadLink: '#'
  }
];

const awards = [
  {
    year: '2024',
    award: 'Best Restaurant Technology Platform',
    organization: 'Restaurant Industry Awards'
  },
  {
    year: '2024',
    award: 'Top 50 Most Innovative Companies',
    organization: 'TechCrunch'
  },
  {
    year: '2023',
    award: 'Best User Experience - Food & Dining',
    organization: 'UX Design Awards'
  },
  {
    year: '2023',
    award: 'Fastest Growing Startup',
    organization: 'Inc. 5000'
  }
];

const teamMembers = [
  {
    name: 'Sarah Johnson',
    title: 'CEO & Co-Founder',
    bio: 'Former VP of Product at major tech company, 10+ years in restaurant technology',
    email: 'sarah@opentableclone.com'
  },
  {
    name: 'Michael Chen',
    title: 'CTO & Co-Founder',
    bio: 'Former Senior Engineer at top tech companies, expert in scalable systems',
    email: 'michael@opentableclone.com'
  },
  {
    name: 'Emily Rodriguez',
    title: 'Head of Marketing',
    bio: 'Marketing leader with 8+ years in consumer tech and marketplace platforms',
    email: 'emily@opentableclone.com'
  }
];

export default function PressPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Press & Media</h1>
          <p className="text-lg text-gray-600">
            Latest news, press releases, and media resources from OpenTable Clone
          </p>
        </div>

        {/* Quick Stats */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-center mb-8">Company at a Glance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-red-600 mb-2">10,000+</div>
                <p className="text-gray-600">Restaurant Partners</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600 mb-2">5M+</div>
                <p className="text-gray-600">Active Diners</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600 mb-2">100+</div>
                <p className="text-gray-600">Cities Served</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600 mb-2">50M+</div>
                <p className="text-gray-600">Reservations Booked</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Recent Press Releases */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6">Recent Press Releases</h2>
              <div className="space-y-6">
                {pressReleases.map((release) => (
                  <div key={release.id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-sm text-gray-500">
                        {new Date(release.date).toLocaleDateString()}
                      </span>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                        {release.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      <Link href={`/press/${release.id}`} className="hover:text-red-600 transition-colors">
                        {release.title}
                      </Link>
                    </h3>
                    <p className="text-gray-600 mb-4">{release.excerpt}</p>
                    <Link
                      href={`/press/${release.id}`}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      Read Full Release →
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* Awards & Recognition */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6">Awards & Recognition</h2>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {awards.map((award, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-red-600 font-bold">🏆</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{award.award}</h3>
                        <p className="text-gray-600 text-sm">{award.organization}</p>
                        <p className="text-gray-500 text-sm">{award.year}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Media Contact */}
            <section className="mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Media Contact</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">Press Inquiries</p>
                    <a href="mailto:press@opentableclone.com" className="text-red-600 hover:text-red-700">
                      press@opentableclone.com
                    </a>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <a href="tel:+1-415-555-0199" className="text-red-600 hover:text-red-700">
                      +1 (415) 555-0199
                    </a>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Response Time</p>
                    <p className="text-gray-600 text-sm">Within 24 hours</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Media Kit */}
            <section className="mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Media Kit</h3>
                <div className="space-y-4">
                  {mediaKit.map((item, index) => (
                    <div key={index}>
                      <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                      <a
                        href={item.downloadLink}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Download →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Leadership Team */}
            <section>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Leadership Team</h3>
                <div className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <div key={index}>
                      <h4 className="font-medium text-gray-900">{member.name}</h4>
                      <p className="text-red-600 text-sm font-medium">{member.title}</p>
                      <p className="text-gray-600 text-sm mb-2">{member.bio}</p>
                      <a
                        href={`mailto:${member.email}`}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        {member.email}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Company Overview */}
        <section className="mt-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6">About OpenTable Clone</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-3">Our Mission</h3>
              <p className="text-gray-600 mb-6">
                To connect restaurants and diners through innovative technology, creating memorable dining 
                experiences while helping restaurants grow their business.
              </p>
              
              <h3 className="text-lg font-semibold mb-3">Company History</h3>
              <p className="text-gray-600">
                Founded in 2020, OpenTable Clone has rapidly grown to become a leading restaurant 
                reservation platform, serving millions of diners and thousands of restaurants across 
                North America.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">What Makes Us Different</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• AI-powered restaurant recommendations</li>
                <li>• Real-time availability and instant confirmations</li>
                <li>• Comprehensive restaurant management tools</li>
                <li>• Mobile-first user experience</li>
                <li>• 24/7 customer support</li>
                <li>• No booking fees for diners</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}