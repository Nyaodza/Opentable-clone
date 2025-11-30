'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function DriverApplyPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    vehicleType: '',
    hasLicense: false,
    hasInsurance: false,
    agreedToTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for applying to become a delivery driver. We'll review your application 
            and get back to you within 2-3 business days.
          </p>
          <Link
            href="/"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Become a Delivery Driver</h1>
          <p className="text-xl text-gray-600">
            Earn money on your schedule. Join our network of delivery partners.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-semibold text-gray-900">Earn Up To $25/hr</h3>
            <p className="text-sm text-gray-600">Competitive pay plus tips</p>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl mb-3">🕐</div>
            <h3 className="font-semibold text-gray-900">Flexible Hours</h3>
            <p className="text-sm text-gray-600">Work when you want</p>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-semibold text-gray-900">Easy App</h3>
            <p className="text-sm text-gray-600">Simple delivery management</p>
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Driver Application</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="Where will you deliver?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
              <select
                required
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              >
                <option value="">Select your vehicle</option>
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="scooter">Scooter</option>
                <option value="bicycle">Bicycle</option>
                <option value="walking">Walking</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  required
                  checked={formData.hasLicense}
                  onChange={(e) => setFormData({ ...formData, hasLicense: e.target.checked })}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-600"
                />
                <span className="ml-3 text-gray-700">I have a valid driver's license</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  required
                  checked={formData.hasInsurance}
                  onChange={(e) => setFormData({ ...formData, hasInsurance: e.target.checked })}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-600"
                />
                <span className="ml-3 text-gray-700">I have valid vehicle insurance</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  required
                  checked={formData.agreedToTerms}
                  onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-600"
                />
                <span className="ml-3 text-gray-700">
                  I agree to the{' '}
                  <Link href="/terms" className="text-red-600 hover:text-red-700">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-red-600 hover:text-red-700">Privacy Policy</Link>
                </span>
              </label>
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
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>

        {/* Requirements */}
        <div className="mt-10 bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Requirements</h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Be at least 18 years old
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Have a valid driver's license (for motorized vehicles)
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Own or have access to a reliable vehicle
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Have valid auto insurance (for motorized vehicles)
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Own a smartphone (iOS or Android)
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Pass a background check
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}


