'use client';

import React, { useState } from 'react';
import { useFriends, useFriendRequests, friendsService, type Friend, type FriendRequest } from '@/lib/social/friends';

interface FriendsListProps {
  className?: string;
}

export function FriendsList({ className = '' }: FriendsListProps) {
  const { friends, loading, error, refresh } = useFriends();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  const handleRemoveFriend = async (friendId: string) => {
    if (confirm('Are you sure you want to remove this friend?')) {
      try {
        await friendsService.removeFriend(friendId);
        refresh();
      } catch (error) {
        alert('Failed to remove friend');
      }
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Failed to load friends: {error}</p>
          <button
            onClick={refresh}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Friends ({friends.length})</h2>
          <button
            onClick={refresh}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-medium mb-2">No friends yet</h3>
          <p className="text-sm">Start connecting with other food lovers!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {friends.map((friend) => (
            <div key={friend.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {friend.friend.avatar ? (
                      <img
                        src={friend.friend.avatar}
                        alt={friend.friend.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {friend.friend.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {friend.friend.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{friend.friend.name}</h3>
                    <p className="text-sm text-gray-600">{friend.friend.email}</p>
                    {friend.friend.lastSeen && !friend.friend.isOnline && (
                      <p className="text-xs text-gray-500">
                        Last seen {new Date(friend.friend.lastSeen).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedFriend(friend)}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friend Detail Modal */}
      {selectedFriend && (
        <FriendDetailModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </div>
  );
}

interface FriendRequestsProps {
  className?: string;
}

export function FriendRequests({ className = '' }: FriendRequestsProps) {
  const { requests, loading, error, refresh } = useFriendRequests();

  const handleRespondToRequest = async (requestId: string, response: 'accept' | 'decline') => {
    try {
      await friendsService.respondToFriendRequest(requestId, response);
      refresh();
    } catch (error) {
      alert(`Failed to ${response} friend request`);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const receivedRequests = requests.received || [];
  const sentRequests = requests.sent || [];

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Friend Requests</h2>
      </div>

      {/* Received Requests */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="font-medium text-gray-900 mb-4">
          Received ({receivedRequests.length})
        </h3>
        
        {receivedRequests.length === 0 ? (
          <p className="text-gray-500 text-sm">No pending friend requests</p>
        ) : (
          <div className="space-y-4">
            {receivedRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {request.fromUser.avatar ? (
                    <img
                      src={request.fromUser.avatar}
                      alt={request.fromUser.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {request.fromUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div>
                    <p className="font-medium text-gray-900">{request.fromUser.name}</p>
                    <p className="text-sm text-gray-600">{request.fromUser.email}</p>
                    {request.message && (
                      <p className="text-sm text-gray-600 italic">"{request.message}"</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondToRequest(request.id, 'accept')}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespondToRequest(request.id, 'decline')}
                    className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent Requests */}
      <div className="p-6">
        <h3 className="font-medium text-gray-900 mb-4">
          Sent ({sentRequests.length})
        </h3>
        
        {sentRequests.length === 0 ? (
          <p className="text-gray-500 text-sm">No sent friend requests</p>
        ) : (
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm">
                    {request.fromUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{request.fromUser.name}</p>
                    <p className="text-sm text-gray-600">{request.fromUser.email}</p>
                  </div>
                </div>
                
                <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AddFriendProps {
  onFriendAdded?: () => void;
  className?: string;
}

export function AddFriend({ onFriendAdded, className = '' }: AddFriendProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await friendsService.sendFriendRequest(email.trim(), message.trim() || undefined);
      setEmail('');
      setMessage('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onFriendAdded?.();
    } catch (error) {
      alert('Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Friend</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! I'd like to connect with you on this platform."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending...' : 'Send Friend Request'}
        </button>

        {success && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            Friend request sent successfully!
          </div>
        )}
      </form>
    </div>
  );
}

interface FriendDetailModalProps {
  friend: Friend;
  onClose: () => void;
}

function FriendDetailModal({ friend, onClose }: FriendDetailModalProps) {
  const [stats, setStats] = useState<any>(null);

  React.useEffect(() => {
    friendsService.getFriendStats(friend.friendId)
      .then(setStats)
      .catch(console.error);
  }, [friend.friendId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Friend Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {friend.friend.avatar ? (
              <img
                src={friend.friend.avatar}
                alt={friend.friend.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                {friend.friend.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{friend.friend.name}</h3>
              <p className="text-gray-600">{friend.friend.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  friend.friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {friend.friend.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-semibold text-gray-900">{stats.mutualFriends}</p>
                <p className="text-sm text-gray-600">Mutual Friends</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-semibold text-gray-900">{stats.sharedRestaurants}</p>
                <p className="text-sm text-gray-600">Shared Restaurants</p>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 mb-6">
            <p>Friends since {new Date(friend.createdAt).toLocaleDateString()}</p>
            {stats?.lastActivity && (
              <p>Last activity: {new Date(stats.lastActivity).toLocaleDateString()}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Message
            </button>
            <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}