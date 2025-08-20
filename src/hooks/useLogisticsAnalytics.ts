/**
 * React Query hooks for logistics analytics
 * Provides caching, optimistic updates, and proper error handling
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  analyticsAPI
} from '@/services/api';
import type { UploadEarningsResponse } from '@/types/api';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

// Query keys for consistency
export const logisticsKeys = {
  all: ['logistics'] as const,
  earnings: () => [...logisticsKeys.all, 'earnings'] as const,
  earningsList: (driverName?: string) => [...logisticsKeys.earnings(), driverName] as const,
  performance: () => [...logisticsKeys.all, 'performance'] as const,
};

/**
 * Hook to fetch driver earnings data
 */
export function useDriverEarnings(driverName?: string, dateRange?: string, startDate?: string, endDate?: string, enabled = true) {
  console.log('useDriverEarnings called with:', { driverName, dateRange, startDate, endDate, enabled });
  
  // Log when parameters change
  useEffect(() => {
    console.log('useDriverEarnings parameters changed:', { driverName, dateRange, startDate, endDate, enabled });
  }, [driverName, dateRange, startDate, endDate, enabled]);
  
  return useQuery({
    queryKey: [...logisticsKeys.earningsList(driverName), dateRange, startDate, endDate],
    queryFn: () => {
      console.log('Calling analyticsAPI.getLogisticsDriverEarnings with:', { driverName, dateRange, startDate, endDate });
      return analyticsAPI.getLogisticsDriverEarnings(driverName, dateRange, startDate, endDate);
    },
    enabled: enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });
}

/**
 * Hook to fetch logistics performance metrics
 */
export function useLogisticsPerformance(enabled = true) {
  return useQuery({
    queryKey: logisticsKeys.performance(),
    queryFn: () => analyticsAPI.getLogisticsPerformanceMetrics(),
    enabled: enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });
}

/**
 * Hook to upload earnings CSV file
 */
export function useUploadEarnings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => analyticsAPI.uploadLogisticsEarnings(file),
    onSuccess: (response: UploadEarningsResponse) => {
      // Invalidate and refetch earnings data
      queryClient.invalidateQueries({ queryKey: logisticsKeys.earnings() });
      
      toast.success(`Earnings data uploaded successfully! ${response.total_drivers} drivers, ${response.total_payments} payments`);
    },
    onError: (error: unknown) => {
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to upload earnings data';
      toast.error(message);
    },
  });
}
