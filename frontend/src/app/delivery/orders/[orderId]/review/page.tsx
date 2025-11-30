'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { deliveryService } from '@/lib/api/delivery';
import { DeliveryOrder } from '@/types/delivery';

interface ReviewForm {
  restaurantRating: number;
  restaurantComment: string;
  restaurantAspects: { [key: string]: number };
  driverRating: number;
  driverComment: string;
  driverAspects: { [key: string]: number };
  photos: File[];
}

const restaurantAspects = [
  { key: 'food_quality', label: 'Food Quality' },
  { key: 'packaging', label: 'Packaging' },
  { key: 'portion_size', label: 'Portion Size' },
  { key: 'value', label: 'Value for Money' }
];

const driverAspects = [
  { key: 'timeliness', label: 'Timeliness' },
  { key: 'communication', label: 'Communication' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'care', label: 'Order Care' }
];

export default function ReviewOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;
  
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewForm>({
    restaurantRating: 0,
    restaurantComment: '',
    restaurantAspects: {},
    driverRating: 0,
    driverComment: '',
    driverAspects: {},
    photos: []
  });

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const orderData = await deliveryService.getOrder(orderId);
      setOrder(orderData);
    } catch (error) {
      console.error('Failed to load order:', error);
      // For demo, use mock data
      setOrder(mockOrder);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (type: 'restaurant' | 'driver', rating: number) => {
    setReviewForm(prev => ({
      ...prev,
      [`${type}Rating`]: rating
    }));
  };

  const handleAspectRating = (type: 'restaurant' | 'driver', aspectKey: string, rating: number) => {
    setReviewForm(prev => ({
      ...prev,
      [`${type}Aspects`]: {
        ...(prev[`${type}Aspects` as keyof ReviewForm] as { [key: string]: number }),
        [aspectKey]: rating
      }
    }));
  };

  const handleCommentChange = (type: 'restaurant' | 'driver', comment: string) => {
    setReviewForm(prev => ({
      ...prev,
      [`${type}Comment`]: comment
    }));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setReviewForm(prev => ({
      ...prev,
      photos: [...prev.photos, ...files].slice(0, 5) // Max 5 photos
    }));
  };

  const removePhoto = (index: number) => {
    setReviewForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setSubmitting(true);
    try {
      // Submit restaurant review
      if (reviewForm.restaurantRating > 0) {
        await deliveryService.createReview({
          orderId: order.id,
          revieweeId: order.restaurantId,
          revieweeType: 'restaurant',
          rating: reviewForm.restaurantRating,
          comment: reviewForm.restaurantComment,
          aspects: Object.entries(reviewForm.restaurantAspects).map(([name, rating]) => ({
            name,
            rating
          }))
        });
      }

      // Submit driver review
      if (order.driverId && reviewForm.driverRating > 0) {
        await deliveryService.createReview({
          orderId: order.id,
          revieweeId: order.driverId,
          revieweeType: 'driver',
          rating: reviewForm.driverRating,
          comment: reviewForm.driverComment,
          aspects: Object.entries(reviewForm.driverAspects).map(([name, rating]) => ({
            name,
            rating
          }))
        });
      }

      // Success! Redirect to order details
      router.push(`/delivery/orders/${orderId}?reviewed=true`);
    } catch (error) {
      console.error('Failed to submit reviews:', error);
      alert('Failed to submit reviews. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarRating = (
    rating: number,
    onRatingChange: (rating: number) => void,
    label: string,
    required = false
  ) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`text-2xl transition-colors ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
            }`}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!order || order.status !== 'delivered') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Not Available</h2>
          <p className="text-gray-600 mb-6">This order cannot be reviewed at this time.</p>
          <Link
            href="/delivery"
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/delivery/orders/${orderId}`}
            className="text-red-600 hover:text-red-700 font-medium mb-4 inline-block"
          >
            ← Back to Order
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Review Your Experience</h1>
          <p className="text-gray-600">Order #{order.id.slice(-8)} • Help others by sharing your experience</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Restaurant Review */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <div className="text-3xl mr-3">🍽️</div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Rate the Restaurant</h2>
                <p className="text-gray-600">Restaurant #{order.restaurantId}</p>
              </div>
            </div>

            {renderStarRating(
              reviewForm.restaurantRating,
              (rating) => handleRatingChange('restaurant', rating),
              'Overall Rating',
              true
            )}

            {/* Restaurant Aspects */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {restaurantAspects.map((aspect) => (
                <div key={aspect.key}>
                  {renderStarRating(
                    reviewForm.restaurantAspects[aspect.key] || 0,
                    (rating) => handleAspectRating('restaurant', aspect.key, rating),
                    aspect.label
                  )}
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tell us about your experience (optional)
              </label>
              <textarea
                value={reviewForm.restaurantComment}
                onChange={(e) => handleCommentChange('restaurant', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="How was the food? Was everything as expected?"
              />
            </div>

            {/* Photo Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Photos (optional)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              />
              {reviewForm.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {reviewForm.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Upload ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Driver Review */}
          {order.driverId && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-6">
                <div className="text-3xl mr-3">🚗</div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Rate Your Driver</h2>
                  <p className="text-gray-600">Driver #{order.driverId.slice(-6)}</p>
                </div>
              </div>

              {renderStarRating(
                reviewForm.driverRating,
                (rating) => handleRatingChange('driver', rating),
                'Overall Rating',
                true
              )}

              {/* Driver Aspects */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {driverAspects.map((aspect) => (
                  <div key={aspect.key}>
                    {renderStarRating(
                      reviewForm.driverAspects[aspect.key] || 0,
                      (rating) => handleAspectRating('driver', aspect.key, rating),
                      aspect.label
                    )}
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How was your delivery experience? (optional)
                </label>
                <textarea
                  value={reviewForm.driverComment}
                  onChange={(e) => handleCommentChange('driver', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Was your driver professional and timely?"
                />
              </div>
            </div>
          )}

          {/* Submit Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={
                  submitting ||
                  (reviewForm.restaurantRating === 0 && reviewForm.driverRating === 0)
                }
                className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submitting ? 'Submitting Reviews...' : 'Submit Reviews'}
              </button>
              <Link
                href={`/delivery/orders/${orderId}`}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
              >
                Skip for Now
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">
              Your reviews help improve the experience for everyone
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// Mock data for demonstration
const mockOrder: DeliveryOrder = {
  id: 'ord_123456789',
  customerId: 'user_001',
  restaurantId: 'rest_001',
  driverId: 'driver_001',
  status: 'delivered',
  items: [
    {
      id: 'item_001',
      name: 'Margherita Pizza',
      price: 18.99,
      quantity: 1
    }
  ],
  subtotal: 18.99,
  deliveryFee: 3.99,
  tip: 3.00,
  tax: 2.00,
  total: 27.98,
  deliveryAddress: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'US'
  },
  restaurantAddress: {
    street: '456 Restaurant Ave',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'US'
  },
  estimatedPrepTime: 20,
  estimatedDeliveryTime: 35,
  actualDeliveryTime: 32,
  paymentMethod: 'card',
  paymentStatus: 'completed',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date(Date.now() - 1800000).toISOString()
};