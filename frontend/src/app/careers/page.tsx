import React from 'react';
import Link from 'next/link';

const jobOpenings = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    department: 'Engineering',
    location: 'San Francisco, CA',
    type: 'Full-time',
    description: 'Build amazing user experiences for millions of diners and restaurant partners.',
    requirements: ['5+ years React experience', 'TypeScript proficiency', 'Experience with Next.js']
  },
  {
    id: '2',
    title: 'Product Manager',
    department: 'Product',
    location: 'New York, NY',
    type: 'Full-time',
    description: 'Drive product strategy and execution for our restaurant marketplace.',
    requirements: ['3+ years product management', 'Marketplace experience', 'Data-driven mindset']
  },
  {
    id: '3',
    title: 'Restaurant Success Manager',
    department: 'Customer Success',
    location: 'Chicago, IL',
    type: 'Full-time',
    description: 'Help restaurant partners maximize their success on our platform.',
    requirements: ['Restaurant industry experience', 'Account management skills', 'Customer-focused']
  },
  {
    id: '4',
    title: 'Backend Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Build scalable APIs and services that power our reservation platform.',
    requirements: ['Node.js/Python experience', 'Database design', 'Microservices architecture']
  },
  {
    id: '5',
    title: 'UX Designer',
    department: 'Design',
    location: 'San Francisco, CA',
    type: 'Full-time',
    description: 'Design intuitive experiences for diners and restaurant owners.',
    requirements: ['3+ years UX design', 'Figma proficiency', 'User research experience']
  },
  {
    id: '6',
    title: 'Marketing Specialist',
    department: 'Marketing',
    location: 'Los Angeles, CA',
    type: 'Full-time',
    description: 'Drive customer acquisition and engagement through digital marketing.',
    requirements: ['Digital marketing experience', 'Analytics skills', 'Creative thinking']
  }
];

const benefits = [
  {
    title: 'Health & Wellness',
    description: 'Comprehensive health, dental, and vision insurance',
    icon: '🏥'
  },
  {
    title: 'Flexible Work',
    description: 'Hybrid work options and flexible schedules',
    icon: '🏠'
  },
  {
    title: 'Learning & Development',
    description: '$2,000 annual learning budget and conference attendance',
    icon: '📚'
  },
  {
    title: 'Dining Perks',
    description: 'Monthly dining credits and exclusive restaurant access',
    icon: '🍽️'
  },
  {
    title: 'Time Off',
    description: 'Unlimited PTO and sabbatical opportunities',
    icon: '🏖️'
  },
  {
    title: 'Equity',
    description: 'Stock options for all employees',
    icon: '📈'
  }
];

const departments = ['All', 'Engineering', 'Product', 'Design', 'Marketing', 'Customer Success', 'Operations'];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Join Our Team</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Help us connect millions of diners with amazing restaurants around the world. 
            Build the future of dining experiences.
          </p>
        </div>

        {/* Company Values */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-center mb-8">Why Work With Us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-lg font-semibold mb-2">Innovation First</h3>
                <p className="text-gray-600">We're constantly pushing boundaries to create better dining experiences.</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="text-lg font-semibold mb-2">Collaborative Culture</h3>
                <p className="text-gray-600">Work with talented, passionate people who support each other's growth.</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="text-lg font-semibold mb-2">Global Impact</h3>
                <p className="text-gray-600">Your work directly impacts restaurants and diners worldwide.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">Benefits & Perks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-3xl mb-3">{benefit.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Job Openings */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">Open Positions</h2>
          
          {/* Department Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {departments.map((dept) => (
              <button
                key={dept}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-red-600 hover:text-red-600 transition-colors text-sm font-medium"
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Job Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobOpenings.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{job.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{job.department}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                      <span>•</span>
                      <span>{job.type}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4">{job.description}</p>
                
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Requirements:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {job.requirements.map((req, index) => (
                      <li key={index}>• {req}</li>
                    ))}
                  </ul>
                </div>
                
                <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-medium">
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Application Process */}
        <section className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-center mb-8">Our Hiring Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-semibold mb-2">Application</h3>
              <p className="text-sm text-gray-600">Submit your application and resume online</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-semibold mb-2">Phone Screen</h3>
              <p className="text-sm text-gray-600">Initial conversation with our recruiting team</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-semibold mb-2">Interviews</h3>
              <p className="text-sm text-gray-600">Meet with the team and hiring manager</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
              <h3 className="font-semibold mb-2">Offer</h3>
              <p className="text-sm text-gray-600">Join the OpenTable Clone family!</p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="text-center">
          <div className="bg-red-50 rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Don't See the Right Role?</h2>
            <p className="text-gray-600 mb-6">
              We're always looking for talented people. Send us your resume and we'll keep you in mind for future opportunities.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/contact"
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Get In Touch
              </Link>
              <a
                href="mailto:careers@opentableclone.com"
                className="border border-red-600 text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 transition-colors"
              >
                careers@opentableclone.com
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}