'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { usePrefetch } from '@/hooks/usePrefetch';
import { LoadingOverlay } from '@/components/ui/loading-state';

interface NavigationContextType {
  isNavigating: boolean;
  navigateTo: (href: string, options?: { preload?: boolean; immediate?: boolean }) => void;
  preloadPage: (href: string) => void;
  currentPage: string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentPage, setCurrentPage] = useState('/dashboard');
  const router = useRouter();
  const pathname = usePathname();
  const { prefetchClients, prefetchClient, prefetchClientUsers } = usePrefetch();

  // Update current page when pathname changes
  useEffect(() => {
    setCurrentPage(pathname);
  }, [pathname]);

  const navigateTo = useCallback(async (href: string, options: { preload?: boolean; immediate?: boolean } = {}) => {
    const { preload = false, immediate = false } = options;

    if (preload) {
      // Preload the page data without navigation
      try {
        // Trigger any necessary data fetching for the target page
        // This will be handled by React Query's prefetching
        return;
      } catch (error) {
        console.error('Preload failed:', error);
      }
    }

    if (immediate) {
      // Immediate navigation without transition
      router.push(href);
      return;
    }

    // Smooth navigation with transition
    setIsNavigating(true);
    
    // Small delay to show transition
    await new Promise(resolve => setTimeout(resolve, 150));
    
    router.push(href);
    
    // Reset navigation state after a short delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  }, [router]);

  const preloadPage = useCallback((href: string) => {
    // Preload data based on the target page
    if (href.includes('/dashboard/clients/')) {
      const clientId = href.split('/').pop();
      if (clientId && clientId !== 'clients') {
        prefetchClient(clientId);
        prefetchClientUsers(clientId);
      }
    } else if (href === '/dashboard/clients') {
      prefetchClients();
    }
  }, [prefetchClients, prefetchClient, prefetchClientUsers]);

  return (
    <NavigationContext.Provider value={{
      isNavigating,
      navigateTo,
      preloadPage,
      currentPage
    }}>
      <AnimatePresence mode="wait">
        {isNavigating && (
          <LoadingOverlay key="navigation-overlay" text="Loading..." />
        )}
      </AnimatePresence>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
