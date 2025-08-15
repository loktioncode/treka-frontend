'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickStats } from '@/components/ui/stats-card';
import { StatusBadge, RoleBadge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
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
  Shield
} from 'lucide-react';



export default function Dashboard() {
  const { user } = useAuth();

  // Sample data - this would come from API calls
  const baseStats = [
    {
      title: 'Total Assets',
      value: '24',
      description: 'Active in system',
      icon: Package,
      color: 'blue' as const,
      trend: { value: '12%', isPositive: true, label: 'vs last month' }
    },
    {
      title: 'Active Components',
      value: '156',
      description: 'Operational status',
      icon: Wrench,
      color: 'green' as const,
      trend: { value: '3%', isPositive: true, label: 'vs last week' }
    },
    {
      title: 'Pending Maintenance',
      value: '8',
      description: 'Scheduled this week',
      icon: Clock,
      color: 'yellow' as const,
      trend: { value: '2', isPositive: false, label: 'new this week' }
    },
    {
      title: 'Critical Issues',
      value: '2',
      description: 'Require immediate attention',
      icon: AlertTriangle,
      color: 'red' as const,
      trend: { value: '1', isPositive: false, label: 'new today' }
    }
  ];

  // Add role-specific stats for super admin
  const superAdminStats = user?.role === 'super_admin' ? [
    {
      title: 'Total Clients',
      value: '12',
      description: 'Active organizations',
      icon: Building2,
      color: 'purple' as const,
      trend: { value: '2', isPositive: true, label: 'new this month' }
    },
    {
      title: 'Total Users',
      value: '48',
      description: 'Across all clients',
      icon: Users,
      color: 'indigo' as const,
      trend: { value: '8%', isPositive: true, label: 'growth rate' }
    }
  ] : [];

  const allStats = [...superAdminStats, ...baseStats];

  const recentActivities = [
    {
      id: 1,
      type: 'maintenance',
      message: 'Maintenance completed on Excavator CAT-320',
      time: '2 hours ago',
      icon: Wrench,
      status: 'active' as const,
      priority: 'low'
    },
    {
      id: 2,
      type: 'alert',
      message: 'Critical alert: Engine temperature high on Truck-001',
      time: '4 hours ago',
      icon: AlertTriangle,
      status: 'critical' as const,
      priority: 'high'
    },
    {
      id: 3,
      type: 'update',
      message: 'Asset location updated for Crane-15',
      time: '6 hours ago',
      icon: Activity,
      status: 'active' as const,
      priority: 'medium'
    },
    {
      id: 4,
      type: 'maintenance',
      message: 'Scheduled maintenance for Generator-05',
      time: '1 day ago',
      icon: Clock,
      status: 'pending' as const,
      priority: 'medium'
    }
  ];

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
            <RoleBadge role={user?.role || 'user'} />
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full">
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
                      : 'bg-blue-100'
                  }`}>
                    <activity.icon className={`h-4 w-4 ${
                      activity.priority === 'high' 
                        ? 'text-red-600' 
                        : activity.priority === 'medium'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
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
                className="w-full p-4 text-left rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">Add New Asset</p>
                    <p className="text-sm text-blue-700">Register a new asset in the system</p>
                  </div>
                  <Zap className="h-4 w-4 text-blue-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
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
                className="w-full p-4 text-left rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-500 rounded-lg group-hover:bg-indigo-600 transition-colors">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-900">View Reports</p>
                    <p className="text-sm text-indigo-700">Generate analytics reports</p>
                  </div>
                  <Zap className="h-4 w-4 text-indigo-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}