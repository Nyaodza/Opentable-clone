'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    preferences: {
      cuisines: ['Italian', 'Japanese'],
      dietary: ['Vegetarian'],
    },
    loyaltyPoints: 2450,
    tier: 'Gold'
  });

  const handleSave = () => {
    // Save profile changes
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <button
              onClick={() => setEditing(!editing)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  {editing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.phone}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Loyalty Program</h2>
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white p-6 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold">{formData.tier} Member</span>
                  <span className="text-2xl font-bold">{formData.loyaltyPoints}</span>
                </div>
                <p className="text-yellow-100">Points Available</p>
                <div className="mt-4">
                  <div className="bg-yellow-300 h-2 rounded-full">
                    <div className="bg-white h-2 rounded-full w-3/4"></div>
                  </div>
                  <p className="text-sm mt-1">550 points to Platinum</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Dining Preferences</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Favorite Cuisines:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.preferences.cuisines.map((cuisine) => (
                        <span key={cuisine} className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Dietary Restrictions:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.preferences.dietary.map((diet) => (
                        <span key={diet} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                          {diet}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {editing && (
            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Save Changes
              </button>
            </div>
          )}

          <div className="mt-8 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => router.push('/reservations')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center"
              >
                <div className="text-2xl mb-2">📅</div>
                <div className="text-sm">My Reservations</div>
              </button>
              <button 
                onClick={() => router.push('/favorites')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center"
              >
                <div className="text-2xl mb-2">❤️</div>
                <div className="text-sm">Favorites</div>
              </button>
              <button 
                onClick={() => router.push('/rewards')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center"
              >
                <div className="text-2xl mb-2">🎁</div>
                <div className="text-sm">Rewards</div>
              </button>
              <button 
                onClick={() => router.push('/reviews')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center"
              >
                <div className="text-2xl mb-2">⭐</div>
                <div className="text-sm">My Reviews</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
