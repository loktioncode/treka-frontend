'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickStats } from '@/components/ui/stats-card';
import { StatusBadge, RoleBadge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
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
  Activity,
  Zap,
  Shield,
  RefreshCw
} from 'lucide-react';



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

  const loadDashboardStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const stats = await analyticsAPI.getDashboardStats();
      setDashboardStats(stats);
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
  };

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

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

  // Map real activities with proper icons
  const recentActivities = dashboardStats.recent_activities.map(activity => {
    let icon = Activity;
    if (activity.type === 'maintenance') icon = Wrench;
    else if (activity.type === 'alert') icon = AlertTriangle;
    else if (activity.type === 'update') icon = Activity;
    
    return {
      ...activity,
      icon,
      time: formatTimeAgo(activity.time)
    };
  });

  // Helper function to format time ago
  function formatTimeAgo(isoString: string): string {
    const now = new Date();
    const past = new Date(isoString);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return past.toLocaleDateString();
  }

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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates from your assets and components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                    activity.priority === 'high' 
                      ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                      : activity.priority === 'medium'
                      ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    activity.priority === 'high' 
                      ? 'bg-red-100' 
                      : activity.priority === 'medium'
                      ? 'bg-yellow-100'
                      : 'bg-teal-100'
                  }`}>
                    <activity.icon className={`h-4 w-4 ${
                      activity.priority === 'high' 
                        ? 'text-red-600' 
                        : activity.priority === 'medium'
                        ? 'text-yellow-600'
                        : 'text-teal-600'
                    }`} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <StatusBadge status={activity.status} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </p>
                  </div>
                </motion.div>
              ))}
              {recentActivities.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">
                    No recent activity to display.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
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
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-4 text-left rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-teal-500 rounded-lg group-hover:bg-teal-600 transition-colors">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-teal-900">Add New Asset</p>
                    <p className="text-sm text-teal-700">Register a new asset in the system</p>
                  </div>
                  <Zap className="h-4 w-4 text-teal-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-4 text-left rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
                    <Wrench className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">Schedule Maintenance</p>
                    <p className="text-sm text-green-700">Plan maintenance activities</p>
                  </div>
                  <Zap className="h-4 w-4 text-green-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.button>

              {user?.role !== 'user' && (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 text-left rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group"
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
                </motion.button>
              )}

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-4 text-left rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-teal-600 rounded-lg group-hover:bg-teal-700 transition-colors">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-teal-900">View Reports</p>
                    <p className="text-sm text-teal-700">Generate analytics reports</p>
                  </div>
                  <Zap className="h-4 w-4 text-teal-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}