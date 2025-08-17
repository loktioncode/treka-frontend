'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { assetAPI, componentAPI, type Asset, type Component, type CreateComponentRequest } from '@/services/api';
import { PrimaryMaterialLabels, ConditionLabels } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Form, FormField, FormLabel, FormSection, FormGrid, FormActions, Select, Textarea } from '@/components/ui/form';
import { 
  ArrowLeft, 
  Edit, 
  Plus, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Settings,
  Calendar,
  DollarSign,
  MapPin,
  Package,
  Car,
  Building2
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

export default function AssetViewPage() {
  const { assetId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state for component creation/editing
  const [componentFormData, setComponentFormData] = useState<Partial<CreateComponentRequest>>({
    name: '',
    description: '',
    component_type: '',
    status: 'operational',
    specifications: {},
    last_maintenance_date: '',
    next_maintenance_date: '',
    maintenance_interval_days: 30
  });

  // Load asset and components
  useEffect(() => {
    if (assetId) {
      loadAsset();
      loadComponents();
    }
  }, [assetId]);

  const loadAsset = async () => {
    try {
      const response = await assetAPI.getAsset(assetId as string);
      setAsset(response);
    } catch (error) {
      toast.error('Failed to load asset');
      console.error('Error loading asset:', error);
    }
  };

  const loadComponents = async () => {
    try {
      const response = await componentAPI.getComponents({ asset_id: assetId as string });
      setComponents(response);
    } catch (error) {
      toast.error('Failed to load components');
      console.error('Error loading components:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComponentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedComponent) {
        await componentAPI.updateComponent(selectedComponent.id, componentFormData);
        toast.success('Component updated successfully');
      } else {
        await componentAPI.createComponent({
          ...componentFormData,
          asset_id: assetId as string
        } as CreateComponentRequest);
        toast.success('Component created successfully');
      }
      
      setShowComponentModal(false);
      setSelectedComponent(null);
      setComponentFormData({
        name: '',
        description: '',
        component_type: '',
        status: 'operational',
        specifications: {},
        last_maintenance_date: '',
        next_maintenance_date: '',
        maintenance_interval_days: 30
      });
      loadComponents();
    } catch (error) {
      toast.error('Failed to save component');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComponent = (component: Component) => {
    setSelectedComponent(component);
    setComponentFormData({
      name: component.name,
      description: component.description,
      component_type: component.component_type,
      status: component.status,
      specifications: component.specifications || {},
      last_maintenance_date: component.last_maintenance_date,
      next_maintenance_date: component.next_maintenance_date,
      maintenance_interval_days: component.maintenance_interval_days
    });
    setShowComponentModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'inactive': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getAssetTypeIcon = (assetType: string) => {
    switch (assetType) {
      case 'vehicle': return <Car className="w-6 h-6" />;
      case 'machinery': return <Wrench className="w-6 h-6" />;
      case 'equipment': return <Package className="w-6 h-6" />;
      case 'infrastructure': return <Building2 className="w-6 h-6" />;
      default: return <Package className="w-6 h-6" />;
    }
  };

  const getMaterialLabel = (material: string) => {
    return PrimaryMaterialLabels[material as keyof typeof PrimaryMaterialLabels] || material;
  };

  const getConditionLabel = (condition: string) => {
    return ConditionLabels[condition as keyof typeof ConditionLabels] || condition;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Asset not found</h1>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            {getAssetTypeIcon(asset.asset_type)}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{asset.name}</h1>
              <p className="text-gray-600">{asset.description}</p>
            </div>
          </div>
        </div>
        <Button onClick={() => router.push(`/dashboard/assets/${asset.id}/edit`)} className="gap-2">
          <Edit className="w-4 h-4" />
          Edit Asset
        </Button>
      </motion.div>

      {/* Asset Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Asset Type</p>
              <p className="font-semibold capitalize">{asset.asset_type}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold capitalize">{asset.status}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-semibold">{asset.location || 'Not specified'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Current Value</p>
              <p className="font-semibold">${asset.current_value?.toLocaleString() || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Asset Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border p-6"
      >
        <h2 className="text-xl font-semibold mb-4">Asset Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">Purchase Date</p>
            <p className="font-medium">{asset.purchase_date ? formatDate(asset.purchase_date) : 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Purchase Cost</p>
            <p className="font-medium">${asset.purchase_cost?.toLocaleString() || 'Not specified'}</p>
          </div>
          {asset.vehicle_details && (
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-2">Vehicle Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Make</p>
                  <p className="font-medium">{asset.vehicle_details.make}</p>
                </div>
                <div>
                  <p className="text-gray-600">Model</p>
                  <p className="font-medium">{asset.vehicle_details.model}</p>
                </div>
                <div>
                  <p className="text-gray-600">Year</p>
                  <p className="font-medium">{asset.vehicle_details.year}</p>
                </div>
                <div>
                  <p className="text-gray-600">VIN</p>
                  <p className="font-medium">{asset.vehicle_details.vin}</p>
                </div>
              </div>
            </div>
          )}
          {asset.machinery_details && (
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-2">Machinery Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Make</p>
                  <p className="font-medium">{asset.machinery_details.make}</p>
                </div>
                <div>
                  <p className="text-gray-600">Model</p>
                  <p className="font-medium">{asset.machinery_details.model}</p>
                </div>
                <div>
                  <p className="text-gray-600">Year</p>
                  <p className="font-medium">{asset.machinery_details.year}</p>
                </div>
                <div>
                  <p className="text-gray-600">Serial Number</p>
                  <p className="font-medium">{asset.machinery_details.serial_number}</p>
                </div>
              </div>
            </div>
          )}
          {asset.infrastructure_details && (
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-2">Infrastructure Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Type</p>
                  <p className="font-medium">{asset.infrastructure_details.type}</p>
                </div>
                <div>
                  <p className="text-gray-600">Age</p>
                  <p className="font-medium">{asset.infrastructure_details.age} years</p>
                </div>
                <div>
                  <p className="text-gray-600">Material</p>
                  <p className="font-medium">
                    {asset.infrastructure_details.material 
                      ? getMaterialLabel(asset.infrastructure_details.material)
                      : 'Not specified'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Condition</p>
                  <p className="font-medium capitalize">
                    {asset.infrastructure_details.condition 
                      ? getConditionLabel(asset.infrastructure_details.condition)
                      : 'Not specified'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Components Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Components</h2>
          <Button onClick={() => setShowComponentModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Component
          </Button>
        </div>

        {/* Components Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {components.map((component) => (
            <motion.div
              key={component.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">{component.name}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditComponent(component)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{component.description}</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(component.status)}`}>
                    {getStatusIcon(component.status)}
                    {component.status}
                  </span>
                </div>
                
                {component.next_maintenance_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Next Maintenance:</span>
                    <span className="font-medium">{formatDate(component.next_maintenance_date)}</span>
                  </div>
                )}
                
                {component.last_maintenance_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wrench className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Last Maintenance:</span>
                    <span className="font-medium">{formatDate(component.last_maintenance_date)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {components.length === 0 && (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No components yet</h3>
            <p className="text-gray-600 mb-4">Start by adding components to track maintenance and performance.</p>
            <Button onClick={() => setShowComponentModal(true)}>
              Add First Component
            </Button>
          </div>
        )}
      </motion.div>

      {/* Component Modal */}
      <Modal
        isOpen={showComponentModal}
        onClose={() => {
          setShowComponentModal(false);
          setSelectedComponent(null);
          setComponentFormData({
            name: '',
            description: '',
            component_type: '',
            status: 'operational',
            specifications: {},
            last_maintenance_date: '',
            next_maintenance_date: '',
            maintenance_interval_days: 30
          });
        }}
        title={selectedComponent ? 'Edit Component' : 'Add Component'}
      >
        <form onSubmit={handleComponentSubmit} className="space-y-6">
          <FormGrid>
            <FormField>
              <FormLabel>Name *</FormLabel>
              <Input
                value={componentFormData.name}
                onChange={(e) => setComponentFormData({ ...componentFormData, name: e.target.value })}
                placeholder="Component name"
                required
              />
            </FormField>
            
            <FormField>
              <FormLabel>Type *</FormLabel>
              <Input
                value={componentFormData.component_type}
                onChange={(e) => setComponentFormData({ ...componentFormData, component_type: e.target.value })}
                placeholder="Component type"
                required
              />
            </FormField>
          </FormGrid>
          
          <FormField>
            <FormLabel>Description</FormLabel>
            <Textarea
              value={componentFormData.description}
              onChange={(e) => setComponentFormData({ ...componentFormData, description: e.target.value })}
              placeholder="Component description"
              rows={3}
            />
          </FormField>
          
          <FormGrid>
            <FormField>
              <FormLabel>Status *</FormLabel>
              <Select
                value={componentFormData.status}
                onChange={(e) => setComponentFormData({ ...componentFormData, status: e.target.value as any })}
                options={[
                  { value: 'operational', label: 'Operational' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
            </FormField>
            
            <FormField>
              <FormLabel>Maintenance Interval (days)</FormLabel>
              <Input
                type="number"
                value={componentFormData.maintenance_interval_days}
                onChange={(e) => setComponentFormData({ ...componentFormData, maintenance_interval_days: parseInt(e.target.value) || 30 })}
                placeholder="30"
              />
            </FormField>
          </FormGrid>
          
          <FormGrid>
            <FormField>
              <FormLabel>Last Maintenance Date</FormLabel>
              <Input
                type="date"
                value={componentFormData.last_maintenance_date || ''}
                onChange={(e) => setComponentFormData({ ...componentFormData, last_maintenance_date: e.target.value })}
              />
            </FormField>
            
            <FormField>
              <FormLabel>Next Maintenance Date</FormLabel>
              <Input
                type="date"
                value={componentFormData.next_maintenance_date || ''}
                onChange={(e) => setComponentFormData({ ...componentFormData, next_maintenance_date: e.target.value })}
              />
            </FormField>
          </FormGrid>
          
          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowComponentModal(false);
                setSelectedComponent(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (selectedComponent ? 'Update' : 'Create')}
            </Button>
          </FormActions>
        </form>
      </Modal>
    </div>
  );
}
