'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationAPI } from '@/services/api';
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Redirect unauthorized users (run only once user is known)
  useEffect(() => {
    if (isLoading) return;
    if (!user) return; // middleware guards unauthenticated; wait until user populated
    if (!['admin', 'user', 'super_admin'].includes(user.role)) {
      toast.error('Access denied. This page is for admins and users only.');
      window.location.href = '/dashboard';
    }
  }, [user, isLoading]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications();
      setNotifications(response);
    } catch (error) {
      console.error('Error loading notifications:', error);
      const axiosError = error as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      const status = axiosError.response?.status;
      const detail = axiosError.response?.data?.detail || axiosError.message || 'Unknown error';
      toast.error(`Failed to load notifications${status ? ` (${status})` : ''}: ${detail}`);
      // If unauthorized, redirect to login (in case interceptor didn't yet)
      if (status === 401) {
        window.location.href = '/login?expired=true';
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notifications only after user is ready
  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    loadNotifications();
  }, [isLoading, user, loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read_status: true }
            : notif
        )
      );
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      await notificationAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read_status: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    } finally {
      setMarkingAllRead(false);
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

  const getEscalationBadge = (escalationStatus: any) => {
    if (!escalationStatus || !escalationStatus.escalated) return null;
    
    return (
      <Badge variant="destructive" size="sm" className="ml-2">
        ESCALATED
      </Badge>
    );
  };

  const pendingCount = notifications.filter(n => !n.read_status).length;
  const groupedNotifications = groupNotifications(notifications);

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
          <Button
            onClick={async () => {
              try {
                await notificationAPI.createTestNotification();
                toast.success('Test notification created!');
                loadNotifications(); // Reload notifications
              } catch (error) {
                console.error('Error creating test notification:', error);
                toast.error('Failed to create test notification');
              }
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Create Test
          </Button>
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
              No notifications yet
            </h3>
            <p className="text-gray-600">
              You&apos;re all caught up! We&apos;ll notify you when there are new updates.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Notifications will appear here for:</p>
              <ul className="mt-2 space-y-1">
                <li>• Maintenance due dates</li>
                <li>• Component alerts</li>
                <li>• System updates</li>
              </ul>
            </div>
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
