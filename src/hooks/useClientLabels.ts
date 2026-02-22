/**
 * Hook to get client-type-specific labels for logistics vs industrial.
 * Logistics: Assets → Vehicles, Components → Parts
 * Industrial: Assets, Components (default)
 */
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/hooks/useClients';

export function useClientLabels() {
  const { user } = useAuth();
  const { data: currentClient } = useClient(user?.client_id ?? '', !!user?.client_id);
  const isLogistics = currentClient?.client_type === 'logistics';

  return {
    assetLabel: isLogistics ? 'Vehicles' : 'Assets',
    assetLabelSingular: isLogistics ? 'Vehicle' : 'Asset',
    componentLabel: isLogistics ? 'Parts' : 'Components',
    componentLabelSingular: isLogistics ? 'Part' : 'Component',
    isLogistics,
  };
}
