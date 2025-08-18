'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { componentAPI, assetAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Wrench,
  Clock,
  User,
  Image as ImageIcon,
  AlertTriangle,
  TrendingDown,
  Calendar,
  Package,
  Settings,
  FileText,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import type { Component, Asset, MaintenanceLog, CreateMaintenanceLogRequest } from '@/types/api';

interface ComponentDetails {
  component: Component | null;
  asset: Asset | null;
  maintenanceLogs: MaintenanceLog[];
  users: Array<{
    id: string;
    name: string;
    role: string;
    lastWorkDate: string;
    workCount: number;
  }>;
  downtimeEvents: Array<{
    id: string;
    startDate: string;
    endDate: string;
    duration: number;
    reason: string;
    maintenanceRelated: boolean;
    cost: number;
  }>;
  images: Array<{
    id: string;
    url: string;
    caption: string;
    uploadedBy: string;
    uploadedAt: string;
    maintenanceLogId?: string;
  }>;
}

export default function ComponentDetailsPage() {
  const { componentId } = useParams();
  const router = useRouter();
  const [details, setDetails] = useState<ComponentDetails>({
    component: null,
    asset: null,
    maintenanceLogs: [],
    users: [],
    downtimeEvents: [],
    images: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Maintenance form state
  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [when, setWhen] = useState<string>(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [submitting, setSubmitting] = useState(false);

  const submitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!componentId) return;
    if (!desc.trim()) {
      toast.error('Description is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateMaintenanceLogRequest = {
        description: desc.trim(),
        maintenance_date: new Date(when).toISOString(),
        notes: notes?.trim() ? notes.trim() : undefined,
        hours_spent: hours ? parseFloat(hours) : undefined
      };
      await componentAPI.createMaintenanceLog(componentId as string, payload);
      toast.success('Maintenance logged');
      // reset
      setDesc('');
      setHours('');
      setNotes('');
      setWhen(() => {
        const d = new Date();
        d.setSeconds(0, 0);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      });
      // reload details
      await loadComponentDetails();
    } catch {
      toast.error('Failed to log maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  // Load component details
  const loadComponentDetails = useCallback(async () => {
    if (!componentId) return;
    try {
      setLoading(true);
      const component = await componentAPI.getComponent(componentId as string);
      let asset = null;
      if (component.asset_id) {
        try {
          asset = await assetAPI.getAsset(component.asset_id);
        } catch {}
      }
      const maintenanceLogs = await componentAPI.getMaintenanceLogs(componentId as string);
      // Extract unique users from maintenance logs
      const userMap = new Map();
      maintenanceLogs.forEach((log: MaintenanceLog) => {
        if (log.performed_by) {
          if (!userMap.has(log.performed_by)) {
            userMap.set(log.performed_by, {
              id: log.performed_by,
              name: log.performed_by,
              role: 'technician',
              lastWorkDate: log.maintenance_date,
              workCount: 1
            });
          } else {
            const existing = userMap.get(log.performed_by);
            existing.workCount += 1;
            if (new Date(log.maintenance_date) > new Date(existing.lastWorkDate)) {
              existing.lastWorkDate = log.maintenance_date;
            }
          }
        }
      });

      setDetails({ component, asset, maintenanceLogs, users: Array.from(userMap.values()), downtimeEvents: [], images: [] });
    } catch {
      toast.error('Failed to load component details');
    } finally {
      setLoading(false);
    }
  }, [componentId]);

  useEffect(() => {
    if (componentId) {
      loadComponentDetails();
    }
  }, [componentId, loadComponentDetails]);

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
      case 'operational': return <Package className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <TrendingDown className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'inactive': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const calculateUptime = () => {
    if (!details.component?.last_maintenance_date) return 100;
    
    const lastMaintenance = new Date(details.component.last_maintenance_date);
    const now = new Date();
    const daysSinceMaintenance = Math.floor((now.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceMaintenance <= 30) return 95;
    if (daysSinceMaintenance <= 60) return 90;
    if (daysSinceMaintenance <= 90) return 85;
    return 80;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!details.component) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Component not found</h3>
        <p className="text-gray-600">The component you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {details.component.name}
            </h1>
            <p className="text-gray-600">
              {details.asset ? `${details.asset.name} • ` : ''}
              {details.component.component_type}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={getStatusColor(details.component.status)}>
            {getStatusIcon(details.component.status)}
            {details.component.status}
          </Badge>
          <Button
            onClick={() => router.push(`/dashboard/components/${componentId}/edit`)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateUptime()}%</div>
            <p className="text-xs text-muted-foreground">
              Last maintenance: {details.component.last_maintenance_date ? formatDate(details.component.last_maintenance_date) : 'Never'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{details.maintenanceLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Total maintenance records
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Technicians</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{details.users.length}</div>
            <p className="text-xs text-muted-foreground">
              Users who worked on this component
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downtime</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {details.downtimeEvents.reduce((total, event) => total + event.duration, 0) / 60}h
            </div>
            <p className="text-xs text-muted-foreground">
              Total downtime hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="maintenance" 
            className="data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            Maintenance
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="images" 
            className="data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            Images
          </TabsTrigger>
          <TabsTrigger 
            value="downtime" 
            className="data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            Downtime
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Component Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Component Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Type:</span>
                    <p className="text-gray-900">{details.component.component_type}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <p className="text-gray-900">{details.component.status}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Description:</span>
                    <p className="text-gray-900">{details.component.description || 'No description'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Asset:</span>
                    <p className="text-gray-900">{details.asset?.name || 'Not assigned'}</p>
                  </div>
                </div>
                
                {details.component.specifications && Object.keys(details.component.specifications).length > 0 && (
                  <div>
                    <span className="font-medium text-gray-600">Specifications:</span>
                    <div className="mt-2 space-y-1">
                      {Object.entries(details.component.specifications).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Maintenance Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Maintenance Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Maintenance:</span>
                    <span className="text-sm font-medium">
                      {details.component.last_maintenance_date 
                        ? formatDate(details.component.last_maintenance_date)
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Next Maintenance:</span>
                    <span className="text-sm font-medium">
                      {details.component.next_maintenance_date 
                        ? formatDate(details.component.next_maintenance_date)
                        : 'Not scheduled'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Interval:</span>
                    <span className="text-sm font-medium">
                      {details.component.maintenance_interval_days} days
                    </span>
                  </div>
                </div>
                
                {details.component.next_maintenance_date && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <Clock className="w-4 h-4" />
                      <span>
                        Next maintenance due in{' '}
                        {Math.ceil((new Date(details.component.next_maintenance_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          {/* Create Maintenance Log Form */}
          <Card className="border-teal-200">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-white border-b">
              <CardTitle className="flex items-center gap-2 text-teal-800">
                <Wrench className="w-5 h-5 text-teal-600" />
                Log New Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitMaintenance} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Describe the maintenance performed"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hours Spent</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="0.0"
                      disabled={submitting}
                    />
                    <p className="text-xs text-gray-500 mt-1">System will calculate cost from technician hourly rate</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      rows={3}
                      placeholder="Additional notes about the maintenance"
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={submitting}>
                    {submitting ? 'Logging...' : 'Log Maintenance'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Maintenance History */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-teal-600" />
                Maintenance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {details.maintenanceLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No maintenance logs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {details.maintenanceLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 bg-white/60 hover:bg-teal-50/40 transition-colors border-teal-100">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" size="sm" className="bg-teal-100 text-teal-800 border-teal-200">Maintenance</Badge>
                            <Badge variant="outline" size="sm" className="bg-gray-100 text-gray-800 border-gray-200">{log.performed_by}</Badge>
                          </div>
                          <p className="text-sm text-gray-700">{log.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(log.maintenance_date)}
                            </span>
                            {log.hours_spent && (
                              <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                                <Clock className="w-3 h-3" />
                                {log.hours_spent}h
                              </span>
                            )}
                            {typeof log.cost === 'number' && (
                              <span className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                                <span className="font-medium">${log.cost.toFixed(2)}</span>
                                {log.hours_spent && log.hours_spent > 0 && (
                                  <span className="text-amber-700/70">({(log.cost / log.hours_spent).toFixed(2)}/hr)</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {log.notes && (
                          <div className="text-sm text-gray-600 max-w-xs">
                            <span className="font-medium">Notes:</span> {log.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Users Who Worked on This Component
              </CardTitle>
            </CardHeader>
            <CardContent>
              {details.users.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No users have worked on this component yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {details.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-gray-600">{user.role}</p>
                        <p className="text-xs text-gray-500">
                          Last worked: {formatDate(user.lastWorkDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-teal-600">
                          {user.workCount}
                        </div>
                        <p className="text-xs text-gray-500">maintenance tasks</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Component Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {details.images.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No images uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {details.images.map((image) => (
                    <div key={image.id} className="border rounded-lg overflow-hidden">
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-gray-400" />
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm">{image.caption}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          By {image.uploadedBy} on {formatDate(image.uploadedAt)}
                        </p>
                        {image.maintenanceLogId && (
                          <Badge variant="outline" size="sm" className="mt-2">
                            Maintenance Log #{image.maintenanceLogId}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Downtime Tab */}
        <TabsContent value="downtime" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Downtime Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16">
                <div className="text-6xl mb-4">😢</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Coming Soon</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Downtime tracking and analysis features are currently under development. 
                  This will include real-time monitoring, cost analysis, and performance insights.
                </p>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
                  <h4 className="font-medium text-blue-800 mb-2">Planned Features:</h4>
                  <ul className="text-sm text-blue-700 space-y-1 text-left">
                    <li>• Real-time downtime detection</li>
                    <li>• Cost impact analysis</li>
                    <li>• Performance metrics & trends</li>
                    <li>• Maintenance correlation</li>
                    <li>• Automated alerts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

