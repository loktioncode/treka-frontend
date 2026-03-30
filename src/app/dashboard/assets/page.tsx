'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { type Asset, type Client, type CreateAssetRequest, type AssetFilters } from '@/services/api';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/useAssets';
import { useClients, useClient } from '@/hooks/useClients';
import { useClientLabels } from '@/hooks/useClientLabels';
import { useConnectedDevices } from '@/hooks/useConnectedDevices';
import { type VehicleDetails, type MachineryDetails, type EquipmentDetails } from '@/types/api';

import { DataTable, type Column, type DataTableAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { QuickStats } from '@/components/ui/stats-card';
import { StatusBadge } from '@/components/ui/badge';
import { Form, FormField, FormLabel, FormSection, FormGrid, FormActions, Select, Textarea } from '@/components/ui/form';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { PrimaryMaterial, PrimaryMaterialLabels, Condition, ConditionLabels } from '@/types/api';

export default function AssetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // React Query hooks
  const { data: clients = [] } = useClients();
  const { data: currentClient } = useClient(user?.client_id ?? '', !!user?.client_id);
  const isLogisticsClient = currentClient?.client_type === 'logistics';
  const { assetLabel, assetLabelSingular, componentLabel } = useClientLabels();
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Build filters for React Query
  const filters: AssetFilters = {
    search: searchTerm || undefined,
    status: (statusFilter as 'active' | 'maintenance' | 'retired' | 'damaged' | undefined) || undefined,
    asset_type: (typeFilter as 'vehicle' | 'machinery' | 'equipment' | 'infrastructure' | undefined) || undefined,
    client_id: selectedClient || undefined
  };

  // Get assets using React Query
  const { data: assets = [], isLoading: loading } = useAssets(filters);
  const { data: devicesData } = useConnectedDevices();
  const deviceIdToOnline = (devicesData?.devices ?? []).reduce<Record<string, boolean>>(
    (acc, d) => {
      acc[d.device_id] = d.online;
      return acc;
    },
    {}
  );

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
    vehicle_details: {
      make: '',
      model: '',
      year: 0,
      vin: '',
      license_plate: '',
      engine_type: '',
      fuel_type: '',
      mileage: 0,
      service_interval_km: 10000,
      driver_id: undefined
    },
    machinery_details: {
      make: '',
      model: '',
      year: 0,
      serial_number: '',
      operating_hours: 0,
      capacity: '',
      power_rating: ''
    },
    equipment_details: {
      model: '',
      serial_number: ''
    },
    infrastructure_details: {
      type: '',
      age: 0,
      material: undefined,
      condition: undefined
    }
  });
  // const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Helper functions to create complete detail objects
  const createCompleteVehicleDetails = (updates: Partial<VehicleDetails>): VehicleDetails => ({
    make: updates.make || formData.vehicle_details?.make || '',
    model: updates.model || formData.vehicle_details?.model || '',
    year: updates.year || formData.vehicle_details?.year || 0,
    vin: updates.vin || formData.vehicle_details?.vin || '',
    license_plate: updates.license_plate || formData.vehicle_details?.license_plate || '',
    engine_type: updates.engine_type || formData.vehicle_details?.engine_type || '',
    device_id: updates.device_id ?? formData.vehicle_details?.device_id ?? '',
    fuel_type: updates.fuel_type || formData.vehicle_details?.fuel_type || '',
    mileage: updates.mileage ?? formData.vehicle_details?.mileage ?? 0,
    service_interval_km: updates.service_interval_km ?? formData.vehicle_details?.service_interval_km ?? 10000,
    driver_id: updates.driver_id || formData.vehicle_details?.driver_id || undefined,
    mqtt_provider: updates.mqtt_provider ?? formData.vehicle_details?.mqtt_provider ?? undefined
  });

  const createCompleteMachineryDetails = (updates: Partial<MachineryDetails>): MachineryDetails => ({
    make: updates.make || formData.machinery_details?.make || '',
    model: updates.model || formData.machinery_details?.model || '',
    year: updates.year || formData.machinery_details?.year || 0,
    serial_number: updates.serial_number || formData.machinery_details?.serial_number || '',
    operating_hours: updates.operating_hours || formData.machinery_details?.operating_hours || 0,
    capacity: updates.capacity || formData.machinery_details?.capacity || '',
    power_rating: updates.power_rating || formData.machinery_details?.power_rating || ''
  });

  const createCompleteEquipmentDetails = (updates: Partial<EquipmentDetails>): EquipmentDetails => ({
    model: updates.model || formData.equipment_details?.model || '',
    serial_number: updates.serial_number || formData.equipment_details?.serial_number || ''
  });

  // Default form state for create (logistics clients can only add vehicles)
  const getDefaultCreateFormData = (): Partial<CreateAssetRequest> => ({
    name: '',
    description: '',
    asset_type: isLogisticsClient ? 'vehicle' : 'equipment',
    status: 'active',
    purchase_date: '',
    purchase_cost: undefined,
    current_value: undefined,
    location: '',
    vehicle_details: {
      make: '',
      model: '',
      year: 0,
      vin: '',
      license_plate: '',
      engine_type: '',
      fuel_type: '',
      mileage: 0,
      service_interval_km: 10000,
      driver_id: undefined,
      mqtt_provider: undefined
    },
    machinery_details: {
      make: '',
      model: '',
      year: 0,
      serial_number: '',
      operating_hours: 0,
      capacity: '',
      power_rating: ''
    },
    equipment_details: {
      model: '',
      serial_number: ''
    },
    infrastructure_details: {
      type: '',
      age: 0,
      material: undefined,
      condition: undefined
    }
  });

  // When create modal opens without an asset (create mode), ensure logistics clients get vehicle as default
  useEffect(() => {
    if (showCreateModal && !selectedAsset && isLogisticsClient && formData.asset_type !== 'vehicle') {
      setFormData((prev) => ({ ...prev, asset_type: 'vehicle' }));
    }
  }, [showCreateModal, selectedAsset, isLogisticsClient, formData.asset_type]);

  // React Query handles all data loading automatically

  // Handle edit mode from URL
  useEffect(() => {
    const editAssetId = searchParams.get('edit');
    if (editAssetId && assets.length > 0) {
      const assetToEdit = assets.find((asset: Asset) => asset.id === editAssetId);
      if (assetToEdit) {
        setSelectedAsset(assetToEdit);
        setFormData({
          name: assetToEdit.name,
          description: assetToEdit.description,
          asset_type: assetToEdit.asset_type,
          status: assetToEdit.status,
          purchase_date: assetToEdit.purchase_date,
          purchase_cost: assetToEdit.purchase_cost,
          current_value: assetToEdit.current_value,
          location: assetToEdit.location,
          vehicle_details: assetToEdit.vehicle_details
            ? { ...assetToEdit.vehicle_details, service_interval_km: assetToEdit.vehicle_details.service_interval_km ?? 10000 }
            : undefined,
          machinery_details: assetToEdit.machinery_details,
          equipment_details: assetToEdit.equipment_details,
          infrastructure_details: assetToEdit.infrastructure_details
        });
        setShowCreateModal(true);
        // Clear the edit parameter from URL
        router.replace('/dashboard/assets');
      }
    }
  }, [searchParams, assets, router]);

  // Stats
  const stats = [
    {
      title: `Total ${assetLabel}`,
      value: assets.length.toString(),
      description: user?.role === 'super_admin' && selectedClient ? 'For selected client' : 'In system',
      icon: Package,
      color: 'blue' as const,
      trend: { value: '12%', isPositive: true, label: 'vs last month' }
    },
    {
      title: `Active ${assetLabel}`,
      value: assets.filter((asset: Asset) => asset.status === 'active').length.toString(),
      description: 'Operational',
      icon: TrendingUp,
      color: 'green' as const,
      trend: { value: '5%', isPositive: true, label: 'vs last week' }
    },
    {
      title: 'Maintenance Required',
      value: assets.filter((asset: Asset) => asset.status === 'maintenance').length.toString(),
      description: 'Need attention',
      icon: Wrench,
      color: 'yellow' as const,
      trend: { value: '2', isPositive: false, label: 'new this week' }
    },
    {
      title: 'Total Value',
      value: `$${assets.reduce((sum: number, asset: Asset) => sum + (asset.current_value || 0), 0).toLocaleString()}`,
      description: 'Current valuation',
      icon: DollarSign,
      color: 'purple' as const,
      trend: { value: '8%', isPositive: true, label: 'vs last month' }
    }
  ];

  // Table columns: vehicle name, number plate, device type, connected, actions
  const columns: Column<Asset>[] = [
    {
      key: 'name',
      title: `${assetLabelSingular} Name`,
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
      key: 'license_plate',
      title: 'Number Plate',
      sortable: true,
      render: (asset) => {
        const plate = asset.asset_type === 'vehicle' && asset.vehicle_details?.license_plate
          ? asset.vehicle_details.license_plate
          : null;
        return plate ? (
          <span className="font-mono text-sm">{plate}</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      }
    },
    {
      key: 'device_type',
      title: 'Device Type',
      render: (asset) => {
        const provider = asset.asset_type === 'vehicle' && asset.vehicle_details?.mqtt_provider
          ? asset.vehicle_details.mqtt_provider
          : null;
        if (!provider) return <span className="text-gray-400">-</span>;
        return (
          <span className="capitalize text-sm">
            {provider === 'teltonika' ? 'Teltonika' : provider === 'custom' ? 'Custom' : provider}
          </span>
        );
      }
    },
    {
      key: 'connected',
      title: 'Connected',
      render: (asset) => {
        const deviceId = asset.asset_type === 'vehicle' && asset.vehicle_details?.device_id
          ? asset.vehicle_details.device_id
          : null;
        if (!deviceId) return <span className="text-gray-400">-</span>;
        const online = deviceIdToOnline[deviceId];
        return (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}
              aria-hidden
            />
            <span className={online ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
              {online ? 'Online' : 'Offline'}
            </span>
          </span>
        );
      }
    },
    {
      key: 'compliance_expiry',
      title: 'Next Expiry',
      render: (asset) => {
        const disks = asset.vehicle_details?.compliance_disks;
        if (!disks || disks.length === 0) return <span className="text-gray-400">—</span>;
        const dates = disks
          .map((d) => d.expiry_date ? new Date(d.expiry_date) : null)
          .filter((d): d is Date => d !== null)
          .sort((a, b) => a.getTime() - b.getTime());
        if (dates.length === 0) return <span className="text-gray-400">—</span>;
        const earliest = dates[0];
        const daysUntil = Math.ceil((earliest.getTime() - Date.now()) / 86400000);
        const expired = daysUntil <= 0;
        const soon = daysUntil > 0 && daysUntil <= 30;
        return (
          <span className={`text-xs font-medium ${expired ? "text-red-600" : soon ? "text-amber-600" : "text-gray-600"}`}>
            {earliest.toLocaleDateString()}
            {expired && " (expired)"}
            {soon && ` (${daysUntil}d)`}
          </span>
        );
      }
    }
  ];

  // Add client column for super admin (after Number Plate)
  if (user?.role === 'super_admin' && !selectedClient) {
    columns.splice(2, 0, {
      key: 'client_id',
      title: 'Client',
      render: (asset) => {
        const client = clients.find((c: Client) => c.id === asset.client_id);
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
        router.push(`/dashboard/assets/${asset.id}`);
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
          machinery_details: asset.machinery_details,
          equipment_details: asset.equipment_details,
          infrastructure_details: asset.infrastructure_details
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
    setIsSubmitting(true);

    try {
      if (selectedAsset) {
        // Update existing asset
        await updateAssetMutation.mutateAsync({
          assetId: selectedAsset.id,
          data: formData
        });
      } else {
        // Create new asset
        await createAssetMutation.mutateAsync(formData as CreateAssetRequest);
      }

      setShowCreateModal(false);
      setSelectedAsset(null);
      setFormData(getDefaultCreateFormData());
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
      await deleteAssetMutation.mutateAsync(selectedAsset.id);

      setShowDeleteModal(false);
      setSelectedAsset(null);
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
              {assetLabel}
            </h1>
            <p className="text-xl text-muted-foreground">
              Manage your {user?.role === 'super_admin' && selectedClient ? 'client' : 'organization'} {assetLabel.toLowerCase()} and equipment
            </p>
          </div>
          <Button
            onClick={() => {
              setFormData(getDefaultCreateFormData());
              setSelectedAsset(null);
              setShowCreateModal(true);
            }}
            className="gap-2"
          >
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
                  ...(clients?.map((client: Client) => ({ value: client.id, label: client.name })) || [])
                ]}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={`Search ${assetLabel.toLowerCase()}...`}
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
        onRowClick={(asset) => router.push(`/dashboard/assets/${asset.id}`)}
        loading={loading}
        searchPlaceholder={`Search ${assetLabel.toLowerCase()} by name or description...`}
        searchFields={['name', 'description', 'location']}
        emptyState={{
          title: `No ${assetLabel.toLowerCase()} found`,
          description: `Create your first ${assetLabelSingular.toLowerCase()} to get started.`,
          action: {
            label: 'Add Asset',
            onClick: () => {
              setFormData(getDefaultCreateFormData());
              setSelectedAsset(null);
              setShowCreateModal(true);
            }
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
        <Form onSubmit={handleSubmit} errors={{}} touched={{}} isSubmitting={isSubmitting}>
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
                <FormLabel htmlFor="asset_type" required>{assetLabelSingular} Type</FormLabel>
                <Select
                  id="asset_type"
                  value={formData.asset_type}
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value as 'vehicle' | 'machinery' | 'equipment' | 'infrastructure' })}
                  required
                  disabled={isLogisticsClient}
                  options={
                    isLogisticsClient
                      ? [{ value: 'vehicle', label: 'Vehicle' }]
                      : [
                          { value: 'vehicle', label: 'Vehicle' },
                          { value: 'machinery', label: 'Machinery' },
                          { value: 'equipment', label: 'Equipment' },
                          { value: 'infrastructure', label: 'Infrastructure' }
                        ]
                  }
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

          {/* Dynamic Asset Type Specific Fields */}
          {formData.asset_type === 'vehicle' && (
            <FormSection title="Vehicle Details">
              <FormGrid cols={2}>
                <FormField name="vehicle_make">
                  <FormLabel htmlFor="vehicle_make" required>Make</FormLabel>
                  <Input
                    id="vehicle_make"
                    value={formData.vehicle_details?.make || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ make: e.target.value })
                    })}
                    placeholder="e.g., Toyota, Ford, BMW"
                    required
                  />
                </FormField>

                <FormField name="vehicle_model">
                  <FormLabel htmlFor="vehicle_model" required>Model</FormLabel>
                  <Input
                    id="vehicle_model"
                    value={formData.vehicle_details?.model || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ model: e.target.value })
                    })}
                    placeholder="e.g., Camry, F-150, X5"
                    required
                  />
                </FormField>

                <FormField name="vehicle_year">
                  <FormLabel htmlFor="vehicle_year" required>Year</FormLabel>
                  <Input
                    type="number"
                    id="vehicle_year"
                    value={formData.vehicle_details?.year || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ year: parseInt(e.target.value) || 0 })
                    })}
                    placeholder="e.g., 2020"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </FormField>

                <FormField name="vehicle_vin">
                  <FormLabel htmlFor="vehicle_vin" required>VIN</FormLabel>
                  <Input
                    id="vehicle_vin"
                    value={formData.vehicle_details?.vin || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ vin: e.target.value })
                    })}
                    placeholder="17-character VIN"
                    maxLength={17}
                    required
                  />
                </FormField>

                <FormField name="vehicle_mqtt_provider">
                  <FormLabel htmlFor="vehicle_mqtt_provider">Device / MQTT provider</FormLabel>
                  <Select
                    id="vehicle_mqtt_provider"
                    value={formData.vehicle_details?.mqtt_provider ?? 'custom'}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({
                        mqtt_provider: (e.target.value === 'teltonika' ? 'teltonika' : 'custom') as 'custom' | 'teltonika'
                      })
                    })}
                    options={[
                      { value: 'custom', label: 'Custom (HiveMQ — ESP32/firmware)' },
                      { value: 'teltonika', label: 'Teltonika (Flespi)' }
                    ]}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Teltonika devices use Flespi MQTT; custom devices use the default HiveMQ broker.
                  </p>
                </FormField>
                <FormField name="vehicle_device_id">
                  <FormLabel htmlFor="vehicle_device_id">IoT Device ID</FormLabel>
                  <Input
                    id="vehicle_device_id"
                    value={formData.vehicle_details?.device_id || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ device_id: e.target.value })
                    })}
                    placeholder={formData.vehicle_details?.mqtt_provider === 'teltonika' ? 'e.g., 1234567 (Flespi device ID)' : 'e.g., ESP32_OBD_001'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.vehicle_details?.mqtt_provider === 'teltonika'
                      ? 'Flespi device ID for live position (topic: flespi/state/gw/devices/{id}/telemetry/position).'
                      : 'Required for telemetry and live tracking. Must match the device_id in the firmware Config (e.g. ESP32_OBD_001).'}
                  </p>
                </FormField>

                <FormField name="vehicle_license_plate">
                  <FormLabel htmlFor="vehicle_license_plate">License Plate</FormLabel>
                  <Input
                    id="vehicle_license_plate"
                    value={formData.vehicle_details?.license_plate || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ license_plate: e.target.value })
                    })}
                    placeholder="e.g., ABC-123"
                  />
                </FormField>

                <FormField name="vehicle_engine_type">
                  <FormLabel htmlFor="vehicle_engine_type">Engine Type</FormLabel>
                  <Input
                    id="vehicle_engine_type"
                    value={formData.vehicle_details?.engine_type || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ engine_type: e.target.value })
                    })}
                    placeholder="e.g., V6, V8, Electric"
                  />
                </FormField>

                <FormField name="vehicle_fuel_type">
                  <FormLabel htmlFor="vehicle_fuel_type">Fuel Type</FormLabel>
                  <Select
                    id="vehicle_fuel_type"
                    value={formData.vehicle_details?.fuel_type || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ fuel_type: e.target.value })
                    })}
                    options={[
                      { value: '', label: 'Select fuel type' },
                      { value: 'petrol', label: 'Petrol' },
                      { value: 'diesel', label: 'Diesel' },
                      { value: 'electric', label: 'Electric' },
                      { value: 'hybrid', label: 'Hybrid' }
                    ]}
                  />
                </FormField>

                <FormField name="vehicle_license_plate">
                  <FormLabel htmlFor="vehicle_license_plate">License Plate</FormLabel>
                  <Input
                    id="vehicle_license_plate"
                    value={formData.vehicle_details?.license_plate || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ license_plate: e.target.value })
                    })}
                    placeholder="e.g., CA 123-456 (SA) or ABC-123 (ZW)"
                    maxLength={20}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    South African format: CA 123-456 | Zimbabwean format: ABC-123
                  </p>
                </FormField>

                <FormField name="vehicle_mileage">
                  <FormLabel htmlFor="vehicle_mileage">Mileage</FormLabel>
                  <Input
                    type="number"
                    id="vehicle_mileage"
                    value={formData.vehicle_details?.mileage || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ mileage: parseInt(e.target.value) || 0 })
                    })}
                    placeholder="e.g., 50000"
                    min="0"
                  />
                </FormField>

                <FormField name="vehicle_service_interval">
                  <FormLabel htmlFor="vehicle_service_interval">Service Interval (km)</FormLabel>
                  <Input
                    type="number"
                    id="vehicle_service_interval"
                    value={formData.vehicle_details?.service_interval_km ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehicle_details: createCompleteVehicleDetails({ service_interval_km: parseInt(e.target.value) || 10000 })
                    })}
                    placeholder="e.g., 10000"
                    min="1000"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Distance between scheduled services (default 10,000 km)
                  </p>
                </FormField>


              </FormGrid>
            </FormSection>
          )}

          {formData.asset_type === 'machinery' && (
            <FormSection title="Machinery Details">
              <FormGrid cols={2}>
                <FormField name="machinery_make">
                  <FormLabel htmlFor="machinery_make" required>Make</FormLabel>
                  <Input
                    id="machinery_make"
                    value={formData.machinery_details?.make || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      machinery_details: createCompleteMachineryDetails({ make: e.target.value })
                    })}
                    placeholder="e.g., Caterpillar, Komatsu"
                    required
                  />
                </FormField>

                <FormField name="machinery_model">
                  <FormLabel htmlFor="machinery_model" required>Model</FormLabel>
                  <Input
                    id="machinery_model"
                    value={formData.machinery_details?.model || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      machinery_details: createCompleteMachineryDetails({ model: e.target.value })
                    })}
                    placeholder="e.g., D6T, PC200"
                    required
                  />
                </FormField>

                <FormField name="machinery_year">
                  <FormLabel htmlFor="machinery_year" required>Year</FormLabel>
                  <Input
                    type="number"
                    id="machinery_year"
                    value={formData.machinery_details?.year || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      machinery_details: createCompleteMachineryDetails({ year: parseInt(e.target.value) || 0 })
                    })}
                    placeholder="e.g., 2018"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </FormField>

                <FormField name="machinery_serial_number">
                  <FormLabel htmlFor="machinery_serial_number" required>Serial Number</FormLabel>
                  <Input
                    id="machinery_serial_number"
                    value={formData.machinery_details?.serial_number || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      machinery_details: createCompleteMachineryDetails({ serial_number: e.target.value })
                    })}
                    placeholder="e.g., CAT123456"
                    required
                  />
                </FormField>

                <FormField name="machinery_operating_hours">
                  <FormLabel htmlFor="machinery_operating_hours">Operating Hours</FormLabel>
                  <Input
                    type="number"
                    id="machinery_operating_hours"
                    value={formData.machinery_details?.operating_hours || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      machinery_details: createCompleteMachineryDetails({ operating_hours: parseInt(e.target.value) || 0 })
                    })}
                    placeholder="e.g., 2500"
                    min="0"
                  />
                </FormField>

                <FormField name="machinery_capacity">
                  <FormLabel htmlFor="machinery_capacity">Capacity</FormLabel>
                  <Input
                    id="machinery_capacity"
                    value={formData.machinery_details?.capacity || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      machinery_details: createCompleteMachineryDetails({ capacity: e.target.value })
                    })}
                    placeholder="e.g., 20 tons, 200 HP"
                  />
                </FormField>

                <FormField name="machinery_power_rating">
                  <FormLabel htmlFor="machinery_power_rating">Power Rating</FormLabel>
                  <Input
                    id="machinery_power_rating"
                    value={formData.machinery_details?.power_rating || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      machinery_details: createCompleteMachineryDetails({ power_rating: e.target.value })
                    })}
                    placeholder="e.g., 200 HP, 150 kW"
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          {formData.asset_type === 'equipment' && (
            <FormSection title="Equipment Details">
              <FormGrid cols={2}>
                <FormField name="equipment_model">
                  <FormLabel htmlFor="equipment_model">Model</FormLabel>
                  <Input
                    id="equipment_model"
                    value={formData.equipment_details?.model || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      equipment_details: createCompleteEquipmentDetails({ model: e.target.value })
                    })}
                    placeholder="e.g., Model XYZ-2000"
                  />
                </FormField>

                <FormField name="equipment_serial_number">
                  <FormLabel htmlFor="equipment_serial_number">Serial Number</FormLabel>
                  <Input
                    id="equipment_serial_number"
                    value={formData.equipment_details?.serial_number || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      equipment_details: createCompleteEquipmentDetails({ serial_number: e.target.value })
                    })}
                    placeholder="e.g., EQ123456"
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          {formData.asset_type === 'infrastructure' && (
            <FormSection title="Infrastructure Details">
              <FormGrid cols={2}>
                <FormField name="infrastructure_type">
                  <FormLabel htmlFor="infrastructure_type">Type</FormLabel>
                  <Select
                    id="infrastructure_type"
                    value={formData.infrastructure_details?.type || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      infrastructure_details: {
                        ...formData.infrastructure_details,
                        type: e.target.value
                      }
                    })}
                    options={[
                      { value: '', label: 'Select type' },
                      { value: 'building', label: 'Building' },
                      { value: 'bridge', label: 'Bridge' },
                      { value: 'road', label: 'Road' },
                      { value: 'pipeline', label: 'Pipeline' },
                      { value: 'electrical', label: 'Electrical System' },
                      { value: 'plumbing', label: 'Plumbing System' },
                      { value: 'other', label: 'Other' }
                    ]}
                  />
                </FormField>

                <FormField name="infrastructure_age">
                  <FormLabel htmlFor="infrastructure_age">Age (Years)</FormLabel>
                  <Input
                    type="number"
                    id="infrastructure_age"
                    value={formData.infrastructure_details?.age || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      infrastructure_details: {
                        ...formData.infrastructure_details,
                        age: parseInt(e.target.value) || undefined
                      }
                    })}
                    placeholder="e.g., 15"
                    min="0"
                  />
                </FormField>

                <FormField name="infrastructure_material">
                  <FormLabel htmlFor="infrastructure_material">Primary Material</FormLabel>
                  <Select
                    id="infrastructure_material"
                    value={formData.infrastructure_details?.material || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      infrastructure_details: {
                        ...formData.infrastructure_details,
                        material: e.target.value as PrimaryMaterial
                      }
                    })}
                    options={[
                      { value: '', label: 'Select material' },
                      { value: PrimaryMaterial.STEEL, label: PrimaryMaterialLabels[PrimaryMaterial.STEEL] },
                      { value: PrimaryMaterial.ALUMINUM, label: PrimaryMaterialLabels[PrimaryMaterial.ALUMINUM] },
                      { value: PrimaryMaterial.CONCRETE, label: PrimaryMaterialLabels[PrimaryMaterial.CONCRETE] },
                      { value: PrimaryMaterial.WOOD, label: PrimaryMaterialLabels[PrimaryMaterial.WOOD] },
                      { value: PrimaryMaterial.PLASTIC, label: PrimaryMaterialLabels[PrimaryMaterial.PLASTIC] },
                      { value: PrimaryMaterial.COMPOSITE, label: PrimaryMaterialLabels[PrimaryMaterial.COMPOSITE] },
                      { value: PrimaryMaterial.GLASS, label: PrimaryMaterialLabels[PrimaryMaterial.GLASS] },
                      { value: PrimaryMaterial.CERAMIC, label: PrimaryMaterialLabels[PrimaryMaterial.CERAMIC] },
                      { value: PrimaryMaterial.BRICK, label: PrimaryMaterialLabels[PrimaryMaterial.BRICK] },
                      { value: PrimaryMaterial.STONE, label: PrimaryMaterialLabels[PrimaryMaterial.STONE] },
                      { value: PrimaryMaterial.COPPER, label: PrimaryMaterialLabels[PrimaryMaterial.COPPER] },
                      { value: PrimaryMaterial.BRASS, label: PrimaryMaterialLabels[PrimaryMaterial.BRASS] },
                      { value: PrimaryMaterial.TITANIUM, label: PrimaryMaterialLabels[PrimaryMaterial.TITANIUM] },
                      { value: PrimaryMaterial.CARBON_FIBER, label: PrimaryMaterialLabels[PrimaryMaterial.CARBON_FIBER] },
                      { value: PrimaryMaterial.FIBERGLASS, label: PrimaryMaterialLabels[PrimaryMaterial.FIBERGLASS] },
                      { value: PrimaryMaterial.RUBBER, label: PrimaryMaterialLabels[PrimaryMaterial.RUBBER] },
                      { value: PrimaryMaterial.LEATHER, label: PrimaryMaterialLabels[PrimaryMaterial.LEATHER] },
                      { value: PrimaryMaterial.FABRIC, label: PrimaryMaterialLabels[PrimaryMaterial.FABRIC] },
                      { value: PrimaryMaterial.OTHER, label: PrimaryMaterialLabels[PrimaryMaterial.OTHER] }
                    ]}
                  />
                </FormField>

                <FormField name="infrastructure_condition">
                  <FormLabel htmlFor="infrastructure_condition">Condition</FormLabel>
                  <Select
                    id="infrastructure_condition"
                    value={formData.infrastructure_details?.condition || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      infrastructure_details: {
                        ...formData.infrastructure_details,
                        condition: e.target.value as Condition
                      }
                    })}
                    options={[
                      { value: '', label: 'Select condition' },
                      { value: Condition.EXCELLENT, label: ConditionLabels[Condition.EXCELLENT] },
                      { value: Condition.GOOD, label: ConditionLabels[Condition.GOOD] },
                      { value: Condition.FAIR, label: ConditionLabels[Condition.FAIR] },
                      { value: Condition.POOR, label: ConditionLabels[Condition.POOR] },
                      { value: Condition.CRITICAL, label: ConditionLabels[Condition.CRITICAL] }
                    ]}
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          )}

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
                  value={formData.purchase_cost || ''}
                  onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || undefined })}
                />
              </FormField>

              <FormField name="current_value">
                <FormLabel htmlFor="current_value">Current Value</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  id="current_value"
                  value={formData.current_value || ''}
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
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAsset(null);
        }}
        title={`Delete ${assetLabelSingular}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedAsset?.name}</strong>?
            This action cannot be undone and will also delete all associated {componentLabel.toLowerCase()}.
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

