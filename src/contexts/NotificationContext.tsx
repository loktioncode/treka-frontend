'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '@/services/api';
import type { Notification } from '@/types/api';
import toast from 'react-hot-toast';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  hasCriticalAlerts: boolean;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updateNotificationReadStatus: (notificationId: string, readStatus: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshNotifications = useCallback(async () => {
    // Don't make API calls if user is not authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications();
      setNotifications(response);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      // For now, we're not implementing read status, so just show success
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      // For now, we're not implementing read status, so just show success
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }, []);

  const updateNotificationReadStatus = useCallback((notificationId: string, readStatus: boolean) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read_status: readStatus }
          : notif
      )
    );
  }, []);

  // Calculate derived state
  const unreadCount = notifications.filter(n => !n.read_status).length;
  const hasCriticalAlerts = notifications.some(n => 
    !n.read_status && (n.urgency === 'critical' || n.urgency === 'OVERDUE')
  );

  // Initial load - only when authenticated
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshNotifications();
    }
  }, [refreshNotifications]);

  // Auto-refresh every 30 seconds, but only when authenticated
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return;
    }
    
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    hasCriticalAlerts,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    updateNotificationReadStatus,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
