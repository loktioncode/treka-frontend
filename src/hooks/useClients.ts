/**
 * React Query hooks for client management
 * Provides caching, optimistic updates, and proper error handling
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAPI, type Client, type CreateClientRequest, type CreateUserRequest, type PaginationParams } from '@/services/api';
import toast from 'react-hot-toast';

// Query keys for consistency
export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...clientKeys.lists(), params] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
  users: (id: string) => [...clientKeys.detail(id), 'users'] as const,
};

/**
 * Hook to fetch all clients with caching and error handling
 */
export function useClients(params: PaginationParams = {}) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => clientAPI.getClients(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });
}

/**
 * Hook to fetch a single client
 */
export function useClient(clientId: string, enabled = true) {
  return useQuery({
    queryKey: clientKeys.detail(clientId),
    queryFn: () => clientAPI.getClient(clientId),
    enabled: enabled && !!clientId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch client users
 */
export function useClientUsers(clientId: string, params: PaginationParams = {}) {
  return useQuery({
    queryKey: clientKeys.users(clientId),
    queryFn: () => clientAPI.getClientUsers(clientId, params),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 2, // 2 minutes for user data
  });
}

/**
 * Hook to create a new client with optimistic updates
 */
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientData: CreateClientRequest) => clientAPI.createClient(clientData),
    onSuccess: (newClient) => {
      // Invalidate and refetch clients list
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      
      // Add the new client to the cache
      queryClient.setQueryData(clientKeys.detail(newClient.id), newClient);
      
      toast.success('Client created successfully');
    },
    onError: (error: unknown) => {
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to create client';
      toast.error(message);
    },
  });
}

/**
 * Hook to update a client with optimistic updates
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: Partial<CreateClientRequest> }) =>
      clientAPI.updateClient(clientId, data),
    onMutate: async ({ clientId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: clientKeys.detail(clientId) });

      // Snapshot previous value
      const previousClient = queryClient.getQueryData<Client>(clientKeys.detail(clientId));

      // Optimistically update
      if (previousClient) {
        queryClient.setQueryData(clientKeys.detail(clientId), {
          ...previousClient,
          ...data,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousClient };
    },
    onError: (error: unknown, { clientId }, context) => {
      // Rollback on error
      if (context?.previousClient) {
        queryClient.setQueryData(clientKeys.detail(clientId), context.previousClient);
      }
      
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to update client';
      toast.error(message);
    },
    onSuccess: (updatedClient) => {
      // Update cache with server response
      queryClient.setQueryData(clientKeys.detail(updatedClient.id), updatedClient);
      
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      
      toast.success('Client updated successfully');
    },
  });
}

/**
 * Hook to delete a client
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => clientAPI.deleteClient(clientId),
    onMutate: async (clientId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: clientKeys.detail(clientId) });
      await queryClient.cancelQueries({ queryKey: clientKeys.lists() });

      // Snapshot previous value
      const previousClients = queryClient.getQueryData<Client[]>(clientKeys.lists());

      // Optimistically remove from lists
      if (previousClients) {
        queryClient.setQueryData(
          clientKeys.lists(),
          previousClients.filter(client => client.id !== clientId)
        );
      }

      return { previousClients };
    },
    onError: (error: unknown, clientId, context) => {
      // Rollback on error
      if (context?.previousClients) {
        queryClient.setQueryData(clientKeys.lists(), context.previousClients);
      }
      
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to delete client';
      toast.error(message);
    },
    onSuccess: (_, clientId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: clientKeys.detail(clientId) });
      queryClient.removeQueries({ queryKey: clientKeys.users(clientId) });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      
      toast.success('Client deleted successfully');
    },
  });
}

/**
 * Hook to create a user for a specific client
 */
export function useCreateClientUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, userData }: { clientId: string; userData: CreateUserRequest }) =>
      clientAPI.createClientUser(clientId, userData),
    onSuccess: (_, { clientId }) => {
      // Invalidate client users query
      queryClient.invalidateQueries({ queryKey: clientKeys.users(clientId) });
      
      toast.success('User created successfully');
    },
    onError: (error: unknown) => {
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to create user';
      toast.error(message);
    },
  });
}
