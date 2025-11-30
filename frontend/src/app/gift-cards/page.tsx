'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const giftCardAmounts = [25, 50, 100, 250, 500];

export default function GiftCardsPage() {
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate purchase
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    alert(`Gift card purchased successfully! Confirmation email sent to ${recipientEmail}`);
    setIsSubmitting(false);
    
    // Reset form
    setRecipientName('');
    setRecipientEmail('');
    setSenderName('');
    setMessage('');
    setDeliveryDate('');
    setCustomAmount('');
    setUseCustomAmount(false);
    setSelectedAmount(100);
  };

  const finalAmount = useCustomAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Gift Cards</h1>
          <p className="text-lg text-gray-600">
            Give the gift of great dining experiences
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Gift Card Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">Purchase Gift Card</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Gift Card Amount</label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {giftCardAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amount);
                        setUseCustomAmount(false);
                      }}
                      className={`py-3 px-4 text-center rounded-lg border font-medium transition-colors ${
                        !useCustomAmount && selectedAmount === amount
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="custom-amount"
                    checked={useCustomAmount}
                    onChange={(e) => setUseCustomAmount(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-600"
                  />
                  <label htmlFor="custom-amount" className="text-sm text-gray-700">
                    Custom amount
                  </label>
                </div>
                
                {useCustomAmount && (
                  <div className="mt-2">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="10"
                      max="1000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum $10, Maximum $1,000</p>
                  </div>
                )}
              </div>

              {/* Recipient Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="recipient-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    id="recipient-name"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label htmlFor="recipient-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email *
                  </label>
                  <input
                    type="email"
                    id="recipient-email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {/* Sender Information */}
              <div>
                <label htmlFor="sender-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="sender-name"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* Personal Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Add a personal message..."
                />
              </div>

              {/* Delivery Date */}
              <div>
                <label htmlFor="delivery-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Date (Optional)
                </label>
                <input
                  type="date"
                  id="delivery-date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to send immediately</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || finalAmount < 10}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  isSubmitting || finalAmount < 10
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isSubmitting ? 'Processing...' : `Purchase Gift Card - $${finalAmount.toFixed(2)}`}
              </button>
            </form>
          </div>

          {/* Gift Card Preview */}
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg p-8 text-white">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">OpenTable Clone</h3>
                <p className="text-red-100 mb-6">Gift Card</p>
                
                <div className="bg-white/20 rounded-lg p-6 mb-6">
                  <div className="text-4xl font-bold mb-2">${finalAmount.toFixed(2)}</div>
                  <p className="text-red-100">Gift Card Value</p>
                </div>
                
                {recipientName && (
                  <div className="text-left">
                    <p className="text-sm text-red-100">To:</p>
                    <p className="font-medium">{recipientName}</p>
                  </div>
                )}
                
                {senderName && (
                  <div className="text-left mt-2">
                    <p className="text-sm text-red-100">From:</p>
                    <p className="font-medium">{senderName}</p>
                  </div>
                )}
                
                {message && (
                  <div className="mt-4 p-3 bg-white/10 rounded text-sm">
                    "{message}"
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Gift Card Features</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  No expiration date
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Use at any participating restaurant
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Check balance online anytime
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Instantly delivered via email
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Perfect for any occasion
                </li>
              </ul>
            </div>

            {/* Popular Occasions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Perfect for Any Occasion</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl mb-1">🎂</div>
                  <p className="text-sm text-gray-600">Birthdays</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl mb-1">💝</div>
                  <p className="text-sm text-gray-600">Anniversaries</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl mb-1">🎓</div>
                  <p className="text-sm text-gray-600">Graduations</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl mb-1">🎄</div>
                  <p className="text-sm text-gray-600">Holidays</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mt-12 bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Do gift cards expire?</h3>
              <p className="text-gray-600 text-sm">
                No, our gift cards never expire. The recipient can use them whenever they want.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Can I check my gift card balance?</h3>
              <p className="text-gray-600 text-sm">
                Yes, you can check your balance online or by calling our customer service.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">What if I lose my gift card?</h3>
              <p className="text-gray-600 text-sm">
                Digital gift cards are safe in your email. For lost cards, contact support with purchase details.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Can I use partial amounts?</h3>
              <p className="text-gray-600 text-sm">
                Yes, you can use your gift card for partial payments. Any remaining balance stays on the card.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mt-12 bg-red-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Give the Gift of Great Dining</h2>
          <p className="text-gray-600 mb-6">
            Perfect for food lovers, special occasions, or just because. Our gift cards open doors to amazing culinary experiences.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/restaurants"
              className="bg-white text-red-600 px-6 py-3 rounded-lg border border-red-600 hover:bg-red-50 transition-colors"
            >
              Browse Restaurants
            </Link>
            <Link
              href="/contact"
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}