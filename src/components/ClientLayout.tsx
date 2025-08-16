'use client';


import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';



interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  // Create a client instance for React Query
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          gcTime: 1000 * 60 * 10, // 10 minutes (replaces cacheTime)
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
        },
        mutations: {
          retry: 1, // Only retry mutations once
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider />
      <AuthProvider>
        {children}
      </AuthProvider>
      {/* Show React Query devtools in development only */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
} 