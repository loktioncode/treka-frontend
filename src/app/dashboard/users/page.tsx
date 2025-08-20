'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { 
  type User, 
  type Client,
  type CreateUserRequest, 
  type CreateAdminRequest 
} from '@/services/api';
import { 
  useUsers, 
  useCreateUser, 
  useCreateAdmin, 
  useUpdateUser, 
  useUpdateUserRole, 
  useToggleUserActivation, 
  useDeleteUser 
} from '@/hooks/useUsers';
import { useClients } from '@/hooks/useClients';
import { usePayouts } from '@/hooks/usePayouts';
import { DataTable, type Column, type DataTableAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatsCard } from '@/components/ui/stats-card';
import { RoleBadge } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
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
  Phone,
  Building2
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

// License number validation functions
const validateLicenseNumber = (licenseNumber: string, licenseType: string): { isValid: boolean; error: string } => {
  if (!licenseNumber.trim()) {
    return { isValid: false, error: 'License number is required' };
  }

  // Remove spaces and convert to uppercase for validation
  const cleanLicense = licenseNumber.replace(/\s/g, '').toUpperCase();

  // South African License Validation
  if (licenseType.startsWith('Code') || licenseType === 'PrDP' || licenseType === 'DDP') {
    // SA format: 1234567890123 (13 digits)
    if (!/^\d{13}$/.test(cleanLicense)) {
      return { isValid: false, error: 'South African license must be 13 digits' };
    }
    return { isValid: true, error: '' };
  }

  // Zimbabwean License Validation
  if (licenseType.startsWith('Class') || licenseType === 'PSV') {
    // ZW format: ZW123456789 (ZW + 9 digits) or 123456789 (9 digits)
    if (!/^(ZW)?\d{9}$/.test(cleanLicense)) {
      return { isValid: false, error: 'Zimbabwean license must be 9 digits or ZW + 9 digits' };
    }
    return { isValid: true, error: '' };
  }

  // Other license types - basic validation
  if (cleanLicense.length < 5 || cleanLicense.length > 20) {
    return { isValid: false, error: 'License number must be between 5 and 20 characters' };
  }

  return { isValid: true, error: '' };
};

export default function UsersPage() {
  const { user } = useAuth();
  
  // React Query hooks - backend now handles role-based filtering
  const { data: users = [], isLoading: loading } = useUsers();
  const { data: clients = [] } = useClients();
  const { data: payoutsData } = usePayouts();
  const createUserMutation = useCreateUser();
  const createAdminMutation = useCreateAdmin();
  const updateUserMutation = useUpdateUser();
  const updateUserRoleMutation = useUpdateUserRole();
  const toggleUserActivationMutation = useToggleUserActivation();
  const deleteUserMutation = useDeleteUser();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState<{ role: 'super_admin' | 'admin' | 'user' | 'technician' | 'driver' | ''; client_id?: string }>({ role: '' });
  const [showRoleChangeConfirmation, setShowRoleChangeConfirmation] = useState(false);
  
  // Debug role change data changes
  useEffect(() => {
    console.log('🔍 roleChangeData changed:', roleChangeData);
  }, [roleChangeData]);

  // Form state - using a union type that includes all necessary fields
  const [formData, setFormData] = useState<Partial<CreateUserRequest> & { client_id?: string }>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'user',
    client_id: '',
    hourly_rate: undefined,
    industry: undefined,
    specializations: [],
    license_number: undefined,
    license_type: undefined,
    license_front_image: undefined,
    license_back_image: undefined,
    vehicle_assignments: [],
    uber_driver_uuid: undefined,
    notification_preferences: {
      email: true,
      whatsapp: false
    }
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [editLicenseNumberError, setEditLicenseNumberError] = useState('');

  // Redirect unauthorized users
  useEffect(() => {
    if (user && !['super_admin', 'admin'].includes(user.role)) {
      toast.error('Access denied. Admin privileges required.');
      window.location.href = '/dashboard';
      return;
    }
  }, [user]);

  // React Query handles data loading automatically
  // No need for manual loadUsers or loadClients functions

  // Utility function to get valid user ID
  const getValidUserId = (userItem: User): string => {
    const userId = userItem.id;
    if (!userId) {
      console.error('❌ No valid user ID found in user data:', userItem);
      throw new Error('User ID not found');
    }
    return userId;
  };

  // React Query hooks handle all API calls automatically

  // Get available roles based on client type and current user role
  const getAvailableRoles = (currentUserRole?: string) => {
    const baseRoles = [
      { value: 'user', label: 'User' },
      { value: 'admin', label: 'Admin' }
    ];

    // If checking for a specific user's available roles (for role changes)
    if (currentUserRole) {
      // Drivers cannot be promoted to admin (business rule)
      if (currentUserRole === 'driver') {
        return [
          { value: 'user', label: 'User' },
          { value: 'technician', label: 'Technician' }
        ];
      }
      
      // Technicians can be promoted to user or admin
      if (currentUserRole === 'technician') {
        return [
          { value: 'user', label: 'User' },
          { value: 'admin', label: 'Admin' }
        ];
      }
      
      // Regular users can be promoted to admin
      if (currentUserRole === 'user') {
        return [
          { value: 'admin', label: 'Admin' },
          { value: 'technician', label: 'Technician' },
          { value: 'driver', label: 'Driver' }
        ];
      }
      
      // Admins can be demoted to user or technician
      if (currentUserRole === 'admin') {
        return [
          { value: 'user', label: 'User' },
          { value: 'technician', label: 'Technician' }
        ];
      }
    }

    // For admin users, determine roles based on their client type
    if (user?.role === 'admin' && user.client_id) {
      const currentClient = clients.find((c: Client) => c.id === user.client_id);
      if (currentClient?.client_type === 'logistics') {
        return [
          { value: 'user', label: 'User' },
          { value: 'driver', label: 'Driver' },
          { value: 'technician', label: 'Technician (Mechanic)' }
        ];
      } else if (currentClient?.client_type === 'industrial') {
        return [
          { value: 'user', label: 'User' },
          { value: 'technician', label: 'Technician' }
        ];
      }
      // Fallback for unknown client type
      return [{ value: 'user', label: 'User' }];
    }

    // For super admin, show all roles
    if (user?.role === 'super_admin') {
      return [
        { value: 'user', label: 'User' },
        { value: 'admin', label: 'Admin' },
        { value: 'technician', label: 'Technician' },
        { value: 'driver', label: 'Driver' }
      ];
    }

    return baseRoles;
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'user',
      client_id: '',
      hourly_rate: undefined,
      industry: undefined,
      specializations: [],
      license_number: undefined,
      license_type: undefined,
      license_front_image: undefined,
      license_back_image: undefined,
      vehicle_assignments: [],
      uber_driver_uuid: undefined,
      notification_preferences: {
        email: true,
        whatsapp: false
      }
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }

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

    // Role-specific validation
    if (formData.role === 'technician') {
      if (!formData.hourly_rate || formData.hourly_rate <= 0) {
        errors.hourly_rate = 'Hourly rate is required for technician role';
      }
    }

    if (formData.role === 'driver') {
      if (!formData.license_number?.trim()) {
        errors.license_number = 'License number is required for driver role';
      } else {
        if (!formData.license_type) {
          errors.license_type = 'License type is required when license number is provided';
        } else {
          const validation = validateLicenseNumber(formData.license_number, formData.license_type);
          if (!validation.isValid) {
            errors.license_number = validation.error;
          }
        }
      }
    }

    // Validate role availability based on client type
    if (user?.role === 'admin' && user.client_id) {
      const currentClient = clients.find((c: Client) => c.id === user.client_id);
      if (currentClient?.client_type === 'logistics' && !['user', 'driver', 'technician'].includes(formData.role || '')) {
        errors.role = 'Invalid role for logistics client';
      } else if (currentClient?.client_type === 'industrial' && !['user', 'technician'].includes(formData.role || '')) {
        errors.role = 'Invalid role for industrial client';
      }
    }

    // Client validation for admin users
    if (user?.role === 'super_admin' && isCreatingAdmin && !formData.client_id) {
      errors.client_id = 'Client is required for admin users';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if there are any changes in the edit form
  const hasChanges = () => {
    if (!selectedUser) return false;
    
    // Check basic fields
    if (editFormData.first_name !== selectedUser.first_name) return true;
    if (editFormData.last_name !== selectedUser.last_name) return true;
    if (editFormData.email !== selectedUser.email) return true;
    if (editFormData.hourly_rate !== selectedUser.hourly_rate) return true;
    if (editFormData.industry !== selectedUser.industry) return true;
    if (JSON.stringify(editFormData.specializations) !== JSON.stringify(selectedUser.specializations)) return true;
    if (JSON.stringify(editFormData.notification_preferences) !== JSON.stringify(selectedUser.notification_preferences)) return true;
    
    // Check driver fields
    if (editFormData.license_number !== selectedUser.license_number) return true;
    if (editFormData.license_type !== selectedUser.license_type) return true;
    if (JSON.stringify(editFormData.vehicle_assignments) !== JSON.stringify(selectedUser.vehicle_assignments)) return true;
    
    return false;
  };

  // Check if the edit form is valid
  const isEditFormValid = () => {
    // Check required fields
    if (!editFormData.first_name?.trim()) return false;
    if (!editFormData.last_name?.trim()) return false;
    if (!editFormData.email?.trim()) return false;
    
    // Check email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email || '')) return false;
    
    // Check driver-specific validation
    if (editFormData.role === 'driver') {
      if (!editFormData.license_number?.trim()) return false;
      if (!editFormData.license_type) return false;
      
      // Validate license number format
      const validation = validateLicenseNumber(editFormData.license_number, editFormData.license_type);
      if (!validation.isValid) return false;
    }
    
    return true;
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Additional license number validation for drivers
    if (formData.role === 'driver' && formData.license_number?.trim() && formData.license_type) {
      const validation = validateLicenseNumber(formData.license_number, formData.license_type);
      if (!validation.isValid) {
        setFormErrors(prev => ({ ...prev, license_number: validation.error }));
        return;
      }
    }
    
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
        await createAdminMutation.mutateAsync(adminData);
      } else if (user?.role === 'admin' && user.client_id) {
        // Create regular user for client - use the role from form data
        const userData = {
          ...formData,
          role: formData.role || 'user'
        } as CreateUserRequest;
        
        console.log('🔍 Creating client user with data:', userData);
        console.log('🔍 Client ID:', user.client_id);
        console.log('🔍 User role:', userData.role);
        console.log('🔍 Form data role:', formData.role);
        console.log('🔍 Available roles:', getAvailableRoles());
        
        await createUserMutation.mutateAsync(userData);
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
      await toggleUserActivationMutation.mutateAsync({ 
        userId: user.id, 
        activate: !user.is_active 
      });
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
      
      await deleteUserMutation.mutateAsync(userId);
      
      setShowDeleteModal(false);
      setSelectedUser(null);
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
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    console.log('✏️ Edit user clicked:', user);
    console.log('🔍 User license data:', {
      license_number: user.license_number,
      license_type: user.license_type,
      vehicle_assignments: user.vehicle_assignments
    });
    setSelectedUser(user);
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      hourly_rate: user.hourly_rate,
      industry: user.industry,
      specializations: user.specializations,
      license_number: user.license_number || '',
      license_type: user.license_type || '',
      license_front_image: user.license_front_image || '',
      license_back_image: user.license_back_image || '',
      vehicle_assignments: user.vehicle_assignments || [],
      uber_driver_uuid: user.uber_driver_uuid || '',
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
    
    // License number validation for drivers
    if (editFormData.role === 'driver') {
      if (!editFormData.license_number?.trim()) {
        errors.license_number = 'License number is required for driver role';
      } else {
        if (!editFormData.license_type) {
          errors.license_type = 'License type is required when license number is provided';
        } else {
          const validation = validateLicenseNumber(editFormData.license_number, editFormData.license_type);
          if (!validation.isValid) {
            errors.license_number = validation.error;
          }
        }
      }
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
      if (editFormData.hourly_rate !== selectedUser.hourly_rate) changedFields.hourly_rate = editFormData.hourly_rate;
      if (editFormData.industry !== selectedUser.industry) changedFields.industry = editFormData.industry;
      if (JSON.stringify(editFormData.specializations) !== JSON.stringify(selectedUser.specializations)) {
        changedFields.specializations = editFormData.specializations;
      }
      if (JSON.stringify(editFormData.notification_preferences) !== JSON.stringify(selectedUser.notification_preferences)) {
        changedFields.notification_preferences = editFormData.notification_preferences;
      }
      
      // Check driver-specific fields
      if (editFormData.license_number !== selectedUser.license_number) {
        changedFields.license_number = editFormData.license_number;
      }
      if (editFormData.license_type !== selectedUser.license_type) {
        changedFields.license_type = editFormData.license_type;
      }
      if (JSON.stringify(editFormData.vehicle_assignments) !== JSON.stringify(selectedUser.vehicle_assignments)) {
        changedFields.vehicle_assignments = editFormData.vehicle_assignments;
      }
      if (editFormData.uber_driver_uuid !== selectedUser.uber_driver_uuid) {
        changedFields.uber_driver_uuid = editFormData.uber_driver_uuid;
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
      
      await updateUserMutation.mutateAsync({ userId, data: changedFields });
      
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
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
      const superAdmins = users.filter((u: User) => u.role === 'super_admin');
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
    
    // Prevent drivers from being upgraded to admin (business rule)
    if (selectedUser.role === 'driver' && roleChangeData.role === 'admin') {
      toast.error('Drivers cannot be promoted to admin role. Drivers must first be upgraded to regular user, then to admin.');
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
          const client = clients.find((c: Client) => c.id === roleChangeData.client_id);
        if (!client) {
      
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
      } catch {
        toast.error('Invalid user data - cannot update role');
        return;
      }
      
      
      await updateUserRoleMutation.mutateAsync({ 
        userId, 
        role: roleChangeData.role, 
        clientId: roleChangeData.client_id 
      });
      
      setShowRoleChangeModal(false);
      setShowRoleChangeConfirmation(false);
      setSelectedUser(null);
      setRoleChangeData({ role: '' });
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
        <RoleBadge role={userRow.role} size="sm" />
      )
    },
    {
      key: 'hourly_rate',
      title: 'Hourly Rate',
      render: (user) => (
        <div className="text-sm">
          {user.hourly_rate ? (
            <span className="text-green-600 font-medium">${user.hourly_rate}/hr</span>
          ) : (
            <span className="text-gray-400">Not set</span>
          )}
        </div>
      )
    },
    {
      key: 'industry',
      title: 'Industry',
      render: (user) => (
        <div className="text-sm">
          {user.role === 'driver' ? (
            <span className="text-blue-600 font-medium">logistics/trans</span>
          ) : user.industry ? (
            <span className="text-blue-600 font-medium">{user.industry}</span>
          ) : (
            <span className="text-gray-400">Not set</span>
          )}
        </div>
      )
    },

    {
      key: 'uber_driver_uuid',
      title: 'Linked Driver',
      render: (user) => (
        <div className="text-sm">
          {user.uber_driver_uuid ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {user.uber_driver_uuid.slice(0, 8)}...
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    },
    {
      key: 'is_active',
      title: 'Status',
      render: (user) => (
        <Badge 
          variant={user.is_active ? 'success' : 'destructive'} 
          className="text-xs"
        >
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
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
    columns.splice(5, 0, {
      key: 'client_id',
      title: 'Client',
      render: (user) => {
        if (user.role === 'super_admin') {
          return <span className="text-gray-400">-</span>;
        }
        const client = clients.find((c: Client) => c.id === user.client_id);
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
        // Admin can only change roles of users under their client, but not other admins or drivers
        if (user?.role === 'admin' && user.client_id === u.client_id && u.role !== 'super_admin' && u.role !== 'admin' && u.role !== 'driver') return true;
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

  const clientOptions = clients.map((client: Client) => ({
    key: client.id,
    value: client.id,
    label: client.name
  }));
  
  // Debug client options
  console.log('Client options created:', clientOptions);
  console.log('Raw clients data:', clients);

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

      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <StatsCard
          title="Total Users"
          value={users.length.toString()}
          description="In system"
          icon={Users}
          color="blue"
          trend={{ value: "12%", isPositive: true, label: "vs last month" }}
        />
        <StatsCard
          title="Active Users"
          value={users.filter((u: User) => u.is_active).length.toString()}
          description="Currently active"
          icon={Users}
          color="green"
          trend={{ value: "5%", isPositive: true, label: "vs last week" }}
        />
        <StatsCard
          title="Admins"
          value={users.filter((u: User) => ['admin', 'super_admin'].includes(u.role)).length.toString()}
          description="Admin users"
          icon={Shield}
          color="purple"
          trend={{ value: "2", isPositive: true, label: "new this month" }}
        />
        <StatsCard
          title="This Month"
          value={users.filter((u: User) => {
            const created = new Date(u.created_at);
            const now = new Date();
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
          }).length.toString()}
          description="New users"
          icon={UserPlus}
          color="teal"
          trend={{ value: "8%", isPositive: true, label: "vs last month" }}
        />
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

            <FormField name="role">
              <FormLabel>Role</FormLabel>
              <Select
                options={getAvailableRoles()}
                value={formData.role || 'user'}
                onChange={(e) => {
                  const newRole = e.target.value as CreateUserRequest['role'];
                  console.log('🔍 Role changed to:', newRole);
                  setFormData({ ...formData, role: newRole });
                  
                  // Clear related errors when role changes
                  if (newRole !== 'driver') {
                    setFormErrors(prev => ({ ...prev, license_number: '', license_type: '' }));
                  }
                  if (newRole !== 'technician') {
                    setFormErrors(prev => ({ ...prev, industry: '', specializations: '' }));
                  }
                  if (newRole !== 'admin') {
                    setFormErrors(prev => ({ ...prev, client_id: '' }));
                  }
                }}
                disabled={isSubmitting}
              />
              <p className="text-sm text-gray-500 mt-1">
                {user?.role === 'admin' && user.client_id && clients.find((c: Client) => c.id === user.client_id)?.client_type === 'logistics' 
                  ? 'Logistics clients can have drivers and technician mechanics for vehicle maintenance'
                  : user?.role === 'admin' && user.client_id && clients.find((c: Client) => c.id === user.client_id)?.client_type === 'industrial'
                  ? 'Industrial clients can have technicians for equipment maintenance'
                  : 'Select the appropriate role for this user'
                }
              </p>
            </FormField>

            {/* Technician-specific fields */}
            {formData.role === 'technician' && (
              <>
                <FormField name="hourly_rate">
                  <FormLabel required>Hourly Rate</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourly_rate || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    placeholder="Enter hourly rate for technician work"
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Set hourly rate for maintenance work cost calculations
                  </p>
                </FormField>

                <FormField name="industry">
                  <FormLabel>Industry (Optional)</FormLabel>
                  <Select
                    value={formData.industry || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      industry: e.target.value || undefined,
                      specializations: [] // Reset specializations when industry changes
                    })}
                    options={[
                      { value: '', label: 'Select industry' },
                      { value: 'Manufacturing', label: 'Manufacturing' },
                      { value: 'Construction', label: 'Construction' },
                      { value: 'Healthcare', label: 'Healthcare' },
                      { value: 'Transportation', label: 'Transportation' },
                      { value: 'Energy', label: 'Energy' },
                      { value: 'Technology', label: 'Technology' },
                      { value: 'Agriculture', label: 'Agriculture' },
                      { value: 'Mining', label: 'Mining' },
                      { value: 'Chemical', label: 'Chemical' },
                      { value: 'Food & Beverage', label: 'Food & Beverage' },
                      { value: 'Pharmaceuticals', label: 'Pharmaceuticals' },
                      { value: 'Automotive', label: 'Automotive' },
                      { value: 'Aerospace', label: 'Aerospace' },
                      { value: 'Maritime', label: 'Maritime' },
                      { value: 'Telecommunications', label: 'Telecommunications' },
                      { value: 'Utilities', label: 'Utilities' },
                      { value: 'Waste Management', label: 'Waste Management' },
                      { value: 'Textiles', label: 'Textiles' },
                      { value: 'Paper & Pulp', label: 'Paper & Pulp' },
                      { value: 'Other', label: 'Other' }
                    ]}
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Select primary industry for future auto-assignment
                  </p>
                </FormField>

                {formData.industry && (
                  <FormField name="specializations">
                    <FormLabel>Specializations (Optional)</FormLabel>
                    <div className="space-y-2">
                      {formData.industry === 'Manufacturing' && (
                        <div className="grid grid-cols-2 gap-2">
                          {['CNC', 'Welding', 'Electronics', 'Mechanical', 'Quality Control'].map((spec) => (
                            <Checkbox
                              key={spec}
                              label={spec}
                              checked={formData.specializations?.includes(spec) || false}
                              onChange={(e) => {
                                const current = formData.specializations || [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, specializations: [...current, spec] });
                                } else {
                                  setFormData({ ...formData, specializations: current.filter(s => s !== spec) });
                                }
                              }}
                              disabled={isSubmitting}
                            />
                          ))}
                        </div>
                      )}
                      {formData.industry === 'Construction' && (
                        <div className="grid grid-cols-2 gap-2">
                          {['Electrical', 'Plumbing', 'HVAC', 'Structural', 'Safety'].map((spec) => (
                            <Checkbox
                              key={spec}
                              label={spec}
                              checked={formData.specializations?.includes(spec) || false}
                              onChange={(e) => {
                                const current = formData.specializations || [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, specializations: [...current, spec] });
                                } else {
                                  setFormData({ ...formData, specializations: current.filter(s => s !== spec) });
                                }
                              }}
                              disabled={isSubmitting}
                            />
                          ))}
                        </div>
                      )}
                      {formData.industry && formData.industry !== 'Manufacturing' && formData.industry !== 'Construction' && (
                        <p className="text-sm text-gray-500">
                          Specialization options for {formData.industry} will be available in future updates.
                        </p>
                      )}
                    </div>
                  </FormField>
                )}
              </>
            )}

            {/* Driver-specific fields */}
            {formData.role === 'driver' && (
              <>
                <FormField name="license_type">
                  <FormLabel required>License Type</FormLabel>
                  <Select
                    value={formData.license_type || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, license_type: e.target.value || undefined });
                      // Clear license type error when user selects a type
                      if (formErrors.license_type) {
                        setFormErrors(prev => ({ ...prev, license_type: '' }));
                      }
                      
                      // Validate license number when license type changes
                      if (formData.license_number?.trim() && e.target.value) {
                        const validation = validateLicenseNumber(formData.license_number, e.target.value);
                        if (!validation.isValid) {
                          setFormErrors(prev => ({ ...prev, license_number: validation.error }));
                        } else {
                          setFormErrors(prev => ({ ...prev, license_number: '' }));
                        }
                      }
                    }}
                    options={[
                      { value: '', label: 'Select license type' },
                      // South African License Types
                      { value: 'Code A', label: 'Code A - Motorcycles (SA)' },
                      { value: 'Code A1', label: 'Code A1 - Light Motorcycles (SA)' },
                      { value: 'Code B', label: 'Code B - Light Motor Vehicles (SA)' },
                      { value: 'Code C', label: 'Code C - Heavy Motor Vehicles (SA)' },
                      { value: 'Code C1', label: 'Code C1 - Medium Heavy Vehicles (SA)' },
                      { value: 'Code EB', label: 'Code EB - Light Vehicle + Trailer (SA)' },
                      { value: 'Code EC', label: 'Code EC - Heavy Vehicle + Trailer (SA)' },
                      { value: 'Code EC1', label: 'Code EC1 - Medium Heavy + Trailer (SA)' },
                      { value: 'PrDP', label: 'Professional Driving Permit (SA)' },
                      { value: 'DDP', label: 'Dangerous Goods Permit (SA)' },
                      // Zimbabwean License Types
                      { value: 'Class 1', label: 'Class 1 - Light Motor Vehicles (ZW)' },
                      { value: 'Class 2', label: 'Class 2 - Heavy Motor Vehicles (ZW)' },
                      { value: 'Class 3', label: 'Class 3 - Extra Heavy Vehicles (ZW)' },
                      { value: 'Class 4', label: 'Class 4 - Motorcycles (ZW)' },
                      { value: 'PSV', label: 'Public Service Vehicle (ZW)' },
                      // General
                      { value: 'Other', label: 'Other' }
                    ]}
                    disabled={isSubmitting}
                    className={formData.license_type ? 'border-teal-600' : ''}
                  />
                  {formErrors.license_type ? (
                    <p className="text-sm text-red-500 mt-1">{formErrors.license_type}</p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      Select license type first
                    </p>
                  )}
                </FormField>

                <FormField name="license_number">
                  <FormLabel required>License Number</FormLabel>
                  <Input
                    value={formData.license_number || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, license_number: e.target.value });
                      // Clear error when user starts typing
                      if (formErrors.license_number) {
                        setFormErrors(prev => ({ ...prev, license_number: '' }));
                      }
                    }}
                    onBlur={() => {
                      if (formData.license_number?.trim() && formData.license_type) {
                        const validation = validateLicenseNumber(formData.license_number, formData.license_type);
                        if (!validation.isValid) {
                          setFormErrors(prev => ({ ...prev, license_number: validation.error }));
                        }
                      }
                    }}
                    placeholder="Enter driver&apos;s license number"
                    disabled={isSubmitting}
                    className={`${formErrors.license_number ? 'border-red-500' : ''} ${!formErrors.license_number && formData.license_number?.trim() && formData.license_type ? 'border-teal-600' : ''}`}
                  />
                  {formErrors.license_number ? (
                    <p className="text-sm text-red-500 mt-1">{formErrors.license_number}</p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      Enter license number
                    </p>
                  )}
                </FormField>

                {/* Driver Selection from Payouts - Only show for logistics clients */}
                {user?.role === 'admin' && user.client_id && clients.find((c: Client) => c.id === user.client_id)?.client_type === 'logistics' && (
                  <FormField name="uber_driver_uuid">
                    <FormLabel>Linked Imported Driver</FormLabel>
                    <Select
                      value={formData.uber_driver_uuid || ''}
                      onChange={(e) => {
                        const selectedDriverUuid = e.target.value;
                        setFormData({ ...formData, uber_driver_uuid: selectedDriverUuid || undefined });
                        
                        // If a driver is selected, pre-populate first and last name
                        if (selectedDriverUuid && payoutsData?.payouts) {
                          const selectedDriver = payoutsData.payouts.find(driver => driver.uuid === selectedDriverUuid);
                          if (selectedDriver) {
                            setFormData(prev => ({
                              ...prev,
                              first_name: selectedDriver.first_name,
                              last_name: selectedDriver.surname
                            }));
                          }
                        }
                      }}
                      options={[
                        { value: '', label: 'No driver linked' },
                        ...(payoutsData?.payouts
                          ?.filter(driver => {
                            // Filter out drivers that already have users (except current user)
                            const hasExistingUser = users.some((user: User) => 
                              user.uber_driver_uuid === driver.uuid && user.id !== selectedUser?.id
                            );
                            
                            // Filter out documents with IDs containing a lot of zeros (test data)
                            const hasManyZeros = driver.uuid && driver.uuid.match(/0{6,}/);
                            
                            return !hasExistingUser && !hasManyZeros;
                          })
                          .map(driver => ({
                            value: driver.uuid,
                            label: `${driver.full_name} (${driver.payment_count} payments, ${driver.total_earnings.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' })})`
                          })) || [])
                      ]}
                      disabled={isSubmitting || !payoutsData?.payouts}
                      className={formData.uber_driver_uuid ? 'border-teal-600' : ''}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {payoutsData?.payouts ? (
                        <>
                          Link this user to an imported driver from your earnings data. 
                          This will automatically populate the first and last name fields.
                          {formData.uber_driver_uuid ? (
                            <span className="text-teal-600 font-medium">
                              {' '}Currently linked to: {payoutsData.payouts.find(driver => driver.uuid === formData.uber_driver_uuid)?.full_name}
                            </span>
                          ) : (
                            <span className="text-gray-600">
                              {' '}No driver currently linked.
                            </span>
                          )}
                        </>
                      ) : (
                        'Loading available drivers...'
                      )}
                    </p>
                  </FormField>
                )}
              </>
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
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
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
                  {selectedUser.client_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Client</label>
                      <p className="text-gray-900">
                        {clients.find((c: Client) => c.id === selectedUser.client_id)?.name || 'Unknown Client'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Account Status</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <Badge variant={selectedUser.is_active ? 'success' : 'destructive'}>
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </Badge>
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

            {/* Role-specific Information */}
            {(selectedUser.role === 'technician' || selectedUser.role === 'driver') && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  {selectedUser.role === 'technician' ? 'Technician' : 'Driver'} Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUser.role === 'technician' && selectedUser.hourly_rate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Hourly Rate</label>
                      <p className="text-gray-900">${selectedUser.hourly_rate}/hour</p>
                    </div>
                  )}
                  {(selectedUser.industry || selectedUser.role === 'driver') && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Industry</label>
                      <p className="text-gray-900">
                        {selectedUser.role === 'driver' ? 'logistics/trans' : selectedUser.industry}
                      </p>
                    </div>
                  )}
                  {selectedUser.role === 'technician' && selectedUser.specializations && selectedUser.specializations.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Specializations</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedUser.specializations.map((spec, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(selectedUser.role && selectedUser.role === 'driver') && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Driver Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUser.license_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">License Number</label>
                      <p className="text-gray-900">{selectedUser.license_number}</p>
                    </div>
                  )}
                  {selectedUser.license_type && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">License Type</label>
                      <p className="text-gray-900">{selectedUser.license_type}</p>
                    </div>
                  )}
                  {selectedUser.vehicle_assignments && selectedUser.vehicle_assignments.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Vehicle Assignments</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedUser.vehicle_assignments.map((vehicle, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {vehicle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedUser.uber_driver_uuid && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Linked Driver</label>
                      <p className="text-gray-900">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {selectedUser.uber_driver_uuid}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Linked to imported driver from earnings data
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                    setShowUserModal(false);
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
                  (user?.role === 'admin' && user.client_id === selectedUser.client_id && selectedUser.role !== 'super_admin' && selectedUser.role !== 'admin' && selectedUser.role !== 'driver')) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUserModal(false);
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
                    setShowUserModal(false);
                    handleEditUser(selectedUser);
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUserModal(false);
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

            {/* Role-specific fields */}
            {editFormData.role === 'technician' && (
              <>
                <FormField name="hourly_rate">
                  <FormLabel>Hourly Rate (Optional)</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.hourly_rate || ''}
                    onChange={(e) => setEditFormData({ 
                      ...editFormData, 
                      hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    placeholder="Enter hourly rate for technician work"
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Set hourly rate for maintenance work cost calculations
                  </p>
                </FormField>

                <FormField name="industry">
                  <FormLabel>Industry (Optional)</FormLabel>
                  <Select
                    value={editFormData.industry || ''}
                    onChange={(e) => setEditFormData({ 
                      ...editFormData, 
                      industry: e.target.value || undefined,
                      specializations: [] // Reset specializations when industry changes
                    })}
                    options={[
                      { value: '', label: 'Select industry' },
                      { value: 'Manufacturing', label: 'Manufacturing' },
                      { value: 'Construction', label: 'Construction' },
                      { value: 'Transportation', label: 'Transportation' },
                      { value: 'Agriculture', label: 'Agriculture' },
                      { value: 'Mining', label: 'Mining' },
                      { value: 'Other', label: 'Other' }
                    ]}
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Select primary industry for future auto-assignment
                  </p>
                </FormField>

                {editFormData.industry && (
                  <FormField name="specializations">
                    <FormLabel>Specializations (Optional)</FormLabel>
                    <div className="space-y-2">
                      {editFormData.industry === 'Manufacturing' && (
                        <div className="grid grid-cols-2 gap-2">
                          {['CNC', 'Welding', 'Electronics', 'Mechanical', 'Quality Control'].map((spec) => (
                            <Checkbox
                              key={spec}
                              label={spec}
                              checked={editFormData.specializations?.includes(spec) || false}
                              onChange={(e) => {
                                const current = editFormData.specializations || [];
                                if (e.target.checked) {
                                  setEditFormData({ ...editFormData, specializations: [...current, spec] });
                                } else {
                                  setEditFormData({ ...editFormData, specializations: current.filter(s => s !== spec) });
                                }
                              }}
                              disabled={isSubmitting}
                            />
                          ))}
                        </div>
                      )}
                      {editFormData.industry === 'Construction' && (
                        <div className="grid grid-cols-2 gap-2">
                          {['Electrical', 'Plumbing', 'HVAC', 'Structural', 'Safety'].map((spec) => (
                            <Checkbox
                              key={spec}
                              label={spec}
                              checked={editFormData.specializations?.includes(spec) || false}
                              onChange={(e) => {
                                const current = editFormData.specializations || [];
                                if (e.target.checked) {
                                  setEditFormData({ ...editFormData, specializations: [...current, spec] });
                                } else {
                                  setEditFormData({ ...editFormData, specializations: current.filter(s => s !== spec) });
                                }
                              }}
                              disabled={isSubmitting}
                            />
                          ))}
                        </div>
                      )}
                      {editFormData.industry && editFormData.industry !== 'Manufacturing' && editFormData.industry !== 'Construction' && (
                        <p className="text-sm text-gray-500">
                          {`Specialization options for ${editFormData.industry} will be available in future updates.`}
                        </p>
                      )}
                    </div>
                  </FormField>
                )}
              </>
            )}

            {editFormData.role === 'driver' && (
              <FormField name="industry">
                <FormLabel>Industry</FormLabel>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">logistics/trans</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Industry is automatically set for drivers
                </p>
              </FormField>
            )}

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

            <FormField name="role">
              <FormLabel>User Role</FormLabel>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900 capitalize">{editFormData.role}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Role cannot be changed here. Use the &quot;Change Role&quot; button below to modify user permissions.
              </p>
            </FormField>
          </FormSection>

          {/* Driver-specific fields - only show if user is a driver */}
          {editFormData.role === 'driver' && (
            <FormSection title="Driver Information">
              <FormGrid cols={2}>
                <FormField name="license_type">
                  <FormLabel required>License Type</FormLabel>
                  <Select
                    value={editFormData.license_type || ''}
                    onChange={(e) => {
                      setEditFormData({ 
                        ...editFormData, 
                        license_type: e.target.value || undefined 
                      });
                      // Clear error when user starts typing
                      if (editLicenseNumberError) {
                        setEditLicenseNumberError('');
                      }
                      // Validate license number when license type changes
                      if (editFormData.license_number?.trim() && e.target.value) {
                        const validation = validateLicenseNumber(editFormData.license_number, e.target.value);
                        if (!validation.isValid) {
                          setEditLicenseNumberError(validation.error);
                        } else {
                          setEditLicenseNumberError('');
                        }
                      }
                    }}
                    options={[
                      { value: '', label: 'Select license type' },
                      // South African License Types
                      { value: 'Code A', label: 'Code A - Motorcycles (SA)' },
                      { value: 'Code A1', label: 'Code A1 - Light Motorcycles (SA)' },
                      { value: 'Code B', label: 'Code B - Light Motor Vehicles (SA)' },
                      { value: 'Code C', label: 'Code C - Heavy Motor Vehicles (SA)' },
                      { value: 'Code C1', label: 'Code C1 - Medium Heavy Vehicles (SA)' },
                      { value: 'Code EB', label: 'Code EB - Light Vehicle + Trailer (SA)' },
                      { value: 'Code EC', label: 'Code EC - Heavy Vehicle + Trailer (SA)' },
                      { value: 'Code EC1', label: 'Code EC1 - Medium Heavy + Trailer (SA)' },
                      { value: 'PrDP', label: 'Professional Driving Permit (SA)' },
                      { value: 'DDP', label: 'Dangerous Goods Permit (SA)' },
                      // Zimbabwean License Types
                      { value: 'Class 1', label: 'Class 1 - Light Motor Vehicles (ZW)' },
                      { value: 'Class 2', label: 'Class 2 - Heavy Motor Vehicles (ZW)' },
                      { value: 'Class 3', label: 'Class 3 - Extra Heavy Vehicles (ZW)' },
                      { value: 'Class 4', label: 'Class 4 - Motorcycles (ZW)' },
                      { value: 'PSV', label: 'Public Service Vehicle (ZW)' },
                      // General
                      { value: 'Other', label: 'Other' }
                    ]}
                    disabled={isSubmitting}
                    className={editFormData.license_type ? 'border-teal-600' : ''}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Select license type first
                  </p>
                </FormField>

                <FormField name="license_number">
                  <FormLabel required>License Number</FormLabel>
                  <Input
                    value={editFormData.license_number || ''}
                    onChange={(e) => {
                      setEditFormData({ ...editFormData, license_number: e.target.value });
                      // Clear error when user starts typing
                      if (editLicenseNumberError) {
                        setEditLicenseNumberError('');
                      }
                    }}
                    onBlur={() => {
                      if (editFormData.license_number?.trim() && editFormData.license_type) {
                        const validation = validateLicenseNumber(editFormData.license_number, editFormData.license_type);
                        if (!validation.isValid) {
                          setEditLicenseNumberError(validation.error);
                        }
                      }
                    }}
                    placeholder="Enter driver&apos;s license number"
                    disabled={isSubmitting}
                    className={`${editLicenseNumberError ? 'border-red-500' : ''} ${!editLicenseNumberError && editFormData.license_number?.trim() && editFormData.license_type ? 'border-teal-600' : ''}`}
                  />
                  {editLicenseNumberError ? (
                    <p className="text-sm text-red-500 mt-1">{editLicenseNumberError}</p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      Enter license number
                    </p>
                  )}
                </FormField>
              </FormGrid>

              {/* Driver Selection from Payouts - Only show for logistics clients */}
              {user?.role === 'admin' && user.client_id && clients.find((c: Client) => c.id === user.client_id)?.client_type === 'logistics' && (
                <FormField name="uber_driver_uuid">
                  <FormLabel>Linked Imported Driver</FormLabel>
                  <Select
                    value={editFormData.uber_driver_uuid || ''}
                    onChange={(e) => {
                      const selectedDriverUuid = e.target.value;
                      setEditFormData({ ...editFormData, uber_driver_uuid: selectedDriverUuid || undefined });
                      
                      // If a driver is selected, pre-populate first and last name
                      if (selectedDriverUuid && payoutsData?.payouts) {
                        const selectedDriver = payoutsData.payouts.find(driver => driver.uuid === selectedDriverUuid);
                        if (selectedDriver) {
                          setEditFormData(prev => ({
                            ...prev,
                            first_name: selectedDriver.first_name,
                            last_name: selectedDriver.surname
                          }));
                        }
                      }
                    }}
                    options={[
                      { value: '', label: 'No driver linked' },
                      ...(payoutsData?.payouts
                        ?.filter(driver => {
                          // Filter out drivers that already have users (except current user)
                          const hasExistingUser = users.some((user: User) => 
                            user.uber_driver_uuid === driver.uuid && user.id !== selectedUser?.id
                          );
                          
                          // Filter out documents with IDs containing a lot of zeros (test data)
                          const hasManyZeros = driver.uuid && driver.uuid.match(/0{6,}/);
                          
                          return !hasExistingUser && !hasManyZeros;
                        })
                        .map(driver => ({
                          value: driver.uuid,
                          label: `${driver.full_name} (${driver.payment_count} payments, ${driver.total_earnings.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' })})`
                        })) || [])
                    ]}
                    disabled={isSubmitting || !payoutsData?.payouts}
                    className={editFormData.uber_driver_uuid ? 'border-teal-600' : ''}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {payoutsData?.payouts ? (
                      <>
                        Link this user to an imported driver from your earnings data. 
                        This will automatically populate the first and last name fields.
                        {editFormData.uber_driver_uuid ? (
                          <span className="text-teal-600 font-medium">
                            {' '}Currently linked to: {payoutsData.payouts.find(driver => driver.uuid === editFormData.uber_driver_uuid)?.full_name}
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            {' '}No driver currently linked.
                          </span>
                        )}
                      </>
                    ) : (
                      'Loading available drivers...'
                    )}
                  </p>
                </FormField>
              )}

              {/* License Images */}
              <FormGrid cols={2}>
                <FormField name="license_front_image">
                  <FormLabel>Front License Image</FormLabel>
                  <div className="space-y-3">
                    {editFormData.license_front_image ? (
                      <div className="relative">
                        <Image 
                          src={editFormData.license_front_image} 
                          alt="Front License" 
                          width={400}
                          height={128}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                          onClick={() => setEditFormData({ ...editFormData, license_front_image: '' })}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                          <span className="text-gray-400 text-2xl">📷</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">No front license image</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement file upload
                            toast('File upload functionality coming soon!');
                          }}
                        >
                          Upload Image
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Front side of driver&apos;s license
                  </p>
                </FormField>

                <FormField name="license_back_image">
                  <FormLabel>Back License Image</FormLabel>
                  <div className="space-y-3">
                    {editFormData.license_back_image ? (
                      <div className="relative">
                        <Image 
                          src={editFormData.license_back_image} 
                          alt="Back License" 
                          width={400}
                          height={128}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                          onClick={() => setEditFormData({ ...editFormData, license_back_image: '' })}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                          <span className="text-gray-400 text-2xl">📷</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">No back license image</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement file upload
                            toast('File upload functionality coming soon!');
                          }}
                        >
                          Upload Image
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Back side of driver&apos;s license
                  </p>
                </FormField>
              </FormGrid>

              <FormField name="vehicle_assignments">
                <FormLabel>Current Vehicle Assignments</FormLabel>
                <div className={`p-3 bg-gray-50 rounded-lg border ${editFormData.vehicle_assignments && editFormData.vehicle_assignments.length > 0 ? 'border-teal-600' : ''}`}>
                  {editFormData.vehicle_assignments && editFormData.vehicle_assignments.length > 0 ? (
                    <div className="space-y-2">
                      {editFormData.vehicle_assignments.map((vehicleId, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                            <span className="text-sm text-gray-700">Vehicle ID: {vehicleId}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Assigned
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">🚗</span>
                      </div>
                      <p className="text-sm text-gray-500">No vehicles currently assigned</p>
                      <p className="text-xs text-gray-400 mt-1">This driver is available for assignment</p>
                    </div>
                  )}
                </div>
                                  <p className="text-sm text-gray-500 mt-1">
                    This driver&apos;s current vehicle assignments (read-only)
                  </p>
              </FormField>
            </FormSection>
          )}

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
                setShowUserModal(false);
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
                  setShowUserModal(false);
                  setRoleChangeData({ role: selectedUser?.role || '' });
                  setShowRoleChangeModal(true);
                }}
                disabled={isSubmitting}
              >
                <Shield className="h-4 w-4 mr-2" />
                Change Role
              </Button>
            )}
            
            <Button 
              type="submit" 
              loading={isSubmitting}
              disabled={!hasChanges() || !isEditFormValid()}
            >
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
                options={getAvailableRoles(selectedUser?.role).map(role => ({
                  key: role.value,
                  value: role.value,
                  label: role.label
                }))}
                value={roleChangeData.role}
                onChange={(e) => setRoleChangeData({ ...roleChangeData, role: e.target.value as 'super_admin' | 'admin' | 'user' | 'technician' | 'driver' })}
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
