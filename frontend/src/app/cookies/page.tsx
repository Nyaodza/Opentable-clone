import React from 'react';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Cookie Policy</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <p className="text-sm text-gray-600 mb-6">Last updated: January 19, 2025</p>
            
            <p className="text-gray-700 mb-4">
              This Cookie Policy explains how OpenTable Clone ("we," "our," or "us") uses cookies and 
              similar tracking technologies when you visit our website and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. What Are Cookies</h2>
            <p className="text-gray-700 mb-4">
              Cookies are small text files that are stored on your device when you visit a website. 
              They help websites remember information about your visit, which can both make it easier 
              to visit the site again and make the site more useful to you.
            </p>
            
            <h3 className="text-lg font-medium text-gray-800 mb-2">Types of Cookies We Use</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li><strong>Session Cookies:</strong> Temporary cookies that expire when you close your browser</li>
              <li><strong>Persistent Cookies:</strong> Cookies that remain on your device until they expire or you delete them</li>
              <li><strong>First-Party Cookies:</strong> Cookies set by OpenTable Clone</li>
              <li><strong>Third-Party Cookies:</strong> Cookies set by our partners and service providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Cookies</h2>
            
            <h3 className="text-lg font-medium text-gray-800 mb-2">Essential Cookies</h3>
            <p className="text-gray-700 mb-4">
              These cookies are necessary for our website to function properly. They enable core 
              functionality such as security, network management, and accessibility.
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>Authentication and security</li>
              <li>Shopping cart and reservation functionality</li>
              <li>Load balancing and site performance</li>
              <li>Accessibility features</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Performance and Analytics Cookies</h3>
            <p className="text-gray-700 mb-4">
              These cookies help us understand how visitors interact with our website by collecting 
              and reporting information anonymously.
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>Google Analytics for website usage statistics</li>
              <li>Page load times and performance monitoring</li>
              <li>Error tracking and debugging</li>
              <li>User journey analysis</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Functional Cookies</h3>
            <p className="text-gray-700 mb-4">
              These cookies enable enhanced functionality and personalization.
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>Language and location preferences</li>
              <li>Search and filter preferences</li>
              <li>Remembered login information</li>
              <li>Personalized recommendations</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Marketing and Advertising Cookies</h3>
            <p className="text-gray-700 mb-4">
              These cookies are used to deliver relevant advertisements and measure advertising effectiveness.
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>Social media integration</li>
              <li>Targeted advertising</li>
              <li>Conversion tracking</li>
              <li>Retargeting campaigns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Third-Party Cookies</h2>
            <p className="text-gray-700 mb-4">
              We work with trusted third-party services that may set cookies on our website:
            </p>
            
            <div className="space-y-4">
              <div className="border-l-4 border-red-600 pl-4">
                <h4 className="font-medium text-gray-900">Google Analytics</h4>
                <p className="text-gray-600 text-sm">
                  Helps us understand website usage and improve user experience.
                  <a href="https://policies.google.com/privacy" className="text-red-600 hover:text-red-700 ml-1">
                    Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="border-l-4 border-red-600 pl-4">
                <h4 className="font-medium text-gray-900">Facebook Pixel</h4>
                <p className="text-gray-600 text-sm">
                  Enables targeted advertising and conversion tracking.
                  <a href="https://www.facebook.com/privacy/explanation" className="text-red-600 hover:text-red-700 ml-1">
                    Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="border-l-4 border-red-600 pl-4">
                <h4 className="font-medium text-gray-900">Stripe</h4>
                <p className="text-gray-600 text-sm">
                  Processes payments securely for gift card purchases.
                  <a href="https://stripe.com/privacy" className="text-red-600 hover:text-red-700 ml-1">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Managing Your Cookie Preferences</h2>
            
            <h3 className="text-lg font-medium text-gray-800 mb-2">Browser Settings</h3>
            <p className="text-gray-700 mb-4">
              Most web browsers allow you to control cookies through their settings. You can:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>View what cookies are stored on your device</li>
              <li>Delete existing cookies</li>
              <li>Block cookies from being set</li>
              <li>Set preferences for specific websites</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Browser-Specific Instructions</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <ul className="text-gray-700 space-y-2">
                <li>
                  <strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data
                </li>
                <li>
                  <strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data
                </li>
                <li>
                  <strong>Safari:</strong> Preferences → Privacy → Manage Website Data
                </li>
                <li>
                  <strong>Edge:</strong> Settings → Site permissions → Cookies and site data
                </li>
              </ul>
            </div>

            <h3 className="text-lg font-medium text-gray-800 mb-2">Opt-Out Tools</h3>
            <p className="text-gray-700 mb-4">
              You can also use these industry tools to opt out of tracking:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>
                <a href="http://optout.aboutads.info/" className="text-red-600 hover:text-red-700">
                  Digital Advertising Alliance Opt-Out
                </a>
              </li>
              <li>
                <a href="http://optout.networkadvertising.org/" className="text-red-600 hover:text-red-700">
                  Network Advertising Initiative Opt-Out
                </a>
              </li>
              <li>
                <a href="https://tools.google.com/dlpage/gaoptout" className="text-red-600 hover:text-red-700">
                  Google Analytics Opt-Out Browser Add-on
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Impact of Disabling Cookies</h2>
            <p className="text-gray-700 mb-4">
              While you can disable cookies, please note that this may affect your experience on our website:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>You may need to re-enter information more frequently</li>
              <li>Some features may not work properly</li>
              <li>Personalized recommendations may not be available</li>
              <li>We may not be able to remember your preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Mobile Apps and Other Technologies</h2>
            <p className="text-gray-700 mb-4">
              Our mobile applications may use similar technologies to cookies, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 ml-4 space-y-1">
              <li>Mobile device identifiers</li>
              <li>Local storage</li>
              <li>SDKs (Software Development Kits)</li>
              <li>Push notification tokens</li>
            </ul>
            <p className="text-gray-700 mb-4">
              You can manage these through your device settings or app permissions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Updates to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Cookie Policy from time to time to reflect changes in technology, 
              legislation, or our business practices. We will notify you of any material changes 
              by posting the updated policy on our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about our use of cookies or this Cookie Policy, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>OpenTable Clone</strong><br />
                Data Protection Team<br />
                Email: privacy@opentableclone.com<br />
                Phone: 1-800-DINE-OUT<br />
                Address: 123 Restaurant Way, San Francisco, CA 94105
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Consent and Preferences</h2>
            <p className="text-gray-700 mb-4">
              By continuing to use our website, you consent to our use of cookies as described in this policy. 
              You can withdraw your consent at any time by adjusting your browser settings or using the 
              preference center on our website.
            </p>
            
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Manage Cookie Preferences</h4>
              <p className="text-red-700 text-sm mb-3">
                Click the button below to update your cookie preferences at any time.
              </p>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
                Cookie Settings
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}