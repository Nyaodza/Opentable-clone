'use client';

import React, { useState } from 'react';
import { useGroupDining, friendsService, type GroupDining } from '@/lib/social/friends';

interface GroupDiningListProps {
  className?: string;
}

export function GroupDiningList({ className = '' }: GroupDiningListProps) {
  const { groups, loading, error, refresh } = useGroupDining();
  const [selectedGroup, setSelectedGroup] = useState<GroupDining | null>(null);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg ${className}`}>
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="flex gap-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-8 h-8 bg-gray-200 rounded-full"></div>
                ))}
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
          <p>Failed to load group dining events: {error}</p>
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
          <h2 className="text-xl font-semibold text-gray-900">Group Dining Events</h2>
          <button
            onClick={refresh}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-medium mb-2">No group dining events</h3>
          <p className="text-sm">Create a group dining event to get started!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {groups.map((group) => (
            <GroupDiningItem
              key={group.id}
              group={group}
              onClick={() => setSelectedGroup(group)}
            />
          ))}
        </div>
      )}

      {/* Group Detail Modal */}
      {selectedGroup && (
        <GroupDiningModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onUpdate={refresh}
        />
      )}
    </div>
  );
}

interface GroupDiningItemProps {
  group: GroupDining;
  onClick: () => void;
}

function GroupDiningItem({ group, onClick }: GroupDiningItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const acceptedParticipants = group.participants.filter(p => p.status === 'accepted');
  const pendingParticipants = group.participants.filter(p => p.status === 'invited');

  return (
    <div 
      className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900">{group.name}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(group.status)}`}>
              {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
            </span>
          </div>
          
          {group.description && (
            <p className="text-gray-600 text-sm mb-3">{group.description}</p>
          )}

          <div className="space-y-2 text-sm text-gray-600">
            {group.scheduledDate && (
              <p>📅 {new Date(group.scheduledDate).toLocaleDateString()}</p>
            )}
            <p>👥 {acceptedParticipants.length} confirmed, {pendingParticipants.length} pending</p>
            <p>📝 Created {new Date(group.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex -space-x-2">
          {acceptedParticipants.slice(0, 4).map((participant) => (
            <div
              key={participant.userId}
              className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
              title={participant.user.name}
            >
              {participant.user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {acceptedParticipants.length > 4 && (
            <div className="w-8 h-8 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-white text-xs">
              +{acceptedParticipants.length - 4}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CreateGroupDiningProps {
  onCreated?: () => void;
  className?: string;
}

export function CreateGroupDining({ onCreated, className = '' }: CreateGroupDiningProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    participantEmails: [''],
    restaurantId: '',
    scheduledDate: '',
  });
  const [loading, setLoading] = useState(false);

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...formData.participantEmails];
    newEmails[index] = value;
    setFormData(prev => ({ ...prev, participantEmails: newEmails }));
  };

  const addEmailField = () => {
    setFormData(prev => ({
      ...prev,
      participantEmails: [...prev.participantEmails, '']
    }));
  };

  const removeEmailField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      participantEmails: prev.participantEmails.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const validEmails = formData.participantEmails.filter(email => email.trim());
    if (validEmails.length === 0) {
      alert('Please add at least one participant email');
      return;
    }

    setLoading(true);
    try {
      await friendsService.createGroupDining({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        participantEmails: validEmails,
        restaurantId: formData.restaurantId.trim() || undefined,
        scheduledDate: formData.scheduledDate || undefined,
      });

      setFormData({
        name: '',
        description: '',
        participantEmails: [''],
        restaurantId: '',
        scheduledDate: '',
      });
      
      onCreated?.();
    } catch (error) {
      alert('Failed to create group dining event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Group Dining Event</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Friday Night Dinner"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Let's try that new Italian place downtown!"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Participants *
          </label>
          <div className="space-y-2">
            {formData.participantEmails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  placeholder="friend@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.participantEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmailField(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addEmailField}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Another Email
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Restaurant (Optional)
          </label>
          <input
            type="text"
            value={formData.restaurantId}
            onChange={(e) => setFormData(prev => ({ ...prev, restaurantId: e.target.value }))}
            placeholder="Restaurant ID or name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scheduled Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={formData.scheduledDate}
            onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !formData.name.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Create Group Event'}
        </button>
      </form>
    </div>
  );
}

interface GroupDiningModalProps {
  group: GroupDining;
  onClose: () => void;
  onUpdate: () => void;
}

function GroupDiningModal({ group, onClose, onUpdate }: GroupDiningModalProps) {
  const [respondingToInvite, setRespondingToInvite] = useState(false);
  const [invitingEmails, setInvitingEmails] = useState(['']);
  const [loading, setLoading] = useState(false);

  const handleInviteResponse = async (response: 'accept' | 'decline') => {
    setRespondingToInvite(true);
    try {
      await friendsService.respondToGroupInvite(group.id, response);
      onUpdate();
      onClose();
    } catch (error) {
      alert(`Failed to ${response} invitation`);
    } finally {
      setRespondingToInvite(false);
    }
  };

  const handleInviteMore = async () => {
    const validEmails = invitingEmails.filter(email => email.trim());
    if (validEmails.length === 0) return;

    setLoading(true);
    try {
      await friendsService.inviteToGroupDining(group.id, validEmails);
      setInvitingEmails(['']);
      onUpdate();
    } catch (error) {
      alert('Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  const acceptedParticipants = group.participants.filter(p => p.status === 'accepted');
  const pendingParticipants = group.participants.filter(p => p.status === 'invited');
  const declinedParticipants = group.participants.filter(p => p.status === 'declined');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{group.name}</h2>
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

        <div className="p-6 space-y-6">
          {/* Group Info */}
          <div>
            {group.description && (
              <p className="text-gray-700 mb-4">{group.description}</p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">Status:</span>
                <span className="ml-2 capitalize">{group.status}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Created:</span>
                <span className="ml-2">{new Date(group.createdAt).toLocaleDateString()}</span>
              </div>
              {group.scheduledDate && (
                <div>
                  <span className="font-medium text-gray-900">Scheduled:</span>
                  <span className="ml-2">{new Date(group.scheduledDate).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Participants */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Participants ({acceptedParticipants.length} confirmed)
            </h3>
            
            {acceptedParticipants.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-green-700 mb-2">Confirmed</h4>
                <div className="space-y-2">
                  {acceptedParticipants.map((participant) => (
                    <div key={participant.userId} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {participant.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{participant.user.name}</span>
                      {participant.joinedAt && (
                        <span className="text-xs text-gray-500">
                          Joined {new Date(participant.joinedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingParticipants.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-yellow-700 mb-2">Pending</h4>
                <div className="space-y-2">
                  {pendingParticipants.map((participant) => (
                    <div key={participant.userId} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {participant.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{participant.user.name}</span>
                      <span className="text-xs text-gray-500">Invited</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {declinedParticipants.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-red-700 mb-2">Declined</h4>
                <div className="space-y-2">
                  {declinedParticipants.map((participant) => (
                    <div key={participant.userId} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {participant.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{participant.user.name}</span>
                      <span className="text-xs text-gray-500">Declined</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Invite More People */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Invite More People</h3>
            <div className="space-y-2">
              {invitingEmails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...invitingEmails];
                      newEmails[index] = e.target.value;
                      setInvitingEmails(newEmails);
                    }}
                    placeholder="friend@example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {invitingEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setInvitingEmails(emails => emails.filter((_, i) => i !== index))}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setInvitingEmails(emails => [...emails, ''])}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Another Email
              </button>
            </div>
            <button
              onClick={handleInviteMore}
              disabled={loading || !invitingEmails.some(email => email.trim())}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send Invitations'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => handleInviteResponse('accept')}
              disabled={respondingToInvite}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {respondingToInvite ? 'Responding...' : 'Accept Invitation'}
            </button>
            <button
              onClick={() => handleInviteResponse('decline')}
              disabled={respondingToInvite}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {respondingToInvite ? 'Responding...' : 'Decline Invitation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}