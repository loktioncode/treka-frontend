/**
 * React Query hooks for user management
 * Provides caching, optimistic updates, and proper error handling
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI, clientAPI, type User, type CreateUserRequest, type CreateAdminRequest, type PaginationParams } from '@/services/api';
import toast from 'react-hot-toast';

// Query keys for consistency
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  clientUsers: (clientId: string) => [...userKeys.all, 'client', clientId] as const,
};

/**
 * Hook to fetch all users with caching and error handling
 */
export function useUsers(params: PaginationParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userAPI.getAllUsers(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,    // 5 minutes
  });
}

/**
 * Hook to fetch a single user
 */
export function useUser(userId: string, enabled = true) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userAPI.getAllUsers({}),
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 5,
    select: (users) => users.find((user: User) => user.id === userId),
  });
}

/**
 * Hook to fetch client users
 */
export function useClientUsers(clientId: string, params: PaginationParams = {}) {
  return useQuery({
    queryKey: userKeys.clientUsers(clientId),
    queryFn: () => clientAPI.getClientUsers(clientId, params),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 2, // 2 minutes for user data
  });
}

/**
 * Hook to create a new user with optimistic updates
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: CreateUserRequest) => userAPI.createUser(userData),
    onSuccess: (newUser) => {
      // Invalidate all user queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      
      // If a driver was created with uber_driver_uuid, invalidate payouts to update available drivers
      if (newUser.role === 'driver' && newUser.uber_driver_uuid) {
        queryClient.invalidateQueries({ queryKey: ['payouts'] });
      }
      
      // Add the new user to the cache
      queryClient.setQueryData(userKeys.detail(newUser.id), newUser);
      
      toast.success('User created successfully');
    },
    onError: (error: unknown) => {
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to create user';
      toast.error(message);
    },
  });
}

/**
 * Hook to create a new admin user with optimistic updates
 */
export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adminData: CreateAdminRequest) => userAPI.createAdmin(adminData),
    onSuccess: (newAdmin) => {
      // Invalidate all user queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      
      // If a driver was created with uber_driver_uuid, invalidate payouts to update available drivers
      if (newAdmin.role === 'driver' && newAdmin.uber_driver_uuid) {
        queryClient.invalidateQueries({ queryKey: ['payouts'] });
      }
      
      // Add the new admin to the cache
      queryClient.setQueryData(userKeys.detail(newAdmin.id), newAdmin);
      
      toast.success('Admin user created successfully');
    },
    onError: (error: unknown) => {
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to create admin user';
      toast.error(message);
    },
  });
}

/**
 * Hook to update a user with optimistic updates
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
      userAPI.updateUser(userId, data),
    onMutate: async ({ userId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });
      await queryClient.cancelQueries({ queryKey: userKeys.all });

      // Snapshot previous values
      const previousUser = queryClient.getQueryData<User>(userKeys.detail(userId));
      const previousUsers = queryClient.getQueryData<User[]>(userKeys.all);

      // Optimistically update user detail
      if (previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), {
          ...previousUser,
          ...data,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistically update users list
      if (previousUsers) {
        queryClient.setQueryData(userKeys.all, 
          previousUsers.map(user => 
            user.id === userId 
              ? { ...user, ...data, updated_at: new Date().toISOString() }
              : user
          )
        );
      }

      return { previousUser, previousUsers };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(variables.userId), context.previousUser);
      }
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.all, context.previousUsers);
      }
      
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to update user';
      toast.error(message);
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * Hook to update user role with optimistic updates
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role, clientId }: { userId: string; role: string; clientId?: string }) =>
      userAPI.updateUserRole(userId, role, clientId),
    onMutate: async ({ userId, role, clientId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });
      await queryClient.cancelQueries({ queryKey: userKeys.all });

      // Snapshot previous values
      const previousUser = queryClient.getQueryData<User>(userKeys.detail(userId));
      const previousUsers = queryClient.getQueryData<User[]>(userKeys.all);

      // Optimistically update user detail
      if (previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), {
          ...previousUser,
          role: role as User['role'],
          client_id: clientId,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistically update users list
      if (previousUsers) {
        queryClient.setQueryData(userKeys.all, 
          previousUsers.map(user => 
            user.id === userId 
              ? { ...user, role: role as User['role'], client_id: clientId, updated_at: new Date().toISOString() }
              : user
          )
        );
      }

      return { previousUser, previousUsers };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(variables.userId), context.previousUser);
      }
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.all, context.previousUsers);
      }
      
      const errorWithResponse = error as { response?: { data?: { detail?: string } } };
      const message = errorWithResponse?.response?.data?.detail || 'Failed to update user role';
      toast.error(message);
    },
    onSuccess: () => {
      toast.success('User role updated successfully');
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * Hook to toggle user activation with optimistic updates
 */
export function useToggleUserActivation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, activate }: { userId: string; activate: boolean }) =>
      userAPI.toggleUserActivation(userId, activate),
    onMutate: async ({ userId, activate }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });
      await queryClient.cancelQueries({ queryKey: userKeys.all });

      // Snapshot previous values
      const previousUser = queryClient.getQueryData<User>(userKeys.detail(userId));
      const previousUsers = queryClient.getQueryData<User[]>(userKeys.all);

      // Optimistically update user detail
      if (previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), {
          ...previousUser,
          is_active: activate,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistically update users list
      if (previousUsers) {
        queryClient.setQueryData(userKeys.all, 
          previousUsers.map(user => 
            user.id === userId 
              ? { ...user, is_active: activate, updated_at: new Date().toISOString() }
              : user
          )
        );
      }

      return { previousUser, previousUsers };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(variables.userId), context.previousUser);
      }
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.all, context.previousUsers);
      }
      
      toast.error('Failed to update user status');
    },
    onSuccess: (data, variables) => {
      toast.success(`User ${variables.activate ? 'activated' : 'deactivated'} successfully`);
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * Hook to delete a user with optimistic updates
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userAPI.deleteUser(userId),
    onMutate: async (userId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });
      await queryClient.cancelQueries({ queryKey: userKeys.all });

      // Snapshot previous values
      const previousUser = queryClient.getQueryData<User>(userKeys.detail(userId));
      const previousUsers = queryClient.getQueryData<User[]>(userKeys.all);

      // Optimistically remove user from list
      if (previousUsers) {
        queryClient.setQueryData(userKeys.all, 
          previousUsers.filter(user => user.id !== userId)
        );
      }

      // Remove user detail from cache
      queryClient.removeQueries({ queryKey: userKeys.detail(userId) });

      return { previousUser, previousUsers };
    },
    onError: (error, userId, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.all, context.previousUsers);
      }
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), context.previousUser);
      }
      
      toast.error('Failed to delete user');
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
