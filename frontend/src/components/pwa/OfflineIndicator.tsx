'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Check } from 'lucide-react';
import { useOffline } from '@/contexts/OfflineContext';

export const OfflineIndicator: React.FC = () => {
  const { 
    isOnline, 
    syncInProgress, 
    pendingActions, 
    syncPendingActions,
    lastSyncTime 
  } = useOffline();
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineMessage(true);
    } else {
      setShowOfflineMessage(false);
      
      // Auto-sync when coming back online
      if (pendingActions.length > 0) {
        syncPendingActions();
      }
    }
  }, [isOnline, pendingActions.length, syncPendingActions]);

  useEffect(() => {
    if (isOnline && !syncInProgress && pendingActions.every(action => action.synced)) {
      setShowSyncSuccess(true);
      const timer = setTimeout(() => setShowSyncSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncInProgress, pendingActions]);

  const handleSyncClick = () => {
    if (isOnline && !syncInProgress) {
      syncPendingActions();
    }
  };

  const getPendingActionsCount = () => {
    return pendingActions.filter(action => !action.synced).length;
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (showSyncSuccess) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
        <Check className="w-4 h-4" />
        <span className="text-sm font-medium">Synced</span>
      </div>
    );
  }

  if (!showOfflineMessage && isOnline && getPendingActionsCount() === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {showOfflineMessage && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 mb-2">
          <WifiOff className="w-4 h-4 offline-pulse" />
          <span className="text-sm font-medium">You're offline</span>
        </div>
      )}
      
      {isOnline && getPendingActionsCount() > 0 && (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Online</span>
            </div>
            <button
              onClick={handleSyncClick}
              disabled={syncInProgress}
              className="text-primary hover:text-primary/80 disabled:text-muted-foreground transition-colors"
              aria-label="Sync pending changes"
            >
              <RefreshCw className={`w-4 h-4 ${syncInProgress ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Pending changes:</span>
              <span className="font-medium">{getPendingActionsCount()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last sync:</span>
              <span>{formatLastSync()}</span>
            </div>
          </div>
          
          {syncInProgress && (
            <div className="mt-2 text-xs text-primary">
              Syncing changes...
            </div>
          )}
        </div>
      )}
    </div>
  );
};