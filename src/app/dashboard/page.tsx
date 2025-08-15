'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  Package,
  Wrench,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Building2,
  BarChart3
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  delay?: number;
}

const StatCard = ({ title, value, description, icon: Icon, trend, color, delay = 0 }: StatCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{value}</p>
                {trend && (
                  <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {trend.isPositive ? '+' : ''}{trend.value}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();

  // Sample data - this would come from API calls
  const stats = [
    {
      title: 'Total Assets',
      value: '24',
      description: 'Active in system',
      icon: Package,
      color: 'blue' as const,
      trend: { value: '12%', isPositive: true }
    },
    {
      title: 'Active Components',
      value: '156',
      description: 'Operational status',
      icon: Wrench,
      color: 'green' as const,
      trend: { value: '3%', isPositive: true }
    },
    {
      title: 'Pending Maintenance',
      value: '8',
      description: 'Scheduled this week',
      icon: Clock,
      color: 'yellow' as const,
      trend: { value: '2', isPositive: false }
    },
    {
      title: 'Critical Issues',
      value: '2',
      description: 'Require immediate attention',
      icon: AlertTriangle,
      color: 'red' as const,
      trend: { value: '1', isPositive: false }
    }
  ];

  // Add role-specific stats
  if (user?.role === 'super_admin') {
    stats.unshift(
      {
        title: 'Total Clients',
        value: '12',
        description: 'Active organizations',
        icon: Building2,
        color: 'purple' as const,
        trend: { value: '2', isPositive: true }
      },
      {
        title: 'Total Users',
        value: '48',
        description: 'Across all clients',
        icon: Users,
        color: 'indigo' as const,
        trend: { value: '8%', isPositive: true }
      }
    );
  }

  const recentActivities = [
    {
      id: 1,
      type: 'maintenance',
      message: 'Maintenance completed on Excavator CAT-320',
      time: '2 hours ago',
      icon: Wrench,
      color: 'text-green-600'
    },
    {
      id: 2,
      type: 'alert',
      message: 'Critical alert: Engine temperature high on Truck-001',
      time: '4 hours ago',
      icon: AlertTriangle,
      color: 'text-red-600'
    },
    {
      id: 3,
      type: 'update',
      message: 'Asset location updated for Crane-15',
      time: '6 hours ago',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      id: 4,
      type: 'maintenance',
      message: 'Scheduled maintenance for Generator-05',
      time: '1 day ago',
      icon: Clock,
      color: 'text-yellow-600'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.first_name || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your {user?.role === 'super_admin' ? 'system' : 'assets'} today.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            {...stat}
            delay={index * 0.1}
          />
        ))}
      </div>

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
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-full bg-muted`}>
                    <activity.icon className={`h-4 w-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No recent activity to display.
                </p>
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
              <button className="w-full p-3 text-left rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Add New Asset</p>
                    <p className="text-sm text-muted-foreground">Register a new asset</p>
                  </div>
                </div>
              </button>
              
              <button className="w-full p-3 text-left rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Schedule Maintenance</p>
                    <p className="text-sm text-muted-foreground">Plan maintenance activities</p>
                  </div>
                </div>
              </button>

              {user?.role !== 'user' && (
                <button className="w-full p-3 text-left rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Manage Users</p>
                      <p className="text-sm text-muted-foreground">Add or edit user accounts</p>
                    </div>
                  </div>
                </button>
              )}

              <button className="w-full p-3 text-left rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="font-medium">View Reports</p>
                    <p className="text-sm text-muted-foreground">Generate analytics reports</p>
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}