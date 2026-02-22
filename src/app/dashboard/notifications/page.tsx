'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Wrench
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import type { Notification } from '@/types/api';

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead,
    acknowledge,
    refreshNotifications,
  } = useNotifications();
  const [markingAllRead, setMarkingAllRead] = useState(false);
  // Date range filter: 'today' | '7' | '14' | '30'
  const [dateRange, setDateRange] = useState<'today' | '7' | '14' | '30'>('14');

  // Redirect unauthorized users (run only once user is known)
  useEffect(() => {
    if (isLoading) return;
    if (!user) return; // middleware guards unauthenticated; wait until user populated
    if (!['admin', 'user', 'super_admin'].includes(user.role)) {
      toast.error('Access denied. This page is for admins and users only.');
      window.location.href = '/dashboard';
    }
  }, [user, isLoading]);



  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      await markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleAcknowledge = async (notificationId: string) => {
    try {
      await acknowledge(notificationId);
      toast.success('Incident acknowledged');
      refreshNotifications();
    } catch (error) {
      console.error('Error acknowledging notification:', error);
      toast.error('Failed to acknowledge');
    }
  };

  const getNotificationIcon = (type: string, urgency?: string) => {
    if (urgency === 'critical' || urgency === 'OVERDUE') return AlertTriangle;
    
    switch (type) {
      case 'MAINTENANCE':
        return Wrench;
      case 'email':
        return Bell;
      case 'whatsapp':
        return BellRing;
      default:
        return Info;
    }
  };

  const getNotificationColor = (urgency?: string) => {
    if (!urgency) return 'text-gray-600 bg-gray-50 border-gray-200';
    
    switch (urgency.toLowerCase()) {
      case 'critical':
      case 'overdue':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
      case 'urgent':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-teal-600 bg-teal-50 border-teal-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyBadgeVariant = (urgency?: string) => {
    if (!urgency) return 'outline';
    
    switch (urgency.toLowerCase()) {
      case 'critical':
      case 'overdue':
        return 'destructive';
      case 'high':
      case 'urgent':
        return 'warning';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Smart notification grouping to avoid UI clutter
  const groupNotifications = (notifications: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {};
    
    notifications.forEach(notification => {
      // Group by component_id for maintenance notifications to avoid duplicates
      if (notification.notification_type === 'MAINTENANCE' && notification.component_id) {
        const key = `maintenance_${notification.component_id}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(notification);
      } else {
        // For other notification types, use unique ID
        const key = `unique_${notification.id}`;
        groups[key] = [notification];
      }
    });
    
    return Object.values(groups);
  };

  const getEscalationStatus = (notification: Notification) => {
    if (notification.notification_type !== 'MAINTENANCE') return null;
    
    const history = notification.history || [];
    const recentEscalations = history.filter(h => 
      h.action === 'escalated' && 
      (new Date().getTime() - new Date(h.timestamp).getTime()) < 86400000 // Last 24 hours
    );
    
    if (recentEscalations.length > 0) {
      const latest = recentEscalations[recentEscalations.length - 1];
      return {
        escalated: true,
        from: latest.from_urgency,
        to: latest.to_urgency,
        reason: latest.reason
      };
    }
    
    return { escalated: false };
  };

  const getEscalationBadge = (escalationStatus: { escalated: boolean; from?: string; to?: string; reason?: string } | null) => {
    if (!escalationStatus || !escalationStatus.escalated) return null;
    return (
      <Badge variant="destructive" size="sm" className="ml-2">
        ESCALATED
      </Badge>
    );
  };

  // Date range filtering helpers
  const getCutoffDate = (range: 'today' | '7' | '14' | '30') => {
    const now = new Date();
    if (range === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return start;
    }
    const days = parseInt(range, 10);
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return cutoff;
  };

  const filteredByDate = (items: Notification[], range: 'today' | '7' | '14' | '30') => {
    const cutoff = getCutoffDate(range);
    return items.filter(n => new Date(n.created_at) >= cutoff);
  };

  // Apply date filter first
  const filteredNotifications = filteredByDate(notifications, dateRange)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pendingCount = filteredNotifications.filter(n => !n.read_status).length;
  const groupedNotifications = groupNotifications(filteredNotifications);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
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
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Notifications
              </h1>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="px-2 py-1">
                  {pendingCount} unread
                </Badge>
              )}
            </div>
            <p className="text-xl text-muted-foreground">
              Stay updated with important alerts and reminders
            </p>
          </div>

          {pendingCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead}
              className="flex items-center gap-2"
            >
              {markingAllRead ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Marking...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Mark All Read
                </>
              )}
            </Button>
          )}
        </div>

        {/* Date Range Filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Showing:</span>
          {([
            { key: 'today', label: 'Today' },
            { key: '7', label: 'Last 7 days' },
            { key: '14', label: 'Last 14 days' },
            { key: '30', label: 'Last 30 days' }
          ] as const).map(opt => (
            <Button
              key={opt.key}
              type="button"
              variant={dateRange === opt.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Notifications List */}
      <div className="space-y-4">
        {groupedNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No notifications in the selected range
            </h3>
            <p className="text-gray-600">
              Try a wider date range.
            </p>
          </motion.div>
        ) : (
          groupedNotifications.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-4">
              {group.map((notification, index) => {
                const Icon = getNotificationIcon(notification.notification_type, notification.urgency);
                const colorClasses = getNotificationColor(notification.urgency);
                const escalationStatus = getEscalationStatus(notification);
                
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }} // Smaller delay for grouped items
                  >
                    <Card className={`transition-all duration-200 hover:shadow-md ${
                      !notification.read_status 
                        ? 'border-l-4 border-l-teal-500 shadow-sm' 
                        : 'opacity-75'
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`p-2 rounded-lg ${colorClasses}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-semibold ${
                                  !notification.read_status 
                                    ? 'text-gray-900' 
                                    : 'text-gray-600'
                                }`}>
                                  {notification.subject}
                                </h3>
                                {notification.urgency && (
                                  <Badge 
                                    variant={getUrgencyBadgeVariant(notification.urgency)}
                                    size="sm"
                                  >
                                    {notification.urgency}
                                  </Badge>
                                )}
                                {getEscalationBadge(escalationStatus)}
                                {notification.read_status && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {(notification.type === 'incident' || notification.type === 'incident_escalated') && !notification.acknowledged_at && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleAcknowledge(notification.id)}
                                    className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Acknowledge
                                  </Button>
                                )}
                                {!notification.read_status && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                                  >
                                    <Check className="h-3 w-3" />
                                    Mark as read
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <p className={`text-sm mb-3 ${
                              !notification.read_status 
                                ? 'text-gray-700' 
                                : 'text-gray-500'
                            }`}>
                              {notification.message}
                            </p>
                            
                            {escalationStatus && escalationStatus.escalated && (
                               <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-3 rounded-r">
                                 <div className="flex items-center gap-2 text-sm">
                                   <AlertTriangle className="h-4 w-4 text-orange-500" />
                                   <span className="font-medium text-orange-800">Escalated Alert</span>
                                 </div>
                                 <div className="text-xs text-orange-700 mt-1">
                                   <span>Urgency increased from <strong>{escalationStatus.from}</strong> to <strong>{escalationStatus.to}</strong></span>
                                   {escalationStatus.reason && (
                                     <span className="block mt-1">Reason: {escalationStatus.reason}</span>
                                   )}
                                 </div>
                               </div>
                             )}

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(notification.created_at)}
                              </span>
                              {notification.due_date && (
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Due: {formatDate(notification.due_date)}
                                </span>
                              )}
                              {notification.scheduled_for && (
                                <span className="flex items-center gap-1">
                                  <BellRing className="h-3 w-3" />
                                  Scheduled: {formatDate(notification.scheduled_for)}
                                </span>
                              )}
                              {notification.recipients && notification.recipients.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  {notification.recipients.length} recipient{notification.recipients.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
