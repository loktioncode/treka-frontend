'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clientKeys } from './useClients';
import { useAuth } from '@/contexts/AuthContext';

export function usePrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchClients = useCallback(async () => {
    try {
      // Only prefetch clients for super admins or when explicitly needed
      if (user?.role === 'super_admin') {
        await queryClient.prefetchQuery({
          queryKey: clientKeys.lists(),
          queryFn: () => import('@/services/api').then(api => api.clientAPI.getClients()),
          staleTime: 1000 * 60 * 5, // 5 minutes
        });
      }
    } catch (error) {
      console.error('Failed to prefetch clients:', error);
    }
  }, [queryClient, user?.role]);

  const prefetchClient = useCallback(async (clientId: string) => {
    try {
      // Only prefetch specific client if user has access to it
      if (user?.role === 'super_admin' || 
          (user?.role === 'admin' && user.client_id === clientId)) {
        await queryClient.prefetchQuery({
          queryKey: clientKeys.detail(clientId),
          queryFn: () => import('@/services/api').then(api => api.clientAPI.getClient(clientId)),
          staleTime: 1000 * 60 * 5,
        });
      }
    } catch (error) {
      console.error('Failed to prefetch client:', error);
    }
  }, [queryClient, user?.role, user?.client_id]);

  const prefetchClientUsers = useCallback(async (clientId: string) => {
    try {
      // Only prefetch client users if user has access to the client
      if (user?.role === 'super_admin' || 
          (user?.role === 'admin' && user.client_id === clientId)) {
        await queryClient.prefetchQuery({
          queryKey: clientKeys.users(clientId),
          queryFn: () => import('@/services/api').then(api => api.clientAPI.getClientUsers(clientId)),
          staleTime: 1000 * 60 * 2,
        });
      }
    } catch (error) {
      console.error('Failed to prefetch client users:', error);
    }
  }, [queryClient, user?.role, user?.client_id]);

  return {
    prefetchClients,
    prefetchClient,
    prefetchClientUsers,
  };
}
