'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { type Client, type CreateClientRequest } from '@/services/api';
import { DataTable, type Column, type DataTableAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { QuickStats } from '@/components/ui/stats-card';
import { Form, FormField, FormLabel, FormSection, FormGrid, FormActions, Textarea, Select } from '@/components/ui/form';
import { Building2, Edit, Trash2, Users, Eye, Mail, Phone, MapPin, Plus, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { PageTransition } from '@/components/PageTransition';
import { useNavigation } from '@/contexts/NavigationContext';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { Badge } from '@/components/ui/badge';

export default function ClientsPage() {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  
  // React Query hooks
  const { data: clients = [], isLoading: loading } = useClients();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateClientRequest>>({
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    client_type: 'industrial',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zip_code: ''
    }
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Redirect non-super-admins
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      toast.error('Access denied. Super admin privileges required.');
      window.location.href = '/dashboard';
      return;
    }
  }, [user]);

  // React Query handles data loading automatically

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      contact_email: '',
      contact_phone: '',
      client_type: 'industrial',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zip_code: ''
      }
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = 'Client name is required';
    }

    if (!formData.contact_email?.trim()) {
      errors.contact_email = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      errors.contact_email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if form is valid for submit button state
  const isFormValid = (): boolean => {
    return !!(
      formData.name?.trim() && 
      formData.contact_email?.trim() && 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)
    );
  };

  // Get loading state from mutations
  const isSubmitting = createClientMutation.isPending || updateClientMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (selectedClient) {
        // Update client
        await updateClientMutation.mutateAsync({ 
          clientId: selectedClient.id, 
          data: formData 
        });
        setShowEditModal(false);
        toast.success('Client updated successfully');
      } else {
        // Create client
        await createClientMutation.mutateAsync(formData as CreateClientRequest);
        setShowCreateModal(false);
        toast.success(`Client "${formData.name}" created successfully! A default admin account has been created with login credentials sent to ${formData.contact_email}`);
      }
      
      resetForm();
      setSelectedClient(null);
    } catch (error) {
      // Error handling is done by the mutation hooks
      console.error('Submit error:', error);
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      description: client.description,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      client_type: client.client_type,
      address: client.address
    });
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!selectedClient) {
      toast.error('No client selected for deletion');
      return;
    }

    if (!selectedClient.id) {
      toast.error('Client ID is missing');
      return;
    }

    try {
      await deleteClientMutation.mutateAsync(selectedClient.id);
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (error) {
      // Error handling is done by the mutation hook
      console.error('Delete error:', error);
    }
  };

  const columns: Column<Client>[] = [
    {
      key: 'name',
      title: 'Client Name',
      sortable: true,
      render: (client) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Building2 className="h-4 w-4 text-teal-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{client.name}</div>
            {client.description && (
              <div className="text-sm text-gray-500">{client.description}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'client_type',
      title: 'Type',
      sortable: true,
      render: (client) => (
        <Badge
          variant={client.client_type === 'industrial' ? 'default' : 'secondary'}
        >
          {client.client_type === 'industrial' ? 'Industrial' : 'Logistics'}
        </Badge>
      )
    },
    {
      key: 'contact_email',
      title: 'Contact',
      render: (client) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            {client.contact_email}
          </div>
          {client.contact_phone && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Phone className="h-4 w-4 text-gray-400" />
              {client.contact_phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'address',
      title: 'Location',
      render: (client) => (
        client.address ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>
              {[client.address.city, client.address.state, client.address.country]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (client) => (
        <Badge 
          variant={client.is_active ? 'success' : 'secondary'}
          size="sm"
        >
          {client.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      title: 'Created',
      sortable: true,
      render: (client) => (
        <span className="text-sm text-gray-500">
          {formatDate(client.created_at)}
        </span>
      )
    }
  ];

  const actions: DataTableAction<Client>[] = [
    {
      key: 'view',
      label: 'Manage',
      icon: Eye,
      onClick: (client) => {
        if (!client.id) {
          toast.error('Client ID not found');
          return;
        }
        navigateTo(`/dashboard/clients/${client.id}`);
      },
      variant: 'secondary'
    },
    {
      key: 'users',
      label: 'View Users',
      icon: Users,
      onClick: (client) => {
        if (!client.id) {
          toast.error('Client ID not found');
          return;
        }
        navigateTo(`/dashboard/clients/${client.id}`);
      },
      variant: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: handleEdit,
      variant: 'secondary'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      onClick: (client) => {
        if (!client) {
          toast.error('Client data not available');
          return;
        }
        setSelectedClient(client);
        setShowDeleteModal(true);
      }
    }
  ];

  if (user?.role !== 'super_admin') {
    return null;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage client organizations and their settings</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <QuickStats 
          stats={[
            {
              title: 'Total Clients',
              value: clients.length.toString(),
              description: 'Organizations in system',
              icon: Building2,
              color: 'blue',
              trend: { 
                value: clients.filter((c: Client) => {
                  const created = new Date(c.created_at);
                  const lastMonth = new Date();
                  lastMonth.setMonth(lastMonth.getMonth() - 1);
                  return created > lastMonth;
                }).length,
                isPositive: true,
                label: 'new this month'
              }
            },
            {
              title: 'Active Clients',
              value: clients.filter((c: Client) => c.is_active).length.toString(),
              description: 'Currently operational',
              icon: TrendingUp,
              color: 'green',
              trend: {
                value: `${Math.round((clients.filter((c: Client) => c.is_active).length / clients.length) * 100) || 0}%`,
                isPositive: true,
                label: 'activation rate'
              }
            },
            {
              title: 'New This Month',
              value: clients.filter((c: Client) => {
                const created = new Date(c.created_at);
                const now = new Date();
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
              }).length.toString(),
              description: 'Recently added',
              icon: Plus,
              color: 'purple',
              trend: {
                value: '15%',
                isPositive: true,
                label: 'growth rate'
              }
            }
          ]}
        />
      </motion.div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <DataTable
          data={clients}
          columns={columns}
          actions={actions}
          loading={loading}
          searchPlaceholder="Search clients by name or email..."
          searchFields={['name', 'contact_email', 'description']}
          addButton={{
            label: 'Add Client',
            onClick: () => {
              resetForm();
              setShowCreateModal(true);
            }
          }}
          emptyState={{
            title: 'No clients found',
            description: 'Get started by creating your first client organization.',
            action: {
              label: 'Add Client',
              onClick: () => {
                resetForm();
                setShowCreateModal(true);
              }
            }
          }}
        />
      </motion.div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedClient(null);
          resetForm();
        }}
        title={selectedClient ? 'Edit Client' : 'Create New Client'}
        size="lg"
      >
        <Form onSubmit={handleSubmit} errors={formErrors} isSubmitting={isSubmitting}>
          <FormSection title="Basic Information">
            <FormGrid cols={2}>
              <FormField name="name">
                <FormLabel required>Client Name</FormLabel>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter client name"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField name="contact_email">
                <FormLabel required>Contact Email</FormLabel>
                <Input
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="Enter contact email"
                  disabled={isSubmitting}
                />
              </FormField>
            </FormGrid>

            <FormField name="contact_phone">
              <FormLabel>Contact Phone</FormLabel>
              <Input
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="Enter contact phone"
                disabled={isSubmitting}
              />
            </FormField>

            <FormField name="client_type">
              <FormLabel>Client Type</FormLabel>
              <Select
                value={formData.client_type || ''}
                onChange={(e) => setFormData({ ...formData, client_type: e.target.value as CreateClientRequest['client_type'] })}
                options={[
                  { value: 'industrial', label: 'Industrial' },
                  { value: 'logistics', label: 'Logistics' }
                ]}
                placeholder="Select a client type"
                disabled={isSubmitting}
              />
            </FormField>

            <FormField name="description">
              <FormLabel>Description</FormLabel>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter client description"
                rows={3}
                disabled={isSubmitting}
              />
            </FormField>
          </FormSection>

          <FormSection title="Address">
            <FormField name="address.street">
              <FormLabel>Street Address</FormLabel>
              <Input
                value={formData.address?.street || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { 
                    street: e.target.value,
                    city: formData.address?.city || '',
                    state: formData.address?.state || '',
                    country: formData.address?.country || '',
                    zip_code: formData.address?.zip_code || ''
                  }
                })}
                placeholder="Enter street address"
                disabled={isSubmitting}
              />
            </FormField>

            <FormGrid cols={2}>
              <FormField name="address.city">
                <FormLabel>City</FormLabel>
                <Input
                  value={formData.address?.city || ''}
                                  onChange={(e) => setFormData({
                  ...formData,
                  address: {
                    street: formData.address?.street || '',
                    city: e.target.value,
                    state: formData.address?.state || '',
                    country: formData.address?.country || '',
                    zip_code: formData.address?.zip_code || ''
                  }
                })}
                  placeholder="Enter city"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField name="address.state">
                <FormLabel>State/Province</FormLabel>
                <Input
                  value={formData.address?.state || ''}
                                  onChange={(e) => setFormData({
                  ...formData,
                  address: {
                    street: formData.address?.street || '',
                    city: formData.address?.city || '',
                    state: e.target.value,
                    country: formData.address?.country || '',
                    zip_code: formData.address?.zip_code || ''
                  }
                })}
                  placeholder="Enter state or province"
                  disabled={isSubmitting}
                />
              </FormField>
            </FormGrid>

            <FormGrid cols={2}>
              <FormField name="address.country">
                <FormLabel>Country</FormLabel>
                <Input
                  value={formData.address?.country || ''}
                                  onChange={(e) => setFormData({
                  ...formData,
                  address: {
                    street: formData.address?.street || '',
                    city: formData.address?.city || '',
                    state: formData.address?.state || '',
                    country: e.target.value,
                    zip_code: formData.address?.zip_code || ''
                  }
                })}
                  placeholder="Enter country"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField name="address.zip_code">
                <FormLabel>ZIP/Postal Code</FormLabel>
                <Input
                  value={formData.address?.zip_code || ''}
                                  onChange={(e) => setFormData({
                  ...formData,
                  address: {
                    street: formData.address?.street || '',
                    city: formData.address?.city || '',
                    state: formData.address?.state || '',
                    country: formData.address?.country || '',
                    zip_code: e.target.value
                  }
                })}
                  placeholder="Enter ZIP or postal code"
                  disabled={isSubmitting}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedClient(null);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={isSubmitting}
              disabled={isSubmitting || !isFormValid()}
            >
              {selectedClient ? 'Update Client' : 'Create Client'}
            </Button>
          </FormActions>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedClient(null);
        }}
        title="Delete Client"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedClient?.name}</strong>? 
            This action cannot be undone and will remove all associated data.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedClient(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteClientMutation.isPending}
            >
              Delete Client
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </PageTransition>
  );
}
