'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { assetAPI, clientAPI, type Asset, type Client, type CreateAssetRequest, type AssetFilters } from '@/services/api';
import { DataTable, type Column, type DataTableAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { QuickStats } from '@/components/ui/stats-card';
import { StatusBadge } from '@/components/ui/badge';
import { FormField, FormLabel, FormSection, FormGrid, FormActions, Select, Textarea } from '@/components/ui/form';
import { 
  Package, 
  Edit, 
  Trash2, 
  Plus, 
  TrendingUp, 
  Search, 
  Filter,
  Building2,
  Car,
  Wrench,
  MapPin,
  DollarSign,
  Calendar,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { ensureId } from '@/lib/id-utils';

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<Partial<CreateAssetRequest>>({
    name: '',
    description: '',
    asset_type: 'equipment',
    status: 'active',
    purchase_date: '',
    purchase_cost: undefined,
    current_value: undefined,
    location: '',
    vehicle_details: undefined,
    machinery_details: undefined
  });
  // const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load assets based on filters
  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters: AssetFilters = {
        search: searchTerm || undefined,
        status: (statusFilter as 'active' | 'maintenance' | 'retired' | 'damaged' | undefined) || undefined,
        asset_type: (typeFilter as 'vehicle' | 'machinery' | 'equipment' | 'infrastructure' | undefined) || undefined,
        client_id: selectedClient || undefined
      };

      let response;
      if (user?.role === 'super_admin') {
        if (selectedClient) {
          response = await assetAPI.getClientAssets(selectedClient, filters);
        } else {
          response = await assetAPI.getAssets(filters);
        }
      } else {
        response = await assetAPI.getAssets(filters);
      }
      
      const transformedAssets = ensureId(response);
      setAssets(transformedAssets);
    } catch (error) {
      toast.error('Failed to load assets');
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedClient, searchTerm, statusFilter, typeFilter]);

  // Load clients based on user role
  const loadClients = useCallback(async () => {
    try {
      if (user?.role === 'super_admin') {
        // Super admin can see all clients
        const response = await clientAPI.getClients();
        const transformedClients = ensureId(response || []);
        setClients(transformedClients);
      } else if (user?.role === 'admin' && user.client_id) {
        // Client admin can only see their own client
        const response = await clientAPI.getClient(user.client_id);
        const transformedClient = ensureId([response]);
        setClients(transformedClient);
      } else {
        // Regular users don't need client list
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
      setClients([]); // Set to empty array on error to prevent undefined
    }
  }, [user]);

  // Load data
  useEffect(() => {
    loadAssets();
    if (user?.role === 'super_admin' || user?.role === 'admin') {
      loadClients();
    }
  }, [user, loadAssets, loadClients]);

  // Stats
  const stats = [
    {
      title: 'Total Assets',
      value: assets.length.toString(),
      description: user?.role === 'super_admin' && selectedClient ? 'For selected client' : 'In system',
      icon: Package,
      color: 'blue' as const,
      trend: { value: '12%', isPositive: true, label: 'vs last month' }
    },
    {
      title: 'Active Assets',
      value: assets.filter(asset => asset.status === 'active').length.toString(),
      description: 'Operational',
      icon: TrendingUp,
      color: 'green' as const,
      trend: { value: '5%', isPositive: true, label: 'vs last week' }
    },
    {
      title: 'Maintenance Required',
      value: assets.filter(asset => asset.status === 'maintenance').length.toString(),
      description: 'Need attention',
      icon: Wrench,
      color: 'yellow' as const,
      trend: { value: '2', isPositive: false, label: 'new this week' }
    },
    {
      title: 'Total Value',
      value: `$${assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0).toLocaleString()}`,
      description: 'Current valuation',
      icon: DollarSign,
      color: 'purple' as const,
      trend: { value: '8%', isPositive: true, label: 'vs last month' }
    }
  ];

  // Table columns
  const columns: Column<Asset>[] = [
    {
      key: 'name',
      title: 'Asset Name',
      sortable: true,
      render: (asset) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-lg">
            {asset.asset_type === 'vehicle' ? <Car className="w-4 h-4 text-teal-600" /> : 
             asset.asset_type === 'machinery' ? <Wrench className="w-4 h-4 text-green-600" /> :
             <Package className="w-4 h-4 text-purple-600" />}
          </div>
          <div>
            <div className="font-medium text-gray-900">{asset.name}</div>
            <div className="text-sm text-gray-500 capitalize">{asset.asset_type}</div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (asset) => <StatusBadge status={asset.status} />
    },
    {
      key: 'location',
      title: 'Location',
      render: (asset) => asset.location ? (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="w-3 h-3 text-gray-400" />
          {asset.location}
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      )
    },
    {
      key: 'current_value',
      title: 'Current Value',
      sortable: true,
      render: (asset) => asset.current_value ? (
        <span className="font-medium">${asset.current_value.toLocaleString()}</span>
      ) : (
        <span className="text-gray-400">-</span>
      )
    },
    {
      key: 'purchase_date',
      title: 'Purchase Date',
      sortable: true,
      render: (asset) => asset.purchase_date ? (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="w-3 h-3 text-gray-400" />
          {formatDate(asset.purchase_date)}
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      )
    }
  ];

  // Add client column for super admin
  if (user?.role === 'super_admin' && !selectedClient) {
    columns.splice(2, 0, {
      key: 'client_id',
      title: 'Client',
      render: (asset) => {
        const client = clients.find(c => c.id === asset.client_id);
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
  const actions: DataTableAction<Asset>[] = [
    {
      key: 'view',
      label: 'View',
      icon: Eye,
      onClick: (asset) => {
        setSelectedAsset(asset);
        // TODO: Implement view modal
      },
      variant: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: (asset) => {
        setSelectedAsset(asset);
        setFormData({
          name: asset.name,
          description: asset.description,
          asset_type: asset.asset_type,
          status: asset.status,
          purchase_date: asset.purchase_date,
          purchase_cost: asset.purchase_cost,
          current_value: asset.current_value,
          location: asset.location,
          vehicle_details: asset.vehicle_details,
          machinery_details: asset.machinery_details
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
      onClick: (asset) => {
        setSelectedAsset(asset);
        setShowDeleteModal(true);
      }
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // setFormErrors({});
    setIsSubmitting(true);

    try {
      if (selectedAsset) {
        await assetAPI.updateAsset(selectedAsset.id, formData);
        toast.success('Asset updated successfully');
      } else {
        await assetAPI.createAsset(formData as CreateAssetRequest);
        toast.success('Asset created successfully');
      }
      
      setShowCreateModal(false);
      setSelectedAsset(null);
      setFormData({
        name: '',
        description: '',
        asset_type: 'equipment',
        status: 'active',
        purchase_date: '',
        purchase_cost: undefined,
        current_value: undefined,
        location: '',
        vehicle_details: undefined,
        machinery_details: undefined
      });
      loadAssets();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
        const detail = error.response.data.detail;
        if (typeof detail === 'object' && detail !== null) {
          // setFormErrors(detail as Record<string, string>);
        } else {
          toast.error(detail as string);
        }
      } else {
        toast.error('Failed to save asset');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;

    setIsSubmitting(true);
    try {
      await assetAPI.deleteAsset(selectedAsset.id);
      toast.success('Asset deleted successfully');
      setShowDeleteModal(false);
      setSelectedAsset(null);
      loadAssets();
    } catch {
      toast.error('Failed to delete asset');
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
              Assets
            </h1>
            <p className="text-xl text-muted-foreground">
              Manage your {user?.role === 'super_admin' && selectedClient ? 'client' : 'organization'} assets and equipment
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Asset
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  ...(clients?.map(client => ({ value: client.id, label: client.name })) || [])
                ]}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search assets..."
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
                { value: 'active', label: 'Active' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'retired', label: 'Retired' },
                { value: 'damaged', label: 'Damaged' }
              ]}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'vehicle', label: 'Vehicle' },
                { value: 'machinery', label: 'Machinery' },
                { value: 'equipment', label: 'Equipment' },
                { value: 'infrastructure', label: 'Infrastructure' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <DataTable
        data={assets}
        columns={columns}
        actions={actions}
        loading={loading}
        searchPlaceholder="Search assets by name or description..."
        searchFields={['name', 'description', 'location']}
        emptyState={{
          title: 'No assets found',
          description: 'Create your first asset to get started.',
          action: {
            label: 'Add Asset',
            onClick: () => setShowCreateModal(true)
          }
        }}
      />

      {/* Create/Edit Asset Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedAsset(null);
          // setFormErrors({});
        }}
        title={selectedAsset ? 'Edit Asset' : 'Create New Asset'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection title="Basic Information">
            <FormGrid cols={2}>
              <FormField name="name">
                <FormLabel htmlFor="name" required>Asset Name</FormLabel>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}

                  required
                />
              </FormField>

              <FormField name="asset_type">
                <FormLabel htmlFor="asset_type" required>Asset Type</FormLabel>
                <Select
                  id="asset_type"
                  value={formData.asset_type}
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value as 'vehicle' | 'machinery' | 'equipment' | 'infrastructure' })}

                  required
                  options={[
                    { value: 'vehicle', label: 'Vehicle' },
                    { value: 'machinery', label: 'Machinery' },
                    { value: 'equipment', label: 'Equipment' },
                    { value: 'infrastructure', label: 'Infrastructure' }
                  ]}
                />
              </FormField>

              <FormField name="status">
                <FormLabel htmlFor="status" required>Status</FormLabel>
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'maintenance' | 'retired' | 'damaged' })}

                  required
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'retired', label: 'Retired' },
                    { value: 'damaged', label: 'Damaged' }
                  ]}
                />
              </FormField>

              <FormField name="location">
                <FormLabel htmlFor="location">Location</FormLabel>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}

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

          <FormSection title="Financial Information">
            <FormGrid cols={3}>
              <FormField name="purchase_date">
                <FormLabel htmlFor="purchase_date">Purchase Date</FormLabel>
                <Input
                  type="date"
                  id="purchase_date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}

                />
              </FormField>

              <FormField name="purchase_cost">
                <FormLabel htmlFor="purchase_cost">Purchase Cost</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  id="purchase_cost"
                  value={formData.purchase_cost}
                  onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || undefined })}

                />
              </FormField>

              <FormField name="current_value">
                <FormLabel htmlFor="current_value">Current Value</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  id="current_value"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || undefined })}

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
                setSelectedAsset(null);
                // setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {selectedAsset ? 'Update Asset' : 'Create Asset'}
            </Button>
          </FormActions>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAsset(null);
        }}
        title="Delete Asset"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedAsset?.name}</strong>? 
            This action cannot be undone and will also delete all associated components.
          </p>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedAsset(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isSubmitting}
              onClick={handleDelete}
            >
              Delete Asset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

