'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Chat, ChatMessage } from '@/components/ui/chat';
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
  MessageSquare,
  Activity,
  DollarSign,
  Shield,
  Settings,
  RefreshCw
} from 'lucide-react';
import { analyticsAPI, assetAPI, componentAPI, clientAPI } from '@/services/api';
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
}

interface Component {
  id: string;
  name: string;
  status: string;
  condition: string;
  last_maintenance: string;
  next_maintenance_date: string;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
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
  const [showChat, setShowChat] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const statsData = await analyticsAPI.getDashboardStats(
        user?.role === 'super_admin' ? filters.clientId : undefined
      );
      setStats(statsData);

      // Load assets
      const assetsData = await assetAPI.getAssets({
        client_id: user?.role === 'super_admin' ? filters.clientId : undefined,
        status: filters.status?.[0] as AssetStatus | undefined, // Take first status if multiple
        asset_type: filters.assetType?.[0] as AssetType | undefined, // Take first type if multiple
        search: filters.searchQuery,
      });
      setAssets(assetsData.items || []);

      // Load components
      const componentsData = await componentAPI.getComponents({
        client_id: user?.role === 'super_admin' ? filters.clientId : undefined,
        status: filters.status?.[0] as ComponentStatus | undefined, // Take first status if multiple
        search: filters.searchQuery,
      });
      setComponents(componentsData.items || []);

      // Load clients (for super admin)
      if (user?.role === 'super_admin') {
        const clientsData = await clientAPI.getClients();
        setClients(clientsData.items || []);
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

  // Generate chart data
  const generateAssetTypeData = () => {
    const typeCounts = assets.reduce((acc, asset) => {
      acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));
  };

  const generateStatusData = () => {
    const statusCounts = components.reduce((acc, component) => {
      acc[component.status] = (acc[component.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  };

  const generateAssetValueData = () => {
    const monthlyData = [
      { month: 'Jan', value: 1250000 },
      { month: 'Feb', value: 1320000 },
      { month: 'Mar', value: 1280000 },
      { month: 'Apr', value: 1450000 },
      { month: 'May', value: 1380000 },
      { month: 'Jun', value: 1520000 },
    ];

    return monthlyData;
  };

  const generatePerformanceData = () => {
    return [
      { month: 'Jan', uptime: 99.2, efficiency: 87.5, maintenance: 12.3 },
      { month: 'Feb', uptime: 99.5, efficiency: 89.1, maintenance: 10.8 },
      { month: 'Mar', uptime: 98.8, efficiency: 85.9, maintenance: 14.2 },
      { month: 'Apr', uptime: 99.7, efficiency: 91.3, maintenance: 8.7 },
      { month: 'May', uptime: 99.1, efficiency: 88.7, maintenance: 11.3 },
      { month: 'Jun', uptime: 99.9, efficiency: 93.2, maintenance: 6.8 },
    ];
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {showChat ? 'Hide' : 'Show'} AI Chat
          </Button>
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
          value={stats?.assets.total.toLocaleString() || '0'}
          change="+12.5%"
          trend="up"
          icon={<Package className="h-6 w-6" />}
          color="text-blue-600"
        />
        <MetricCard
          title="Asset Value"
          value={`$${(stats?.assets.total_value || 0).toLocaleString()}`}
          change="+8.2%"
          trend="up"
          icon={<DollarSign className="h-6 w-6" />}
          color="text-green-600"
        />
        <MetricCard
          title="Critical Components"
          value={stats?.components.critical || 0}
          change="-15.3%"
          trend="down"
          icon={<AlertTriangle className="h-6 w-6" />}
          color="text-red-600"
        />
        <MetricCard
          title="System Uptime"
          value="99.8%"
          change="+0.2%"
          trend="up"
          icon={<Shield className="h-6 w-6" />}
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
              {/* Asset Value Trend */}
              <SimpleLineChart
                data={generateAssetValueData()}
                xKey="month"
                yKey="value"
                title="Asset Value Trend"
                subtitle="Monthly asset value changes"
                showArea={true}
              />

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
              {/* Component Status Trends */}
              <SimpleBarChart
                data={generateStatusData()}
                xKey="name"
                yKey="value"
                title="Component Status Distribution"
                subtitle="Current component health status"
              />
            </TabsContent>

            <TabsContent value="distribution" className="space-y-6">
              {/* Asset Status by Type */}
              <SimpleBarChart
                data={[
                  { type: 'Vehicle', active: 45, maintenance: 12, retired: 3 },
                  { type: 'Machinery', active: 78, maintenance: 23, retired: 8 },
                  { type: 'Equipment', active: 156, maintenance: 34, retired: 12 },
                  { type: 'Infrastructure', active: 89, maintenance: 15, retired: 5 },
                ]}
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
          {/* AI Chat */}
          {showChat && (
            <Chat
              messages={chatMessages}
              onSendMessage={handleChatMessage}
              isLoading={isChatLoading}
              className="h-96"
            />
          )}

          {/* Quick Insights */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-teal-50 rounded-lg">
                <p className="text-sm text-teal-800">
                  <strong>Performance Alert:</strong> 3 components are approaching maintenance due dates
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Efficiency Trend:</strong> Asset utilization has improved 12% this month
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Cost Optimization:</strong> Consider consolidating similar equipment types
                </p>
              </div>
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

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Assets */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Assets</h3>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {assets.slice(0, 5).map((asset, index) => (
              <div key={asset.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-teal-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{asset.name}</p>
                    <p className="text-sm text-gray-500">{asset.asset_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">${asset.current_value.toLocaleString()}</p>
                  <Badge className={asset.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {asset.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Maintenance Schedule */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Maintenance</h3>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>
          <div className="space-y-4">
            {components
              .filter(c => c.next_maintenance_date)
              .slice(0, 5)
              .map((component) => (
                <div key={component.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{component.name}</p>
                    <p className="text-sm text-gray-500">Due: {new Date(component.next_maintenance_date).toLocaleDateString()}</p>
                  </div>
                  <Badge className={
                    component.status === 'critical' ? 'bg-red-100 text-red-800' :
                    component.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }>
                    {component.status}
                  </Badge>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
