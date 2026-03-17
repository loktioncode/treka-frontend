'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  clientAPI, 
  userAPI,
  authAPI,
  type Client, 
  type User, 
  type CreateUserRequest, 
  type CreateAdminRequest 
} from '@/services/api';
import { DataTable, type Column, type DataTableAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Form, 
  FormField, 
  FormLabel, 
  FormSection, 
  FormGrid, 
  FormActions, 
  Select, 
  Checkbox,
  Textarea 
} from '@/components/ui/form';
import { 
  ArrowLeft,
  Building2, 
  Users, 
  Edit, 
  Trash2, 
  UserPlus, 
  Mail, 
  Shield, 
  ToggleLeft, 
  ToggleRight,
  Phone,
  MapPin,
  Calendar,
  Power,
  PowerOff,
  Send
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';


export default function ClientDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const [client, setClient] = useState<Client | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Form states
  const [userFormData, setUserFormData] = useState<Partial<CreateUserRequest & CreateAdminRequest>>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    client_id: clientId,
    notification_preferences: {
      email: true,
      whatsapp: false
    }
  });
  const [editUserFormData, setEditUserFormData] = useState<Partial<User>>({});
  const [clientFormData, setClientFormData] = useState<Partial<Client>>({});
  const [userFormErrors, setUserFormErrors] = useState<Record<string, string>>({});
  const [clientFormErrors, setClientFormErrors] = useState<Record<string, string>>({});
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Redirect non-super-admins
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      toast.error('Access denied. Super admin privileges required.');
      router.push('/dashboard');
      return;
    }
  }, [user, router]);

  const loadClient = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientAPI.getClient(clientId);
      setClient(response);
      setClientFormData(response);
    } catch (error) {
      toast.error('Failed to load client details');
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const response = await clientAPI.getClientUsers(clientId);
      setUsers(response);
    } catch (error) {
      toast.error('Failed to load client users');
      console.error('Error loading users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [clientId]);

  // Load client and users
  useEffect(() => {
    // Only make API calls if clientId is provided and user is authenticated
    if (clientId && typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        loadClient();
        loadUsers();
      }
    }
  }, [clientId, loadClient, loadUsers]);

  const resetUserForm = () => {
    setUserFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      client_id: clientId,
      notification_preferences: {
        email: true,
        whatsapp: false
      }
    });
    setUserFormErrors({});
    setIsCreatingAdmin(false);
  };

  const validateUserForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!userFormData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!userFormData.password?.trim()) {
      errors.password = 'Password is required';
    } else if (userFormData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (!userFormData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!userFormData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }

    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateClientForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!clientFormData.name?.trim()) {
      errors.name = 'Client name is required';
    }

    if (!clientFormData.contact_email?.trim()) {
      errors.contact_email = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientFormData.contact_email)) {
      errors.contact_email = 'Please enter a valid email address';
    }

    setClientFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUserForm()) return;

    setIsSubmitting(true);
    try {
      if (isCreatingAdmin) {
        // Create admin user - ensure client_id and role are included
        const adminData = {
          ...userFormData,
          client_id: clientId,
          role: "admin"  // Explicitly set role for admin users
        };
        await userAPI.createAdmin(adminData as CreateAdminRequest);
        toast.success('Admin user created successfully');
      } else {
        // Create regular user for client - the API endpoint should handle client assignment
        const userData: CreateUserRequest = {
          email: userFormData.email!,
          password: userFormData.password!,
          first_name: userFormData.first_name!,
          last_name: userFormData.last_name!,
          role: "user" as const,  // Explicitly set role for regular users
          notification_preferences: userFormData.notification_preferences!
        };
        await clientAPI.createClientUser(clientId, userData);
        toast.success('User created successfully');
      }
      
      setShowCreateUserModal(false);
      await loadUsers();
      resetUserForm();
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

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateClientForm()) return;

    setIsSubmitting(true);
    try {
      await clientAPI.updateClient(clientId, clientFormData);
      toast.success('Client updated successfully');
      setShowEditClientModal(false);
      await loadClient();
    } catch (error: unknown) {
      let message = 'Failed to update client';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserActivation = async (user: User) => {
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

  const handleToggleClientActivation = async () => {
    if (!client) return;
    
    try {
      await clientAPI.toggleClientActivation(client.id, !client.is_active);
      toast.success(`Client ${client.is_active ? 'deactivated' : 'activated'} successfully`);
      await loadClient();
    } catch (error: unknown) {
      let message = 'Failed to update client status';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
      }
      toast.error(message);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      // Get the valid user ID
      const userId = selectedUser.id;
      if (!userId) {
        throw new Error('No valid user ID found');
      }
      

      
      await userAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      setShowDeleteUserModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error: unknown) {
      console.error('❌ Error deleting user:', error);
      let message = 'Failed to delete user';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
        console.error('❌ API Error details:', axiosError.response?.data);
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWelcomeEmail = async (user: User) => {
    try {
      // Since there's no specific welcome email endpoint, we'll use password reset
      // as a way to send them login instructions
      await authAPI.forgotPassword(user.email);
      toast.success(`Welcome email with login instructions sent to ${user.email}`);
    } catch (error: unknown) {
      let message = 'Failed to send welcome email';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
      }
      toast.error(message);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      notification_preferences: user.notification_preferences
    });
    setIsEditingUser(false);
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await userAPI.updateUser(selectedUser.id, editUserFormData);
      toast.success('User updated successfully');
      setIsEditingUser(false);
      await loadUsers();
    } catch (error: unknown) {
      let message = 'Failed to update user';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as { message: string }).message;
      } else if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        message = axiosError.response?.data?.detail || message;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const userColumns: Column<User>[] = [
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
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-teal-100 text-teal-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {user.role.toUpperCase()}
          </span>
        </div>
      )
    },
    {
      key: 'is_active',
      title: 'Status',
      render: (user) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
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

  const userActions: DataTableAction<User>[] = [
    {
      key: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: handleEditUser,
      variant: 'secondary'
    },
    {
      key: 'activate',
      label: 'Activate',
      icon: ToggleLeft,
      onClick: handleToggleUserActivation,
      show: (user) => !user.is_active,
      variant: 'secondary'
    },
    {
      key: 'deactivate', 
      label: 'Deactivate',
      icon: ToggleRight,
      onClick: handleToggleUserActivation,
      show: (user) => user.is_active,
      variant: 'secondary'
    },
    {
      key: 'send_welcome',
      label: 'Send Welcome Email',
      icon: Send,
      variant: 'secondary',
      onClick: handleSendWelcomeEmail
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      onClick: (user) => {
        setSelectedUser(user);
        setShowDeleteUserModal(true);
      }
    }
  ];

  if (user?.role !== 'super_admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Client Not Found</h2>
        <p className="text-gray-600 mb-6">The requested client could not be found.</p>
        <Button onClick={() => router.push('/dashboard/clients')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role === 'user');

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/clients')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-teal-600" />
              {client.name}
            </h1>
            <p className="text-gray-600 mt-1">Manage client details, admins, and users</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleToggleClientActivation}
            variant={client.is_active ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {client.is_active ? (
              <>
                <PowerOff className="h-4 w-4" />
                Deactivate Client
              </>
            ) : (
              <>
                <Power className="h-4 w-4" />
                Activate Client
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowEditClientModal(true)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Client
          </Button>
        </div>
      </motion.div>

      {/* Client Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.description && (
              <p className="text-gray-600">{client.description}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{client.contact_email}</span>
              </div>
              {client.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{client.contact_phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Created {formatDate(client.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`h-2 w-2 rounded-full ${client.is_active ? 'bg-green-600' : 'bg-red-600'}`}></div>
                <span>{client.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            {client.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  {client.address.street && <div>{client.address.street}</div>}
                  <div>
                    {[client.address.city, client.address.state, client.address.country]
                      .filter(Boolean)
                      .join(', ')}
                    {client.address.zip_code && ` ${client.address.zip_code}`}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Users</span>
              <span className="text-2xl font-bold text-gray-900">{users.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Admins</span>
              <span className="text-2xl font-bold text-teal-600">{admins.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Regular Users</span>
              <span className="text-2xl font-bold text-green-600">{regularUsers.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Users</span>
              <span className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.is_active).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Users Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Users & Admins</h2>
          <Button
            onClick={() => {
              resetUserForm();
              setShowCreateUserModal(true);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        <DataTable
          data={users}
          columns={userColumns}
          actions={userActions}
          onRowClick={handleEditUser}
          loading={usersLoading}
          searchPlaceholder="Search users by name or email..."
          searchFields={['first_name', 'last_name', 'email']}
          emptyState={{
            title: 'No users found',
            description: 'This client has no users yet. Create the first user to get started.',
            action: {
              label: 'Add User',
              onClick: () => {
                resetUserForm();
                setShowCreateUserModal(true);
              }
            }
          }}
        />
      </motion.div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateUserModal}
        onClose={() => {
          setShowCreateUserModal(false);
          resetUserForm();
        }}
        title="Create New User"
        size="lg"
      >
        <Form onSubmit={handleCreateUser} errors={userFormErrors} isSubmitting={isSubmitting}>
          <FormSection title="User Type">
            <FormField name="user_type">
              <FormLabel>User Type</FormLabel>
              <Select
                options={[
                  { value: 'user', label: 'Regular User' },
                  { value: 'admin', label: 'Admin User' }
                ]}
                value={isCreatingAdmin ? 'admin' : 'user'}
                onChange={(e) => setIsCreatingAdmin(e.target.value === 'admin')}
                disabled={isSubmitting}
              />
            </FormField>
          </FormSection>

          <FormSection title="User Information">
            <FormGrid cols={2}>
              <FormField name="first_name">
                <FormLabel required>First Name</FormLabel>
                <Input
                  value={userFormData.first_name || ''}
                  onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                  placeholder="Enter first name"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField name="last_name">
                <FormLabel required>Last Name</FormLabel>
                <Input
                  value={userFormData.last_name || ''}
                  onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                  placeholder="Enter last name"
                  disabled={isSubmitting}
                />
              </FormField>
            </FormGrid>

            <FormField name="email">
              <FormLabel required>Email Address</FormLabel>
              <Input
                type="email"
                value={userFormData.email || ''}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                placeholder="Enter email address"
                disabled={isSubmitting}
              />
            </FormField>

            <FormField name="password">
              <FormLabel required>Password</FormLabel>
              <Input
                type="password"
                value={userFormData.password || ''}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                placeholder="Enter password (min 8 characters)"
                disabled={isSubmitting}
              />
            </FormField>
          </FormSection>

          <FormSection title="Notification Preferences">
            <div className="space-y-3">
              <Checkbox
                label="Email notifications"
                checked={userFormData.notification_preferences?.email || false}
                onChange={(e) => setUserFormData({
                  ...userFormData,
                  notification_preferences: {
                    email: e.target.checked,
                    whatsapp: userFormData.notification_preferences?.whatsapp || false
                  }
                })}
                disabled={isSubmitting}
              />
              <Checkbox
                label="WhatsApp notifications"
                checked={userFormData.notification_preferences?.whatsapp || false}
                onChange={(e) => setUserFormData({
                  ...userFormData,
                  notification_preferences: {
                    email: userFormData.notification_preferences?.email || false,
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
                setShowCreateUserModal(false);
                resetUserForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create {isCreatingAdmin ? 'Admin' : 'User'}
            </Button>
          </FormActions>
        </Form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={showEditClientModal}
        onClose={() => {
          setShowEditClientModal(false);
          setClientFormData(client);
        }}
        title="Edit Client"
        size="lg"
      >
        <Form onSubmit={handleUpdateClient} errors={clientFormErrors} isSubmitting={isSubmitting}>
          <FormSection title="Basic Information">
            <FormGrid cols={2}>
              <FormField name="name">
                <FormLabel required>Client Name</FormLabel>
                <Input
                  value={clientFormData.name || ''}
                  onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                  placeholder="Enter client name"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField name="contact_email">
                <FormLabel required>Contact Email</FormLabel>
                <Input
                  type="email"
                  value={clientFormData.contact_email || ''}
                  onChange={(e) => setClientFormData({ ...clientFormData, contact_email: e.target.value })}
                  placeholder="Enter contact email"
                  disabled={isSubmitting}
                />
              </FormField>
            </FormGrid>

            <FormField name="contact_phone">
              <FormLabel>Contact Phone</FormLabel>
              <Input
                value={clientFormData.contact_phone || ''}
                onChange={(e) => setClientFormData({ ...clientFormData, contact_phone: e.target.value })}
                placeholder="Enter contact phone"
                disabled={isSubmitting}
              />
            </FormField>

            <FormField name="description">
              <FormLabel>Description</FormLabel>
              <Textarea
                value={clientFormData.description || ''}
                onChange={(e) => setClientFormData({ ...clientFormData, description: e.target.value })}
                placeholder="Enter client description"
                rows={3}
                disabled={isSubmitting}
              />
            </FormField>
          </FormSection>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditClientModal(false);
                setClientFormData(client);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Update Client
            </Button>
          </FormActions>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false);
          setSelectedUser(null);
          setIsEditingUser(false);
        }}
        title={`${isEditingUser ? 'Edit' : 'View'} User Details`}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            {!isEditingUser ? (
              // View Mode
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">User Information</h3>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingUser(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
                
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedUser.role === 'admin'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedUser.role.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Account Status</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <p className={`${selectedUser.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedUser.is_active ? 'Active' : 'Inactive'}
                        </p>
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
                        await handleToggleUserActivation(selectedUser);
                        // Refresh the selected user data
                        const updatedUsers = await clientAPI.getClientUsers(clientId);
                        const updatedUser = updatedUsers.find((u: User) => u.id === selectedUser.id);
                        if (updatedUser) {
                          setSelectedUser(updatedUser);
                        }
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

                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditUserModal(false);
                      setSelectedUser(null);
                      setIsEditingUser(false);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </>
            ) : (
              // Edit Mode
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Edit User Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FormLabel required>First Name</FormLabel>
                      <Input
                        value={editUserFormData.first_name || ''}
                        onChange={(e) => setEditUserFormData({ ...editUserFormData, first_name: e.target.value })}
                        placeholder="Enter first name"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <FormLabel required>Last Name</FormLabel>
                      <Input
                        value={editUserFormData.last_name || ''}
                        onChange={(e) => setEditUserFormData({ ...editUserFormData, last_name: e.target.value })}
                        placeholder="Enter last name"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <FormLabel required>Email</FormLabel>
                    <Input
                      type="email"
                      value={editUserFormData.email || ''}
                      onChange={(e) => setEditUserFormData({ ...editUserFormData, email: e.target.value })}
                      placeholder="Enter email"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <FormLabel>Notification Preferences</FormLabel>
                    <div className="space-y-3 mt-2">
                      <Checkbox
                        label="Email notifications"
                        checked={editUserFormData.notification_preferences?.email || false}
                        onChange={(e) => setEditUserFormData({
                          ...editUserFormData,
                          notification_preferences: {
                            email: e.target.checked,
                            whatsapp: editUserFormData.notification_preferences?.whatsapp || false
                          }
                        })}
                        disabled={isSubmitting}
                      />
                      <Checkbox
                        label="WhatsApp notifications"
                        checked={editUserFormData.notification_preferences?.whatsapp || false}
                        onChange={(e) => setEditUserFormData({
                          ...editUserFormData,
                          notification_preferences: {
                            email: editUserFormData.notification_preferences?.email || false,
                            whatsapp: e.target.checked
                          }
                        })}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingUser(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateUser}
                    loading={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Update User
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={showDeleteUserModal}
        onClose={() => {
          setShowDeleteUserModal(false);
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
                setShowDeleteUserModal(false);
                setSelectedUser(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
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
