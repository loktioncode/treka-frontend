/**
 * React Query hooks for logistics analytics
 * Provides caching, optimistic updates, and proper error handling
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsAPI } from '@/services/api';
import toast from 'react-hot-toast';

/**
 * Hook to fetch logistics driver earnings data
 */
export const useDriverEarnings = (
  driverName?: string,
  dateRange: string = '1y', // Default to last 1 year instead of 30 days
  startDate?: string,
  endDate?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['logistics-driver-earnings', driverName, dateRange, startDate, endDate],
    queryFn: async () => {
      console.log('Calling analyticsAPI.getDriverEarnings with:', { driverName, dateRange, startDate, endDate });
      try {
        const result = await analyticsAPI.getDriverEarnings(dateRange, startDate, endDate);
        console.log('analyticsAPI.getDriverEarnings result:', result);
        return result;
      } catch (error) {
        console.error('analyticsAPI.getDriverEarnings error:', error);
        throw error;
      }
    },
    enabled: enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook to fetch logistics performance metrics
 */
export const useLogisticsPerformance = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['logistics-performance'],
    queryFn: () => {
      console.log('Calling analyticsAPI.getLogisticsPerformance');
      return analyticsAPI.getLogisticsPerformance();
    },
    enabled: enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook to upload earnings CSV file
 */
export const useUploadEarnings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      console.log('Calling analyticsAPI.uploadEarnings with file:', file.name);
      return analyticsAPI.uploadEarnings(file);
    },
    onSuccess: (data) => {
      console.log('Earnings upload successful:', data);
      toast.success(`Successfully uploaded earnings data for ${data.total_drivers} drivers`);
      
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['logistics-driver-earnings'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-performance'] });
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
    },
    onError: (error: Error) => {
      console.error('Earnings upload failed:', error);
      toast.error('Failed to upload earnings data. Please try again.');
    },
  });
};
