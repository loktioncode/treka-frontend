'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { assetAPI, componentAPI, clientAPI, type Asset, type Component, type CreateComponentRequest } from '@/services/api';
import { type ComponentStatus } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Form, FormField, FormLabel, FormGrid, FormActions, Select, Textarea } from '@/components/ui/form';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
  Building2,
  Gauge,
  Fuel,
  Compass,
  Activity,
  Zap,
  Thermometer,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AssetViewPage() {
  const { assetId } = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; first_name: string; last_name: string; license_number?: string; role?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDriverAssignModal, setShowDriverAssignModal] = useState(false);
  const [showUnassignConfirmModal, setShowUnassignConfirmModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  
  // Simulated sensor data for vehicles (will come from ESP32)
  const [vehicleSensorData] = useState({
    fuelLevel: 78, // percentage
    mileage: 15420, // km
    averageSpeed: 45, // km/h
    idlingTime: 2.5, // hours today
    engineTemp: 92, // celsius
    engineVibrations: 0.15, // g-force
    currentSpeed: 0, // km/h (stationary)
    direction: 'N', // compass direction
    lastUpdate: new Date().toISOString()
  });

  // Simulated sensor data for machinery (will come from various sensors)
  const [machinerySensorData] = useState({
    motorTemp: 68, // celsius
    motorVibrations: 0.08, // g-force
    beltTension: 85, // percentage of optimal
    bearingHealth: 92, // percentage
    actuatorPosition: 45, // degrees
    pressure: 2.4, // bar
    flowRate: 12.5, // L/min
    powerConsumption: 3.2, // kW
    lastUpdate: new Date().toISOString()
  });

  // Cost calculator state (vehicle)
  const [costStart, setCostStart] = useState<string>('');
  const [costEnd, setCostEnd] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [idlingHours, setIdlingHours] = useState<string>('');
  const [fuelPrice, setFuelPrice] = useState<string>('1.85'); // price per liter
  const [lPer100Km, setLPer100Km] = useState<string>('10'); // driving consumption
  const [driverRate, setDriverRate] = useState<string>(''); // optional
  const [driverHours, setDriverHours] = useState<string>(''); // optional
  const [otherCosts, setOtherCosts] = useState<string>(''); // optional

  const calcNumber = (v: string): number => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const computedCosts = (() => {
    const distance = calcNumber(distanceKm);
    const price = calcNumber(fuelPrice);
    const driveCons = calcNumber(lPer100Km);
    const dRate = calcNumber(driverRate);
    const dHours = calcNumber(driverHours);
    const extra = calcNumber(otherCosts);

    const litersDriving = (distance * driveCons) / 100; // L
    const fuelCost = litersDriving * price;
    const driverCost = dRate > 0 && dHours > 0 ? dRate * dHours : 0;
    const total = fuelCost + driverCost + extra;

    return { litersDriving, fuelCost, driverCost, extra, total };
  })();

  // Form state for component creation/editing
  const [componentFormData, setComponentFormData] = useState<{
    name: string;
    description: string;
    component_type: string;
    status: ComponentStatus;
    specifications: Record<string, unknown>;
    last_maintenance_date: string;
    next_maintenance_date: string;
    maintenance_interval_days: number;
  }>({
    name: '',
    description: '',
    component_type: '',
    status: 'operational',
    specifications: {},
    last_maintenance_date: '',
    next_maintenance_date: '',
    maintenance_interval_days: 30
  });

  // Dynamic component types based on asset type
  const getComponentTypes = (assetType: string) => {
    const baseTypes = [
      { value: 'general', label: 'General Component' },
      { value: 'electrical_general', label: 'Electrical Component' },
      { value: 'mechanical', label: 'Mechanical Component' },
      { value: 'hydraulic', label: 'Hydraulic Component' },
      { value: 'pneumatic', label: 'Pneumatic Component' }
    ];

    const assetSpecificTypes = {
      vehicle: [
        { value: 'engine', label: 'Engine Component' },
        { value: 'transmission', label: 'Transmission Component' },
        { value: 'brake', label: 'Brake Component' },
        { value: 'suspension', label: 'Suspension Component' },
        { value: 'electrical_system', label: 'Electrical System' },
        { value: 'fuel_system', label: 'Fuel System' },
        { value: 'cooling_system', label: 'Cooling System' },
        { value: 'consumable', label: 'Consumable (Oil, Filters, etc.)' }
      ],
      machinery: [
        { value: 'motor', label: 'Motor/Engine' },
        { value: 'belt', label: 'Belts & Pulleys' },
        { value: 'bearing', label: 'Bearings' },
        { value: 'seal', label: 'Seals & Gaskets' },
        { value: 'filter', label: 'Filters' },
        { value: 'actuator', label: 'Actuators' },
        { value: 'sensor', label: 'Sensors' },
        { value: 'control_system', label: 'Control System' },
        { value: 'consumable', label: 'Consumable Parts' }
      ],
      equipment: [
        { value: 'power_supply', label: 'Power Supply' },
        { value: 'circuit_board', label: 'Circuit Board' },
        { value: 'display', label: 'Display/Screen' },
        { value: 'connector', label: 'Connectors' },
        { value: 'battery', label: 'Battery' },
        { value: 'cooling_fan', label: 'Cooling Fan' },
        { value: 'storage', label: 'Storage Device' },
        { value: 'consumable', label: 'Consumable Parts' }
      ],
      infrastructure: [
        { value: 'structural', label: 'Structural Component' },
        { value: 'electrical_infrastructure', label: 'Electrical System' },
        { value: 'plumbing', label: 'Plumbing System' },
        { value: 'hvac', label: 'HVAC System' },
        { value: 'security', label: 'Security System' },
        { value: 'lighting', label: 'Lighting System' },
        { value: 'consumable', label: 'Consumable Parts' }
      ]
    };

    return [...baseTypes, ...(assetSpecificTypes[assetType as keyof typeof assetSpecificTypes] || [])];
  };

  // Load asset and components
  const loadAsset = useCallback(async () => {
    try {
      const response = await assetAPI.getAsset(assetId as string);
      setAsset(response);
    } catch (error) {
      toast.error('Failed to load asset');
      console.error('Error loading asset:', error);
    }
  }, [assetId]);

  const loadComponents = useCallback(async () => {
    try {
      const response = await componentAPI.getComponents({ asset_id: assetId as string });
      setComponents(response);
    } catch (error) {
      toast.error('Failed to load components');
      console.error('Error loading components:', error);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  const loadDrivers = useCallback(async () => {
    try {
      if (asset?.client_id) {
        setLoadingDrivers(true);
        console.log('🔍 Loading drivers for client:', asset.client_id);
        console.log('🔍 API params:', { role: 'driver' });
        
        const response = await clientAPI.getClientUsers(asset.client_id, { 
          role: 'driver'
        });
        console.log('🔍 Drivers API response:', response);
        console.log('🔍 Response type:', typeof response);
        console.log('🔍 Response length:', Array.isArray(response) ? response.length : 'Not an array');
        
        if (Array.isArray(response)) {
          console.log('🔍 First driver data:', response[0]);
          console.log('🔍 All driver roles:', response.map(d => ({ id: d.id, name: `${d.first_name} ${d.last_name}`, role: d.role })));
        }
        
        setDrivers(response || []);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  }, [asset?.client_id]);

  useEffect(() => {
    if (assetId) {
      loadAsset();
      loadComponents();
    }
  }, [assetId, loadAsset, loadComponents]);

  useEffect(() => {
    if (asset) {
      loadDrivers();
    }
  }, [asset, loadDrivers]);



  const handleComponentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert date strings to proper format for the API
      const processedData = {
        ...componentFormData,
        asset_id: assetId as string,
        // Convert date strings to ISO datetime format or undefined if empty
        last_maintenance_date: componentFormData.last_maintenance_date && 
          typeof componentFormData.last_maintenance_date === 'string' && 
          componentFormData.last_maintenance_date.trim() !== ''
          ? new Date(componentFormData.last_maintenance_date).toISOString()
          : undefined,
        next_maintenance_date: componentFormData.next_maintenance_date && 
          typeof componentFormData.next_maintenance_date === 'string' && 
          componentFormData.next_maintenance_date.trim() !== ''
          ? new Date(componentFormData.next_maintenance_date).toISOString()
          : undefined
      };

      if (selectedComponent) {
        await componentAPI.updateComponent(selectedComponent.id, processedData);
        toast.success('Component updated successfully');
      } else {
        await componentAPI.createComponent(processedData as CreateComponentRequest);
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
    } catch {
      toast.error('Failed to save component');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComponent = (component: Component) => {
    setSelectedComponent(component);
    
    // Convert dates to YYYY-MM-DD format for HTML date inputs
    const formatDateForInput = (dateString: string | undefined) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
      } catch (error) {
        console.error('Error formatting date:', error);
        return '';
      }
    };

    setComponentFormData({
      name: component.name,
      description: component.description || '',
      component_type: component.component_type,
      status: component.status,
      specifications: component.specifications || {},
      last_maintenance_date: formatDateForInput(component.last_maintenance_date),
      next_maintenance_date: formatDateForInput(component.next_maintenance_date),
      maintenance_interval_days: component.maintenance_interval_days || 30
    });
    setShowComponentModal(true);
  };

  // Driver assignment handlers
  const handleUnassignDriver = () => {
    setShowUnassignConfirmModal(true);
  };

  const handleConfirmUnassign = async () => {
    if (!asset?.vehicle_details?.driver_id) return;
    
    setIsSubmitting(true);
    try {
      // Call API to unassign driver from vehicle
      await assetAPI.unassignDriverFromVehicle(asset.id);
      
      // Reload asset data
      await loadAsset();
      await loadDrivers();
      
      toast.success('Driver successfully unassigned from vehicle');
      setShowUnassignConfirmModal(false);
    } catch (error) {
      toast.error('Failed to unassign driver from vehicle');
      console.error('Error unassigning driver:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriverId) {
      toast.error('Please select a driver');
      return;
    }

    // Check if driver is already assigned to another vehicle
    const selectedDriver = drivers.find(d => d.id === selectedDriverId);
    if (!selectedDriver) {
      toast.error('Selected driver not found');
      return;
    }

    setIsSubmitting(true);
    try {
      // Call API to assign driver to vehicle
      await assetAPI.assignDriverToVehicle(asset!.id, selectedDriverId);
      
      // Reload asset data
      await loadAsset();
      await loadDrivers();
      
      toast.success(`Driver ${selectedDriver.first_name} ${selectedDriver.last_name} successfully assigned to vehicle`);
      setShowDriverAssignModal(false);
      setSelectedDriverId('');
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to assign driver to vehicle'
        : 'Failed to assign driver to vehicle';
      toast.error(errorMessage);
      console.error('Error assigning driver:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get available drivers (not assigned to any vehicle)
  const getAvailableDrivers = () => {
    console.log('🔍 All drivers:', drivers);
    console.log('🔍 Current asset driver ID:', asset?.vehicle_details?.driver_id);
    console.log('🔍 Drivers with role filter:', drivers.filter(d => d.role === 'driver'));
    
    const availableDrivers = drivers.filter(driver => {
      // Don't show the currently assigned driver as available
      const isAvailable = driver.id !== asset?.vehicle_details?.driver_id;
      console.log(`🔍 Driver ${driver.first_name} ${driver.last_name} (role: ${driver.role}): available=${isAvailable}`);
      return isAvailable;
    });
    
    console.log('🔍 Available drivers:', availableDrivers);
    return availableDrivers;
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

      {/* Asset Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="overview" 
              className="flex-1 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="sensors" 
              className="flex-1 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
            >
              Sensor Data
            </TabsTrigger>
            {asset.asset_type === 'vehicle' && (
              <TabsTrigger 
                value="costs" 
                className="flex-1 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
              >
                Cost Calculator
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="components" 
              className="flex-1 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
            >
              Components
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="space-y-6">
            {/* Asset Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-blue-50 to-white border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Components</p>
                      <p className="text-2xl font-bold text-blue-800">{components.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-50 to-white border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Operational</p>
                      <p className="text-2xl font-bold text-green-800">
                        {components.filter(c => c.status === 'operational').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-amber-50 to-white border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                    <div>
                      <p className="text-sm text-amber-600 font-medium">Maintenance Due</p>
                      <p className="text-2xl font-bold text-amber-800">
                        {components.filter(c => c.status === 'maintenance').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-red-50 to-white border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-sm text-red-600 font-medium">Critical</p>
                      <p className="text-2xl font-bold text-red-800">
                        {components.filter(c => c.status === 'critical').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Asset Information */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Asset Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Purchase Date, Purchase Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
                  <p className="text-gray-900">{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Cost</label>
                  <p className="text-gray-900">{asset.purchase_cost ? `$${asset.purchase_cost.toLocaleString()}` : 'Not specified'}</p>
                </div>
              </div>
              
              {/* Only show relevant asset type details */}
              {asset.asset_type === 'vehicle' && asset.vehicle_details && (
                <div className="md:col-span-2 mt-6">
                  <h4 className="font-semibold mb-2">Vehicle Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                      <p className="text-gray-900">{asset.vehicle_details.make || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                      <p className="text-gray-900">{asset.vehicle_details.model || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                      <p className="text-gray-900">{asset.vehicle_details.year || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">License Plate</label>
                      <p className="text-gray-900">{asset.vehicle_details.license_plate || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">VIN</label>
                      <p className="text-gray-900">{asset.vehicle_details.vin || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Type</label>
                      <p className="text-gray-900">{asset.vehicle_details.fuel_type || 'Not specified'}</p>
                    </div>

                  </div>
                </div>
              )}

              {/* Driver Assignment Section for Vehicles */}
              {asset.asset_type === 'vehicle' && (
                <div className="md:col-span-2 mt-6">
                  <h4 className="font-semibold mb-4">Driver Assignment</h4>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {asset.vehicle_details?.driver_id ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Car className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {drivers.find(d => d.id === asset.vehicle_details?.driver_id)?.first_name} {drivers.find(d => d.id === asset.vehicle_details?.driver_id)?.last_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              License: {drivers.find(d => d.id === asset.vehicle_details?.driver_id)?.license_number || 'Not specified'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => handleUnassignDriver()}
                        >
                          Remove Driver
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Car className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 mb-3">No driver assigned to this vehicle</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                          onClick={() => setShowDriverAssignModal(true)}
                          disabled={drivers.length === 0}
                        >
                          {drivers.length === 0 ? 'No Available Drivers' : 'Assign Driver'}
                        </Button>
                        {drivers.length === 0 && (
                          <p className="text-xs text-gray-400 mt-2">Create driver users first to assign them to vehicles</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {asset.asset_type === 'machinery' && asset.machinery_details && (
                <div className="md:col-span-2 mt-6">
                  <h4 className="font-semibold mb-2">Machinery Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                      <p className="text-gray-900">{asset.machinery_details.make || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                      <p className="text-gray-900">{asset.machinery_details.model || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                      <p className="text-gray-900">{asset.machinery_details.year || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
                      <p className="text-gray-900">{asset.machinery_details.serial_number || 'Not specified'}</p>
                    </div>
                    {asset.machinery_details.operating_hours && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Operating Hours</label>
                        <p className="text-gray-900">{asset.machinery_details.operating_hours}</p>
                      </div>
                    )}
                    {asset.machinery_details.capacity && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                        <p className="text-gray-900">{asset.machinery_details.capacity}</p>
                      </div>
                    )}
                    {asset.machinery_details.power_rating && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Power Rating</label>
                        <p className="text-gray-900">{asset.machinery_details.power_rating}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {asset.asset_type === 'infrastructure' && asset.infrastructure_details && (
                <div className="md:col-span-2 mt-6">
                  <h4 className="font-semibold mb-2">Infrastructure Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <p className="text-gray-900">{asset.infrastructure_details.type || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                      <p className="text-gray-900">{asset.infrastructure_details.age ? `${asset.infrastructure_details.age} years` : 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                      <p className="text-gray-900">{asset.infrastructure_details.material || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                      <p className="text-gray-900">{asset.infrastructure_details.condition || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Maintenance Summary */}
            <div className="bg-white rounded-lg border p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Maintenance Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Upcoming Maintenance</h4>
                  <div className="space-y-2">
                    {components
                      .filter(c => c.next_maintenance_date)
                      .sort((a, b) => new Date(a.next_maintenance_date!).getTime() - new Date(b.next_maintenance_date!).getTime())
                      .slice(0, 3)
                      .map(component => (
                        <div key={component.id} className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                          <div>
                            <p className="font-medium text-sm">{component.name}</p>
                            <p className="text-xs text-amber-600">
                              Due: {new Date(component.next_maintenance_date!).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            {component.status}
                          </Badge>
                        </div>
                      ))}
                    {components.filter(c => c.next_maintenance_date).length === 0 && (
                      <p className="text-sm text-gray-500">No upcoming maintenance scheduled</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {components
                      .filter(c => c.last_maintenance_date)
                      .sort((a, b) => new Date(b.last_maintenance_date!).getTime() - new Date(a.last_maintenance_date!).getTime())
                      .slice(0, 3)
                      .map(component => (
                        <div key={component.id} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                          <div>
                            <p className="font-medium text-sm">{component.name}</p>
                            <p className="text-xs text-green-600">
                              Last: {new Date(component.last_maintenance_date!).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {component.status}
                          </Badge>
                        </div>
                      ))}
                    {components.filter(c => c.last_maintenance_date).length === 0 && (
                      <p className="text-sm text-gray-500">No recent maintenance activity</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Sensor Data Tab */}
          <TabsContent value="sensors" className="space-y-6">
            {asset.asset_type === 'vehicle' ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      <Gauge className="w-5 h-5 text-blue-600" />
                      Vehicle Sensor Data (ESP32)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Fuel className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-800">{vehicleSensorData.fuelLevel}%</div>
                        <p className="text-sm text-blue-600">Fuel Level</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <Gauge className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-800">{vehicleSensorData.mileage.toLocaleString()} km</div>
                        <p className="text-sm text-green-600">Total Mileage</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <Activity className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-purple-800">{vehicleSensorData.averageSpeed} km/h</div>
                        <p className="text-sm text-purple-600">Average Speed</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-orange-800">{vehicleSensorData.idlingTime}h</div>
                        <p className="text-sm text-orange-600">Idling Time</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800">Engine Performance</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="flex items-center gap-2 text-gray-700">
                              <Thermometer className="w-4 h-4 text-red-500" />
                              Engine Temperature
                            </span>
                            <span className="font-semibold">{vehicleSensorData.engineTemp}°C</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="flex items-center gap-2 text-gray-700">
                              <Activity className="w-4 h-4 text-yellow-500" />
                              Engine Vibrations
                            </span>
                            <span className="font-semibold">{vehicleSensorData.engineVibrations}g</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800">Current Status</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="flex items-center gap-2 text-gray-700">
                              <Gauge className="w-4 h-4 text-blue-500" />
                              Current Speed
                            </span>
                            <span className="font-semibold">{vehicleSensorData.currentSpeed} km/h</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="flex items-center gap-2 text-gray-700">
                              <Compass className="w-4 h-4 text-green-500" />
                              Direction
                            </span>
                            <span className="font-semibold">{vehicleSensorData.direction}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs text-gray-500 text-center">
                      Last updated: {formatDate(vehicleSensorData.lastUpdate)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : asset.asset_type === 'machinery' ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="bg-gradient-to-r from-green-50 to-white border-b">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Zap className="w-5 h-5 text-green-600" />
                      Machinery Sensor Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <Thermometer className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-800">{machinerySensorData.motorTemp}°C</div>
                        <p className="text-sm text-green-600">Motor Temperature</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-800">{machinerySensorData.motorVibrations}g</div>
                        <p className="text-sm text-blue-600">Motor Vibrations</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-purple-800">{machinerySensorData.beltTension}%</div>
                        <p className="text-sm text-purple-600">Belt Tension</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <CheckCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-orange-800">{machinerySensorData.bearingHealth}%</div>
                        <p className="text-sm text-orange-600">Bearing Health</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800">System Parameters</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="flex items-center gap-2 text-gray-700">
                              <Settings className="w-4 h-4 text-blue-500" />
                              Actuator Position
                            </span>
                            <span className="font-semibold">{machinerySensorData.actuatorPosition}°</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="flex items-center gap-2 text-gray-700">
                              <Gauge className="w-4 h-4 text-red-500" />
                              Pressure
                            </span>
                            <span className="font-semibold">{machinerySensorData.pressure} bar</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800">Performance Metrics</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="flex items-center gap-2 text-gray-700">
                              <Activity className="w-4 h-4 text-green-500" />
                              Flow Rate
                            </span>
                            <span className="font-semibold">{machinerySensorData.flowRate} L/min</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="flex items-center gap-2 text-gray-700">
                              <Zap className="w-4 h-4 text-yellow-500" />
                              Power Consumption
                            </span>
                            <span className="font-semibold">{machinerySensorData.powerConsumption} kW</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs text-gray-500 text-center">
                      Last updated: {formatDate(machinerySensorData.lastUpdate)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📡</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Sensor Data Not Available</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Real-time sensor data is currently only available for vehicles and machinery assets. 
                  Equipment and infrastructure assets will have sensor integration in future updates.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Cost Calculator (Vehicle Only) */}
          {asset.asset_type === 'vehicle' && (
            <TabsContent value="costs" className="space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-amber-50 to-white border-b">
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    Operational Cost Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date/Time</label>
                      <input
                        type="datetime-local"
                        value={costStart}
                        onChange={(e) => setCostStart(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date/Time</label>
                      <input
                        type="datetime-local"
                        value={costEnd}
                        onChange={(e) => setCostEnd(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Distance (km)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. 125.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Idling Time (hours)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={idlingHours}
                        onChange={(e) => setIdlingHours(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. 2.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Price (per L)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={fuelPrice}
                        onChange={(e) => setFuelPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. 1.85"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Consumption (L/100km)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={lPer100Km}
                        onChange={(e) => setLPer100Km(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. 10.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Other Costs (optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={otherCosts}
                        onChange={(e) => setOtherCosts(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. tolls, parking"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Driver Rate (per hour, optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={driverRate}
                        onChange={(e) => setDriverRate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. 5.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Driver Hours (optional)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={driverHours}
                        onChange={(e) => setDriverHours(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. 8.0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <Gauge className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-amber-800">{computedCosts.litersDriving.toFixed(2)} L</div>
                      <p className="text-sm text-amber-700">Fuel Used</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-800">${computedCosts.fuelCost.toFixed(2)}</div>
                      <p className="text-sm text-green-700">Fuel Cost</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-800">${computedCosts.total.toFixed(2)}</div>
                      <p className="text-sm text-blue-700">Total Cost</p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border text-sm text-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="font-medium">Driving Fuel:</span> {computedCosts.litersDriving.toFixed(2)} L
                      </div>
                      <div>
                        <span className="font-medium">Driver Cost:</span> ${computedCosts.driverCost.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Other Costs:</span> ${computedCosts.extra.toFixed(2)}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Costs are estimates based on inputs; integrate with telemetry for precise figures.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-6">
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
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(component.status || 'operational')}`}>
                        {getStatusIcon(component.status || 'operational')}
                        {component.status || 'Operational'}
                      </span>
                    </div>
                    
                    {/* Next Maintenance Due */}
                    {component.next_maintenance_date ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">Next Maintenance:</span>
                        <span className="font-medium">{formatDate(component.next_maintenance_date)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Next Maintenance: Not scheduled</span>
                      </div>
                    )}
                    
                    {/* Last Maintenance */}
                    {component.last_maintenance_date ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Wrench className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">Last Maintenance:</span>
                        <span className="font-medium">{formatDate(component.last_maintenance_date)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Wrench className="w-4 h-4 text-gray-400" />
                        <span>Last Maintenance: Never</span>
                      </div>
                    )}
                    
                    {/* Maintenance Interval */}
                    {component.maintenance_interval_days && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">Interval:</span>
                        <span className="font-medium">{component.maintenance_interval_days} days</span>
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
          </TabsContent>
        </Tabs>
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
        <Form onSubmit={handleComponentSubmit} errors={{}} touched={{}} isSubmitting={isSubmitting}>
          <FormGrid>
            <FormField name="name">
              <FormLabel>Name *</FormLabel>
              <Input
                value={componentFormData.name}
                onChange={(e) => setComponentFormData({ ...componentFormData, name: e.target.value })}
                placeholder="Component name"
                required
              />
            </FormField>
            
            <FormField name="component_type">
              <FormLabel>Type *</FormLabel>
              <Select
                options={getComponentTypes(asset?.asset_type || 'equipment')}
                value={componentFormData.component_type}
                onChange={(e) => setComponentFormData({ ...componentFormData, component_type: e.target.value })}
                placeholder="Select component type"
                required
              />
            </FormField>
          </FormGrid>
          
          <FormField name="description">
            <FormLabel>Description</FormLabel>
            <Textarea
              value={componentFormData.description}
              onChange={(e) => setComponentFormData({ ...componentFormData, description: e.target.value })}
              placeholder="Component description"
              rows={3}
            />
          </FormField>
          
          <FormGrid>
            <FormField name="status">
              <FormLabel>Status *</FormLabel>
              <Select
                value={componentFormData.status || 'operational'}
                onChange={(e) => setComponentFormData({ ...componentFormData, status: e.target.value as ComponentStatus })}
                options={[
                  { value: 'operational', label: 'Operational' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
            </FormField>
            
            <FormField name="maintenance_interval_days">
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
            <FormField name="last_maintenance_date">
              <FormLabel>Last Maintenance Date</FormLabel>
              <Input
                type="date"
                value={componentFormData.last_maintenance_date || ''}
                onChange={(e) => setComponentFormData({ ...componentFormData, last_maintenance_date: e.target.value })}
              />
            </FormField>
            
            <FormField name="next_maintenance_date">
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
        </Form>
      </Modal>

      {/* Driver Assignment Modal */}
      <Modal
        isOpen={showDriverAssignModal}
        onClose={() => {
          setShowDriverAssignModal(false);
          setSelectedDriverId('');
        }}
        title="Assign Driver to Vehicle"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Select a driver to assign to <strong>{asset?.name}</strong>. 
            Only unassigned drivers are shown.
          </p>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Available Drivers
            </label>
            
            {/* Driver count info */}
            <div className="text-sm text-gray-600">
              {loadingDrivers ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                  Loading drivers...
                </span>
              ) : (
                `Available drivers: ${getAvailableDrivers().length}`
              )}
            </div>
            
            <SearchableSelect
              value={selectedDriverId}
              onChange={setSelectedDriverId}
              options={[
                { value: '', label: 'Select a driver...' },
                ...getAvailableDrivers().map(driver => ({
                  value: driver.id,
                  label: `${driver.first_name} ${driver.last_name}${driver.license_number ? ` (${driver.license_number})` : ''}`
                }))
              ]}
              placeholder="Choose driver"
              searchPlaceholder="Type to search drivers by name or email..."
            />
          </div>

          {getAvailableDrivers().length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
                <p className="font-medium">
                  No Available Drivers
                </p>
              </div>
              <p className="text-amber-700 text-sm mt-1">
                All drivers are currently assigned to other vehicles, or no drivers exist for this client.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowDriverAssignModal(false);
                setSelectedDriverId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignDriver}
              disabled={!selectedDriverId || isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Driver'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unassign Driver Confirmation Modal */}
      <Modal
        isOpen={showUnassignConfirmModal}
        onClose={() => setShowUnassignConfirmModal(false)}
        title="Remove Driver Assignment"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Confirm Driver Removal</p>
              <p className="text-red-700 text-sm mt-1">
                Are you sure you want to remove {drivers.find(d => d.id === asset?.vehicle_details?.driver_id)?.first_name} {drivers.find(d => d.id === asset?.vehicle_details?.driver_id)?.last_name} from <strong>{asset?.name}</strong>?
              </p>
            </div>
          </div>

          <p className="text-gray-600 text-sm">
            This action will unassign the driver from the vehicle. The driver will become available for assignment to other vehicles.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowUnassignConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUnassign}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Removing...' : 'Remove Driver'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
