import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <p className="text-sm text-gray-600 mb-6">Last updated: January 19, 2025</p>
            
            <p className="text-gray-700 mb-4">
              OpenTable Clone ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-gray-800 mb-2">Personal Information</h3>
            <p className="text-gray-700 mb-4">We may collect personal information that you provide directly to us, such as:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>Name, email address, and phone number</li>
              <li>Account credentials</li>
              <li>Dining preferences and dietary restrictions</li>
              <li>Reservation history</li>
              <li>Payment information (processed securely through third-party providers)</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Usage Information</h3>
            <p className="text-gray-700 mb-4">We automatically collect certain information when you use our services:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>Device and browser information</li>
              <li>IP address and location data</li>
              <li>Pages visited and features used</li>
              <li>Search queries and interactions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>Process and manage restaurant reservations</li>
              <li>Send reservation confirmations and reminders</li>
              <li>Provide customer support</li>
              <li>Personalize your experience and make recommendations</li>
              <li>Send promotional communications (with your consent)</li>
              <li>Improve our services and develop new features</li>
              <li>Detect and prevent fraud or unauthorized access</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information Sharing</h2>
            <p className="text-gray-700 mb-4">We may share your information with:</p>
            
            <h3 className="text-lg font-medium text-gray-800 mb-2">Restaurants</h3>
            <p className="text-gray-700 mb-4">
              When you make a reservation, we share necessary information (name, contact details, party size, 
              special requests) with the restaurant to fulfill your booking.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Service Providers</h3>
            <p className="text-gray-700 mb-4">
              We work with third-party service providers who help us operate our business, such as payment 
              processors, email services, and analytics providers.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Legal Requirements</h3>
            <p className="text-gray-700 mb-4">
              We may disclose information if required by law or in response to valid legal requests.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement appropriate technical and organizational measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. This includes:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Limited access to personal information</li>
              <li>Secure data centers and infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Your Rights and Choices</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>Access and update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Opt-out of marketing communications</li>
              <li>Request a copy of your data</li>
              <li>Object to certain uses of your information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies and Tracking</h2>
            <p className="text-gray-700 mb-4">
              We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, 
              and deliver personalized content. You can manage cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              Our services are not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. International Data Transfers</h2>
            <p className="text-gray-700 mb-4">
              Your information may be transferred to and processed in countries other than your own. We ensure 
              appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>OpenTable Clone</strong><br />
                Privacy Team<br />
                Email: privacy@opentableclone.com<br />
                Phone: 1-800-DINE-OUT
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}