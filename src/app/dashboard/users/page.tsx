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
  ToggleRight
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setUsers(response);
      } else if (user?.role === 'admin' && user.client_id) {
        // Admin sees only their client's users
        const response = await clientAPI.getClientUsers(user.client_id);
        setUsers(response);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data
  useEffect(() => {
    loadUsers();
    if (user?.role === 'super_admin') {
      loadClients();
    }
  }, [user, loadUsers]);

  const loadClients = async () => {
    try {
      const response = await clientAPI.getClients();
      setClients(response);
    } catch (error) {
      console.error('Error loading clients:', error);
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
        // Create admin user
        await userAPI.createAdmin(formData as CreateAdminRequest);
        toast.success('Admin user created successfully');
      } else if (user?.role === 'admin' && user.client_id) {
        // Create regular user for client
        await clientAPI.createClientUser(user.client_id, formData as CreateUserRequest);
        toast.success('User created successfully');
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
      await userAPI.deleteUser(selectedUser.id);
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error: unknown) {
      let message = 'Failed to delete user';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
      }
      toast.error(message);
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
      render: (user) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-400" />
          <RoleBadge role={user.role} size="sm" />
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
      key: 'notification_preferences',
      title: 'Notifications',
      render: (user) => (
        <div className="text-sm text-gray-600">
          {user.notification_preferences?.email && '📧 '}
          {user.notification_preferences?.whatsapp && '📱 '}
          {!user.notification_preferences?.email && !user.notification_preferences?.whatsapp && '-'}
        </div>
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
        setSelectedUser(u);
        setShowDeleteModal(true);
      },
      show: (u) => u.id !== user?.id // Can't delete yourself
    }
  ];

  if (!['super_admin', 'admin'].includes(user?.role || '')) {
    return null;
  }

  const userTypeOptions = user?.role === 'super_admin' 
    ? [
        { value: 'user', label: 'Regular User' },
        { value: 'admin', label: 'Admin User' }
      ]
    : [];

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }));

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
            <Button type="submit" loading={isSubmitting}>
              Create User
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
    </div>
  );
}
