'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePrefetch } from './usePrefetch';
import { useAuth } from '@/contexts/AuthContext';

export function useRoutePrefetch() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { prefetchClients, prefetchClient, prefetchClientUsers } = usePrefetch();

  useEffect(() => {
    // Only prefetch data if user is authenticated
    if (!user) return;

    // Preload data for adjacent routes based on current path and user role
    if (pathname === '/dashboard') {
      // Only prefetch clients for super admins on dashboard
      if (user.role === 'super_admin') {
        prefetchClients();
      }
    } else if (pathname === '/dashboard/clients') {
      // Only prefetch clients list for super admins
      if (user.role === 'super_admin') {
        prefetchClients();
      }
    } else if (pathname.startsWith('/dashboard/clients/')) {
      // Preload specific client data when viewing a client
      const clientId = pathname.split('/').pop();
      if (clientId && clientId !== 'clients') {
        // Only prefetch if user has access to this client
        if (user.role === 'super_admin' || 
            (user.role === 'admin' && user.client_id === clientId)) {
          prefetchClient(clientId);
          prefetchClientUsers(clientId);
        }
      }
    }
  }, [pathname, user, prefetchClients, prefetchClient, prefetchClientUsers]);
}
