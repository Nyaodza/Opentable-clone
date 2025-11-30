import React from 'react';
import { unifiedApiClient } from '../api/unified-client';

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
  updatedAt: string;
  friend: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  fromUser: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface SocialActivity {
  id: string;
  userId: string;
  type: 'reservation' | 'review' | 'favorite' | 'check_in' | 'photo';
  data: {
    restaurantId?: string;
    restaurantName?: string;
    rating?: number;
    comment?: string;
    photos?: string[];
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  visibility: 'public' | 'friends' | 'private';
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  likes: number;
  comments: number;
  isLiked?: boolean;
}

export interface GroupDining {
  id: string;
  name: string;
  description?: string;
  organizerId: string;
  participants: Array<{
    userId: string;
    status: 'invited' | 'accepted' | 'declined';
    joinedAt?: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
  }>;
  restaurantId?: string;
  reservationId?: string;
  scheduledDate?: string;
  status: 'planning' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

class FriendsService {
  // Friend Management
  async getFriends(): Promise<Friend[]> {
    return await unifiedApiClient.get('/social/friends');
  }

  async getFriendRequests(): Promise<{
    sent: FriendRequest[];
    received: FriendRequest[];
  }> {
    return await unifiedApiClient.get('/social/friend-requests');
  }

  async sendFriendRequest(
    email: string,
    message?: string
  ): Promise<FriendRequest> {
    return await unifiedApiClient.post('/social/friend-requests', {
      email,
      message,
    });
  }

  async respondToFriendRequest(
    requestId: string,
    response: 'accept' | 'decline'
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.put(`/social/friend-requests/${requestId}`, {
      response,
    });
  }

  async removeFriend(friendId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.delete(`/social/friends/${friendId}`);
  }

  async blockUser(userId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/social/block`, { userId });
  }

  async unblockUser(userId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.delete(`/social/block/${userId}`);
  }

  async getBlockedUsers(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    blockedAt: string;
  }>> {
    return await unifiedApiClient.get('/social/blocked');
  }

  // Friend Discovery
  async searchUsers(query: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    mutualFriends?: number;
    isFriend?: boolean;
    hasPendingRequest?: boolean;
  }>> {
    return await unifiedApiClient.get('/social/search', { query });
  }

  async getSuggestedFriends(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    mutualFriends: number;
    commonInterests: string[];
    score: number;
  }>> {
    return await unifiedApiClient.get('/social/suggestions');
  }

  async getFriendsFromContacts(contacts: Array<{
    name: string;
    email: string;
    phone?: string;
  }>): Promise<Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    isAlreadyFriend: boolean;
  }>> {
    return await unifiedApiClient.post('/social/find-contacts', { contacts });
  }

  // Social Activity
  async getFriendsActivity(limit = 20, offset = 0): Promise<{
    activities: SocialActivity[];
    total: number;
    hasMore: boolean;
  }> {
    return await unifiedApiClient.get('/social/activity', { limit, offset });
  }

  async shareActivity(activity: {
    type: SocialActivity['type'];
    data: SocialActivity['data'];
    visibility: SocialActivity['visibility'];
  }): Promise<SocialActivity> {
    return await unifiedApiClient.post('/social/activity', activity);
  }

  async likeActivity(activityId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/social/activity/${activityId}/like`);
  }

  async unlikeActivity(activityId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.delete(`/social/activity/${activityId}/like`);
  }

  async commentOnActivity(
    activityId: string,
    comment: string
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/social/activity/${activityId}/comment`, {
      comment,
    });
  }

  async getActivityComments(activityId: string): Promise<Array<{
    id: string;
    comment: string;
    userId: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
    createdAt: string;
  }>> {
    return await unifiedApiClient.get(`/social/activity/${activityId}/comments`);
  }

  // Group Dining
  async createGroupDining(group: {
    name: string;
    description?: string;
    participantEmails: string[];
    restaurantId?: string;
    scheduledDate?: string;
  }): Promise<GroupDining> {
    return await unifiedApiClient.post('/social/group-dining', group);
  }

  async getGroupDiningEvents(): Promise<GroupDining[]> {
    return await unifiedApiClient.get('/social/group-dining');
  }

  async getGroupDiningEvent(groupId: string): Promise<GroupDining> {
    return await unifiedApiClient.get(`/social/group-dining/${groupId}`);
  }

  async updateGroupDining(
    groupId: string,
    updates: Partial<{
      name: string;
      description: string;
      restaurantId: string;
      scheduledDate: string;
      status: GroupDining['status'];
    }>
  ): Promise<GroupDining> {
    return await unifiedApiClient.put(`/social/group-dining/${groupId}`, updates);
  }

  async inviteToGroupDining(
    groupId: string,
    emails: string[]
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/social/group-dining/${groupId}/invite`, {
      emails,
    });
  }

  async respondToGroupInvite(
    groupId: string,
    response: 'accept' | 'decline'
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.put(`/social/group-dining/${groupId}/respond`, {
      response,
    });
  }

  async removeFromGroup(
    groupId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.delete(`/social/group-dining/${groupId}/participants/${userId}`);
  }

  // Collaborative Lists
  async createSharedList(list: {
    name: string;
    description?: string;
    visibility: 'public' | 'friends' | 'private';
    collaborators?: string[];
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    visibility: string;
    ownerId: string;
    collaborators: Array<{
      userId: string;
      permission: 'view' | 'edit' | 'admin';
      user: {
        id: string;
        name: string;
        avatar?: string;
      };
    }>;
    restaurants: any[];
    createdAt: string;
  }> {
    return await unifiedApiClient.post('/social/shared-lists', list);
  }

  async getSharedLists(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    visibility: string;
    ownerId: string;
    isOwner: boolean;
    permission: 'view' | 'edit' | 'admin';
    restaurantCount: number;
    collaboratorCount: number;
    updatedAt: string;
  }>> {
    return await unifiedApiClient.get('/social/shared-lists');
  }

  async addRestaurantToSharedList(
    listId: string,
    restaurantId: string,
    note?: string
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/social/shared-lists/${listId}/restaurants`, {
      restaurantId,
      note,
    });
  }

  async removeRestaurantFromSharedList(
    listId: string,
    restaurantId: string
  ): Promise<{ success: boolean }> {
    return await unifiedApiClient.delete(`/social/shared-lists/${listId}/restaurants/${restaurantId}`);
  }

  // Follow System
  async followRestaurant(restaurantId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/social/follow/restaurant/${restaurantId}`);
  }

  async unfollowRestaurant(restaurantId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.delete(`/social/follow/restaurant/${restaurantId}`);
  }

  async getFollowedRestaurants(): Promise<Array<{
    id: string;
    name: string;
    cuisineType: string;
    averageRating: number;
    priceRange: string;
    images: string[];
    followedAt: string;
    newUpdates?: boolean;
  }>> {
    return await unifiedApiClient.get('/social/followed-restaurants');
  }

  async followUser(userId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.post(`/social/follow/user/${userId}`);
  }

  async unfollowUser(userId: string): Promise<{ success: boolean }> {
    return await unifiedApiClient.delete(`/social/follow/user/${userId}`);
  }

  // Social Proof
  async getFriendsAtRestaurant(restaurantId: string): Promise<Array<{
    id: string;
    name: string;
    avatar?: string;
    visitCount: number;
    lastVisit: string;
    averageRating?: number;
  }>> {
    return await unifiedApiClient.get(`/social/friends-at-restaurant/${restaurantId}`);
  }

  async getFriendsRecommendations(restaurantId: string): Promise<Array<{
    friendId: string;
    friendName: string;
    friendAvatar?: string;
    rating: number;
    review?: string;
    visitDate: string;
  }>> {
    return await unifiedApiClient.get(`/social/friends-recommendations/${restaurantId}`);
  }

  // Social Statistics
  async getSocialStats(): Promise<{
    friends: number;
    followers: number;
    following: number;
    sharedLists: number;
    reviews: number;
    photos: number;
    checkins: number;
    groupDinings: number;
  }> {
    return await unifiedApiClient.get('/social/stats');
  }

  async getFriendStats(friendId: string): Promise<{
    mutualFriends: number;
    sharedRestaurants: number;
    similarTastes: number;
    totalInteractions: number;
    lastActivity: string;
  }> {
    return await unifiedApiClient.get(`/social/friends/${friendId}/stats`);
  }
}

// Singleton instance
export const friendsService = new FriendsService();

// React hooks
export function useFriends() {
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    friendsService
      .getFriends()
      .then(setFriends)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newFriends = await friendsService.getFriends();
      setFriends(newFriends);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { friends, loading, error, refresh };
}

export function useFriendRequests() {
  const [requests, setRequests] = React.useState<{
    sent: FriendRequest[];
    received: FriendRequest[];
  }>({ sent: [], received: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    friendsService
      .getFriendRequests()
      .then(setRequests)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const newRequests = await friendsService.getFriendRequests();
      setRequests(newRequests);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return { requests, loading, error, refresh };
}

export function useSocialActivity(limit = 20) {
  const [activities, setActivities] = React.useState<SocialActivity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);

  const loadActivities = React.useCallback(async (offset = 0, append = false) => {
    try {
      if (!append) setLoading(true);
      const result = await friendsService.getFriendsActivity(limit, offset);
      
      if (append) {
        setActivities(prev => [...prev, ...result.activities]);
      } else {
        setActivities(result.activities);
      }
      
      setHasMore(result.hasMore);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  React.useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const loadMore = React.useCallback(() => {
    if (hasMore && !loading) {
      loadActivities(activities.length, true);
    }
  }, [hasMore, loading, activities.length, loadActivities]);

  return { activities, loading, error, hasMore, loadMore, refresh: () => loadActivities() };
}

export function useGroupDining() {
  const [groups, setGroups] = React.useState<GroupDining[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    friendsService
      .getGroupDiningEvents()
      .then(setGroups)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const newGroups = await friendsService.getGroupDiningEvents();
      setGroups(newGroups);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return { groups, loading, error, refresh };
}

export default friendsService;