/**
 * React Query hooks for logistics analytics
 * Provides caching and proper error handling for telemetry data
 */
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '@/services/api';

/**
 * Hook to fetch fleet-wide telemetry summary
 */
export const useFleetTelemetry = (filters?: Record<string, any>, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['logistics-fleet-telemetry', filters],
    queryFn: async () => {
      console.log('Calling analyticsAPI.getFleetTelemetry with filters:', filters);
      try {
        const result = await analyticsAPI.getFleetTelemetry(filters);
        console.log('analyticsAPI.getFleetTelemetry result:', result);
        return result;
      } catch (error) {
        console.error('analyticsAPI.getFleetTelemetry error:', error);
        throw error;
      }
    },
    enabled: enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes - fresher data when DB is fallback
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
};
