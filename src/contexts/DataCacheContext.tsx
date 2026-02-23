'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAssets } from '@/hooks/useAssets';
import { useUsers } from '@/hooks/useUsers';
import { useComponents } from '@/hooks/useComponents';
import { useTripPlans } from '@/hooks/useTripPlans';
import { useClients } from '@/hooks/useClients';
import { assetKeys } from '@/hooks/useAssets';
import { userKeys } from '@/hooks/useUsers';
import { componentKeys } from '@/hooks/useComponents';
import { tripPlanKeys } from '@/hooks/useTripPlans';
import { clientKeys } from '@/hooks/useClients';
import type { Asset, User, Component, TripPlan, Client } from '@/types/api';

export interface DataCacheState {
  /** Cached assets - avoid repeated API calls */
  assets: Asset[] | undefined;
  assetsLoading: boolean;
  assetsError: Error | null;
  /** Cached users */
  users: User[] | undefined;
  usersLoading: boolean;
  usersError: Error | null;
  /** Cached components */
  components: Component[] | undefined;
  componentsLoading: boolean;
  componentsError: Error | null;
  /** Cached trip plans */
  tripPlans: TripPlan[] | undefined;
  tripPlansLoading: boolean;
  tripPlansError: Error | null;
  /** Cached clients */
  clients: Client[] | undefined;
  clientsLoading: boolean;
  clientsError: Error | null;
  /** Refetch all cached data */
  refetchAll: () => void;
  /** Refetch specific cache */
  refetchAssets: () => void;
  refetchUsers: () => void;
  refetchComponents: () => void;
  refetchTripPlans: () => void;
  refetchClients: () => void;
}

const DataCacheContext = createContext<DataCacheState | undefined>(undefined);

/** Normalize API response to array - handles paginated vs list responses */
function toArray<T>(data: T[] | { items?: T[] } | undefined): T[] | undefined {
  if (!data) return undefined;
  if (Array.isArray(data)) return data;
  return (data as { items?: T[] }).items ?? [];
}

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const assetsQuery = useAssets({ limit: 500 });
  const usersQuery = useUsers({});
  const componentsQuery = useComponents({}, { limit: 500 });
  const tripPlansQuery = useTripPlans();
  const clientsQuery = useClients({});

  const assets = toArray(assetsQuery.data) as Asset[] | undefined;
  const users = Array.isArray(usersQuery.data) ? usersQuery.data : toArray(usersQuery.data) as User[] | undefined;
  const components = toArray(componentsQuery.data) as Component[] | undefined;
  const tripPlans = Array.isArray(tripPlansQuery.data) ? tripPlansQuery.data : (tripPlansQuery.data as TripPlan[] | undefined);
  const clients = toArray(clientsQuery.data) as Client[] | undefined;

  const refetchAssets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
  }, [queryClient]);

  const refetchUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: userKeys.lists() });
  }, [queryClient]);

  const refetchComponents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: componentKeys.lists() });
  }, [queryClient]);

  const refetchTripPlans = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: tripPlanKeys.lists() });
  }, [queryClient]);

  const refetchClients = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
  }, [queryClient]);

  const refetchAll = useCallback(() => {
    refetchAssets();
    refetchUsers();
    refetchComponents();
    refetchTripPlans();
    refetchClients();
  }, [refetchAssets, refetchUsers, refetchComponents, refetchTripPlans, refetchClients]);

  const value: DataCacheState = {
    assets,
    assetsLoading: assetsQuery.isLoading,
    assetsError: assetsQuery.error as Error | null,
    users,
    usersLoading: usersQuery.isLoading,
    usersError: usersQuery.error as Error | null,
    components,
    componentsLoading: componentsQuery.isLoading,
    componentsError: componentsQuery.error as Error | null,
    tripPlans: tripPlans ?? [],
    tripPlansLoading: tripPlansQuery.isLoading,
    tripPlansError: tripPlansQuery.error as Error | null,
    clients,
    clientsLoading: clientsQuery.isLoading,
    clientsError: clientsQuery.error as Error | null,
    refetchAll,
    refetchAssets,
    refetchUsers,
    refetchComponents,
    refetchTripPlans,
    refetchClients,
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}
