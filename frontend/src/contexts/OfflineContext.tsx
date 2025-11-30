'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { openDB, IDBPDatabase } from 'idb';

interface OfflineData {
  restaurants: any[];
  reservations: any[];
  user: any;
  favorites: any[];
  searchHistory: string[];
  lastSync: number;
}

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'reservation' | 'favorite' | 'review' | 'user';
  data: any;
  timestamp: number;
  synced: boolean;
}

interface OfflineContextType {
  isOnline: boolean;
  isInitialized: boolean;
  offlineData: OfflineData;
  pendingActions: OfflineAction[];
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  
  // Data methods
  getOfflineRestaurants: () => Promise<any[]>;
  saveOfflineRestaurants: (restaurants: any[]) => Promise<void>;
  getOfflineReservations: () => Promise<any[]>;
  saveOfflineReservations: (reservations: any[]) => Promise<void>;
  getFavorites: () => Promise<any[]>;
  addFavorite: (restaurant: any) => Promise<void>;
  removeFavorite: (restaurantId: string) => Promise<void>;
  
  // Action methods
  addPendingAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>) => Promise<void>;
  syncPendingActions: () => Promise<void>;
  clearPendingActions: () => Promise<void>;
  
  // Search methods
  addSearchHistory: (query: string) => Promise<void>;
  getSearchHistory: () => Promise<string[]>;
  clearSearchHistory: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

interface OfflineProviderProps {
  children: React.ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [db, setDb] = useState<IDBPDatabase | null>(null);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    restaurants: [],
    reservations: [],
    user: null,
    favorites: [],
    searchHistory: [],
    lastSync: 0,
  });
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await openDB('opentable-offline', 1, {
          upgrade(db) {
            // Create stores
            if (!db.objectStoreNames.contains('restaurants')) {
              db.createObjectStore('restaurants', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('reservations')) {
              db.createObjectStore('reservations', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('favorites')) {
              db.createObjectStore('favorites', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('searchHistory')) {
              db.createObjectStore('searchHistory', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('pendingActions')) {
              db.createObjectStore('pendingActions', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('metadata')) {
              db.createObjectStore('metadata', { keyPath: 'key' });
            }
          },
        });

        setDb(database);
        await loadOfflineData(database);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize offline database:', error);
      }
    };

    initDB();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        syncPendingActions();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const loadOfflineData = async (database: IDBPDatabase) => {
    try {
      const [restaurants, reservations, favorites, searchHistory, actions, metadata] = await Promise.all([
        database.getAll('restaurants'),
        database.getAll('reservations'),
        database.getAll('favorites'),
        database.getAll('searchHistory'),
        database.getAll('pendingActions'),
        database.get('metadata', 'lastSync'),
      ]);

      setOfflineData({
        restaurants,
        reservations,
        user: null, // Load from auth context
        favorites,
        searchHistory: searchHistory.map(item => item.query),
        lastSync: metadata?.value || 0,
      });

      setPendingActions(actions);
      setLastSyncTime(metadata?.value ? new Date(metadata.value) : null);
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const getOfflineRestaurants = useCallback(async (): Promise<any[]> => {
    if (!db) return [];
    return await db.getAll('restaurants');
  }, [db]);

  const saveOfflineRestaurants = useCallback(async (restaurants: any[]): Promise<void> => {
    if (!db) return;
    
    const tx = db.transaction('restaurants', 'readwrite');
    await Promise.all(restaurants.map(restaurant => tx.store.put(restaurant)));
    await tx.done;
    
    setOfflineData(prev => ({ ...prev, restaurants }));
  }, [db]);

  const getOfflineReservations = useCallback(async (): Promise<any[]> => {
    if (!db) return [];
    return await db.getAll('reservations');
  }, [db]);

  const saveOfflineReservations = useCallback(async (reservations: any[]): Promise<void> => {
    if (!db) return;
    
    const tx = db.transaction('reservations', 'readwrite');
    await Promise.all(reservations.map(reservation => tx.store.put(reservation)));
    await tx.done;
    
    setOfflineData(prev => ({ ...prev, reservations }));
  }, [db]);

  const getFavorites = useCallback(async (): Promise<any[]> => {
    if (!db) return [];
    return await db.getAll('favorites');
  }, [db]);

  const addFavorite = useCallback(async (restaurant: any): Promise<void> => {
    if (!db) return;
    
    await db.put('favorites', restaurant);
    
    if (!isOnline) {
      await addPendingAction({
        type: 'create',
        entity: 'favorite',
        data: restaurant,
      });
    }
    
    const updatedFavorites = await getFavorites();
    setOfflineData(prev => ({ ...prev, favorites: updatedFavorites }));
  }, [db, isOnline]);

  const removeFavorite = useCallback(async (restaurantId: string): Promise<void> => {
    if (!db) return;
    
    await db.delete('favorites', restaurantId);
    
    if (!isOnline) {
      await addPendingAction({
        type: 'delete',
        entity: 'favorite',
        data: { id: restaurantId },
      });
    }
    
    const updatedFavorites = await getFavorites();
    setOfflineData(prev => ({ ...prev, favorites: updatedFavorites }));
  }, [db, isOnline]);

  const addPendingAction = useCallback(async (
    action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>
  ): Promise<void> => {
    if (!db) return;
    
    const fullAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false,
    };
    
    await db.put('pendingActions', fullAction);
    setPendingActions(prev => [...prev, fullAction]);
  }, [db]);

  const syncPendingActions = useCallback(async (): Promise<void> => {
    if (!db || !isOnline || syncInProgress || pendingActions.length === 0) return;
    
    setSyncInProgress(true);
    
    try {
      const actionsToSync = pendingActions.filter(action => !action.synced);
      
      for (const action of actionsToSync) {
        try {
          // Here you would make API calls to sync the action
          // For now, we'll just mark them as synced
          await db.put('pendingActions', { ...action, synced: true });
          
          setPendingActions(prev => 
            prev.map(a => a.id === action.id ? { ...a, synced: true } : a)
          );
        } catch (error) {
          console.error('Failed to sync action:', action, error);
        }
      }
      
      // Update last sync time
      const now = Date.now();
      await db.put('metadata', { key: 'lastSync', value: now });
      setLastSyncTime(new Date(now));
      setOfflineData(prev => ({ ...prev, lastSync: now }));
      
    } catch (error) {
      console.error('Failed to sync pending actions:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [db, isOnline, syncInProgress, pendingActions]);

  const clearPendingActions = useCallback(async (): Promise<void> => {
    if (!db) return;
    
    await db.clear('pendingActions');
    setPendingActions([]);
  }, [db]);

  const addSearchHistory = useCallback(async (query: string): Promise<void> => {
    if (!db || !query.trim()) return;
    
    // Avoid duplicates
    const existing = await db.getAll('searchHistory');
    if (existing.some(item => item.query === query)) return;
    
    await db.add('searchHistory', { query, timestamp: Date.now() });
    
    const updated = await db.getAll('searchHistory');
    setOfflineData(prev => ({ 
      ...prev, 
      searchHistory: updated.map(item => item.query).slice(-20) // Keep last 20
    }));
  }, [db]);

  const getSearchHistory = useCallback(async (): Promise<string[]> => {
    if (!db) return [];
    
    const history = await db.getAll('searchHistory');
    return history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map(item => item.query);
  }, [db]);

  const clearSearchHistory = useCallback(async (): Promise<void> => {
    if (!db) return;
    
    await db.clear('searchHistory');
    setOfflineData(prev => ({ ...prev, searchHistory: [] }));
  }, [db]);

  const value: OfflineContextType = {
    isOnline,
    isInitialized,
    offlineData,
    pendingActions,
    syncInProgress,
    lastSyncTime,
    
    getOfflineRestaurants,
    saveOfflineRestaurants,
    getOfflineReservations,
    saveOfflineReservations,
    getFavorites,
    addFavorite,
    removeFavorite,
    
    addPendingAction,
    syncPendingActions,
    clearPendingActions,
    
    addSearchHistory,
    getSearchHistory,
    clearSearchHistory,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};