'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const faqItems = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I sign up as a driver?',
        a: 'Visit our driver application page and complete the online form. You\'ll need to provide your personal information, vehicle details, and consent to a background check.'
      },
      {
        q: 'How long does the approval process take?',
        a: 'Most applications are reviewed within 2-3 business days. Background checks may take an additional 3-5 days.'
      },
      {
        q: 'What documents do I need?',
        a: 'You\'ll need a valid driver\'s license, proof of insurance, and vehicle registration. Additional documents may be required based on your location.'
      }
    ]
  },
  {
    category: 'Earnings & Payments',
    questions: [
      {
        q: 'How much can I earn?',
        a: 'Earnings vary by location and time. On average, drivers earn $15-25 per hour including tips. Peak hours and high-demand areas can yield higher earnings.'
      },
      {
        q: 'When do I get paid?',
        a: 'Payments are processed weekly via direct deposit. You can also enable instant payouts for a small fee.'
      },
      {
        q: 'How do tips work?',
        a: '100% of tips go directly to you. Tips are paid out with your regular earnings.'
      }
    ]
  },
  {
    category: 'Deliveries',
    questions: [
      {
        q: 'How do I accept deliveries?',
        a: 'When online in the driver app, you\'ll receive delivery requests. Tap to accept and follow the navigation to the restaurant and then the customer.'
      },
      {
        q: 'What if a customer isn\'t available?',
        a: 'Follow the in-app prompts to contact the customer. If they\'re unreachable after the waiting period, you can mark the delivery as undeliverable.'
      },
      {
        q: 'Can I decline deliveries?',
        a: 'Yes, you can decline any delivery. However, consistently declining may affect your priority for future orders.'
      }
    ]
  }
];

export default function DriverSupportPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Your message has been sent. We\'ll respond within 24 hours.');
    setContactForm({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Driver Support Center</h1>
          <p className="text-xl text-gray-600">
            We're here to help you succeed. Find answers or contact our support team.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Link href="/driver" className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900">Driver Dashboard</h3>
            <p className="text-sm text-gray-600">View your stats and earnings</p>
          </Link>
          <Link href="/driver/earnings" className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-semibold text-gray-900">Earnings Help</h3>
            <p className="text-sm text-gray-600">Payment and earnings questions</p>
          </Link>
          <a href="tel:1-800-555-0123" className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">📞</div>
            <h3 className="font-semibold text-gray-900">Call Support</h3>
            <p className="text-sm text-gray-600">1-800-555-0123</p>
          </a>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          
          {faqItems.map((section) => (
            <div key={section.category} className="mb-8 last:mb-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{section.category}</h3>
              <div className="space-y-3">
                {section.questions.map((faq, index) => {
                  const faqId = `${section.category}-${index}`;
                  return (
                    <div key={faqId} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setOpenFaq(openFaq === faqId ? null : faqId)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-900">{faq.q}</span>
                        <span className="text-gray-500 ml-4">
                          {openFaq === faqId ? '−' : '+'}
                        </span>
                      </button>
                      {openFaq === faqId && (
                        <div className="px-4 pb-4 text-gray-600">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Driver Support</h2>
          <p className="text-gray-600 mb-6">
            Can't find what you're looking for? Send us a message and we'll get back to you within 24 hours.
          </p>
          
          <form onSubmit={handleContactSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                required
                value={contactForm.subject}
                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              >
                <option value="">Select a topic</option>
                <option value="earnings">Earnings & Payments</option>
                <option value="account">Account Issues</option>
                <option value="delivery">Delivery Problem</option>
                <option value="app">App Technical Issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                required
                rows={5}
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="Describe your issue or question..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


