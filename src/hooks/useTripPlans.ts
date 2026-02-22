/**
 * React Query hooks for trip plan management
 * Provides caching and proper error handling
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripPlanAPI } from '@/services/api';
import type { TripPlanCreate, TripPlanUpdate } from '@/types/api';
import toast from 'react-hot-toast';

// Query keys for consistency
export const tripPlanKeys = {
  all: ['trip-plans'] as const,
  lists: () => [...tripPlanKeys.all, 'list'] as const,
  list: (assetId?: string) => [...tripPlanKeys.lists(), assetId ?? 'all'] as const,
  details: () => [...tripPlanKeys.all, 'detail'] as const,
  detail: (id: string) => [...tripPlanKeys.details(), id] as const,
};

/**
 * Hook to fetch all trip plans (optionally filtered by asset) with caching
 */
export function useTripPlans(assetId?: string) {
  return useQuery({
    queryKey: tripPlanKeys.list(assetId),
    queryFn: () => tripPlanAPI.getTripPlans(assetId),
    staleTime: 1000 * 60 * 5, // 5 minutes - avoid unnecessary API calls
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });
}

/**
 * Hook to fetch a single trip plan
 */
export function useTripPlan(planId: string, enabled = true) {
  return useQuery({
    queryKey: tripPlanKeys.detail(planId),
    queryFn: () => tripPlanAPI.getTripPlan(planId),
    enabled: enabled && !!planId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to create a trip plan
 */
export function useCreateTripPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TripPlanCreate) => tripPlanAPI.createTripPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripPlanKeys.lists() });
      toast.success('Trip plan created');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Failed to create trip plan');
    },
  });
}

/**
 * Hook to update a trip plan
 */
export function useUpdateTripPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: TripPlanUpdate }) =>
      tripPlanAPI.updateTripPlan(planId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tripPlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tripPlanKeys.detail(variables.planId) });
      toast.success('Trip plan updated');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Failed to update trip plan');
    },
  });
}

/**
 * Hook to delete a trip plan
 */
export function useDeleteTripPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => tripPlanAPI.deleteTripPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripPlanKeys.lists() });
      toast.success('Trip plan deleted');
    },
    onError: () => {
      toast.error('Failed to delete trip plan');
    },
  });
}
