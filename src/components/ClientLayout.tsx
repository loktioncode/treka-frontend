'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "../app/globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
          retry: (failureCount, error: any) => {
            // Don't retry on authentication/authorization errors
            if (error?.response?.status && [401, 403, 404].includes(error.response.status)) {
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
    <html lang="en">
      <head>
        {/* Security headers */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
      </body>
    </html>
  );
} 