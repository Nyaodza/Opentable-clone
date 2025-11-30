'use client';

import React, { useState } from 'react';
import { useSocialActivity, friendsService, type SocialActivity } from '@/lib/social/friends';

interface SocialActivityFeedProps {
  className?: string;
}

export function SocialActivityFeed({ className = '' }: SocialActivityFeedProps) {
  const { activities, loading, error, hasMore, loadMore, refresh } = useSocialActivity();

  const handleLike = async (activityId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await friendsService.unlikeActivity(activityId);
      } else {
        await friendsService.likeActivity(activityId);
      }
      refresh();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-lg ${className}`}>
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-6 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
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
          <p>Failed to load activity feed: {error}</p>
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
          <h2 className="text-xl font-semibold text-gray-900">Activity Feed</h2>
          <button
            onClick={refresh}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <div className="text-4xl mb-4">🔄</div>
          <h3 className="text-lg font-medium mb-2">No activity yet</h3>
          <p className="text-sm">Follow friends to see their dining activities!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onLike={(isLiked) => handleLike(activity.id, isLiked)}
            />
          ))}
          
          {hasMore && (
            <div className="p-4 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ActivityItemProps {
  activity: SocialActivity;
  onLike: (isLiked: boolean) => void;
}

function ActivityItem({ activity, onLike }: ActivityItemProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'reservation':
        return '🍽️';
      case 'review':
        return '⭐';
      case 'favorite':
        return '❤️';
      case 'check_in':
        return '📍';
      case 'photo':
        return '📸';
      default:
        return '🔄';
    }
  };

  const getActivityText = (activity: SocialActivity) => {
    switch (activity.type) {
      case 'reservation':
        return `made a reservation at ${activity.data.restaurantName}`;
      case 'review':
        return `reviewed ${activity.data.restaurantName}`;
      case 'favorite':
        return `added ${activity.data.restaurantName} to favorites`;
      case 'check_in':
        return `checked in at ${activity.data.restaurantName}`;
      case 'photo':
        return `shared photos from ${activity.data.restaurantName}`;
      default:
        return 'had some activity';
    }
  };

  const loadComments = async () => {
    if (comments.length === 0) {
      setLoadingComments(true);
      try {
        const activityComments = await friendsService.getActivityComments(activity.id);
        setComments(activityComments);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await friendsService.commentOnActivity(activity.id, newComment.trim());
      setNewComment('');
      // Reload comments
      const activityComments = await friendsService.getActivityComments(activity.id);
      setComments(activityComments);
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start gap-3">
        {/* User Avatar */}
        {activity.user.avatar ? (
          <img
            src={activity.user.avatar}
            alt={activity.user.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            {activity.user.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          {/* Activity Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-900">{activity.user.name}</span>
            <span className="text-gray-600">{getActivityText(activity)}</span>
            <span className="text-lg">{getActivityIcon(activity.type)}</span>
          </div>

          <p className="text-sm text-gray-500 mb-3">
            {new Date(activity.createdAt).toLocaleDateString()} at{' '}
            {new Date(activity.createdAt).toLocaleTimeString()}
          </p>

          {/* Activity Content */}
          {activity.type === 'review' && activity.data.rating && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-lg ${
                        i < (activity.data.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  ({activity.data.rating}/5)
                </span>
              </div>
              {activity.data.comment && (
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                  "{activity.data.comment}"
                </p>
              )}
            </div>
          )}

          {/* Photos */}
          {activity.data.photos && activity.data.photos.length > 0 && (
            <div className="mb-3">
              <div className="grid grid-cols-2 gap-2">
                {activity.data.photos.slice(0, 4).map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt="Activity photo"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ))}
                {activity.data.photos.length > 4 && (
                  <div className="bg-gray-200 rounded-lg flex items-center justify-center text-gray-600">
                    +{activity.data.photos.length - 4} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Privacy Indicator */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {activity.visibility === 'public' ? '🌍 Public' : 
               activity.visibility === 'friends' ? '👥 Friends' : '🔒 Private'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => onLike(activity.isLiked || false)}
              className={`flex items-center gap-1 transition-colors ${
                activity.isLiked 
                  ? 'text-red-600 hover:text-red-700' 
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              <span className="text-lg">{activity.isLiked ? '❤️' : '🤍'}</span>
              {activity.likes > 0 && <span>{activity.likes}</span>}
            </button>

            <button
              onClick={loadComments}
              className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <span className="text-lg">💬</span>
              {activity.comments > 0 && <span>{activity.comments}</span>}
            </button>

            <button className="text-gray-600 hover:text-blue-600 transition-colors">
              <span className="text-lg">🔗</span>
              Share
            </button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              {loadingComments ? (
                <div className="animate-pulse">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex gap-2 mb-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 mb-3">
                      {comment.user.avatar ? (
                        <img
                          src={comment.user.avatar}
                          alt={comment.user.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                          {comment.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg px-3 py-2">
                          <p className="font-medium text-sm text-gray-900">
                            {comment.user.name}
                          </p>
                          <p className="text-sm text-gray-700">{comment.comment}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Add Comment Form */}
                  <form onSubmit={handleComment} className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Post
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ShareActivityProps {
  restaurantId?: string;
  restaurantName?: string;
  onShared?: () => void;
  className?: string;
}

export function ShareActivity({ 
  restaurantId, 
  restaurantName, 
  onShared, 
  className = '' 
}: ShareActivityProps) {
  const [type, setType] = useState<SocialActivity['type']>('check_in');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [visibility, setVisibility] = useState<SocialActivity['visibility']>('friends');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await friendsService.shareActivity({
        type,
        data: {
          restaurantId,
          restaurantName,
          rating: type === 'review' ? rating : undefined,
          comment: comment.trim() || undefined,
        },
        visibility,
      });

      setComment('');
      setRating(0);
      onShared?.();
    } catch (error) {
      alert('Failed to share activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Activity</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Activity Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SocialActivity['type'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="check_in">Check In</option>
            <option value="review">Review</option>
            <option value="favorite">Add to Favorites</option>
            <option value="photo">Share Photos</option>
          </select>
        </div>

        {type === 'review' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400 transition-colors`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comment (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Privacy
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as SocialActivity['visibility'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="public">🌍 Public</option>
            <option value="friends">👥 Friends Only</option>
            <option value="private">🔒 Private</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sharing...' : 'Share Activity'}
        </button>
      </form>
    </div>
  );
}