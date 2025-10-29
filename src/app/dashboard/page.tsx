'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickStats } from '@/components/ui/stats-card';
import { RoleBadge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Wrench,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Building2,
  BarChart3,
  Zap,
  Shield,
  RefreshCw
} from 'lucide-react';
import { SmartLink } from '@/components/SmartLink';
import { 
  OverallEarningsChart, 
  DriverLeaderboardChart, 
  PaymentDistributionChart, 
  PerformanceTrendsChart 
} from '@/components/ui/dashboard-charts';
import { MarketingCarousel } from '@/components/ui/marketing-carousel';
import { useDashboardAnalytics, DateRangeFilter } from '@/hooks/useDashboardAnalytics';
import { useClient } from '@/hooks/useClients';


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

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeFilter>('30d');
  const [showDemoData, setShowDemoData] = useState<boolean>(() => {
    // Load demo data preference from localStorage on component mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-show-demo-data');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  
  // Get current user's client information to determine if they're a logistics client
  const { data: currentClient } = useClient(user?.client_id || '', !!user?.client_id);
  
  // Fetch analytics data for charts - only when user is authenticated and is a logistics client
  const { data: analyticsData, isLoading: analyticsLoading, isError: analyticsError, refetch: refetchAnalytics } = useDashboardAnalytics(
    selectedDateRange, 
    showDemoData, 
    !!currentClient && currentClient.client_type === 'logistics'
  );

  const loadDashboardStats = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Only call analytics API for logistics clients
      if (currentClient?.client_type === 'logistics') {
        const stats = await analyticsAPI.getDashboardStats();
        setDashboardStats(stats);
      } else {
        // For industrial clients, set default stats without calling analytics API
        setDashboardStats({
          assets: { total: 0, active: 0, maintenance: 0, total_value: 0 },
          components: { total: 0, operational: 0, critical: 0, maintenance_due: 0 },
          notifications: { pending: 0 },
          recent_activities: [],
          total_clients: user?.role === 'super_admin' ? 0 : undefined,
          total_users: user?.role === 'super_admin' ? 0 : undefined
        });
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Failed to load dashboard statistics');
      // Fallback to dummy data on error
      setDashboardStats({
        assets: { total: 0, active: 0, maintenance: 0, total_value: 0 },
        components: { total: 0, operational: 0, critical: 0, maintenance_due: 0 },
        notifications: { pending: 0 },
        recent_activities: [],
        total_clients: user?.role === 'super_admin' ? 0 : undefined,
        total_users: user?.role === 'super_admin' ? 0 : undefined
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, currentClient, setLoading, setRefreshing, setError, setDashboardStats]);

  useEffect(() => {
    // Only make API calls if user is authenticated
    if (user && user.id) {
      loadDashboardStats();
    }
  }, [user, loadDashboardStats]);

  const handleRefresh = () => {
    loadDashboardStats(true);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        {/* Analytics charts loading state */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`chart-${i}`} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboardStats) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to Load Dashboard
          </h3>
          <p className="text-gray-600">{error || 'Failed to load dashboard data'}</p>
        </div>
      </div>
    );
  }

  // Create stats array from real data
  const baseStats = [
    {
      title: 'Total Assets',
      value: dashboardStats.assets.total.toString(),
      description: 'Active in system',
      icon: Package,
      color: 'blue' as const,
      trend: { 
        value: `${dashboardStats.assets.active}`, 
        isPositive: dashboardStats.assets.active > dashboardStats.assets.maintenance, 
        label: 'active assets' 
      }
    },
    {
      title: 'Active Components',
      value: dashboardStats.components.operational.toString(),
      description: 'Operational status',
      icon: Wrench,
      color: 'green' as const,
      trend: { 
        value: `${dashboardStats.components.total}`, 
        isPositive: true, 
        label: 'total components' 
      }
    },
    {
      title: 'Maintenance Due',
      value: dashboardStats.components.maintenance_due.toString(),
      description: 'Within 7 days',
      icon: Clock,
      color: 'yellow' as const,
      trend: { 
        value: `${dashboardStats.assets.maintenance}`, 
        isPositive: false, 
        label: 'assets in maintenance' 
      }
    },
    {
      title: 'Critical Issues',
      value: dashboardStats.components.critical.toString(),
      description: 'Require immediate attention',
      icon: AlertTriangle,
      color: 'red' as const,
      trend: { 
        value: `${dashboardStats.notifications.pending}`, 
        isPositive: false, 
        label: 'pending notifications' 
      }
    }
  ];

  // Add role-specific stats for super admin
  const superAdminStats = user?.role === 'super_admin' ? [
    {
      title: 'Total Clients',
      value: dashboardStats.total_clients?.toString() || '0',
      description: 'Active organizations',
      icon: Building2,
      color: 'purple' as const,
      trend: { 
        value: 'Active', 
        isPositive: true, 
        label: 'organizations' 
      }
    },
    {
      title: 'Total Users',
      value: dashboardStats.total_users?.toString() || '0',
      description: 'Across all clients',
      icon: Users,
      color: 'indigo' as const,
      trend: { 
        value: 'System-wide', 
        isPositive: true, 
        label: 'access' 
      }
    },
    {
      title: 'Total Asset Value',
      value: `$${dashboardStats.assets.total_value.toLocaleString()}`,
      description: 'All assets combined',
      icon: TrendingUp,
      color: 'green' as const,
      trend: { 
        value: 'Portfolio', 
        isPositive: true, 
        label: 'value' 
      }
    }
  ] : [];

  const allStats = [...superAdminStats, ...baseStats];

  // Note: recentActivities functionality has been replaced with analytics charts

  // Note: formatTimeAgo function removed as it's no longer needed

  // Helper function to get date range label
  const getDateRangeLabel = (range: DateRangeFilter): string => {
    const labels = {
      '7d': '7 Days',
      '30d': '30 Days',
      '1y': '1 Year',
      '5y': '5 Years'
    };
    return labels[range] || '1 Month';
  };

  // Handle demo data checkbox change and persist to localStorage
  const handleDemoDataChange = (checked: boolean) => {
    setShowDemoData(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-show-demo-data', JSON.stringify(checked));
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
              Welcome back, {user?.first_name || 'User'}!
            </h1>
            <p className="text-xl text-muted-foreground">
              Here&apos;s an overview of your {user?.role === 'super_admin' ? 'system' : 'assets'} today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <RoleBadge role={user?.role || 'user'} />
            <div className="p-3 bg-gradient-to-r from-teal-500 to-teal-700 rounded-full">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <QuickStats stats={allStats} />

      {/* Analytics Charts Section - Only for logistics clients */}
      {currentClient?.client_type === 'logistics' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2"
        >
          {/* Analytics Header */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
                <p className="text-gray-600">Key insights from your logistics operations</p>
              </div>
              <button
                onClick={refetchAnalytics}
                disabled={analyticsLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                {analyticsLoading ? 'Refreshing...' : 'Refresh Analytics'}
              </button>
            </div>
            
            {/* Date Range Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700 mr-2">Time Period:</span>
              {[
                { value: '7d' as DateRangeFilter, label: '7 Days' },
                { value: '30d' as DateRangeFilter, label: '30 Days' },
                { value: '1y' as DateRangeFilter, label: '1 Year' },
                { value: '5y' as DateRangeFilter, label: '5 Years' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSelectedDateRange(value)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                    selectedDateRange === value
                      ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {/* Demo Data Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDemoData}
                  onChange={(e) => handleDemoDataChange(e.target.checked)}
                  className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                />
                <span>Show Demo Data (for presentations)</span>
              </label>
              {showDemoData && (
                <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
                  Demo Mode
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Earnings Chart */}
            {analyticsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : analyticsError ? (
              <Card className="h-64 w-full flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600">Failed to load earnings data</p>
                </div>
              </Card>
            ) : analyticsData?.overallEarnings?.length === 0 ? (
              <Card className="h-64 w-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No earnings data available</p>
                  <p className="text-sm text-gray-500">Upload earnings data to see charts</p>
                </div>
              </Card>
            ) : (
              <OverallEarningsChart 
                data={analyticsData?.overallEarnings || []}
                title={`Overall Earnings - ${getDateRangeLabel(selectedDateRange)}`}
                subtitle="Earnings trend for selected period"
              />
            )}
            
            {/* Driver Leaderboard Chart */}
            {analyticsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <DriverLeaderboardChart 
                data={analyticsData?.driverLeaderboard || []}
                title={`Driver Leaderboard - ${getDateRangeLabel(selectedDateRange)}`}
                subtitle="Top performing drivers"
              />
            )}
            
            {/* Payment Distribution Chart */}
            {analyticsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <PaymentDistributionChart 
                data={analyticsData?.paymentDistribution || []}
                title={`Top Drivers by Earnings - ${getDateRangeLabel(selectedDateRange)}`}
                subtitle="Earnings breakdown by driver"
              />
            )}
            
            {/* Performance Trends Chart */}
            {analyticsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <PerformanceTrendsChart 
                data={analyticsData?.performanceTrends || []}
                title={`Performance Trends - ${getDateRangeLabel(selectedDateRange)}`}
                subtitle="Drivers vs Earnings correlation"
              />
            )}
          </div>
          
          {/* Help message for users without data */}
          {!analyticsLoading && !analyticsError && 
           (!analyticsData?.overallEarnings?.length && 
            !analyticsData?.driverLeaderboard?.length && 
            !analyticsData?.paymentDistribution?.length && 
            !analyticsData?.performanceTrends?.length) && (
            <div className="mt-6 p-6 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-teal-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-teal-900 mb-2">Get Started with Analytics</h3>
                <p className="text-teal-700 mb-4">
                  Upload your first earnings CSV file to start seeing insights about your logistics operations.
                </p>
                <SmartLink 
                  href="/dashboard/analytics"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <TrendingUp className="h-5 w-5" />
                  Go to Analytics
                </SmartLink>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Actions - Hide for logistics clients */}
      {currentClient?.client_type === 'industrial' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions - Show for all users with role-appropriate actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Asset Management - Available for all users */}
                <SmartLink 
                  href="/dashboard/assets"
                  className="w-full p-4 text-left rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 transition-all duration-200 group block"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-teal-500 rounded-lg group-hover:bg-teal-600 transition-colors">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-teal-900">Manage Assets</p>
                      <p className="text-sm text-teal-700">View and manage system assets</p>
                    </div>
                    <Zap className="h-4 w-4 text-teal-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </SmartLink>

                {/* Component Management - Available for all users */}
                <SmartLink 
                  href="/dashboard/components"
                  className="w-full p-4 text-left rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-all duration-200 group block"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
                      <Wrench className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">Manage Components</p>
                      <p className="text-sm text-green-700">View and manage system components</p>
                    </div>
                    <Zap className="h-4 w-4 text-green-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </SmartLink>

                {/* User Management - Available for admin and super_admin */}
                {user?.role !== 'user' && (
                  <SmartLink 
                    href="/dashboard/users"
                    className="w-full p-4 text-left rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group block"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-purple-900">Manage Users</p>
                        <p className="text-sm text-purple-700">Add or edit user accounts</p>
                      </div>
                      <Zap className="h-4 w-4 text-purple-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </SmartLink>
                )}

                {/* Client Management - Only for super_admin */}
                {user?.role === 'super_admin' && (
                  <SmartLink 
                    href="/dashboard/clients"
                    className="w-full p-4 text-left rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group block"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-blue-900">Manage Clients</p>
                        <p className="text-sm text-blue-700">Manage client organizations</p>
                      </div>
                      <Zap className="h-4 w-4 text-blue-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </SmartLink>
                )}

                {/* Notifications - Available for all users */}
                <SmartLink 
                  href="/dashboard/notifications"
                  className="w-full p-4 text-left rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 transition-all duration-200 group block"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-500 rounded-lg group-hover:bg-orange-600 transition-colors">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-orange-900">View Notifications</p>
                      <p className="text-sm text-orange-700">Check system alerts and updates</p>
                    </div>
                    <Zap className="h-4 w-4 text-orange-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </SmartLink>
              </CardContent>
            </Card>
          </motion.div>
          {/* Marketing Carousel - Show for all users */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full"
          >
            <MarketingCarousel />
          </motion.div>
        </div>
      )}

      {/* Marketing Carousel - Show for logistics clients (full width) */}
      {currentClient?.client_type === 'logistics' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-full"
        >
          <MarketingCarousel />
        </motion.div>
      )}
    </div>
  );
}