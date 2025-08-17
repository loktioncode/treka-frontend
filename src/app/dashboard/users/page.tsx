'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  userAPI, 
  clientAPI, 
  type User, 
  type Client, 
  type CreateUserRequest, 
  type CreateAdminRequest 
} from '@/services/api';
import { DataTable, type Column, type DataTableAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, RoleBadge } from '@/components/ui/badge';
import { 
  Form, 
  FormField, 
  FormLabel, 
  FormSection, 
  FormGrid, 
  FormActions, 
  Select, 
  Checkbox 
} from '@/components/ui/form';
import { 
  Users, 
  Trash2, 
  UserPlus, 
  Mail, 
  Shield, 
  ToggleLeft, 
  ToggleRight,
  Eye,
  Edit,
  Phone
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState<{ role: 'super_admin' | 'admin' | 'user' | ''; client_id?: string }>({ role: '' });
  const [showRoleChangeConfirmation, setShowRoleChangeConfirmation] = useState(false);
  
  // Debug role change data changes
  useEffect(() => {
    console.log('🔍 roleChangeData changed:', roleChangeData);
  }, [roleChangeData]);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateUserRequest & CreateAdminRequest>>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    client_id: '',
    notification_preferences: {
      email: true,
      whatsapp: false
    }
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Redirect unauthorized users
  useEffect(() => {
    if (user && !['super_admin', 'admin'].includes(user.role)) {
      toast.error('Access denied. Admin privileges required.');
      window.location.href = '/dashboard';
      return;
    }
  }, [user]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      if (user?.role === 'super_admin') {
        // Super admin sees all users
        const response = await userAPI.getAllUsers();
        console.log('🔍 Loaded users data:', response);
        
        // Check user ID fields
        response.forEach((userItem: User, index: number) => {
          console.log(`User ${index}:`, {
            id: userItem.id,
            email: userItem.email,
            role: userItem.role
          });
        });
        
        // Normalize user data to ensure we have valid ID fields
        const normalizedUsers = response.map((userItem: User) => ({
          ...userItem,
          id: userItem.id || `temp-${Date.now()}-${Math.random()}`
        }));
        
        console.log('🔍 Normalized users data:', normalizedUsers);
        setUsers(normalizedUsers);
      } else if (user?.role === 'admin' && user.client_id) {
        // Admin sees only their client's users
        const response = await clientAPI.getClientUsers(user.client_id);
        console.log('🔍 Loaded client users data:', response);
        
        // Normalize user data for admin view too
        const normalizedUsers = response.map((userItem: User) => ({
          ...userItem,
          id: userItem.id || `temp-${Date.now()}-${Math.random()}`
        }));
        
        setUsers(normalizedUsers);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadClients = useCallback(async () => {
    try {
      if (user?.role === 'super_admin') {
        // Super admin can see all clients
        const response = await clientAPI.getClients();
        console.log('🔍 Raw clients API response:', response);
        
        // Check client structure
        if (response.length > 0) {
          const sampleClient = response[0];
          console.log('🔍 Sample client structure:', {
            keys: Object.keys(sampleClient),
            id: sampleClient.id,
            name: sampleClient.name
          });
        }
        
        setClients(response);
      } else if (user?.role === 'admin' && user.client_id) {
        // Client admin can only see their own client
        const response = await clientAPI.getClient(user.client_id);
        console.log('🔍 Client admin client response:', response);
        setClients([response]);
      } else {
        // Regular users don't need client list
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  }, [user]);

  // Load data
  useEffect(() => {
    loadUsers();
    if (user?.role === 'super_admin' || user?.role === 'admin') {
      loadClients();
    }
  }, [user, loadUsers, loadClients]);

  // Utility function to get valid user ID
  const getValidUserId = (userItem: User): string => {
    const userId = userItem.id;
    if (!userId) {
      console.error('❌ No valid user ID found in user data:', userItem);
      throw new Error('User ID not found');
    }
    return userId;
  };

  // Test function to verify backend API endpoints
  const testBackendEndpoints = async () => {
    if (user?.role !== 'super_admin') return;
    
    console.log('🧪 Testing backend API endpoints...');
    
    try {
      // Test user list endpoint
      console.log('Testing user list endpoint...');
      const usersResponse = await userAPI.getAllUsers();
      console.log('✅ Users endpoint working:', usersResponse.length, 'users found');
      
      // Test clients endpoint
      console.log('Testing clients endpoint...');
      const clientsResponse = await clientAPI.getClients();
      console.log('✅ Clients endpoint working:', clientsResponse.length, 'clients found');
      
      // Test role update endpoint (dry run - just check if it's accessible)
      if (usersResponse.length > 0) {
        const testUser = usersResponse[0];
        console.log('Testing role update endpoint accessibility...');
        console.log('Test user:', { 
          id: testUser.id, 
          role: testUser.role,
          email: testUser.email,
          fullData: testUser
        });
        
        // Check which ID field is available
        if (testUser.id) {
          console.log('✅ Using id field for backend operations');
        } else {
          console.log('❌ No ID field found - this will cause issues!');
        }
        
        // Test the utility function
        try {
          const validId = getValidUserId(testUser);
          console.log('✅ Utility function works, valid ID:', validId);
        } catch (error) {
          console.error('❌ Utility function failed:', error);
        }
        
        // Log the raw API response to see the actual structure
        console.log('🔍 Raw user data structure:', JSON.stringify(testUser, null, 2));
      }
      
    } catch (error) {
      console.error('❌ Backend API test failed:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      client_id: user?.role === 'admin' ? user.client_id : '',
      notification_preferences: {
        email: true,
        whatsapp: false
      }
    });
    setFormErrors({});
    setIsCreatingAdmin(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password?.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }

    if (user?.role === 'super_admin' && isCreatingAdmin && !formData.client_id) {
      errors.client_id = 'Client is required for admin users';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (user?.role === 'super_admin' && isCreatingAdmin) {
        // Create admin user - ensure role is set to 'admin'
        const adminData = {
          ...formData,
          role: 'admin'
        } as CreateAdminRequest;
        
        console.log('Creating admin user with data:', adminData);
        await userAPI.createAdmin(adminData);
        toast.success('Admin user created successfully');
      } else if (user?.role === 'admin' && user.client_id) {
        // Create regular user for client
        await clientAPI.createClientUser(user.client_id, formData as CreateUserRequest);
        toast.success('User created successfully');
      } else if (user?.role === 'admin' && !user.client_id) {
        // Admin user doesn't have a client assigned
        toast.error('Admin user must be assigned to a client to create users. Please contact a super admin to assign you to a client.');
        return;
      } else if (user?.role === 'super_admin') {
        // This case shouldn't happen, but handle it
        toast.error('Please specify if creating an admin or select a client');
        return;
      }
      
      setShowCreateModal(false);
      await loadUsers();
      resetForm();
    } catch (error: unknown) {
      let message = 'Failed to create user';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
        
        // Provide better guidance for specific errors
        if (message.includes('Admin user must be assigned to a client')) {
          message = 'Admin user must be assigned to a client to create users. Please contact a super admin to assign you to a client.';
        }
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActivation = async (user: User) => {
    try {
      await userAPI.toggleUserActivation(user.id, !user.is_active);
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      await loadUsers();
      } catch (error: unknown) {
    let message = 'Failed to update user status';
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      message = axiosError.response?.data?.detail || message;
    }
    toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      // Use the utility function to get a valid user ID
      const userId = getValidUserId(selectedUser);
      console.log('🗑️ Deleting user with ID:', userId);
      console.log('🗑️ Selected user data:', selectedUser);
      
      await userAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error: unknown) {
      console.error('❌ Error deleting user:', error);
      let message = 'Failed to delete user';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
        console.error('❌ API Error details:', axiosError.response?.data);
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewUser = (user: User) => {
    console.log('👁️ View user clicked:', user);
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEditUser = (user: User) => {
    console.log('✏️ Edit user clicked:', user);
    setSelectedUser(user);
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      notification_preferences: user.notification_preferences
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    // Validate the form data before submission
    const errors: Record<string, string> = {};
    
    if (!editFormData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!editFormData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }
    
    if (!editFormData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }
    
    // Check if email is being changed and if it's different from current
    if (editFormData.email && editFormData.email !== selectedUser.email) {
      // Email is being changed - check if it's unique (this might be a backend validation)
      console.log('Email is being changed from', selectedUser.email, 'to', editFormData.email);
    }
    
    if (Object.keys(errors).length > 0) {
      // Show validation errors
      Object.values(errors).forEach(error => toast.error(error));
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Log the data being sent for debugging
      console.log('Updating user with data:', editFormData);
      console.log('User ID being updated:', selectedUser.id);
      console.log('Current user data:', selectedUser);
      
      // Only send fields that have actually changed
      const changedFields: Partial<User> = {};
      if (editFormData.email !== selectedUser.email) changedFields.email = editFormData.email;
      if (editFormData.first_name !== selectedUser.first_name) changedFields.first_name = editFormData.first_name;
      if (editFormData.last_name !== selectedUser.last_name) changedFields.last_name = editFormData.last_name;
      if (JSON.stringify(editFormData.notification_preferences) !== JSON.stringify(selectedUser.notification_preferences)) {
        changedFields.notification_preferences = editFormData.notification_preferences;
      }
      
      console.log('Only sending changed fields:', changedFields);
      
      // If no fields have changed, show a message and return
      if (Object.keys(changedFields).length === 0) {
        toast.success('No changes detected');
        return;
      }
      
      // Use the utility function to get a valid user ID
      let userId: string;
      try {
        userId = getValidUserId(selectedUser);
        console.log('Using user ID for user update:', userId);
      } catch (error) {
        console.error('❌ Failed to get valid user ID for user update:', error);
        toast.error('Invalid user data - cannot update user');
        return;
      }
      
      const result = await userAPI.updateUser(userId, changedFields);
      console.log('API response:', result);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error: unknown) {
      let message = 'Failed to update user';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
        console.error('API Error Details:', axiosError.response?.data);
        
        // Handle specific error cases based on error message
        if (message.includes('already exists') || message.includes('duplicate')) {
          message = 'Email address already exists. Please use a different email.';
        } else if (message.includes('permission') || message.includes('forbidden')) {
          message = 'You do not have permission to update this user.';
        } else if (message.includes('not found')) {
          message = 'User not found.';
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        // Handle network or other errors
        message = (error as Error).message;
        if (message.includes('Network Error') || message.includes('timeout')) {
          message = 'Network error. Please check your connection and try again.';
        }
      }
      toast.error(message);
      console.error('Error updating user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !roleChangeData.role) return;
    
    // Prevent users from changing their own role
    if (selectedUser.id === user?.id) {
      toast.error('You cannot change your own role');
      return;
    }
    
    // Prevent downgrading super admin if there's only one
    if (selectedUser.role === 'super_admin' && roleChangeData.role !== 'super_admin') {
      const superAdmins = users.filter(u => u.role === 'super_admin');
      if (superAdmins.length === 1) {
        toast.error('Cannot remove the last super admin');
        return;
      }
    }
    
    // Prevent role escalation attacks
    if (user?.role === 'admin' && roleChangeData.role === 'super_admin') {
      toast.error('Admins cannot promote users to super admin');
      return;
    }
    
    // Prevent changing super admin roles if not super admin
    if (user?.role !== 'super_admin' && selectedUser.role === 'super_admin') {
      toast.error('Only super admins can modify super admin roles');
      return;
    }
    
    // Prevent admins from changing other admin roles within the same client
    // This prevents privilege escalation attacks where one admin could remove another's privileges
    if (user?.role === 'admin' && selectedUser.role === 'admin' && user.client_id === selectedUser.client_id) {
      toast.error('Admins cannot modify other admin roles within the same client');
      return;
    }
    
    // Show confirmation for role changes
    setShowRoleChangeConfirmation(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser || !roleChangeData.role) return;
    
    // Additional validation before API call
    if (roleChangeData.role === selectedUser.role) {
      toast.error('No role change detected');
      return;
    }
    
    // Validate client assignment for admin roles
    if (roleChangeData.role === 'admin' && user?.role === 'super_admin' && !roleChangeData.client_id) {
      toast.error('Client assignment is required for admin users');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Log the role change data for debugging
      console.log('Role change request:', {
        userId: selectedUser.id,
        id: selectedUser.id,
        currentRole: selectedUser.role,
        newRole: roleChangeData.role,
        clientId: roleChangeData.client_id,
        user: selectedUser
      });
      
      // Validate client_id if it's being sent
      if (roleChangeData.client_id) {
        // Check if client_id is actually a valid client ID (not a name)
        const client = clients.find(c => c.id === roleChangeData.client_id);
        if (!client) {
          console.error('❌ Invalid client_id:', roleChangeData.client_id);
          console.log('Available clients:', clients);
          toast.error('Invalid client selection. Please try again.');
          return;
        }
        console.log('✅ Valid client found:', client);
      }
      
      // Use the utility function to get a valid user ID
      let userId: string;
      try {
        userId = getValidUserId(selectedUser);
        console.log('Using user ID for role update:', userId);
      } catch (error) {
        console.error('❌ Failed to get valid user ID:', error);
        toast.error('Invalid user data - cannot update role');
        return;
      }
      
      // Final validation before API call
      console.log('🚀 Sending role update to API:', {
        userId,
        role: roleChangeData.role,
        client_id: roleChangeData.client_id,
        fullPayload: { role: roleChangeData.role, client_id: roleChangeData.client_id }
      });
      
      const result = await userAPI.updateUserRole(userId, roleChangeData.role, roleChangeData.client_id);
      console.log('Role update API response:', result);
      
      toast.success('User role updated successfully');
      setShowRoleChangeModal(false);
      setShowRoleChangeConfirmation(false);
      setSelectedUser(null);
      setRoleChangeData({ role: '' });
      await loadUsers();
    } catch (error: unknown) {
      let message = 'Failed to update user role';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
        console.error('Role Update API Error Details:', axiosError.response?.data);
        
        // Handle specific error cases for role updates based on error message
        if (message.includes('conflict') || message.includes('not allowed')) {
          message = 'Role change conflict. This role change is not allowed.';
        } else if (message.includes('permission') || message.includes('forbidden')) {
          message = 'You do not have permission to change this user\'s role.';
        } else if (message.includes('not found')) {
          message = 'User not found.';
        } else if (message.includes('validation') || message.includes('client assignment')) {
          message = 'Role change validation failed. Please check the client assignment.';
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        // Handle network or other errors
        message = (error as Error).message;
        if (message.includes('Network Error') || message.includes('timeout')) {
          message = 'Network error. Please check your connection and try again.';
        }
      }
      toast.error(message);
      console.error('Error updating user role:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'email',
      title: 'User',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Users className="h-4 w-4 text-teal-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user.email}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      render: (userRow) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-400" />
          <RoleBadge role={userRow.role} size="sm" />
          {/* Show edit indicator if role can be changed */}
          {((user?.role === 'super_admin') || 
            (user?.role === 'admin' && user.client_id === userRow.client_id && userRow.role !== 'super_admin' && userRow.role !== 'admin')) && (
            <div className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded-full border border-teal-200">
              <Shield className="h-3 w-3 inline mr-1" />
              Editable
            </div>
          )}
        </div>
      )
    },
    {
      key: 'is_active',
      title: 'Status',
      render: (user) => (
        <StatusBadge 
          status={user.is_active ? 'active' : 'inactive'} 
          size="sm"
        />
      )
    },

    {
      key: 'created_at',
      title: 'Created',
      sortable: true,
      render: (user) => (
        <span className="text-sm text-gray-500">
          {formatDate(user.created_at)}
        </span>
      )
    }
  ];

  // Add client column for super admin view
  if (user?.role === 'super_admin') {
    columns.splice(2, 0, {
      key: 'client_id',
      title: 'Client',
      render: (user) => {
        if (user.role === 'super_admin') {
          return <span className="text-gray-400">-</span>;
        }
        const client = clients.find(c => c.id === user.client_id);
        return (
          <span className="text-sm text-gray-600">
            {client?.name || 'Unknown'}
          </span>
        );
      }
    });
  }

  const actions: DataTableAction<User>[] = [
    {
      key: 'view',
      label: 'View',
      icon: Eye,
      onClick: handleViewUser,
      variant: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: handleEditUser,
      variant: 'secondary'
    },
    {
      key: 'change_role',
      label: 'Change Role',
      icon: Shield,
      onClick: (u) => {
        setSelectedUser(u);
        setRoleChangeData({ role: u.role });
        setShowRoleChangeModal(true);
      },
      variant: 'secondary',
      show: (u) => {
        // Super admin can change any user's role
        if (user?.role === 'super_admin') return true;
        // Admin can only change roles of users under their client, but not other admins
        if (user?.role === 'admin' && user.client_id === u.client_id && u.role !== 'super_admin' && u.role !== 'admin') return true;
        return false;
      }
    },
    {
      key: 'activate',
      label: 'Activate',
      icon: ToggleLeft,
      onClick: handleToggleActivation,
      show: (u) => !u.is_active && u.id !== user?.id
    },
    {
      key: 'deactivate',
      label: 'Deactivate', 
      icon: ToggleRight,
      onClick: handleToggleActivation,
      show: (u) => u.is_active && u.id !== user?.id
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      onClick: (u) => {
        console.log('🗑️ Delete action clicked for user:', u);
        console.log('🗑️ Current user ID:', user?.id);
        console.log('🗑️ User ID to delete:', u.id);
        setSelectedUser(u);
        setShowDeleteModal(true);
      },
      show: (u) => {
        const canDelete = u.id !== user?.id;
        console.log('🗑️ Delete action visibility check:', {
          userId: u.id,
          currentUserId: user?.id,
          canDelete,
          userEmail: u.email
        });
        return canDelete; // Can't delete yourself
      }
    }
  ];

  if (!['super_admin', 'admin'].includes(user?.role || '')) {
    return null;
  }

  const userTypeOptions = user?.role === 'super_admin' 
    ? [
        { key: 'user', value: 'user', label: 'Regular User' },
        { key: 'admin', value: 'admin', label: 'Admin User' }
      ]
    : [];

  const clientOptions = clients.map(client => ({
            key: client.id,
        value: client.id,
    label: client.name
  }));
  
  // Debug client options
  console.log('🔍 Client options created:', clientOptions);
  console.log('🔍 Raw clients data:', clients);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">
            Manage user accounts and permissions
            {user?.role === 'admin' && ' for your organization'}
          </p>
        </div>
        
        {/* Backend Test Button for Super Admins */}
        {user?.role === 'super_admin' && (
          <Button
            variant="outline"
            onClick={testBackendEndpoints}
            className="text-sm"
          >
            🧪 Test Backend
          </Button>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.is_active).length}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-purple-600">
                  {users.filter(u => ['admin', 'super_admin'].includes(u.role)).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-teal-600">
                  {users.filter(u => {
                    const created = new Date(u.created_at);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <UserPlus className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Help message for admin users without client assignment */}
        {user?.role === 'admin' && !user.client_id && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800">
                  Admin Account Setup Required
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    Your admin account is not yet assigned to a client organization. 
                    You need to be assigned to a client before you can create users.
                  </p>
                  <p className="mt-1">
                    Please contact a super administrator to assign you to a client organization.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DataTable
          data={users}
          columns={columns}
          actions={actions}
          loading={loading}
          searchPlaceholder="Search users by name or email..."
          searchFields={['first_name', 'last_name', 'email']}
          addButton={{
            label: 'Add User',
            onClick: () => {
              resetForm();
              setShowCreateModal(true);
            }
          }}
          emptyState={{
            title: 'No users found',
            description: 'Get started by creating your first user account.',
            action: {
              label: 'Add User',
              onClick: () => {
                resetForm();
                setShowCreateModal(true);
              }
            }
          }}
        />
      </motion.div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create New User"
        size="lg"
      >
        <Form onSubmit={handleSubmit} errors={formErrors} isSubmitting={isSubmitting}>
          {/* Help message for admin users without client assignment */}
          {user?.role === 'admin' && !user.client_id && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Cannot Create Users
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Your admin account is not assigned to a client organization. 
                      You need to be assigned to a client before you can create users.
                    </p>
                    <p className="mt-1">
                      Please contact a super administrator to assign you to a client organization.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <FormSection title="User Type">
            {user?.role === 'super_admin' && (
              <FormField name="user_type">
                <FormLabel>User Type</FormLabel>
                <Select
                  options={userTypeOptions}
                  value={isCreatingAdmin ? 'admin' : 'user'}
                  onChange={(e) => setIsCreatingAdmin(e.target.value === 'admin')}
                  disabled={isSubmitting}
                />
              </FormField>
            )}

            {user?.role === 'super_admin' && isCreatingAdmin && (
              <FormField name="client_id">
                <FormLabel required>Client</FormLabel>
                <Select
                  options={clientOptions}
                  value={formData.client_id || ''}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  placeholder="Select a client"
                  disabled={isSubmitting}
                />
              </FormField>
            )}
          </FormSection>

          <FormSection title="User Information">
            <FormGrid cols={2}>
              <FormField name="first_name">
                <FormLabel required>First Name</FormLabel>
                <Input
                  value={formData.first_name || ''}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Enter first name"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField name="last_name">
                <FormLabel required>Last Name</FormLabel>
                <Input
                  value={formData.last_name || ''}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Enter last name"
                  disabled={isSubmitting}
                />
              </FormField>
            </FormGrid>

            <FormField name="email">
              <FormLabel required>Email Address</FormLabel>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                disabled={isSubmitting}
              />
            </FormField>

            <FormField name="password">
              <FormLabel required>Password</FormLabel>
              <Input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password (min 8 characters)"
                disabled={isSubmitting}
              />
            </FormField>
          </FormSection>

          <FormSection title="Notification Preferences">
            <div className="space-y-3">
              <Checkbox
                label="Email notifications"
                checked={formData.notification_preferences?.email || false}
                onChange={(e) => setFormData({
                  ...formData,
                  notification_preferences: {
                    email: e.target.checked,
                    whatsapp: formData.notification_preferences?.whatsapp || false
                  }
                })}
                disabled={isSubmitting}
              />
              <Checkbox
                label="WhatsApp notifications"
                checked={formData.notification_preferences?.whatsapp || false}
                onChange={(e) => setFormData({
                  ...formData,
                  notification_preferences: {
                    email: formData.notification_preferences?.email || false,
                    whatsapp: e.target.checked
                  }
                })}
                disabled={isSubmitting}
              />
            </div>
          </FormSection>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={isSubmitting}
              disabled={user?.role === 'admin' && !user.client_id}
            >
              Create {isCreatingAdmin ? 'Admin' : 'User'}
            </Button>
          </FormActions>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>? 
            This action cannot be undone and will remove all associated data.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={isSubmitting}
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      {/* View User Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedUser(null);
        }}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Personal Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <p className="text-gray-900">{selectedUser.first_name} {selectedUser.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Role</label>
                    <RoleBadge role={selectedUser.role} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Account Status</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <StatusBadge status={selectedUser.is_active ? 'active' : 'inactive'} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-gray-900">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-gray-900">{formatDate(selectedUser.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Notification Preferences</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">Email notifications</span>
                  <span className={`text-sm font-medium ${selectedUser.notification_preferences?.email ? 'text-green-600' : 'text-gray-400'}`}>
                    {selectedUser.notification_preferences?.email ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">WhatsApp notifications</span>
                  <span className={`text-sm font-medium ${selectedUser.notification_preferences?.whatsapp ? 'text-green-600' : 'text-gray-400'}`}>
                    {selectedUser.notification_preferences?.whatsapp ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant={selectedUser.is_active ? "destructive" : "default"}
                  onClick={async () => {
                    await handleToggleActivation(selectedUser);
                    setShowViewModal(false);
                  }}
                  className="flex items-center gap-2"
                >
                  {selectedUser.is_active ? (
                    <>
                      <ToggleRight className="h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4" />
                      Activate
                    </>
                  )}
                </Button>
                
                {/* Role Change Button - only show if user has permission */}
                {((user?.role === 'super_admin') || 
                  (user?.role === 'admin' && user.client_id === selectedUser.client_id && selectedUser.role !== 'super_admin' && selectedUser.role !== 'admin')) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowViewModal(false);
                      setRoleChangeData({ role: selectedUser.role });
                      setShowRoleChangeModal(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Change Role
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditUser(selectedUser);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedUser(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        title="Edit User"
        size="lg"
      >
        <Form onSubmit={handleUpdateUser} isSubmitting={isSubmitting}>
          <FormSection title="Personal Information">
            <FormGrid cols={2}>
              <FormField name="first_name">
                <FormLabel required>First Name</FormLabel>
                <Input
                  value={editFormData.first_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                  placeholder="Enter first name"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField name="last_name">
                <FormLabel required>Last Name</FormLabel>
                <Input
                  value={editFormData.last_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  placeholder="Enter last name"
                  disabled={isSubmitting}
                />
              </FormField>
            </FormGrid>

            <FormField name="email">
              <FormLabel required>Email Address</FormLabel>
              <Input
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="Enter email address"
                disabled={isSubmitting}
              />
            </FormField>
          </FormSection>

          <FormSection title="Notification Preferences">
            <div className="space-y-3">
              <Checkbox
                label="Email notifications"
                checked={editFormData.notification_preferences?.email || false}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  notification_preferences: {
                    email: e.target.checked,
                    whatsapp: editFormData.notification_preferences?.whatsapp || false
                  }
                })}
                disabled={isSubmitting}
              />
              <Checkbox
                label="WhatsApp notifications"
                checked={editFormData.notification_preferences?.whatsapp || false}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  notification_preferences: {
                    email: editFormData.notification_preferences?.email || false,
                    whatsapp: e.target.checked
                  }
                })}
                disabled={isSubmitting}
              />
            </div>
          </FormSection>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setSelectedUser(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            {/* Role Change Button - only show if user has permission */}
            {((user?.role === 'super_admin') || 
              (user?.role === 'admin' && user.client_id === selectedUser?.client_id && selectedUser?.role !== 'super_admin' && selectedUser?.role !== 'admin')) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setRoleChangeData({ role: selectedUser?.role || '' });
                  setShowRoleChangeModal(true);
                }}
                disabled={isSubmitting}
              >
                <Shield className="h-4 w-4 mr-2" />
                Change Role
              </Button>
            )}
            
            <Button type="submit" loading={isSubmitting}>
              Update User
            </Button>
          </FormActions>
        </Form>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        isOpen={showRoleChangeModal}
        onClose={() => {
          setShowRoleChangeModal(false);
          setSelectedUser(null);
          setRoleChangeData({ role: '' });
        }}
        title="Change User Role"
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Current User
              </label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900">
                  {selectedUser?.first_name} {selectedUser?.last_name}
                </div>
                <div className="text-sm text-gray-500">{selectedUser?.email}</div>
                <div className="text-sm text-gray-500">
                  Current Role: <span className="font-medium">{selectedUser?.role}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                New Role
              </label>
              <Select
                options={[
                  { key: 'user', value: 'user', label: 'Regular User' },
                  { key: 'admin', value: 'admin', label: 'Admin User' },
                  ...(user?.role === 'super_admin' ? [{ key: 'super_admin', value: 'super_admin', label: 'Super Admin' }] : [])
                ]}
                value={roleChangeData.role}
                onChange={(e) => setRoleChangeData({ ...roleChangeData, role: e.target.value as 'super_admin' | 'admin' | 'user' })}
                disabled={isSubmitting}
              />
            </div>

            {roleChangeData.role === 'admin' && user?.role === 'super_admin' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Client
                </label>
                <Select
                  options={clientOptions}
                  value={roleChangeData.client_id || ''}
                  onChange={(e) => {
                    console.log('Client selection changed:', {
                      selectedValue: e.target.value,
                      availableOptions: clientOptions,
                      currentRoleChangeData: roleChangeData
                    });
                    const newData = { ...roleChangeData, client_id: e.target.value };
                    console.log('Setting new role change data:', newData);
                    setRoleChangeData(newData);
                  }}
                  placeholder="Select a client"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {roleChangeData.role === 'admin' && user?.role === 'admin' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-700">
                  <strong>Note:</strong> This user will be assigned to your client organization.
                </div>
              </div>
            )}

            {roleChangeData.role === selectedUser?.role && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-sm text-gray-600">
                  <strong>Note:</strong> The selected role is the same as the current role.
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRoleChangeModal(false);
                setSelectedUser(null);
                setRoleChangeData({ role: '' });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleRoleChange}
              loading={isSubmitting}
              disabled={
                !roleChangeData.role || 
                (roleChangeData.role === 'admin' && user?.role === 'super_admin' && !roleChangeData.client_id) ||
                roleChangeData.role === selectedUser?.role
              }
            >
              Update Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Change Confirmation Modal */}
      <Modal
        isOpen={showRoleChangeConfirmation}
        onClose={() => {
          setShowRoleChangeConfirmation(false);
        }}
        title="Confirm Role Change"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">
              <strong>Warning:</strong> Changing a user&apos;s role will affect their permissions and access to the system.
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-gray-600">
              Are you sure you want to change <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>&apos;s role?
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">From:</span>
              <RoleBadge role={selectedUser?.role || 'user'} size="sm" />
              <span className="text-gray-500">To:</span>
              <RoleBadge role={roleChangeData.role || 'user'} size="sm" />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowRoleChangeConfirmation(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={confirmRoleChange}
              loading={isSubmitting}
            >
              Confirm Role Change
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
