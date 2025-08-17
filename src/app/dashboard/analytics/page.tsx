'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  AlertTriangle,
  Calendar,
  Filter,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  // Mock data for demonstration
  const metrics = [
    {
      title: 'Total Assets',
      value: '2,847',
      change: '+12.5%',
      trend: 'up',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Active Users',
      value: '1,234',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'Critical Alerts',
      value: '23',
      change: '-15.3%',
      trend: 'down',
      icon: AlertTriangle,
      color: 'text-red-600'
    },
    {
      title: 'System Uptime',
      value: '99.8%',
      change: '+0.2%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-purple-600'
    }
  ];

  const chartData = [
    { month: 'Jan', assets: 120, users: 80, alerts: 15 },
    { month: 'Feb', assets: 135, users: 95, alerts: 12 },
    { month: 'Mar', assets: 150, users: 110, alerts: 18 },
    { month: 'Apr', assets: 165, users: 125, alerts: 14 },
    { month: 'May', assets: 180, users: 140, alerts: 20 },
    { month: 'Jun', assets: 195, users: 155, alerts: 16 }
  ];

  const topAssets = [
    { name: 'Server Cluster A', status: 'healthy', uptime: '99.9%', lastCheck: '2 min ago' },
    { name: 'Database Server', status: 'warning', uptime: '98.5%', lastCheck: '5 min ago' },
    { name: 'Load Balancer', status: 'healthy', uptime: '99.7%', lastCheck: '1 min ago' },
    { name: 'File Storage', status: 'critical', uptime: '95.2%', lastCheck: '10 min ago' },
    { name: 'API Gateway', status: 'healthy', uptime: '99.8%', lastCheck: '3 min ago' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your system performance and asset health
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Date Range:</span>
        </div>
        <div className="flex rounded-lg border border-gray-200 p-1">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                dateRange === range
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-gray-50`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {metric.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change}
              </span>
              <span className="text-sm text-gray-500 ml-1">from last month</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Growth Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Asset Growth</h3>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
          <div className="space-y-4">
            {chartData.map((data) => (
              <div key={data.month} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 w-12">{data.month}</span>
                <div className="flex-1 mx-4">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-600 rounded-full transition-all duration-300"
                      style={{ width: `${(data.assets / 200) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {data.assets}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* User Activity Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
          <div className="space-y-4">
            {chartData.map((data) => (
              <div key={data.month} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 w-12">{data.month}</span>
                <div className="flex-1 mx-4">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${(data.users / 160) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {data.users}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Assets Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Top Assets by Performance</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSensitiveData(!showSensitiveData)}
            >
              {showSensitiveData ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {showSensitiveData ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uptime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Check
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topAssets.map((asset, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusColor(asset.status)}>
                      {asset.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{asset.uptime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{asset.lastCheck}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="w-full justify-start" variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            View Alerts
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </Card>
    </div>
  );
}
