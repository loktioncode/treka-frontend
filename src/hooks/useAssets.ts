/**
 * React Query hooks for Fleet management
 * Provides caching, optimistic updates, and proper error handling
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetAPI, type Asset, type CreateAssetRequest, type AssetFilters, type PaginationParams } from '@/services/api';
import toast from 'react-hot-toast';

// Query keys for consistency
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: AssetFilters, params: PaginationParams = {}) => [...assetKeys.lists(), filters, params] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  clientAssets: (clientId: string, filters: AssetFilters, params: PaginationParams = {}) =>
    [...assetKeys.all, 'client', clientId, filters, params] as const,
};

/**
 * Hook to fetch all assets with caching and error handling
 */
export function useAssets(filters: AssetFilters = {}, params: PaginationParams = {}) {
  return useQuery({
    queryKey: assetKeys.list(filters, params),
    queryFn: () => assetAPI.getAssets(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,    // 5 minutes
  });
}

/**
 * Hook to fetch a single asset
 */
export function useAsset(assetId: string, enabled = true) {
  return useQuery({
    queryKey: assetKeys.detail(assetId),
    queryFn: () => assetAPI.getAsset(assetId),
    enabled: enabled && !!assetId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch client assets
 */
export function useClientAssets(clientId: string, filters: AssetFilters = {}, params: PaginationParams = {}) {
  return useQuery({
    queryKey: assetKeys.clientAssets(clientId, filters, params),
    queryFn: () => assetAPI.getClientAssets(clientId, filters),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 2, // 2 minutes for asset data
  });
}

/**
 * Hook to create a new asset with optimistic updates
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetData: CreateAssetRequest) => assetAPI.createAsset(assetData),
    onSuccess: (newAsset) => {
      // Invalidate and refetch assets list
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });

      // Add the new asset to the cache
      queryClient.setQueryData(assetKeys.detail(newAsset.id), newAsset);

      toast.success('Asset created successfully');
    },
    onError: (error: unknown) => {
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to create asset';
      toast.error(message);
    },
  });
}

/**
 * Hook to update an asset with optimistic updates
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, data }: { assetId: string; data: Partial<CreateAssetRequest> }) =>
      assetAPI.updateAsset(assetId, data),
    onMutate: async ({ assetId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: assetKeys.detail(assetId) });
      await queryClient.cancelQueries({ queryKey: assetKeys.lists() });

      // Snapshot previous values
      const previousAsset = queryClient.getQueryData<Asset>(assetKeys.detail(assetId));
      const previousAssets = queryClient.getQueryData<Asset[]>(assetKeys.lists());

      // Optimistically update asset detail
      if (previousAsset) {
        queryClient.setQueryData(assetKeys.detail(assetId), {
          ...previousAsset,
          ...data,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistically update assets list
      if (previousAssets) {
        queryClient.setQueryData(assetKeys.lists(),
          previousAssets.map(asset =>
            asset.id === assetId
              ? { ...asset, ...data, updated_at: new Date().toISOString() }
              : asset
          )
        );
      }

      return { previousAsset, previousAssets };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousAsset) {
        queryClient.setQueryData(assetKeys.detail(variables.assetId), context.previousAsset);
      }
      if (context?.previousAssets) {
        queryClient.setQueryData(assetKeys.lists(), context.previousAssets);
      }

      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to update asset';
      toast.error(message);
    },
    onSuccess: () => {
      toast.success('Asset updated successfully');
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

/**
 * Hook to delete an asset with optimistic updates
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) => assetAPI.deleteAsset(assetId),
    onMutate: async (assetId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: assetKeys.detail(assetId) });
      await queryClient.cancelQueries({ queryKey: assetKeys.lists() });

      // Snapshot previous values
      const previousAsset = queryClient.getQueryData<Asset>(assetKeys.detail(assetId));
      const previousAssets = queryClient.getQueryData<Asset[]>(assetKeys.lists());

      // Optimistically remove asset from list
      if (previousAssets) {
        queryClient.setQueryData(assetKeys.lists(),
          previousAssets.filter(asset => asset.id !== assetId)
        );
      }

      // Remove asset detail from cache
      queryClient.removeQueries({ queryKey: assetKeys.detail(assetId) });

      return { previousAsset, previousAssets };
    },
    onError: (error, assetId, context) => {
      // Rollback on error
      if (context?.previousAssets) {
        queryClient.setQueryData(assetKeys.lists(), context.previousAssets);
      }
      if (context?.previousAsset) {
        queryClient.setQueryData(assetKeys.detail(assetId), context.previousAsset);
      }

      toast.error('Failed to delete asset');
    },
    onSuccess: () => {
      toast.success('Asset deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

/**
 * Hook to fetch multiple assets by IDs
 */
export function useAssetsByIds(assetIds: string[], enabled = true) {
  return useQuery({
    queryKey: [...assetKeys.all, 'byIds', assetIds.sort()],
    queryFn: async () => {
      // Fetch assets one by one since there's no bulk endpoint
      const assets = await Promise.all(
        assetIds.map(id => assetAPI.getAsset(id))
      );
      return assets;
    },
    enabled: enabled && assetIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });
}
