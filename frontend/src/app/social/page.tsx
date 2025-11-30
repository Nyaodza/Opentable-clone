'use client';

import React, { useState } from 'react';
import { FriendsList, FriendRequests, AddFriend } from '@/components/social/friends-list';
import { SocialActivityFeed, ShareActivity } from '@/components/social/social-activity';
import { GroupDiningList, CreateGroupDining } from '@/components/social/group-dining';

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<'activity' | 'friends' | 'groups'>('activity');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const tabs = [
    { id: 'activity', label: 'Activity Feed', icon: '🔄' },
    { id: 'friends', label: 'Friends', icon: '👥' },
    { id: 'groups', label: 'Group Dining', icon: '🍽️' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Social</h1>
          <p className="text-gray-600">Connect with friends and discover new dining experiences together</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'activity' && (
              <div className="space-y-6">
                <ShareActivity className="mb-6" />
                <SocialActivityFeed />
              </div>
            )}

            {activeTab === 'friends' && (
              <div className="space-y-6">
                <FriendRequests />
                <FriendsList />
              </div>
            )}

            {activeTab === 'groups' && (
              <div className="space-y-6">
                {showCreateGroup ? (
                  <CreateGroupDining
                    onCreated={() => setShowCreateGroup(false)}
                    className="mb-6"
                  />
                ) : (
                  <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Group Dining Events</h3>
                        <p className="text-gray-600">Organize dining experiences with your friends</p>
                      </div>
                      <button
                        onClick={() => setShowCreateGroup(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create Event
                      </button>
                    </div>
                  </div>
                )}
                <GroupDiningList />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {activeTab === 'activity' && (
              <>
                <QuickStats />
                <TrendingRestaurants />
              </>
            )}

            {activeTab === 'friends' && (
              <>
                <AddFriend />
                <FriendSuggestions />
              </>
            )}

            {activeTab === 'groups' && (
              <>
                <UpcomingEvents />
                <GroupStats />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStats() {
  const stats = [
    { label: 'Friends', value: '24', icon: '👥' },
    { label: 'Reviews', value: '12', icon: '⭐' },
    { label: 'Check-ins', value: '48', icon: '📍' },
    { label: 'Photos', value: '67', icon: '📸' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h3>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendingRestaurants() {
  const trending = [
    { name: 'The Garden Bistro', category: 'French', trend: '+15%' },
    { name: 'Sushi Master', category: 'Japanese', trend: '+12%' },
    { name: 'Pizza Corner', category: 'Italian', trend: '+8%' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Trending Among Friends</h3>
      <div className="space-y-3">
        {trending.map((restaurant, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{restaurant.name}</p>
              <p className="text-sm text-gray-600">{restaurant.category}</p>
            </div>
            <span className="text-green-600 text-sm font-medium">{restaurant.trend}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FriendSuggestions() {
  const suggestions = [
    { name: 'Sarah Johnson', mutualFriends: 3, commonInterests: ['Italian', 'Sushi'] },
    { name: 'Mike Chen', mutualFriends: 2, commonInterests: ['BBQ', 'Mexican'] },
    { name: 'Emma Davis', mutualFriends: 5, commonInterests: ['French', 'Desserts'] },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Friend Suggestions</h3>
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {suggestion.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{suggestion.name}</p>
                <p className="text-sm text-gray-600">{suggestion.mutualFriends} mutual friends</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {suggestion.commonInterests.map((interest) => (
                <span key={interest} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {interest}
                </span>
              ))}
            </div>
            <button className="w-full px-3 py-1 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              Add Friend
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingEvents() {
  const events = [
    { name: 'Team Lunch', date: '2024-01-15', participants: 6 },
    { name: 'Birthday Dinner', date: '2024-01-20', participants: 8 },
    { name: 'Wine Tasting', date: '2024-01-25', participants: 4 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
      <div className="space-y-3">
        {events.map((event, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{event.name}</p>
            <p className="text-sm text-gray-600">
              {new Date(event.date).toLocaleDateString()} • {event.participants} people
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupStats() {
  const stats = [
    { label: 'Groups Created', value: '3', icon: '🍽️' },
    { label: 'Events Joined', value: '12', icon: '📅' },
    { label: 'Total Participants', value: '45', icon: '👥' },
    { label: 'Success Rate', value: '89%', icon: '✅' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Dining Stats</h3>
      <div className="space-y-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">{stat.icon}</span>
              <span className="text-sm text-gray-600">{stat.label}</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}