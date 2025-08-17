'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  MarkAsRead
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

interface Notification {
  id: string;
  notification_type: 'email' | 'whatsapp' | 'MAINTENANCE';
  subject: string;
  message: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'sent' | 'failed';
  read_status?: boolean;
  created_at: string;
  scheduled_for?: string;
  due_date?: string;
  component_id?: string;
  asset_id?: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Redirect unauthorized users
  useEffect(() => {
    if (user && !['admin', 'user'].includes(user.role)) {
      toast.error('Access denied. This page is for admins and users only.');
      window.location.href = '/dashboard';
      return;
    }
  }, [user]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications();
      setNotifications(response);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, status: 'read' }
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
        prev.map(notif => ({ ...notif, status: 'read' }))
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
    if (urgency === 'critical') return AlertTriangle;
    
    switch (type) {
      case 'MAINTENANCE':
        return Clock;
      case 'email':
        return Bell;
      case 'whatsapp':
        return BellRing;
      default:
        return Info;
    }
  };

  const getNotificationColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'warning';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const pendingCount = notifications.filter(n => !n.read_status).length;

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
      </motion.div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
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
              You're all caught up! We'll notify you when there are new updates.
            </p>
          </motion.div>
        ) : (
          notifications.map((notification, index) => {
            const Icon = getNotificationIcon(notification.notification_type, notification.urgency);
            const colorClasses = getNotificationColor(notification.urgency || 'low');
            
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`transition-all duration-200 hover:shadow-md ${
                  !notification.read_status 
                    ? 'border-l-4 border-l-blue-500 shadow-sm' 
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
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
