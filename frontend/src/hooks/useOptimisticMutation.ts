/**
 * Optimistic Mutation Hook
 * Provides immediate UI updates with automatic rollback on failure
 */

import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient, MutationOptions } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

// Types
export interface OptimisticMutationOptions<TData, TVariables, TContext> {
  // The mutation function
  mutationFn: (variables: TVariables) => Promise<TData>;
  
  // Generate optimistic data
  optimisticUpdate: (variables: TVariables, currentData: any) => any;
  
  // Query key(s) to update
  queryKey: string | string[];
  
  // Called on success
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  
  // Called on error
  onError?: (error: Error, variables: TVariables, context: TContext) => void;
  
  // Called on settle (success or error)
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables, context: TContext) => void;
  
  // Show toast notifications
  showToast?: boolean;
  
  // Toast messages
  toastMessages?: {
    loading?: string;
    success?: string;
    error?: string;
  };
  
  // Rollback delay (for animations)
  rollbackDelay?: number;
  
  // Retry configuration
  retry?: number | boolean;
  
  // Debounce time for rapid mutations
  debounceMs?: number;
}

interface MutationState<TData> {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  data: TData | null;
  error: Error | null;
}

/**
 * Hook for optimistic mutations with automatic rollback
 */
export function useOptimisticMutation<
  TData = unknown,
  TVariables = unknown,
  TContext = { previousData: any }
>(options: OptimisticMutationOptions<TData, TVariables, TContext>) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<MutationState<TData>>({
    isLoading: false,
    isError: false,
    isSuccess: false,
    data: null,
    error: null,
  });
  
  const toastId = useRef<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastVariables = useRef<TVariables | null>(null);

  const queryKeys = Array.isArray(options.queryKey) 
    ? options.queryKey 
    : [options.queryKey];

  const mutation = useMutation({
    mutationFn: options.mutationFn,
    
    // Before mutation: apply optimistic update
    onMutate: async (variables: TVariables): Promise<TContext> => {
      // Cancel any outgoing refetches
      for (const key of queryKeys) {
        await queryClient.cancelQueries({ queryKey: [key] });
      }

      // Snapshot previous values
      const previousData: Record<string, any> = {};
      for (const key of queryKeys) {
        previousData[key] = queryClient.getQueryData([key]);
      }

      // Apply optimistic update
      for (const key of queryKeys) {
        const currentData = queryClient.getQueryData([key]);
        const optimisticData = options.optimisticUpdate(variables, currentData);
        queryClient.setQueryData([key], optimisticData);
      }

      setState(prev => ({ ...prev, isLoading: true }));

      // Show loading toast
      if (options.showToast && options.toastMessages?.loading) {
        toastId.current = toast.loading(options.toastMessages.loading);
      }

      return { previousData } as TContext;
    },

    // On error: rollback
    onError: (error: Error, variables: TVariables, context: TContext | undefined) => {
      // Rollback to previous data
      if (context && (context as any).previousData) {
        const rollback = () => {
          for (const key of queryKeys) {
            const previousValue = (context as any).previousData[key];
            if (previousValue !== undefined) {
              queryClient.setQueryData([key], previousValue);
            }
          }
        };

        if (options.rollbackDelay) {
          setTimeout(rollback, options.rollbackDelay);
        } else {
          rollback();
        }
      }

      setState({
        isLoading: false,
        isError: true,
        isSuccess: false,
        data: null,
        error,
      });

      // Show error toast
      if (options.showToast) {
        if (toastId.current) {
          toast.error(options.toastMessages?.error || 'An error occurred', {
            id: toastId.current,
          });
        } else {
          toast.error(options.toastMessages?.error || 'An error occurred');
        }
      }

      options.onError?.(error, variables, context as TContext);
    },

    // On success: update with real data
    onSuccess: (data: TData, variables: TVariables, context: TContext | undefined) => {
      setState({
        isLoading: false,
        isError: false,
        isSuccess: true,
        data,
        error: null,
      });

      // Show success toast
      if (options.showToast) {
        if (toastId.current) {
          toast.success(options.toastMessages?.success || 'Success!', {
            id: toastId.current,
          });
        } else {
          toast.success(options.toastMessages?.success || 'Success!');
        }
      }

      options.onSuccess?.(data, variables, context as TContext);
    },

    // On settle: cleanup
    onSettled: (data, error, variables, context) => {
      // Invalidate queries to ensure fresh data
      for (const key of queryKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }

      toastId.current = null;

      options.onSettled?.(
        data as TData | undefined, 
        error as Error | null, 
        variables, 
        context as TContext
      );
    },

    retry: options.retry ?? false,
  });

  // Debounced mutate function
  const mutate = useCallback((variables: TVariables) => {
    if (options.debounceMs) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      
      lastVariables.current = variables;
      
      debounceTimer.current = setTimeout(() => {
        if (lastVariables.current) {
          mutation.mutate(lastVariables.current);
        }
      }, options.debounceMs);
    } else {
      mutation.mutate(variables);
    }
  }, [mutation, options.debounceMs]);

  // Async mutate
  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    return mutation.mutateAsync(variables);
  }, [mutation]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isError: false,
      isSuccess: false,
      data: null,
      error: null,
    });
    mutation.reset();
  }, [mutation]);

  return {
    mutate,
    mutateAsync,
    reset,
    ...state,
  };
}

/**
 * Pre-configured optimistic mutations for common operations
 */

// Reservation mutations
export function useOptimisticReservation() {
  const queryClient = useQueryClient();

  const createReservation = useOptimisticMutation({
    mutationFn: async (data: {
      restaurantId: string;
      date: string;
      time: string;
      partySize: number;
      specialRequests?: string;
    }) => {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create reservation');
      return response.json();
    },
    queryKey: 'reservations',
    optimisticUpdate: (variables, currentData) => {
      const tempId = `temp-${Date.now()}`;
      const newReservation = {
        id: tempId,
        ...variables,
        status: 'pending',
        createdAt: new Date().toISOString(),
        _optimistic: true,
      };
      
      if (Array.isArray(currentData)) {
        return [newReservation, ...currentData];
      }
      return currentData;
    },
    showToast: true,
    toastMessages: {
      loading: 'Creating reservation...',
      success: 'Reservation created!',
      error: 'Failed to create reservation',
    },
  });

  const cancelReservation = useOptimisticMutation({
    mutationFn: async (reservationId: string) => {
      const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to cancel reservation');
      return response.json();
    },
    queryKey: 'reservations',
    optimisticUpdate: (reservationId, currentData) => {
      if (Array.isArray(currentData)) {
        return currentData.map((r: any) =>
          r.id === reservationId
            ? { ...r, status: 'cancelled', _optimistic: true }
            : r
        );
      }
      return currentData;
    },
    showToast: true,
    toastMessages: {
      loading: 'Cancelling reservation...',
      success: 'Reservation cancelled',
      error: 'Failed to cancel reservation',
    },
    rollbackDelay: 300, // Allow animation to complete
  });

  const updateReservation = useOptimisticMutation({
    mutationFn: async (data: {
      id: string;
      date?: string;
      time?: string;
      partySize?: number;
      specialRequests?: string;
    }) => {
      const response = await fetch(`/api/reservations/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update reservation');
      return response.json();
    },
    queryKey: 'reservations',
    optimisticUpdate: (variables, currentData) => {
      if (Array.isArray(currentData)) {
        return currentData.map((r: any) =>
          r.id === variables.id
            ? { ...r, ...variables, _optimistic: true }
            : r
        );
      }
      return currentData;
    },
    showToast: true,
    toastMessages: {
      loading: 'Updating reservation...',
      success: 'Reservation updated!',
      error: 'Failed to update reservation',
    },
  });

  return {
    createReservation,
    cancelReservation,
    updateReservation,
  };
}

// Favorite mutations
export function useOptimisticFavorite() {
  return useOptimisticMutation({
    mutationFn: async (data: { restaurantId: string; action: 'add' | 'remove' }) => {
      const response = await fetch(`/api/favorites/${data.restaurantId}`, {
        method: data.action === 'add' ? 'POST' : 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to update favorites');
      return response.json();
    },
    queryKey: 'favorites',
    optimisticUpdate: (variables, currentData) => {
      const favorites = Array.isArray(currentData) ? currentData : [];
      
      if (variables.action === 'add') {
        return [...favorites, { 
          restaurantId: variables.restaurantId, 
          _optimistic: true 
        }];
      } else {
        return favorites.filter((f: any) => 
          f.restaurantId !== variables.restaurantId
        );
      }
    },
    showToast: true,
    toastMessages: {
      loading: 'Updating favorites...',
      success: 'Favorites updated!',
      error: 'Failed to update favorites',
    },
  });
}

// Review mutations
export function useOptimisticReview() {
  return useOptimisticMutation({
    mutationFn: async (data: {
      restaurantId: string;
      rating: number;
      comment: string;
    }) => {
      const response = await fetch(`/api/restaurants/${data.restaurantId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to submit review');
      return response.json();
    },
    queryKey: 'reviews',
    optimisticUpdate: (variables, currentData) => {
      const newReview = {
        id: `temp-${Date.now()}`,
        ...variables,
        createdAt: new Date().toISOString(),
        user: { name: 'You' }, // Placeholder
        _optimistic: true,
      };
      
      if (Array.isArray(currentData)) {
        return [newReview, ...currentData];
      }
      return currentData;
    },
    showToast: true,
    toastMessages: {
      loading: 'Submitting review...',
      success: 'Review submitted!',
      error: 'Failed to submit review',
    },
  });
}

export default useOptimisticMutation;

