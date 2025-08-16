import { useEffect, useState } from 'react';

/**
 * Hook to safely detect if we're on the client side
 * Prevents hydration mismatches when using client-only APIs
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
