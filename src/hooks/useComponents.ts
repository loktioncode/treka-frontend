/**
 * React Query hooks for component management
 * Provides caching, optimistic updates, and proper error handling
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { componentAPI, type Component, type CreateComponentRequest, type ComponentFilters, type PaginationParams } from '@/services/api';
import toast from 'react-hot-toast';

// Query keys for consistency
export const componentKeys = {
  all: ['components'] as const,
  lists: () => [...componentKeys.all, 'list'] as const,
  list: (filters: ComponentFilters, params: PaginationParams = {}) => [...componentKeys.lists(), filters, params] as const,
  details: () => [...componentKeys.all, 'detail'] as const,
  detail: (id: string) => [...componentKeys.details(), id] as const,
  clientComponents: (clientId: string, filters: ComponentFilters, params: PaginationParams = {}) => 
    [...componentKeys.all, 'client', clientId, filters, params] as const,
};

/**
 * Hook to fetch all components with caching and error handling
 */
export function useComponents(filters: ComponentFilters = {}, params: PaginationParams = {}) {
  return useQuery({
    queryKey: componentKeys.list(filters, params),
    queryFn: () => componentAPI.getComponents(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,    // 5 minutes
  });
}

/**
 * Hook to fetch a single component
 */
export function useComponent(componentId: string, enabled = true) {
  return useQuery({
    queryKey: componentKeys.detail(componentId),
    queryFn: () => componentAPI.getComponent(componentId),
    enabled: enabled && !!componentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch client components
 */
export function useClientComponents(clientId: string, filters: ComponentFilters = {}, params: PaginationParams = {}) {
  return useQuery({
    queryKey: componentKeys.clientComponents(clientId, filters, params),
    queryFn: () => componentAPI.getClientComponents(clientId, filters),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 2, // 2 minutes for component data
  });
}

/**
 * Hook to create a new component with optimistic updates
 */
export function useCreateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (componentData: CreateComponentRequest) => componentAPI.createComponent(componentData),
    onSuccess: (newComponent) => {
      // Invalidate and refetch components list
      queryClient.invalidateQueries({ queryKey: componentKeys.lists() });
      
      // Add the new component to the cache
      queryClient.setQueryData(componentKeys.detail(newComponent.id), newComponent);
      
      toast.success('Component created successfully');
    },
    onError: (error: unknown) => {
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to create component';
      toast.error(message);
    },
  });
}

/**
 * Hook to update a component with optimistic updates
 */
export function useUpdateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ componentId, data }: { componentId: string; data: Partial<CreateComponentRequest> }) =>
      componentAPI.updateComponent(componentId, data),
    onMutate: async ({ componentId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: componentKeys.detail(componentId) });
      await queryClient.cancelQueries({ queryKey: componentKeys.lists() });

      // Snapshot previous values
      const previousComponent = queryClient.getQueryData<Component>(componentKeys.detail(componentId));
      const previousComponents = queryClient.getQueryData<Component[]>(componentKeys.lists());

      // Optimistically update component detail
      if (previousComponent) {
        queryClient.setQueryData(componentKeys.detail(componentId), {
          ...previousComponent,
          ...data,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistically update components list
      if (previousComponents) {
        queryClient.setQueryData(componentKeys.lists(), 
          previousComponents.map(component => 
            component.id === componentId 
              ? { ...component, ...data, updated_at: new Date().toISOString() }
              : component
          )
        );
      }

      return { previousComponent, previousComponents };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousComponent) {
        queryClient.setQueryData(componentKeys.detail(variables.componentId), context.previousComponent);
      }
      if (context?.previousComponents) {
        queryClient.setQueryData(componentKeys.lists(), context.previousComponents);
      }
      
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to update component';
      toast.error(message);
    },
    onSuccess: () => {
      toast.success('Component updated successfully');
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: componentKeys.detail(variables.componentId) });
      queryClient.invalidateQueries({ queryKey: componentKeys.lists() });
    },
  });
}

/**
 * Hook to delete a component with optimistic updates
 */
export function useDeleteComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (componentId: string) => componentAPI.deleteComponent(componentId),
    onMutate: async (componentId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: componentKeys.detail(componentId) });
      await queryClient.cancelQueries({ queryKey: componentKeys.lists() });

      // Snapshot previous values
      const previousComponent = queryClient.getQueryData<Component>(componentKeys.detail(componentId));
      const previousComponents = queryClient.getQueryData<Component[]>(componentKeys.lists());

      // Optimistically remove component from list
      if (previousComponents) {
        queryClient.setQueryData(componentKeys.lists(), 
          previousComponents.filter(component => component.id !== componentId)
        );
      }

      // Remove component detail from cache
      queryClient.removeQueries({ queryKey: componentKeys.detail(componentId) });

      return { previousComponent, previousComponents };
    },
    onError: (error, componentId, context) => {
      // Rollback on error
      if (context?.previousComponents) {
        queryClient.setQueryData(componentKeys.lists(), context.previousComponents);
      }
      if (context?.previousComponent) {
        queryClient.setQueryData(componentKeys.detail(componentId), context.previousComponent);
      }
      
      toast.error('Failed to delete component');
    },
    onSuccess: () => {
      toast.success('Component deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: componentKeys.lists() });
    },
  });
}
