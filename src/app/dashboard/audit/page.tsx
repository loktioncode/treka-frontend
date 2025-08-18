'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auditAPI } from '@/services/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Filter, 
  Search, 
  User,
  Building2,
  Package,
  Wrench,
  Bell,
  AlertTriangle,
  TrendingUp,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import type { AuditEntry, AuditSummary, AuditAction, AuditSeverity } from '@/types/audit';

export default function AuditPage() {
  const { user, isLoading } = useAuth();
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    action: '',
    severity: '',
    user_id: '',
    client_id: '',
    resource_type: '',
    resource_id: '',
    search: ''
  });

  // Redirect unauthorized users
  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== 'super_admin') {
      toast.error('Access denied. This page is for super admins only.');
      window.location.href = '/dashboard';
    }
  }, [user, isLoading]);

  const loadAuditData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load audit trail
      const trailResponse = await auditAPI.getAuditTrail(filters);
      setAuditEntries(trailResponse);
      
      // Load audit summary
      const summaryResponse = await auditAPI.getAuditSummary({
        start_date: filters.start_date,
        end_date: filters.end_date,
        client_id: filters.client_id
      });
      setAuditSummary(summaryResponse);
      
    } catch (error) {
      console.error('Error loading audit data:', error);
      toast.error('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadAuditData();
    }
  }, [user, loadAuditData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await auditAPI.exportAuditCSV(filters);
      toast.success('CSV export completed');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      await auditAPI.exportAuditPDF({
        start_date: filters.start_date,
        end_date: filters.end_date,
        client_id: filters.client_id
      });
      toast.success('PDF export completed');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'user_created':
      case 'user_updated':
      case 'user_deactivated':
        return User;
      case 'client_created':
      case 'client_updated':
      case 'client_deactivated':
        return Building2;
      case 'asset_created':
      case 'asset_updated':
      case 'asset_deleted':
        return Package;
      case 'component_created':
      case 'component_updated':
      case 'component_deleted':
        return Wrench;
      case 'notification_created':
      case 'notification_sent':
      case 'notification_escalated':
        return Bell;
      default:
        return FileText;
    }
  };

  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return null;
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
              Audit Trail
            </h1>
            <p className="text-xl text-muted-foreground">
              Complete system activity monitoring and compliance tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportCSV}
              disabled={exporting}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={exporting}
              variant="outline"
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Start Date</label>
            <Input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">End Date</label>
            <Input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Action</label>
            <Select
              options={[
                { value: '', label: 'All Actions' },
                { value: 'user_created', label: 'User Created' },
                { value: 'user_updated', label: 'User Updated' },
                { value: 'asset_created', label: 'Asset Created' },
                { value: 'component_created', label: 'Component Created' },
                { value: 'notification_escalated', label: 'Notification Escalated' }
              ]}
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Severity</label>
            <Select
              options={[
                { value: '', label: 'All Severities' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' }
              ]}
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700">Search</label>
          <div className="mt-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search in descriptions, details, or resource names..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={loadAuditData} className="gap-2">
            <Eye className="w-4 h-4" />
            Apply Filters
          </Button>
          <Button
            onClick={() => setFilters({
              start_date: '',
              end_date: '',
              action: '',
              severity: '',
              user_id: '',
              client_id: '',
              resource_type: '',
              resource_id: '',
              search: ''
            })}
            variant="outline"
          >
            Clear Filters
          </Button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      {auditSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditSummary.total_entries}</div>
              <p className="text-xs text-muted-foreground">
                {auditSummary.date_range.start && auditSummary.date_range.end && 
                  `${formatDate(auditSummary.date_range.start)} - ${formatDate(auditSummary.date_range.end)}`
                }
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Escalations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditSummary.escalation_count}</div>
              <p className="text-xs text-muted-foreground">
                Notification escalations
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Actions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditSummary.critical_actions_count}</div>
              <p className="text-xs text-muted-foreground">
                High priority activities
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(auditSummary.entries_by_user).length}</div>
              <p className="text-xs text-muted-foreground">
                Users with activity
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Audit Entries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Audit Entries</h2>
          <div className="text-sm text-gray-500">
            {auditEntries.length} entries found
          </div>
        </div>
        
        {auditEntries.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit entries found</h3>
            <p className="text-gray-600">Try adjusting your filters or date range.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {auditEntries.map((entry, index) => {
              const Icon = getActionIcon(entry.action);
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="p-2 rounded-lg bg-gray-100">
                          <Icon className="h-5 w-5 text-gray-600" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {entry.description}
                              </h3>
                              <Badge variant="outline" className={getSeverityColor(entry.severity)}>
                                {entry.severity}
                              </Badge>
                              {entry.escalation_from && entry.escalation_to && (
                                <Badge variant="destructive" size="sm">
                                  ESCALATED
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-500">
                              {formatDate(entry.timestamp)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            {entry.user_email && (
                              <div>
                                <span className="font-medium">User:</span> {entry.user_email}
                                {entry.user_role && ` (${entry.user_role})`}
                              </div>
                            )}
                            {entry.resource_type && (
                              <div>
                                <span className="font-medium">Resource:</span> {entry.resource_type}
                                {entry.resource_name && ` - ${entry.resource_name}`}
                              </div>
                            )}
                            {entry.ip_address && (
                              <div>
                                <span className="font-medium">IP:</span> {entry.ip_address}
                              </div>
                            )}
                          </div>
                          
                          {entry.escalation_from && entry.escalation_to && (
                            <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-3 rounded-r">
                              <div className="text-sm text-orange-800">
                                <span className="font-medium">Escalated:</span> {entry.escalation_from} → {entry.escalation_to}
                                {entry.escalation_reason && (
                                  <span className="block mt-1">Reason: {entry.escalation_reason}</span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {entry.changes_summary && (
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Changes:</span> {entry.changes_summary}
                            </div>
                          )}
                          
                          {entry.tags.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">Tags:</span>
                              {entry.tags.map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="outline" size="sm">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
