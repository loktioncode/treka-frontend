'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Chat, ChatMessage } from '@/components/ui/chat';
import { FloatingChatButton } from '@/components/ui/floating-chat-button';
import { AnalyticsFilters, AnalyticsFilters as AnalyticsFiltersType } from '@/components/ui/analytics-filters';
import { 
  SimpleBarChart, 
  SimpleLineChart, 
  SimplePieChart, 
  MultiLineChart,
  MetricCard 
} from '@/components/ui/charts';
import { 
  BarChart3, 
  Package, 
  AlertTriangle,
  Calendar,
  Download,
  Eye,
  Brain,
  Activity,
  DollarSign,
  Shield,
  Settings,
  RefreshCw,
  Clock
} from 'lucide-react';
import { analyticsAPI, assetAPI, componentAPI, clientAPI, notificationAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { AssetStatus, AssetType, ComponentStatus } from '@/types/api';

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

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AnalyticsFiltersType>({
    dateRange: '30d',
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
  


  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('Loading analytics data...', { user, filters });
      
      // Load dashboard stats
      const statsData = await analyticsAPI.getDashboardStats(
        user?.role === 'super_admin' ? filters.clientId : undefined
      );
      console.log('Stats data loaded:', statsData);
      setStats(statsData);

      // Load comprehensive assets data with more details
      try {
        console.log('Loading comprehensive assets data...');
        const assetsData = await assetAPI.getAssets({
          client_id: user?.role === 'super_admin' ? filters.clientId : undefined,
          status: filters.status?.[0] as AssetStatus | undefined,
          asset_type: filters.assetType?.[0] as AssetType | undefined,
          search: filters.searchQuery,
          limit: 100, // Get more assets for better insights
        });
        console.log('Assets data loaded successfully:', assetsData);
        if (assetsData.items && assetsData.items.length > 0) {
          setAssets(assetsData.items);
          console.log('Set detailed assets:', assetsData.items);
        } else {
          console.log('Assets API returned empty items array');
          setAssets([]);
        }
      } catch (error) {
        console.error('Failed to load detailed assets:', error);
        setAssets([]);
      }

      // Load comprehensive components data with maintenance history
      let componentsToUse: Component[] = [];
      try {
        console.log('Loading comprehensive components data...');
        const componentsData = await componentAPI.getComponents({
          client_id: user?.role === 'super_admin' ? filters.clientId : undefined,
          search: filters.searchQuery,
          limit: 100, // Get more components for better insights
        });
        console.log('Components data loaded:', componentsData);
        console.log('Components API response structure:', {
          hasItems: !!componentsData.items,
          itemsLength: componentsData.items?.length || 0,
          firstItem: componentsData.items?.[0],
          responseKeys: Object.keys(componentsData)
        });
        
        if (componentsData.items && componentsData.items.length > 0) {
          componentsToUse = componentsData.items;
          setComponents(componentsData.items);
          console.log('Set detailed components:', componentsData.items);
          console.log('Component IDs from API:', componentsData.items.map((c: Component) => ({ id: c.id, name: c.name })));
        } else {
          console.log('Components API returned empty items array');
          componentsToUse = [];
          setComponents([]);
        }
      } catch (error) {
        console.error('Failed to load detailed components:', error);
        componentsToUse = [];
        setComponents([]);
      }

      // Load clients (for super admin)
      if (user?.role === 'super_admin') {
        const clientsData = await clientAPI.getClients();
        console.log('Clients data loaded:', clientsData);
        setClients(clientsData.items || []);
      }

      // Load maintenance logs for better insights
      try {
        console.log('Loading maintenance logs...');
        
        if (componentsToUse.length > 0) {
          // Check if we have real component IDs or fallback ones
          const hasRealComponentIds = componentsToUse.some(comp => !comp.id.startsWith('component-'));
          
          if (hasRealComponentIds) {
            console.log(`Fetching maintenance logs from ${componentsToUse.length} components with real IDs...`);
            
            // Fast algorithm: Use Promise.allSettled to fetch from all components concurrently
            // This is much faster than sequential calls and handles failures gracefully
            const maintenancePromises = componentsToUse.map(async (component) => {
              try {
                console.log(`Fetching maintenance logs for component: ${component.id} (${component.name})`);
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
              .flatMap(result => (result as PromiseFulfilledResult<any[]>).value);
            
            console.log(`Successfully loaded maintenance logs from ${maintenanceResults.filter(r => r.status === 'fulfilled').length}/${componentsToUse.length} components`);
            console.log('Total maintenance logs loaded:', allMaintenanceLogs.length);
            setMaintenanceLogs(allMaintenanceLogs);
          } else {
            console.log('⚠️ Skipping maintenance logs - using fallback component IDs that will not work with API');
            console.log('Fallback component IDs:', componentsToUse.map(c => c.id));
            setMaintenanceLogs([]);
          }
        } else {
          console.log('No components available for maintenance logs');
          setMaintenanceLogs([]);
        }
      } catch (error) {
        console.error('Failed to load maintenance logs:', error);
        console.log('Component IDs available:', componentsToUse.map(c => ({ id: c.id, name: c.name })));
        setMaintenanceLogs([]);
      }

      // Load recent notifications for insights
      try {
        console.log('Loading recent notifications...');
        const notificationsData = await notificationAPI.getNotifications({ 
          limit: 20
        });
        console.log('Notifications loaded:', notificationsData);
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
  }, [user, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const generateStatusData = () => {
    // If we have detailed components, use them
    if (components && components.length > 0) {
      const statusCounts = components.reduce((acc, component) => {
        acc[component.status] = (acc[component.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(statusCounts).map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count,
      }));
    }

    // No components available - return empty array
    return [];
  };

  const generateAssetValueData = () => {
    // If we have detailed assets, use them
    if (assets && assets.length > 0) {
      // Group assets by month based on creation date or last updated date
      const monthlyData: Record<string, number> = {};
      
      assets.forEach(asset => {
        // Use creation date or fallback to current month
        const date = asset.created_at ? new Date(asset.created_at) : new Date();
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (asset.current_value || 0);
      });

      // Convert to array format for charts
      return Object.entries(monthlyData).map(([month, value]) => ({
        month,
        value: Math.round(value)
      }));
    }

    // If we only have stats data, create a basic monthly trend
    if (stats?.assets?.total_value) {
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
      return [
        { month: currentMonth, value: Math.round(stats.assets.total_value) }
      ];
    }

    return [];
  };

  const generatePerformanceData = () => {
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

  // Real-time metric calculations
  const calculateTotalAssetValue = () => {
    // Use stats data if available, otherwise calculate from assets array
    if (stats?.assets?.total_value !== undefined) {
      return stats.assets.total_value;
    }
    return assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
  };

  const calculateCriticalComponents = () => {
    // Use stats data if available, otherwise calculate from components array
    if (stats?.components?.critical !== undefined) {
      return stats.components.critical;
    }
    return components.filter(component => component.status === 'critical').length;
  };

  const calculateSystemUptime = () => {
    // Use stats data if available, otherwise calculate from components array
    if (stats?.components?.total !== undefined && stats.components.total > 0) {
      const operational = stats.components.operational || 0;
      return Math.round((operational / stats.components.total) * 100);
    }
    
    if (components.length === 0) return 100;
    
    const operationalComponents = components.filter(c => c.status === 'operational').length;
    return Math.round((operationalComponents / components.length) * 100);
  };

  // Simplified trend calculations (in a real app, these would compare with historical data)
  const calculateAssetGrowth = () => {
    return assets.length > 0 ? '+0.0%' : '0.0%';
  };

  const calculateAssetTrend = () => {
    return assets.length > 0 ? 'up' as const : 'neutral' as const;
  };

  const calculateValueGrowth = () => {
    const totalValue = calculateTotalAssetValue();
    return totalValue > 0 ? '+0.0%' : '0.0%';
  };

  const calculateValueTrend = () => {
    const totalValue = calculateTotalAssetValue();
    return totalValue > 0 ? 'up' as const : 'neutral' as const;
  };

  const calculateCriticalChange = () => {
    const criticalCount = calculateCriticalComponents();
    return criticalCount > 0 ? '-0.0%' : '0.0%';
  };

  const calculateCriticalTrend = () => {
    const criticalCount = calculateCriticalComponents();
    return criticalCount > 0 ? 'down' as const : 'neutral' as const;
  };

  const calculateUptimeChange = () => {
    const uptime = calculateSystemUptime();
    return uptime > 95 ? '+0.0%' : '0.0%';
  };

  const calculateUptimeTrend = () => {
    const uptime = calculateSystemUptime();
    return uptime > 95 ? 'up' as const : 'neutral' as const;
  };

  const calculateResponseTimeAverage = () => {
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
    const avgResponseTime = calculateResponseTimeAverage();
    // In a real app, this would compare with historical data
    return avgResponseTime > 0 ? '-0.0%' : '0.0%';
  };

  const calculateResponseTimeTrend = () => {
    const avgResponseTime = calculateResponseTimeAverage();
    // In a real app, this would compare with historical data
    return avgResponseTime > 0 ? 'down' as const : 'neutral' as const;
  };

  const calculateComponentsDueSoon = () => {
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
    const dueSoon = calculateComponentsDueSoon();
    return dueSoon > 0 ? '+0.0%' : '0.0%';
  };

  const calculateComponentsDueTrend = () => {
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

      {/* No Data Message */}
      {stats && stats.assets.total === 0 && stats.components.total === 0 && (
        <Card className="p-6 bg-blue-50 border border-blue-200">
          <div className="text-center">
            <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">No Data Available</h3>
            <p className="text-blue-700 mb-4">
              Your analytics dashboard is currently empty. To get started, you'll need to add some assets and components to your system.
            </p>
            <div className="space-y-2 text-sm text-blue-600">
              <p>• Add assets through the Assets management section</p>
              <p>• Create components in the Components section</p>
              <p>• Once data is added, charts and insights will automatically populate</p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <AnalyticsFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => setFilters({ dateRange: '30d' })}
        assets={assets}
        clients={clients}
      />

      {/* Key Metrics */}
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

      {/* Main Content */}
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



      {/* Floating Chat Button */}
      <FloatingChatButton
        messages={chatMessages}
        onSendMessage={handleChatMessage}
        isLoading={isChatLoading}
      />
    </div>
  );
}
