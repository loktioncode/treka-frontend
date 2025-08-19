'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  type Component, 
  type Asset,
  type Client,
  type CreateComponentRequest, 
  type ComponentFilters
} from '@/services/api';
import { useComponents, useCreateComponent, useUpdateComponent, useDeleteComponent } from '@/hooks/useComponents';
import { useAssets } from '@/hooks/useAssets';
import { useClients } from '@/hooks/useClients';
import { ComponentStatus } from '@/types/api';
import { DataTable, type Column, type DataTableAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { QuickStats } from '@/components/ui/stats-card';
import { StatusBadge } from '@/components/ui/badge';
import { Form, FormField, FormLabel, FormSection, FormGrid, FormActions, Select, Textarea } from '@/components/ui/form';
import { 
  Wrench, 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  Filter,
  Building2,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate, formatDateForInput } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function ComponentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // React Query hooks
  const { data: clients = [] } = useClients();
  const { data: assets = [] } = useAssets();
  const createComponentMutation = useCreateComponent();
  const updateComponentMutation = useUpdateComponent();
  const deleteComponentMutation = useDeleteComponent();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Build filters for React Query
  const filters: ComponentFilters = {
    search: searchTerm || undefined,
    status: (statusFilter as 'operational' | 'warning' | 'critical' | 'maintenance' | 'inactive' | undefined) || undefined,
    asset_id: selectedAsset || undefined,
    client_id: selectedClient || undefined
  };

  // Get components using React Query
  const { data: components = [], isLoading: loading } = useComponents(filters);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    component_type: string;
    status: ComponentStatus;
    asset_id: string;
    specifications: Record<string, unknown>;
    last_maintenance_date: string;
    next_maintenance_date: string;
    maintenance_interval_days: number;
  }>({
    name: '',
    description: '',
    component_type: '',
    status: 'operational',
    asset_id: '',
    specifications: {},
    last_maintenance_date: '',
    next_maintenance_date: '',
    maintenance_interval_days: 30
  });


  // Reset asset filter when client changes
  useEffect(() => {
    setSelectedAsset(''); // Reset asset filter when client changes
  }, [selectedClient]);

  // Stats
  const stats = [
    {
      title: 'Total Components',
      value: components.length.toString(),
      description: user?.role === 'super_admin' && selectedClient ? 'For selected client' : 'In system',
      icon: Wrench,
      color: 'blue' as const,
      trend: { value: '15%', isPositive: true, label: 'vs last month' }
    },
    {
      title: 'Operational',
      value: components.filter((comp: Component) => comp.status === 'operational').length.toString(),
      description: 'Working normally',
      icon: CheckCircle,
      color: 'green' as const,
      trend: { value: '8%', isPositive: true, label: 'vs last week' }
    },
    {
      title: 'Critical Issues',
      value: components.filter((comp: Component) => comp.status === 'critical').length.toString(),
      description: 'Need immediate attention',
      icon: AlertTriangle,
      color: 'red' as const,
      trend: { value: '2', isPositive: false, label: 'new today' }
    },
    {
      title: 'Maintenance Due',
      value: components.filter((comp: Component) => {
        if (!comp.next_maintenance_date) return false;
        const dueDate = new Date(comp.next_maintenance_date);
        const today = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }).length.toString(),
      description: 'Within 7 days',
      icon: Clock,
      color: 'yellow' as const,
      trend: { value: '3', isPositive: false, label: 'this week' }
    }
  ];

  // Table columns
  const columns: Column<Component>[] = [
    {
      key: 'name',
      title: 'Component Name',
      sortable: true,
      render: (component) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-lg">
            <Wrench className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{component.name}</div>
            <div className="text-sm text-gray-500">{component.component_type}</div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (component) => <StatusBadge status={component.status} />
    },
    {
      key: 'asset_id',
      title: 'Asset',
      render: (component) => {
        const asset = assets.find((a: Asset) => a.id === component.asset_id);
        return asset ? (
          <div className="flex items-center gap-2">
            <Package className="w-3 h-3 text-gray-400" />
            <span className="text-sm">{asset.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">Unknown</span>
        );
      }
    },
    {
      key: 'last_maintenance_date',
      title: 'Last Maintenance',
      sortable: true,
      render: (component) => component.last_maintenance_date ? (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="w-3 h-3 text-gray-400" />
          {formatDate(component.last_maintenance_date)}
        </div>
      ) : (
        <span className="text-gray-400">Never</span>
      )
    },
    {
      key: 'next_maintenance_date',
      title: 'Next Maintenance',
      sortable: true,
      render: (component) => {
        if (!component.next_maintenance_date) {
          return <span className="text-gray-400">Not scheduled</span>;
        }
        
        const dueDate = new Date(component.next_maintenance_date);
        const today = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let className = "text-sm";
        if (diffDays < 0) className += " text-red-600"; // Overdue
        else if (diffDays <= 7) className += " text-yellow-600"; // Due soon
        else className += " text-gray-600"; // Future
        
        return (
          <div className={`flex items-center gap-1 ${className}`}>
            <Clock className="w-3 h-3" />
            {formatDate(component.next_maintenance_date)}
            {diffDays < 0 && <span className="text-xs">(Overdue)</span>}
            {diffDays >= 0 && diffDays <= 7 && <span className="text-xs">(Due soon)</span>}
          </div>
        );
      }
    }
  ];

  // Add client column for super admin
  if (user?.role === 'super_admin' && !selectedClient) {
    columns.splice(3, 0, {
      key: 'client_id',
      title: 'Client',
      render: (component) => {
        const client = clients.find((c: Client) => c.id === component.client_id);
        return client ? (
          <div className="flex items-center gap-2">
            <Building2 className="w-3 h-3 text-gray-400" />
            <span className="text-sm">{client.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">Unknown</span>
        );
      }
    });
  }

  // Table actions
  const actions: DataTableAction<Component>[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: (component) => {
        router.push(`/dashboard/components/${component.id}`);
      },
      variant: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: (component) => {
        console.log('Editing component:', component);
        console.log('Original dates:', {
          last_maintenance_date: component.last_maintenance_date,
          next_maintenance_date: component.next_maintenance_date
        });
        
        const formattedDates = {
          last_maintenance_date: formatDateForInput(component.last_maintenance_date),
          next_maintenance_date: formatDateForInput(component.next_maintenance_date)
        };
        
        console.log('Formatted dates:', formattedDates);
        
        setSelectedComponent(component);
        setFormData({
          name: component.name,
          description: component.description || '',
          component_type: component.component_type,
          status: component.status,
          asset_id: component.asset_id,
          specifications: component.specifications || {},
          last_maintenance_date: formattedDates.last_maintenance_date,
          next_maintenance_date: formattedDates.next_maintenance_date,
          maintenance_interval_days: component.maintenance_interval_days || 30
        });
        setShowCreateModal(true);
      },
      variant: 'secondary'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      onClick: (component) => {
        setSelectedComponent(component);
        setShowDeleteModal(true);
      }
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      // Convert date strings to proper format for the API
      const processedData = {
        ...formData,
        // Convert date strings to ISO datetime format or undefined if empty
        last_maintenance_date: formData.last_maintenance_date && 
          typeof formData.last_maintenance_date === 'string' && 
          formData.last_maintenance_date.trim() !== ''
          ? new Date(formData.last_maintenance_date).toISOString()
          : undefined,
        next_maintenance_date: formData.next_maintenance_date && 
          typeof formData.next_maintenance_date === 'string' && 
          formData.next_maintenance_date.trim() !== ''
          ? new Date(formData.next_maintenance_date).toISOString()
          : undefined
      };

      if (selectedComponent) {
        // Update existing component
        await updateComponentMutation.mutateAsync({ 
          componentId: selectedComponent.id, 
          data: processedData 
        });
      } else {
        // Create new component
        await createComponentMutation.mutateAsync(processedData as CreateComponentRequest);
      }
      
      setShowCreateModal(false);
      setSelectedComponent(null);
      setFormData({
        name: '',
        description: '',
        component_type: '',
        status: 'operational',
        asset_id: '',
        specifications: {},
        last_maintenance_date: '',
        next_maintenance_date: '',
        maintenance_interval_days: 30
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
        const detail = error.response.data.detail;
        if (typeof detail === 'object' && detail !== null) {
          // Form errors handling removed
        } else {
          toast.error(detail as string);
        }
      } else {
        toast.error('Failed to save component');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedComponent) return;

    setIsSubmitting(true);
    try {
      await deleteComponentMutation.mutateAsync(selectedComponent.id);
      
      setShowDeleteModal(false);
      setSelectedComponent(null);
    } catch {
      toast.error('Failed to delete component');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Components
            </h1>
            <p className="text-xl text-muted-foreground">
              Manage asset components and maintenance schedules
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Component
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <QuickStats stats={stats} />

      {/* Filters */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Filter className="w-5 h-5" />
          Filters
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Client filter - only for super admin */}
          {user?.role === 'super_admin' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Client</label>
              <Select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full"
                options={[
                  { value: '', label: 'All Clients' },
                  ...(clients.map((client: Client) => ({ value: client.id, label: client.name })))
                ]}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Asset</label>
            <Select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              options={[
                { value: '', label: 'All Assets' },
                ...(assets.map((asset: Asset) => ({ value: asset.id, label: asset.name })))
              ]}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'operational', label: 'Operational' },
                { value: 'warning', label: 'Warning' },
                { value: 'critical', label: 'Critical' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Components Table */}
      <DataTable
        data={components}
        columns={columns}
        actions={actions}
        loading={loading}
        searchPlaceholder="Search components by name or type..."
        searchFields={['name', 'description', 'component_type']}
        emptyState={{
          title: 'No components found',
          description: 'Create your first component to get started.',
          action: {
            label: 'Add Component',
            onClick: () => setShowCreateModal(true)
          }
        }}
      />

      {/* Create/Edit Component Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedComponent(null);

        }}
        title={selectedComponent ? 'Edit Component' : 'Create New Component'}
        size="lg"
      >
        <Form onSubmit={handleSubmit} errors={{}} touched={{}} isSubmitting={isSubmitting}>
          <FormSection title="Basic Information">
            <FormGrid cols={2}>
              <FormField name="name">
                <FormLabel htmlFor="name" required>Component Name</FormLabel>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}

                  required
                />
              </FormField>

              <FormField name="component_type">
                <FormLabel htmlFor="component_type" required>Component Type</FormLabel>
                <Input
                  id="component_type"
                  value={formData.component_type}
                  onChange={(e) => setFormData({ ...formData, component_type: e.target.value })}

                  placeholder="e.g., Engine, Brake System, etc."
                  required
                />
              </FormField>

              <FormField name="status">
                <FormLabel htmlFor="status" required>Status</FormLabel>
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ComponentStatus })}
                  options={[
                    { value: 'operational', label: 'Operational' },
                    { value: 'warning', label: 'Warning' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                  required
                />
              </FormField>

              <FormField name="asset_id">
                <FormLabel htmlFor="asset_id" required>Asset</FormLabel>
                <Select
                  id="asset_id"
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  options={[
                    { value: '', label: 'Select an asset' },
                    ...assets.map((asset: Asset) => ({ value: asset.id, label: asset.name }))
                  ]}
                  required
                />
              </FormField>
            </FormGrid>

                          <FormField name="description">
                <FormLabel htmlFor="description">Description</FormLabel>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}

                rows={3}
              />
            </FormField>
          </FormSection>

          <FormSection title="Maintenance Schedule">
            <FormGrid cols={3}>
              <FormField name="last_maintenance_date">
                <FormLabel htmlFor="last_maintenance_date">Last Maintenance</FormLabel>
                <Input
                  type="date"
                  id="last_maintenance_date"
                  value={formData.last_maintenance_date || ''}
                  onChange={(e) => setFormData({ ...formData, last_maintenance_date: e.target.value })}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Debug: {formData.last_maintenance_date || 'No date set'}
                </div>
              </FormField>

              <FormField name="maintenance_interval_days">
                <FormLabel htmlFor="maintenance_interval_days">Interval (Days)</FormLabel>
                <Input
                  type="number"
                  id="maintenance_interval_days"
                  value={formData.maintenance_interval_days}
                  onChange={(e) => setFormData({ ...formData, maintenance_interval_days: parseInt(e.target.value) || 30 })}

                  min="1"
                />
              </FormField>

              <FormField name="next_maintenance_date">
                <FormLabel htmlFor="next_maintenance_date">Next Maintenance</FormLabel>
                <Input
                  type="date"
                  id="next_maintenance_date"
                  value={formData.next_maintenance_date}
                  onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}

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
                setSelectedComponent(null);

              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {selectedComponent ? 'Update Component' : 'Create Component'}
            </Button>
          </FormActions>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedComponent(null);
        }}
        title="Delete Component"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedComponent?.name}</strong>? 
            This action cannot be undone and will also delete all maintenance logs.
          </p>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedComponent(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isSubmitting}
              onClick={handleDelete}
            >
              Delete Component
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

