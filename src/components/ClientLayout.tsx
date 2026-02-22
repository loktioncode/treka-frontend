'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { DataCacheProvider } from '@/contexts/DataCacheContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { TripPlanDraftProvider } from '@/contexts/TripPlanDraftContext';
import { ToastProvider } from '@/components/ToastProvider';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';



interface ClientLayoutProps {
  children: ReactNode;
}

const CACHE_KEY = 'treka-query-cache';
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes - avoid refetch when data is fresh
          gcTime: CACHE_MAX_AGE, // Match persist maxAge so cache survives
          retry: (failureCount, error: unknown) => {
            // Don't retry on authentication/authorization errors
            const errorWithResponse = error as { response?: { status?: number } };
            if (errorWithResponse?.response?.status && [401, 403, 404].includes(errorWithResponse.response.status)) {
              return false;
            }
            return failureCount < 3;
          },
          refetchOnWindowFocus: false, // Prevent unnecessary refetches
          refetchOnReconnect: true,    // Refetch when connection restored
          // Don't run queries when not authenticated
          enabled: () => {
            // Check if we have an auth token before running any queries
            if (typeof window !== 'undefined') {
              const token = localStorage.getItem('auth_token');
              return !!token;
            }
            return false;
          },
        },
        mutations: {
          retry: 1, // Only retry mutations once
        },
      },
    })
  );

  const persister =
    typeof window !== 'undefined'
      ? createSyncStoragePersister({
          storage: window.localStorage,
          key: CACHE_KEY,
        })
      : undefined;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persister ? { persister, maxAge: CACHE_MAX_AGE } : undefined}
    >
      <ToastProvider />
      <AuthProvider>
        <DataCacheProvider>
          <NavigationProvider>
            <NotificationProvider>
              <TripPlanDraftProvider>
                {children}
              </TripPlanDraftProvider>
            </NotificationProvider>
          </NavigationProvider>
        </DataCacheProvider>
      </AuthProvider>
      {/* Show React Query devtools in development only */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </PersistQueryClientProvider>
  );
} 