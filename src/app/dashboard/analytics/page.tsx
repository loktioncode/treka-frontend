'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatMessage } from '@/components/ui/chat';
import { FloatingChatButton } from '@/components/ui/floating-chat-button';
import { AnalyticsFilters, AnalyticsFilters as AnalyticsFiltersType } from '@/components/ui/analytics-filters';
import { Modal } from '@/components/ui/modal';
import { 
  SimpleBarChart, 
  SimplePieChart, 
  MultiLineChart,
  MetricCard,
  GroupedMonthlyEarningsChart
} from '@/components/ui/charts';
import { MultiSearchableSelect } from '@/components/ui/multi-searchable-select';
import { Input } from '@/components/ui/input';
import { 
  BarChart3, 
  Package, 
  AlertTriangle,
  Calendar,
  Download,
  Brain,
  Activity,
  Settings,
  RefreshCw,
  Clock,
  Upload,
  Users,
  Car,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { analyticsAPI, assetAPI, componentAPI, clientAPI, notificationAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { useDriverEarnings, useLogisticsPerformance, useUploadEarnings } from '@/hooks/useLogisticsAnalytics';
import { formatCurrency } from '@/lib/utils';
import type { 
  AssetStatus, 
  AssetType, 
  Client,
  DriverEarnings,
  DriverPerformanceTrend,
  MonthlyEarnings
} from '@/types/api';

interface DashboardStats {
  assets: {
    total: number;
    active: number;
    maintenance: number;
    total_value: number;
  };
  components: {
    total: number;
    operational: number;
    critical: number;
    maintenance_due: number;
  };
  notifications: {
    pending: number;
  };
  recent_activities: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
    status: string;
    priority: string;
  }>;
  total_clients?: number;
  total_users?: number;
}

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  status: string;
  current_value: number;
  purchase_date: string;
  location: string;
  created_at?: string;
  updated_at?: string;
}

interface Component {
  id: string;
  name: string;
  status: string;
  condition: string;
  last_maintenance: string;
  next_maintenance_date: string;
  created_at?: string;
  updated_at?: string;
}

interface MaintenanceLog {
  id: string;
  component_id: string;
  description: string;
  date: string;
  technician: string;
  cost: number;
  status: string;
  created_at: string;
  resolved_at?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  created_at: string;
  read: boolean;
  status: string;
  acknowledged_at?: string;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AnalyticsFiltersType>({
    dateRange: '1y', // Default to last 1 year for better initial data display
    startDate: undefined,
    endDate: undefined,
    assetIds: undefined,
    componentIds: undefined,
    userIds: undefined,
    status: undefined,
    assetType: undefined,
    condition: undefined,
    clientId: undefined,
    searchQuery: undefined,
  });

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Logistics analytics state
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [driverFilter, setDriverFilter] = useState<string[]>([]);

  // React Query hooks for logistics analytics
  const { data: earningsData, isLoading: earningsLoading, refetch: refetchEarnings } = useDriverEarnings(
    undefined, // Always fetch all driver data, filter on frontend
    // For logistics clients, use date range from filters; for others, use undefined
    currentClient?.client_type === 'logistics' ? filters.dateRange : undefined,
    // Pass custom date parameters for logistics clients
    currentClient?.client_type === 'logistics' ? filters.startDate : undefined,
    currentClient?.client_type === 'logistics' ? filters.endDate : undefined,
    !!currentClient && currentClient.client_type === 'logistics'
  );

  // Debug logging for filter changes and manual refetch
  useEffect(() => {
    if (currentClient?.client_type === 'logistics') {
      console.log('Logistics filters changed:', {
        dateRange: filters.dateRange,
        startDate: filters.startDate,
        endDate: filters.endDate
      });
      
      // Manually refetch earnings data when filters change
      if (refetchEarnings) {
        console.log('Refetching earnings data due to filter change');
        refetchEarnings();
      }
    }
  }, [filters.dateRange, filters.startDate, filters.endDate, currentClient, refetchEarnings]);

  // Debug logging for earnings data changes
  useEffect(() => {
    if (currentClient?.client_type === 'logistics' && earningsData) {
      console.log('Earnings data updated:', {
        totalDrivers: earningsData?.summary?.total_drivers,
        totalEarnings: earningsData?.summary?.total_earnings,
        selectedPeriodEarnings: earningsData?.summary?.selected_period_earnings,
        dateRange: filters.dateRange,
        startDate: filters.startDate,
        endDate: filters.endDate
      });
    }
  }, [earningsData, currentClient, filters.dateRange, filters.startDate, filters.endDate]);
  

  
  const { data: performanceData } = useLogisticsPerformance(
    !!currentClient && currentClient.client_type === 'logistics'
  );
  
  const uploadEarningsMutation = useUploadEarnings();

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const statsData = await analyticsAPI.getDashboardStats(
        user?.role === 'super_admin' ? filters.clientId : undefined
      );
      setStats(statsData);

      // Skip loading assets and components data for logistics clients
      if (currentClient?.client_type === 'logistics') {
        setAssets([]);
        setComponents([]);
        setMaintenanceLogs([]);
      } else {
        // Load comprehensive assets data with more details (only for non-logistics clients)
        try {
          const assetsData = await assetAPI.getAssets({
            client_id: user?.role === 'super_admin' ? filters.clientId : undefined,
            status: filters.status?.[0] as AssetStatus | undefined,
            asset_type: filters.assetType?.[0] as AssetType | undefined,
            search: filters.searchQuery,
            limit: 100, // Get more assets for better insights
          });
          if (assetsData.items && assetsData.items.length > 0) {
            setAssets(assetsData.items);
          } else {
            setAssets([]);
          }
        } catch (error) {
          console.error('Failed to load detailed assets:', error);
          setAssets([]);
        }

        // Load comprehensive components data with maintenance history (only for non-logistics clients)
        let componentsToUse: Component[] = [];
        try {
          const componentsData = await componentAPI.getComponents({
            client_id: user?.role === 'super_admin' ? filters.clientId : undefined,
            search: filters.searchQuery,
            limit: 100, // Get more components for better insights
          });
          
          if (componentsData.items && componentsData.items.length > 0) {
            componentsToUse = componentsData.items;
            setComponents(componentsData.items);
          } else {
            componentsToUse = [];
            setComponents([]);
          }
        } catch (error) {
          console.error('Failed to load detailed components:', error);
          componentsToUse = [];
          setComponents([]);
        }

        // Load maintenance logs for better insights (only for non-logistics clients)
        try {
          if (componentsToUse.length > 0) {
            // Check if we have real component IDs or fallback ones
            const hasRealComponentIds = componentsToUse.some(comp => !comp.id.startsWith('component-'));
            
            if (hasRealComponentIds) {
              // Fast algorithm: Use Promise.allSettled to fetch from all components concurrently
              // This is much faster than sequential calls and handles failures gracefully
              const maintenancePromises = componentsToUse.map(async (component) => {
                try {
                  const response = await componentAPI.getMaintenanceLogs(component.id, { limit: 20 });
                  return response.items || [];
                } catch (error) {
                  console.warn(`Failed to fetch maintenance logs for component ${component.id}:`, error);
                  return []; // Return empty array for failed components
                }
              });
              
              // Execute all requests concurrently and wait for results
              const maintenanceResults = await Promise.allSettled(maintenancePromises);
              
              // Combine all successful results into one array
              const allMaintenanceLogs = maintenanceResults
                .filter(result => result.status === 'fulfilled')
                .flatMap(result => (result as PromiseFulfilledResult<MaintenanceLog[]>).value);
              
              setMaintenanceLogs(allMaintenanceLogs);
            } else {
              setMaintenanceLogs([]);
            }
          } else {
            setMaintenanceLogs([]);
          }
        } catch (error) {
          console.error('Failed to load maintenance logs:', error);
          setMaintenanceLogs([]);
        }
      }

      // Load clients (for super admin)
      if (user?.role === 'super_admin') {
        const clientsData = await clientAPI.getClients();
        setClients(clientsData.items || []);
      }

      // Load recent notifications for insights
      try {
        const notificationsData = await notificationAPI.getNotifications({ 
          limit: 20
        });
        setRecentNotifications(notificationsData.items || []);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [user, filters.clientId, filters.status, filters.assetType, filters.searchQuery, currentClient]);

  // Load current client info for logistics analytics
  const loadClientInfo = useCallback(async () => {
    try {
      if (user?.client_id) {
        const clientData = await clientAPI.getClient(user.client_id);
        setCurrentClient(clientData);
      }
    } catch (error) {
      console.error('Error loading client info:', error);
    }
  }, [user]);

  useEffect(() => {
    loadClientInfo();
  }, [loadClientInfo]);

  useEffect(() => {
    if (currentClient) {
      loadData();
    }
  }, [currentClient, loadData]);

  // Initialize filters for logistics clients - only set default once when client is first loaded
  useEffect(() => {
    if (currentClient?.client_type === 'logistics' && !filters.dateRange) {
      setFilters(prev => ({
        ...prev,
        dateRange: '1y',
        startDate: undefined,
        endDate: undefined
      }));
    }
  }, [currentClient, filters.dateRange]); // Include filters.dateRange to satisfy the linter



  // Helper function to get period display text
  const getPeriodDisplayText = () => {
    if (filters.startDate && filters.endDate) {
      return `${filters.startDate} to ${filters.endDate}`;
    }
    
    const periodLabels = {
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days', 
      '1y': 'Last Year',
      '5y': 'Last 5 Years'
    };
    
    return periodLabels[filters.dateRange as keyof typeof periodLabels] || 'Last Year';
  };

  // Helper function to check if there's meaningful data
  const hasMeaningfulData = () => {
    if (!earningsData?.data?.drivers) return false;
    
    // Check if any driver has actual earnings (not just 0 values)
    // Include both period earnings and total earnings for better insights
    return earningsData.data.drivers.some((driver: DriverEarnings) => 
      driver.total_earnings > 0 || 
      Object.values(driver.period_earnings).some((earnings: number) => earnings > 0)
    );
  };

  // Helper function to check if there's any historical data available
  const hasHistoricalData = () => {
    if (!earningsData?.data?.drivers) return false;
    
    // Check if we have any drivers with payment history
    return earningsData.data.drivers.some((driver: DriverEarnings) => 
      driver.payment_count > 0
    );
  };

  // Handle chat message
  const handleChatMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      // Get AI insights from the backend
      const filtersForAI = {
        dateRange: filters.dateRange,
        startDate: filters.startDate,
        endDate: filters.endDate,
        assetIds: filters.assetIds,
        componentIds: filters.componentIds,
        userIds: filters.userIds,
        status: filters.status,
        assetType: filters.assetType,
        condition: filters.condition,
        clientId: filters.clientId,
        searchQuery: filters.searchQuery,
      };
      
      const aiResponse = await analyticsAPI.getAIInsights(message, filtersForAI);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.data_summary || `I've analyzed your data based on: "${message}". Here are the key insights:`,
        timestamp: new Date(),
        metadata: {
          dataSource: 'analytics_dashboard',
          filters: filters,
          insights: aiResponse.insights || [],
        },
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setIsChatLoading(false);
    } catch (error) {
      console.error('Error processing chat message:', error);
      
      // Fallback to mock response if API fails
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm analyzing your data based on: "${message}". Here are some insights based on the current filters and data:`,
        timestamp: new Date(),
        metadata: {
          dataSource: 'analytics_dashboard',
          filters: filters,
          insights: [
            `Total assets: ${stats?.assets.total || 0}`,
            `Active components: ${stats?.components.operational || 0}`,
            `Critical alerts: ${stats?.components.critical || 0}`,
            `Maintenance due: ${stats?.components.maintenance_due || 0}`,
          ],
        },
      };

      setChatMessages(prev => [...prev, fallbackMessage]);
      setIsChatLoading(false);
      toast.error('AI analysis failed, showing fallback insights');
    }
  };

  // Generate real chart data from database
  const generateAssetTypeData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return [];
    }

    // If we have detailed assets, use them
    if (assets && assets.length > 0) {
      const typeCounts = assets.reduce((acc, asset) => {
        acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(typeCounts).map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count,
      }));
    }

    // No assets available - return empty array
    return [];
  };

  const generateMaintenanceTrendsData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return [];
    }

    // If we have detailed components, calculate maintenance trends
    if (components && components.length > 0) {
      const now = new Date();
      const currentMonth = now.toLocaleDateString('en-US', { month: 'short' });
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'short' });
      
      // Count components by maintenance status
      let onTimeCount = 0;
      let missedCount = 0;
      
      components.forEach(component => {
        if (component.next_maintenance_date) {
          const dueDate = new Date(component.next_maintenance_date);
          if (dueDate >= now) {
            onTimeCount++;
          } else {
            missedCount++;
          }
        }
      });
      
      return [
        { month: lastMonth, value: onTimeCount, type: 'On Time' },
        { month: currentMonth, value: missedCount, type: 'Missed' }
      ];
    }

    // If we have stats data, use that for trends
    if (stats?.components?.total) {
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
      const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'short' });
      
      return [
        { month: lastMonth, value: stats.components.operational || 0, type: 'On Time' },
        { month: currentMonth, value: (stats.components.total - (stats.components.operational || 0)), type: 'Missed' }
      ];
    }

    // No data available - return empty array
    return [];
  };



  const generatePerformanceData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return [];
    }

    // If we have detailed components, use them
    if (components && components.length > 0) {
      // Calculate real performance metrics based on component data
      const monthlyData: Record<string, { uptime: number; efficiency: number; maintenance: number }> = {};
      
      components.forEach(component => {
        const date = component.created_at ? new Date(component.created_at) : new Date();
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { uptime: 0, efficiency: 0, maintenance: 0 };
        }
        
        // Calculate uptime based on status (operational = 100%, others = reduced)
        const uptime = component.status === 'operational' ? 100 : 
                       component.status === 'warning' ? 85 : 
                       component.status === 'critical' ? 50 : 
                       component.status === 'maintenance' ? 0 : 75;
        
        // Calculate efficiency based on maintenance schedule
        const efficiency = component.next_maintenance_date ? 
          Math.max(50, 100 - (new Date(component.next_maintenance_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)) : 75;
        
        // Calculate maintenance hours (simplified)
        const maintenance = component.status === 'maintenance' ? 8 : 0;
        
        monthlyData[monthKey].uptime += uptime;
        monthlyData[monthKey].efficiency += efficiency;
        monthlyData[monthKey].maintenance += maintenance;
      });

      // Average the metrics per month
      return Object.entries(monthlyData).map(([month, metrics]) => ({
        month,
        uptime: Math.round((metrics.uptime / components.length) * 10) / 10,
        efficiency: Math.round((metrics.efficiency / components.length) * 10) / 10,
        maintenance: Math.round(metrics.maintenance * 10) / 10
      }));
    }

    // If we only have stats data, create basic performance metrics
    if (stats?.components?.total) {
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
      const uptime = stats.components.total > 0 ? 
        Math.round((stats.components.operational / stats.components.total) * 100) : 100;
      
      return [
        { 
          month: currentMonth, 
          uptime: uptime, 
          efficiency: 85, 
          maintenance: 0 
        }
      ];
    }

    return [];
  };

  const generateAssetStatusByTypeData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return [];
    }

    // If we have detailed assets, use them
    if (assets && assets.length > 0) {
      // Group assets by type and status
      const typeStatusCounts: Record<string, Record<string, number>> = {};
      
      assets.forEach(asset => {
        if (!typeStatusCounts[asset.asset_type]) {
          typeStatusCounts[asset.asset_type] = { active: 0, maintenance: 0, retired: 0, damaged: 0 };
        }
        
        const status = asset.status as 'active' | 'maintenance' | 'retired' | 'damaged';
        if (status in typeStatusCounts[asset.asset_type]) {
          typeStatusCounts[asset.asset_type][status]++;
        }
      });

      // Convert to chart data format
      return Object.entries(typeStatusCounts).map(([type, statusCounts]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        ...statusCounts
      }));
    }

    // If we only have stats data, create basic status distribution
    if (stats?.assets?.total) {
      // Create a more realistic distribution based on common asset types
      const vehicleCount = Math.ceil(stats.assets.total / 2);
      const infrastructureCount = stats.assets.total - vehicleCount;
      
      const distribution = [];
      
      if (vehicleCount > 0) {
        distribution.push({
          type: 'Vehicle',
          active: Math.min(vehicleCount, stats.assets.active || 0),
          maintenance: Math.min(vehicleCount, stats.assets.maintenance || 0),
          retired: 0,
          damaged: 0
        });
      }
      
      if (infrastructureCount > 0) {
        distribution.push({
          type: 'Infrastructure',
          active: Math.min(infrastructureCount, stats.assets.active || 0),
          maintenance: Math.min(infrastructureCount, stats.assets.maintenance || 0),
          retired: 0,
          damaged: 0
        });
      }
      
      return distribution;
    }

    return [];
  };

  // Generate real-time insights
  const generateMaintenanceInsights = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return null;
    }

    if (!components || components.length === 0) {
      return null;
    }

    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    const componentsNeedingMaintenance = components.filter(component => {
      if (!component.next_maintenance_date) return false;
      const maintenanceDate = new Date(component.next_maintenance_date);
      return maintenanceDate <= fourteenDaysFromNow;
    });

    // Calculate maintenance delays
    const delayedComponents = components.filter(component => {
      if (!component.next_maintenance_date) return false;
      const maintenanceDate = new Date(component.next_maintenance_date);
      return maintenanceDate < now;
    });

    if (componentsNeedingMaintenance.length === 0 && delayedComponents.length === 0) {
      return (
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Maintenance Status:</strong> All components are on schedule
          </p>
        </div>
      );
    }

    const insights = [];

    // Show delayed maintenance alerts
    if (delayedComponents.length > 0) {
      const criticalDelayed = delayedComponents.filter(c => c.status === 'critical').length;
      const avgDelayDays = Math.round(
        delayedComponents.reduce((sum, c) => {
          const delay = now.getTime() - new Date(c.next_maintenance_date).getTime();
          return sum + (delay / (1000 * 60 * 60 * 24));
        }, 0) / delayedComponents.length
      );

      insights.push(
        <div key="delayed" className="p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>⚠️ Maintenance Overdue:</strong> {delayedComponents.length} component{delayedComponents.length !== 1 ? 's' : ''} 
            {criticalDelayed > 0 ? ` (${criticalDelayed} critical)` : ''} 
            overdue by {avgDelayDays} day{avgDelayDays !== 1 ? 's' : ''} on average
          </p>
        </div>
      );
    }

    // Show upcoming maintenance alerts
    if (componentsNeedingMaintenance.length > 0) {
      const criticalCount = componentsNeedingMaintenance.filter(c => c.status === 'critical').length;
      const warningCount = componentsNeedingMaintenance.filter(c => c.status === 'warning').length;

      let alertColor = 'bg-amber-50';
      let textColor = 'text-amber-800';
      let priority = 'Maintenance Due';

      if (criticalCount > 0) {
        alertColor = 'bg-red-50';
        textColor = 'text-red-800';
        priority = 'Critical Alert';
      }

      insights.push(
        <div key="upcoming" className={`p-3 ${alertColor} rounded-lg`}>
          <p className={`text-sm ${textColor}`}>
            <strong>{priority}:</strong> {componentsNeedingMaintenance.length} component{componentsNeedingMaintenance.length !== 1 ? 's' : ''} 
            {criticalCount > 0 ? ` (${criticalCount} critical)` : ''} 
            {warningCount > 0 ? ` (${warningCount} warning)` : ''} 
            need maintenance within 14 days
          </p>
        </div>
      );
    }

    return <div className="space-y-2">{insights}</div>;
  };

  const generateEfficiencyInsights = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return null;
    }

    if (!assets || assets.length === 0) {
      return null;
    }

    const activeAssets = assets.filter(asset => asset.status === 'active');
    const maintenanceAssets = assets.filter(asset => asset.status === 'maintenance');
    const totalValue = activeAssets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
    const avgValue = totalValue / activeAssets.length;

    // Calculate efficiency based on asset utilization and maintenance status
    const utilizationRate = (activeAssets.length / assets.length) * 100;
    const maintenanceRate = (maintenanceAssets.length / assets.length) * 100;
    const efficiency = Math.min(100, Math.max(50, utilizationRate + (avgValue > 100000 ? 20 : 0)));

    // Calculate value efficiency
    const totalAssetValue = assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
    const activeValueRate = totalValue / totalAssetValue * 100;

    return (
      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Asset Efficiency:</strong> {Math.round(efficiency)}% overall efficiency
        </p>
        <p className="text-xs text-blue-700 mt-1">
          Utilization: {Math.round(utilizationRate)}% | Maintenance: {Math.round(maintenanceRate)}% | 
          Value Active: {Math.round(activeValueRate)}%
        </p>
      </div>
    );
  };

  const generateCostInsights = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return null;
    }

    if (!assets || assets.length === 0) {
      return null;
    }

    const assetTypeCounts = assets.reduce((acc, asset) => {
      acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const assetTypeValues = assets.reduce((acc, asset) => {
      if (!acc[asset.asset_type]) acc[asset.asset_type] = 0;
      acc[asset.asset_type] += asset.current_value || 0;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonType = Object.entries(assetTypeCounts).sort(([,a], [,b]) => b - a)[0];
    const highestValueType = Object.entries(assetTypeValues).sort(([,a], [,b]) => b - a)[0];
    
    const insights = [];

    // Asset consolidation insight
    if (mostCommonType && mostCommonType[1] > 2) {
      insights.push(
        <div key="consolidation" className="p-3 bg-amber-50 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Asset Consolidation:</strong> {mostCommonType[0].charAt(0).toUpperCase() + mostCommonType[0].slice(1)} 
            type has {mostCommonType[1]} assets - consider consolidation for cost optimization
          </p>
        </div>
      );
    }

    // Value concentration insight
    if (highestValueType && highestValueType[1] > 50000) {
      const percentage = Math.round((highestValueType[1] / calculateTotalAssetValue()) * 100);
      insights.push(
        <div key="value" className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Value Concentration:</strong> {highestValueType[0].charAt(0).toUpperCase() + highestValueType[0].slice(1)} 
            assets represent {percentage}% of total portfolio value
          </p>
        </div>
      );
    }

    // Maintenance cost insight
    const maintenanceAssets = assets.filter(asset => asset.status === 'maintenance');
    if (maintenanceAssets.length > 0) {
      const maintenanceValue = maintenanceAssets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
      const maintenancePercentage = Math.round((maintenanceValue / calculateTotalAssetValue()) * 100);
      
      insights.push(
        <div key="maintenance" className="p-3 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>Maintenance Impact:</strong> {maintenanceAssets.length} asset{maintenanceAssets.length !== 1 ? 's' : ''} 
            worth ${maintenanceValue.toLocaleString()} ({maintenancePercentage}% of portfolio) are currently under maintenance
          </p>
        </div>
      );
    }

    if (insights.length === 0) {
      return (
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Asset Distribution:</strong> Well-balanced asset portfolio across different types
          </p>
        </div>
      );
    }

    return <div className="space-y-2">{insights}</div>;
  };

  const generateNotificationInsights = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return null;
    }

    if (!recentNotifications || recentNotifications.length === 0) {
      return null;
    }

    const highPriorityNotifications = recentNotifications.filter(notification => 
      notification.priority === 'high' || notification.priority === 'critical'
    );

    const overdueNotifications = recentNotifications.filter(notification => {
      if (!notification.created_at) return false;
      const createdDate = new Date(notification.created_at);
      const now = new Date();
      const daysSinceCreated = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated > 7; // Notifications older than 7 days
    });

    const insights = [];

    // High priority notifications
    if (highPriorityNotifications.length > 0) {
      insights.push(
        <div key="high-priority" className="p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>🚨 High Priority Alerts:</strong> {highPriorityNotifications.length} notification{highPriorityNotifications.length !== 1 ? 's' : ''} 
            require immediate attention
          </p>
        </div>
      );
    }

    // Overdue notifications
    if (overdueNotifications.length > 0) {
      insights.push(
        <div key="overdue" className="p-3 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>⏰ Overdue Notifications:</strong> {overdueNotifications.length} notification{overdueNotifications.length !== 1 ? 's' : ''} 
            have been pending for over 7 days
          </p>
        </div>
      );
    }

    // General notification status
    if (insights.length === 0 && recentNotifications.length > 0) {
      insights.push(
        <div key="general" className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Notification Status:</strong> {recentNotifications.length} pending notification{recentNotifications.length !== 1 ? 's' : ''} 
            in the system
          </p>
        </div>
      );
    }

    return insights.length > 0 ? <div className="space-y-2">{insights}</div> : null;
  };

  // Helper function to get grouped monthly earnings data for multiple drivers
  const getGroupedMonthlyEarningsData = () => {
    if (!driverFilter.length || driverFilter.length < 2 || !earningsData?.data?.drivers || !earningsData?.summary?.driver_performance_trends) {
      return null;
    }

    // Check if we have date filters applied
    const hasDateFilters = !!(filters.startDate && filters.endDate);
    
    if (!hasDateFilters) {
      return null; // Only show grouped chart when date filters are applied
    }

    const selectedDrivers = earningsData.data.drivers.filter((d: DriverEarnings) => driverFilter.includes(d.uuid));
    const monthlyData: Record<string, Record<string, number>> = {};
    
    // Initialize monthly data structure
    selectedDrivers.forEach((driver: DriverEarnings) => {
      const driverTrend = earningsData.summary.driver_performance_trends.find(
        (trend: DriverPerformanceTrend) => trend.driver_name === driver.full_name
      );
      
      if (driverTrend) {
        driverTrend.monthly_earnings.forEach((month: MonthlyEarnings) => {
          if (!monthlyData[month.month]) {
            monthlyData[month.month] = {};
          }
          monthlyData[month.month][driver.full_name] = month.earnings;
        });
      }
    });

    // Convert to array format and add totals
    return Object.entries(monthlyData).map(([month, driverEarnings]) => {
      const total = Object.values(driverEarnings).reduce((sum, earnings) => sum + earnings, 0);
      return {
        month,
        ...driverEarnings,
        total
      };
    });
  };

  // Helper function to get selected drivers' monthly earnings
  const getSelectedDriversMonthlyEarnings = () => {
    if (!driverFilter.length || !earningsData?.data?.drivers) {
      return earningsData?.summary?.monthly_earnings || [];
    }
    
    // Check if we have date filters applied
    const hasDateFilters = !!(filters.startDate && filters.endDate);
    
    // If multiple drivers selected, combine their monthly earnings
    if (driverFilter.length > 1) {
      const selectedDrivers = earningsData.data.drivers.filter((d: DriverEarnings) => driverFilter.includes(d.uuid));
      const combinedMonthlyData: Record<string, number> = {};
      
      if (hasDateFilters && earningsData?.summary?.driver_performance_trends) {
        // Use date-filtered performance trends
        selectedDrivers.forEach((driver: DriverEarnings) => {
          const driverTrend = earningsData.summary.driver_performance_trends.find(
            (trend: DriverPerformanceTrend) => trend.driver_name === driver.full_name
          );
          
          if (driverTrend) {
            driverTrend.monthly_earnings.forEach((month: MonthlyEarnings) => {
              if (!combinedMonthlyData[month.month]) {
                combinedMonthlyData[month.month] = 0;
              }
              combinedMonthlyData[month.month] += month.earnings;
            });
          }
        });
      } else {
        // Use overall driver data (no date filters)
        // For now, return overall monthly earnings since individual driver trends might not be available
        return earningsData?.summary?.monthly_earnings || [];
      }
      
      return Object.entries(combinedMonthlyData).map(([month, earnings]) => ({
        month,
        earnings
      }));
    }
    
    // Single driver selected
    const selectedDriver = earningsData.data.drivers.find((d: DriverEarnings) => d.uuid === driverFilter[0]);
    if (!selectedDriver) return earningsData.summary.monthly_earnings || [];
    
    if (hasDateFilters && earningsData?.summary?.driver_performance_trends) {
      // Use date-filtered performance trends
      const driverTrend = earningsData.summary.driver_performance_trends.find(
        (driver: DriverPerformanceTrend) => driver.driver_name === selectedDriver.full_name
      );
      return driverTrend?.monthly_earnings || earningsData.summary.monthly_earnings || [];
    } else {
      // Use overall driver data (no date filters)
      // For now, return overall monthly earnings since individual driver trends might not be available
      return earningsData?.summary?.monthly_earnings || [];
    }
  };

  // Helper function to get selected drivers data
  const getSelectedDrivers = () => {
    if (!driverFilter.length || !earningsData?.data?.drivers) return [];
    return earningsData.data.drivers.filter((d: DriverEarnings) => driverFilter.includes(d.uuid));
  };

  // Helper function to get first selected driver (for backward compatibility)
  const getSelectedDriver = () => {
    if (!driverFilter.length || !earningsData?.data?.drivers) return null;
    return earningsData.data.drivers.find((d: DriverEarnings) => d.uuid === driverFilter[0]) || null;
  };

  // Real-time metric calculations
  const calculateTotalAssetValue = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return 0;
    }

    // Use stats data if available, otherwise calculate from assets array
    if (stats?.assets?.total_value !== undefined) {
      return stats.assets.total_value;
    }
    return assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
  };

  const calculateCriticalComponents = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return 0;
    }

    // Use stats data if available, otherwise calculate from components array
    if (stats?.components?.critical !== undefined) {
      return stats.components.critical;
    }
    return components.filter(component => component.status === 'critical').length;
  };



  // Simplified trend calculations (in a real app, these would compare with historical data)
  const calculateAssetGrowth = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return '0.0%';
    }
    return assets.length > 0 ? '+0.0%' : '0.0%';
  };

  const calculateAssetTrend = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return 'neutral' as const;
    }
    return assets.length > 0 ? 'up' as const : 'neutral' as const;
  };



  const calculateCriticalChange = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return '0.0%';
    }
    const criticalCount = calculateCriticalComponents();
    return criticalCount > 0 ? '-0.0%' : '0.0%';
  };

  const calculateCriticalTrend = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return 'neutral' as const;
    }
    const criticalCount = calculateCriticalComponents();
    return criticalCount > 0 ? 'down' as const : 'neutral' as const;
  };



  const calculateResponseTimeAverage = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return 0;
    }

    // Calculate average response time based on maintenance logs and notifications
    if (!maintenanceLogs.length && !recentNotifications.length) {
      return 0;
    }

    let totalResponseTime = 0;
    let resolvedCount = 0;

    // Look for maintenance logs that have been resolved
    maintenanceLogs.forEach(log => {
      if (log.status === 'resolved' && log.resolved_at && log.created_at) {
        const alertDate = new Date(log.created_at);
        const resolvedDate = new Date(log.resolved_at);
        const responseTime = Math.ceil((resolvedDate.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24));
        totalResponseTime += responseTime;
        resolvedCount++;
      }
    });

    // Also check notifications that might have been acknowledged
    recentNotifications.forEach(notification => {
      if (notification.status === 'acknowledged' && notification.acknowledged_at && notification.created_at) {
        const alertDate = new Date(notification.created_at);
        const acknowledgedDate = new Date(notification.acknowledged_at);
        const responseTime = Math.ceil((acknowledgedDate.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24));
        totalResponseTime += responseTime;
        resolvedCount++;
      }
    });

    // If no resolved items, try to estimate from pending ones
    if (resolvedCount === 0) {
      const pendingItems = [
        ...maintenanceLogs.filter(log => log.status === 'pending'),
        ...recentNotifications.filter(n => n.status === 'pending')
      ];
      
      if (pendingItems.length > 0) {
        // Estimate based on average age of pending items
        const now = new Date();
        const totalAge = pendingItems.reduce((sum, item) => {
          if (item.created_at) {
            const age = Math.ceil((now.getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
            return sum + age;
          }
          return sum;
        }, 0);
        return Math.round(totalAge / pendingItems.length);
      }
    }

    return resolvedCount > 0 ? Math.round(totalResponseTime / resolvedCount) : 0;
  };

  const calculateResponseTimeChange = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return '0.0%';
    }
    const avgResponseTime = calculateResponseTimeAverage();
    // In a real app, this would compare with historical data
    return avgResponseTime > 0 ? '-0.0%' : '0.0%';
  };

  const calculateResponseTimeTrend = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return 'neutral' as const;
    }
    const avgResponseTime = calculateResponseTimeAverage();
    // In a real app, this would compare with historical data
    return avgResponseTime > 0 ? 'down' as const : 'neutral' as const;
  };

  const calculateComponentsDueSoon = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return 0;
    }

    // Count components due for maintenance in the next 5 days
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
    
    return components.filter(component => {
      if (!component.next_maintenance_date) return false;
      const dueDate = new Date(component.next_maintenance_date);
      return dueDate <= fiveDaysFromNow && dueDate >= now;
    }).length;
  };

  const calculateComponentsDueChange = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return '0.0%';
    }
    const dueSoon = calculateComponentsDueSoon();
    return dueSoon > 0 ? '+0.0%' : '0.0%';
  };

  const calculateComponentsDueTrend = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === 'logistics') {
      return 'neutral' as const;
    }
    const dueSoon = calculateComponentsDueSoon();
    return dueSoon > 0 ? 'up' as const : 'neutral' as const;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive insights into your assets, components, and system performance
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* No Data Message - Only show for non-logistics clients */}
      {currentClient?.client_type !== 'logistics' && stats && stats.assets.total === 0 && stats.components.total === 0 && (
        <Card className="p-6 bg-blue-50 border border-blue-200">
          <div className="text-center">
            <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">No Data Available</h3>
            <p className="text-blue-700 mb-4">
              Your analytics dashboard is currently empty. Add assets and components to see insights.
            </p>
          </div>
        </Card>
      )}

      {/* Filters - Show different filters based on client type */}
      {currentClient?.client_type === 'logistics' ? (
        // Logistics Date Range Filter (moved here to replace other filters)
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium text-gray-900">FILTER</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Dashboard filtered for:</span> 
                  {filters.startDate && filters.endDate ? (
                    <span className="ml-2 font-medium text-teal-600">
                      {filters.startDate} to {filters.endDate}
                    </span>
                  ) : (
                    <span className="ml-2 font-medium text-teal-600">{filters.dateRange}</span>
                  )}
                  {driverFilter.length > 0 && (
                    <span className="ml-2 font-medium text-blue-600">
                      | Driver{driverFilter.length > 1 ? 's' : ''}: {driverFilter.length === 1 ? getSelectedDriver()?.full_name : `${driverFilter.length} selected`}
                    </span>
                  )}
                  {earningsData?.summary?.selected_period_earnings !== undefined && (
                    <span className="ml-2 text-gray-500">
                      (Total: {formatCurrency(earningsData.summary.selected_period_earnings, earningsData.summary.currency || 'ZAR')})
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setFilters(prev => ({ 
                      ...prev, 
                      dateRange: '1y',
                      startDate: undefined,
                      endDate: undefined
                    }));
                    // Clear driver filter when resetting date range
                    setDriverFilter([]);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Reset to 1 Year
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Quick Date Range Selector */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Quick Select:</label>
                <div className="flex gap-3">
                  <select
                    value={filters.dateRange}
                    onChange={(e) => {
                      setFilters(prev => ({ 
                        ...prev, 
                        dateRange: e.target.value,
                        startDate: undefined,
                        endDate: undefined
                      }));
                      // Clear driver filter when changing to preset date range
                      setDriverFilter([]);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="1y">Last Year</option>
                    <option value="5y">Last 5 Years</option>
                  </select>
                  
                  {/* Custom Date Range Inputs - Always visible */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">From:</label>
                    <input
                      type="date"
                      value={filters.startDate || ''}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        setFilters(prev => ({ 
                          ...prev, 
                          startDate: newStartDate
                        }));
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">To:</label>
                    <input
                      type="date"
                      value={filters.endDate || ''}
                      onChange={(e) => {
                        const newEndDate = e.target.value;
                        setFilters(prev => ({ 
                          ...prev, 
                          endDate: newEndDate
                        }));
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Driver Filter - Only show when date range is selected */}
              {(filters.startDate && filters.endDate) && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Driver:</label>
                  <MultiSearchableSelect
                    options={earningsData?.data?.drivers?.map((driver: DriverEarnings) => ({
                      value: driver.uuid,
                      label: driver.full_name
                    })) || []}
                    value={driverFilter}
                                      onChange={(newValue) => {
                    setDriverFilter(newValue);
                  }}
                    placeholder={earningsData?.data?.drivers?.length ? "Select drivers..." : "Loading drivers..."}
                    searchPlaceholder="Search drivers..."
                    className="min-w-[300px]"
                    disabled={!earningsData?.data?.drivers?.length}
                  />
                  {driverFilter.length > 0 && (
                    <Button
                      onClick={() => setDriverFilter([])}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              )}

            </div>
          </div>
        </Card>
      ) : (
        // Standard filters for non-logistics clients
        <AnalyticsFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={() => setFilters({ 
            dateRange: '1y',
            startDate: undefined,
            endDate: undefined,
            assetIds: undefined,
            componentIds: undefined,
            userIds: undefined,
            status: undefined,
            assetType: undefined,
            condition: undefined,
            clientId: undefined,
            searchQuery: undefined,
          })}
          assets={assets}
          clients={clients}
        />
      )}

      {/* Key Metrics */}
      {currentClient?.client_type === 'logistics' ? (
        // Logistics Analytics Dashboard
        <div className="space-y-6">
          {/* Logistics Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Logistics Analytics Dashboard</h2>
              <p className="text-sm text-gray-600">
                Track driver performance and earnings from Uber Fleet
              </p>
            </div>
            <Button onClick={() => setShowUploadModal(true)} className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl">
              <Upload className="h-4 w-4 mr-2" />
              Upload Earnings CSV
            </Button>
          </div>



          {/* Logistics Metrics */}
          {/* Note: UUID 00000000-0000-0000-0000-000000000000 represents client withdrawals and is handled separately */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Drivers"
              value={earningsData?.summary?.total_drivers?.toString() || '0'}
              change="+0.0%"
              trend="up"
              icon={<Users className="h-6 w-6" />}
              color="text-blue-600"
            />
            <MetricCard
              title={driverFilter.length > 0 ? `Driver Earnings (${getPeriodDisplayText()})` : `Total Earnings (${getPeriodDisplayText()})`}
              value={
                driverFilter.length > 0
                  ? formatCurrency(
                      driverFilter.length === 1
                        ? (getSelectedDriver()?.total_earnings || 0)
                        : getSelectedDrivers().reduce((sum: number, driver: DriverEarnings) => sum + (driver.total_earnings || 0), 0),
                      earningsData?.summary?.currency || 'ZAR'
                    )
                  : formatCurrency(earningsData?.summary?.selected_period_earnings || 0, earningsData?.summary?.currency || 'ZAR')
              }
              change={hasMeaningfulData() ? "+0.0%" : hasHistoricalData() ? "Historical Data" : "No Data"}
              trend={hasMeaningfulData() ? "up" : hasHistoricalData() ? "neutral" : "neutral"}
              icon={<DollarSign className="h-6 w-6" />}
              color={hasMeaningfulData() ? "text-green-600" : hasHistoricalData() ? "text-blue-600" : "text-gray-400"}
            />
            <MetricCard
              title="Vehicles with Drivers"
              value={performanceData?.fleet?.assigned_vehicles?.toString() || '0'}
              subtitle={
                performanceData?.fleet?.active_vehicles && performanceData?.fleet?.assigned_vehicles 
                  ? `${performanceData.fleet.active_vehicles - performanceData.fleet.assigned_vehicles} unassigned`
                  : undefined
              }
              change="+0.0%"
              trend="up"
              icon={<Car className="h-6 w-6" />}
              color="text-purple-600"
            />
            <MetricCard
              title="Total Withdrawals"
              value={formatCurrency(earningsData?.summary?.client_withdrawals || 0, earningsData?.summary?.currency || 'ZAR')}
              change="+0.0%"
              trend="up"
              icon={<TrendingDown className="h-6 w-6" />}
              color="text-red-600"
            />
          </div>

          {/* Selected Drivers Summary Card */}
          {driverFilter.length > 0 && earningsData?.data?.drivers && (
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {driverFilter.length === 1 
                        ? getSelectedDriver()?.full_name 
                        : `${driverFilter.length} Drivers Selected`
                      }
                    </h3>
                    <p className="text-sm text-gray-600">
                      {driverFilter.length === 1 
                        ? `Driver ID: ${driverFilter[0]}`
                        : getSelectedDrivers().slice(0, 3).map((driver: DriverEarnings) => driver.full_name).join(', ') + (driverFilter.length > 3 ? '...' : '')
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-600">
                    {formatCurrency(
                      driverFilter.length === 1
                        ? (getSelectedDriver()?.total_earnings || 0)
                        : getSelectedDrivers().reduce((sum: number, driver: DriverEarnings) => sum + (driver.total_earnings || 0), 0),
                      earningsData?.summary?.currency || 'ZAR'
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {filters.startDate && filters.endDate ? 'Selected Period Earnings' : 'Total Earnings'}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Logistics Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Earnings Chart */}
            {earningsData?.summary?.monthly_earnings && earningsData.summary.monthly_earnings.length > 0 && (hasMeaningfulData() || hasHistoricalData()) ? (
              // Show grouped chart for multiple drivers with date filters, otherwise show simple chart
              driverFilter.length > 1 && getGroupedMonthlyEarningsData() ? (
                <GroupedMonthlyEarningsChart
                  data={getGroupedMonthlyEarningsData()!}
                  driverNames={getSelectedDrivers().map((d: DriverEarnings) => d.full_name)}
                  title={`Monthly Earnings - ${driverFilter.length} Drivers`}
                  subtitle="Individual driver earnings and total by month"
                />
              ) : (
                <SimpleBarChart
                  data={getSelectedDriversMonthlyEarnings()}
                  xKey="month"
                  yKey="earnings"
                  title={driverFilter.length > 0 ? `Monthly Earnings - ${driverFilter.length === 1 ? getSelectedDriver()?.full_name : `${driverFilter.length} Drivers`}` : "Monthly Earnings"}
                  subtitle={driverFilter.length > 0 ? `Monthly earnings for ${driverFilter.length === 1 ? 'selected driver' : 'selected drivers'}` : "Total earnings by month"}
                />
              )
            ) : (
              <Card className="p-6">
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Monthly Earnings Data</h3>
                  <p className="text-gray-600 mb-4">
                    {hasHistoricalData() ? 'No monthly earnings data available for the selected period' : 'Upload earnings data to see monthly trends'}
                  </p>
                  {!hasHistoricalData() && (
                    <Button onClick={() => setShowUploadModal(true)} className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Earnings CSV
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Driver Performance Trends */}
            {earningsData?.summary?.driver_performance_trends && earningsData.summary.driver_performance_trends.length > 0 && (hasMeaningfulData() || hasHistoricalData()) ? (
              <MultiLineChart
                data={
                  driverFilter.length > 0 && earningsData?.summary?.driver_performance_trends
                    ? earningsData.summary.driver_performance_trends
                        .filter((driver: DriverPerformanceTrend) => {
                          if (driverFilter.length === 1) {
                            return driver.driver_name === getSelectedDriver()?.full_name;
                          } else {
                            // For multiple drivers, show all selected drivers
                            return getSelectedDrivers().some((selectedDriver: DriverEarnings) => 
                              selectedDriver.full_name === driver.driver_name
                            );
                          }
                        })
                        .flatMap((driver: DriverPerformanceTrend) => 
                          driver.monthly_earnings.map((month: MonthlyEarnings) => ({
                            month: month.month,
                            [driver.driver_name]: month.earnings
                          }))
                        )
                    : earningsData.summary.driver_performance_trends.flatMap((driver: DriverPerformanceTrend) => 
                        driver.monthly_earnings.map((month: MonthlyEarnings) => ({
                          month: month.month,
                          [driver.driver_name]: month.earnings
                        }))
                      ).reduce((acc: Record<string, unknown>[], curr: Record<string, unknown>) => {
                        const existing = acc.find((item: Record<string, unknown>) => item.month === curr.month);
                        if (existing) {
                          Object.assign(existing, curr);
                        } else {
                          acc.push(curr);
                        }
                        return acc;
                      }, [] as Record<string, unknown>[])
                }
                xKey="month"
                lines={
                  driverFilter.length > 0 && earningsData?.summary?.driver_performance_trends
                    ? earningsData.summary.driver_performance_trends
                        .filter((driver: DriverPerformanceTrend) => {
                          if (driverFilter.length === 1) {
                            return driver.driver_name === getSelectedDriver()?.full_name;
                          } else {
                            return getSelectedDrivers().some((selectedDriver: DriverEarnings) => 
                              selectedDriver.full_name === driver.driver_name
                            );
                          }
                        })
                        .map((driver: DriverPerformanceTrend, index: number) => ({
                          key: driver.driver_name,
                          label: driver.driver_name,
                          color: ['#0d9488', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 5]
                        }))
                    : earningsData.summary.driver_performance_trends.slice(0, 5).map((driver: DriverPerformanceTrend, index: number) => ({
                        key: driver.driver_name,
                        label: driver.driver_name,
                        color: ['#0d9488', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 5]
                      }))
                }
                title={driverFilter.length > 0 ? `Driver Performance - ${driverFilter.length === 1 ? getSelectedDriver()?.full_name : `${driverFilter.length} Drivers`}` : "Driver Performance Trends"}
                subtitle={driverFilter.length > 0 ? `Monthly earnings for ${driverFilter.length === 1 ? 'selected driver' : 'selected drivers'}` : "Monthly earnings by driver"}
              />
            ) : (
              <Card className="p-6">
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Driver Performance Data</h3>
                  <p className="text-gray-600 mb-4">
                    {hasHistoricalData() ? 'No driver performance trends available for the selected period' : 'Upload earnings data to see driver performance trends'}
                  </p>
                  {!hasHistoricalData() && (
                    <Button onClick={() => setShowUploadModal(true)} className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Earnings CSV
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Vehicle Performance Metrics */}
          {performanceData?.fleet && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Performance Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{performanceData.fleet.total_vehicles}</div>
                  <div className="text-sm text-gray-600">Total Vehicles</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{performanceData.fleet.active_vehicles}</div>
                  <div className="text-sm text-gray-600">Available Vehicles</div>
                  {performanceData.fleet.active_vehicles && performanceData.fleet.assigned_vehicles && (
                    <div className="text-xs text-gray-500 mt-1">
                      {performanceData.fleet.active_vehicles - performanceData.fleet.assigned_vehicles} unassigned
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{performanceData.fleet.assigned_vehicles}</div>
                  <div className="text-sm text-gray-600">Vehicles with Drivers</div>
                </div>
              </div>
            </Card>
          )}

          {/* Driver Performance Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Driver Performance</h3>
                {filters.startDate && filters.endDate && (
                  <span className="text-sm font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    {filters.startDate} to {filters.endDate}
                  </span>
                )}
              </div>
              <Input
                placeholder="Search drivers in table..."
                className="w-64"
                disabled
              />
            </div>
            
            {earningsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading driver data...</p>
              </div>
            ) : earningsData?.data?.drivers && earningsData.data.drivers.length > 0 ? (
              (hasMeaningfulData() || hasHistoricalData()) ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Driver</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          {filters.startDate && filters.endDate ? 'Selected Period' : 'Total Earnings'}
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          {filters.startDate && filters.endDate ? 'Period Earnings' : 'Last 7 Days'}
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          {filters.startDate && filters.endDate ? 'Period Payments' : 'Last 30 Days'}
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Payments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsData.data.drivers.map((driver: DriverEarnings) => (
                        <tr key={driver.uuid} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{driver.full_name}</div>
                              <div className="text-sm text-gray-500">ID: {driver.uuid}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-green-600">
                            {filters.startDate && filters.endDate 
                              ? formatCurrency(driver.selected_period_earnings || driver.total_earnings, earningsData?.summary?.currency || 'ZAR')
                              : formatCurrency(driver.total_earnings, earningsData?.summary?.currency || 'ZAR')
                            }
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {filters.startDate && filters.endDate 
                              ? formatCurrency(driver.selected_period_earnings || 0, earningsData?.summary?.currency || 'ZAR')
                              : formatCurrency(driver.period_earnings['7d'], earningsData?.summary?.currency || 'ZAR')
                            }
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {filters.startDate && filters.endDate 
                              ? formatCurrency(driver.selected_period_earnings || 0, earningsData?.summary?.currency || 'ZAR')
                              : formatCurrency(driver.period_earnings['30d'], earningsData?.summary?.currency || 'ZAR')
                            }
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {driver.payment_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">No Earnings Data Available</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Your analytics dashboard is currently showing zero earnings for the selected period. 
                    This could mean:
                  </p>
                  <div className="space-y-2 text-sm text-gray-500 mb-6 max-w-md mx-auto">
                    <p>• No CSV data has been uploaded yet</p>
                    <p>• The selected date range has no payment records</p>
                    <p>• All driver earnings are showing as zero</p>
                  </div>
                  <div className="space-y-3">
                    <Button onClick={() => setShowUploadModal(true)} className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Earnings CSV
                    </Button>
                    <div className="text-xs text-gray-400">
                      Upload a CSV file from Fleet App to start tracking driver earnings and performance
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No Drivers Found</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  No driver data is currently available in your system. 
                  To get started with logistics analytics:
                </p>
                <div className="space-y-2 text-sm text-gray-500 mb-6 max-w-md mx-auto">
                  <p>• Upload a CSV file from Uber Fleet</p>
                  <p>• Ensure your CSV contains driver and payment information</p>
                  <p>• Check that the file format matches the expected structure</p>
                </div>
                <div className="space-y-3">
                  <Button onClick={() => setShowUploadModal(true)} className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload First CSV
                  </Button>
                  <div className="text-xs text-gray-400">
                    This will create your first driver records and enable analytics
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        // Industrial Analytics Dashboard (existing content)
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Assets"
              value={(stats?.assets?.total || assets.length).toString()}
              change={calculateAssetGrowth()}
              trend={calculateAssetTrend()}
              icon={<Package className="h-6 w-6" />}
              color="text-blue-600"
            />
            <MetricCard
              title="Response Time Average"
              value={`${calculateResponseTimeAverage()} days`}
              change={calculateResponseTimeChange()}
              trend={calculateResponseTimeTrend()}
              icon={<Clock className="h-6 w-6" />}
              color="text-green-600"
            />
            <MetricCard
              title="Critical Components"
              value={calculateCriticalComponents()}
              change={calculateCriticalChange()}
              trend={calculateCriticalTrend()}
              icon={<AlertTriangle className="h-6 w-6" />}
              color="text-red-600"
            />
            <MetricCard
              title="Components Due Soon"
              value={calculateComponentsDueSoon()}
              change={calculateComponentsDueChange()}
              trend={calculateComponentsDueTrend()}
              icon={<Calendar className="h-6 w-6" />}
              color="text-purple-600"
            />
          </div>
        </div>
      )}

      {/* Main Content - Hide for logistics clients */}
      {currentClient?.client_type !== 'logistics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Asset Type Distribution */}
                <SimplePieChart
                  data={generateAssetTypeData()}
                  nameKey="name"
                  valueKey="value"
                  title="Asset Type Distribution"
                  subtitle="Breakdown by asset category"
                />


              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                {/* Performance Metrics */}
                <MultiLineChart
                  data={generatePerformanceData()}
                  xKey="month"
                  lines={[
                    { key: 'uptime', label: 'Uptime %', color: '#10b981' },
                    { key: 'efficiency', label: 'Efficiency %', color: '#3b82f6' },
                    { key: 'maintenance', label: 'Maintenance Hours', color: '#f59e0b' },
                  ]}
                  title="Performance Metrics"
                  subtitle="Monthly performance indicators"
                />
              </TabsContent>

              <TabsContent value="trends" className="space-y-6">
                {/* Maintenance Trends */}
                <SimpleBarChart
                  data={generateMaintenanceTrendsData()}
                  xKey="month"
                  yKey="value"
                  title="Maintenance Trends"
                  subtitle="Maintenance missed vs on-time trends"
                />
              </TabsContent>

              <TabsContent value="distribution" className="space-y-6">
                {/* Asset Status by Type */}
                <SimpleBarChart
                  data={generateAssetStatusByTypeData()}
                  xKey="type"
                  yKey="active"
                  title="Asset Status by Type"
                  subtitle="Distribution of asset statuses across types"
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Insights */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">Real-Time Insights</h3>
              </div>
              <div className="space-y-3">
                {generateMaintenanceInsights()}
                {generateEfficiencyInsights()}
                {generateCostInsights()}
                {generateNotificationInsights()}
              </div>
            </Card>

            {/* Recent Activities */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
              </div>
              <div className="space-y-3">
                {stats?.recent_activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.priority === 'high' ? 'bg-red-500' :
                      activity.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button className="w-full justify-start" variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
                <Button className="w-full justify-start" variant="outline" size="sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  View Alerts
                </Button>
                <Button className="w-full justify-start" variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Alerts
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}



      {/* CSV Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Uber Fleet Earnings CSV"
        size="lg"
      >
        <div className="space-y-4">
          <div className="text-center">
            <Upload className="h-12 w-12 text-teal-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Earnings Data</h3>
            <p className="text-gray-600 mb-4">
              Upload a CSV file exported from Uber Fleet to track driver earnings and performance.
            </p>
          </div>


          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-teal-600 hover:text-teal-500">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </div>
                <p className="text-xs text-gray-500">CSV files only</p>
              </div>
            </label>
          </div>
          
          {uploadFile && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(uploadFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadFile(null)}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (uploadFile) {
                  try {
                    await uploadEarningsMutation.mutateAsync(uploadFile);
                    setShowUploadModal(false);
                    setUploadFile(null);
                  } catch (error) {
                    console.error('Upload failed:', error);
                  }
                }
              }}
              disabled={!uploadFile || uploadEarningsMutation.isPending}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {uploadEarningsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                'Upload CSV'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Chat Button */}
      <FloatingChatButton
        messages={chatMessages}
        onSendMessage={handleChatMessage}
        isLoading={isChatLoading}
      />
    </div>
  );
}
