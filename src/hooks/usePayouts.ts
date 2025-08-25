import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '@/services/api';

export interface PayoutDriver {
  uuid: string;
  first_name: string;
  surname: string;
  full_name: string;
  total_earnings: number;
  payment_count: number;
  last_updated: string;
}

export interface PayoutsResponse {
  message: string;
  summary: {
    total_drivers: number;
    total_earnings: number;
    total_payments: number;
  };
  payouts: PayoutDriver[];
}

export const usePayouts = (isLogisticsClient: boolean = true) => {
  return useQuery<PayoutsResponse>({
    queryKey: ['payouts'],
    queryFn: analyticsAPI.getAllPayouts,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    enabled: isLogisticsClient, // Only run for logistics clients
  });
};
