'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Users,
  Building2,
  Package,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  User,
  BarChart3,
  Wrench,
  Home,
  ChevronDown,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkeletonProfile } from '@/components/ui/skeleton';
import { SmartLink } from '@/components/SmartLink';
import { useNavigation } from '@/contexts/NavigationContext';
import { useRoutePrefetch } from '@/hooks/useRoutePrefetch';
import { Tooltip } from '@/components/ui/tooltip';
import { notificationAPI } from '@/services/api';
import { Notification } from '@/types/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('super_admin' | 'admin' | 'user')[];
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['super_admin', 'admin', 'user']
  },
  {
    name: 'Clients',
    href: '/dashboard/clients',
    icon: Building2,
    roles: ['super_admin']
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    icon: Users,
    roles: ['super_admin', 'admin']
  },
  {
    name: 'Assets',
    href: '/dashboard/assets',
    icon: Package,
    roles: ['admin', 'user']
  },
  {
    name: 'Components',
    href: '/dashboard/components',
    icon: Wrench,
    roles: ['admin', 'user']
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    roles: ['admin']
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['admin']
  },
  {
    name: 'Audit',
    href: '/dashboard/audit',
    icon: FileText,
    roles: ['super_admin']
  }
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { navigateTo } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Initialize from localStorage if available, default to collapsed
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });
  
  // Notification state
  const [notificationCount, setNotificationCount] = useState(0);
  const [hasCriticalAlerts, setHasCriticalAlerts] = useState(false);
  
  // Enable automatic route prefetching
  useRoutePrefetch();

  // Handle sidebar collapse toggle with persistence
  const handleSidebarToggle = useCallback(() => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
    }
  }, [sidebarCollapsed]);

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Fetch notification count and check for critical alerts
  useEffect(() => {
    if (user) {
      const fetchNotificationCount = async () => {
        try {
          const notifications = await notificationAPI.getNotifications();
          const unreadCount = notifications.filter((n: Notification) => !n.read_status).length;
          const criticalAlerts = notifications.some((n: Notification) => 
            !n.read_status && (n.urgency === 'critical' || n.urgency === 'OVERDUE')
          );
          
          setNotificationCount(unreadCount);
          setHasCriticalAlerts(criticalAlerts);
        } catch (error) {
          console.error('Failed to fetch notification count:', error);
        }
      };
      
      fetchNotificationCount();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
  };

  // Show loading skeleton while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-4">
          <SkeletonProfile />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if no user
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:hidden"
          >
                    <SidebarContent 
          navigation={filteredNavigation} 
          pathname={pathname}
          onClose={() => setSidebarOpen(false)}
          isMobile={true}
          onLogout={handleLogout}
        />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`} style={{ overflow: 'visible', zIndex: 50 }}>
        <SidebarContent 
          navigation={filteredNavigation} 
          pathname={pathname}
          isMobile={false}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleSidebarToggle}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      }`}>
        {/* Top navigation */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Tooltip content="Open menu" position="bottom">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden cursor-pointer"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </Tooltip>

          <div className="h-6 w-px bg-gray-200 lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            {/* Right side */}
            <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
              {/* Notifications */}
              <Tooltip content="Notifications" position="bottom">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/notifications')}
                  className="relative -m-2.5 p-2.5 text-gray-400 hover:text-gray-500 cursor-pointer"
                >
                  <Bell className="h-6 w-6" />
                  {/* Notification count badge */}
                  {notificationCount > 0 && (
                    <span className={cn(
                      "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium text-white",
                      hasCriticalAlerts ? "bg-red-500" : "bg-teal-700"
                    )}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </button>
              </Tooltip>

              {/* Separator */}
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

              {/* Profile dropdown */}
              <div className="relative">
                <Tooltip content="Profile menu" position="bottom">
                  <button
                    type="button"
                    className="flex items-center gap-x-2 rounded-full bg-gray-50 p-1.5 text-sm leading-6 text-gray-900 hover:bg-gray-100 cursor-pointer"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="hidden lg:flex lg:items-center">
                      <span className="ml-2 text-sm font-semibold leading-6 text-gray-900">
                        {user.first_name} {user.last_name}
                      </span>
                      <ChevronDown className="ml-2 h-5 w-5 text-gray-400" />
                    </span>
                  </button>
                </Tooltip>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5"
                    >
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigateTo('/dashboard/profile');
                        }}
                        className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <User className="mr-3 h-4 w-4" />
                        Your Profile
                      </button>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Chat Button - will be implemented by individual pages */}
    </div>
  );
}

interface SidebarContentProps {
  navigation: NavigationItem[];
  pathname: string;
  onClose?: () => void;
  isMobile: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout: () => void;
}

function SidebarContent({ navigation, pathname, onClose, isMobile, collapsed = false, onToggleCollapse, onLogout }: SidebarContentProps) {
  return (
    <div className={cn(
      "flex grow flex-col gap-y-5 overflow-y-auto bg-white pb-4 shadow-xl",
      collapsed ? "px-2" : "px-6"
    )} style={{ overflow: 'visible' }}>
      {/* Ensure no horizontal overflow when collapsed */}
      <div className={cn(
        "min-w-0 relative",
        collapsed ? "w-12" : "w-full"
      )} style={{ overflow: 'visible' }}>
        <div className="flex h-16 shrink-0 items-center justify-between">
          <div className="flex items-center gap-x-3">
          {collapsed ? (
            <SmartLink href="/dashboard" className="flex items-center justify-center hover:opacity-80 transition-opacity w-8 h-8">
              <div className="h-8 w-8 rounded bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </SmartLink>
          ) : (
            <SmartLink href="/dashboard" className="flex items-center gap-x-3 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 rounded bg-gradient-to-r from-teal-700 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TREKA</span>
            </SmartLink>
          )}
        </div>
        <div className="flex items-center gap-2" style={{ overflow: 'visible' }}>
          {!isMobile && onToggleCollapse && (
            collapsed ? (
              <button
                type="button"
                className="rounded-md hover:bg-gray-100 cursor-pointer transition-colors p-1.5 w-8 h-8"
                onClick={onToggleCollapse}
              >
                <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200 rotate-180" />
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md hover:bg-gray-100 cursor-pointer transition-colors p-1"
                onClick={onToggleCollapse}
                title="Collapse sidebar"
              >
                <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200" />
              </button>
            )
          )}
          {isMobile && (
            <button
              type="button"
              className="-m-2.5 p-2.5 cursor-pointer"
              onClick={onClose}
            >
              <X className="h-6 w-6 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex flex-1 flex-col" style={{ overflow: 'visible' }}>
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className={cn(
              "space-y-1",
              collapsed ? "" : "-mx-2"
            )} style={{ overflow: 'visible' }}>
              {navigation.map((item) => {
                // Special handling for dashboard route to avoid conflicts with sub-routes
                const isActive = item.href === '/dashboard' 
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                
                const navigationItem = (
                  <SmartLink
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-700 hover:text-teal-700 hover:bg-teal-50',
                      'group flex gap-x-3 rounded-md text-sm leading-6 font-semibold transition-colors cursor-pointer',
                      collapsed ? 'justify-center p-1.5 w-10 h-10' : 'p-2'
                    )}
                    variant="default"
                  >
                    <item.icon
                      className={cn(
                        isActive ? 'text-teal-700' : 'text-gray-400 group-hover:text-teal-700',
                        'h-6 w-6 shrink-0'
                      )}
                    />
                    {!collapsed && item.name}
                  </SmartLink>
                );

                return (
                  <li key={item.name} style={{ overflow: 'visible' }}>
                    {collapsed ? (
                      <Tooltip content={item.name} position="right">
                        {navigationItem}
                      </Tooltip>
                    ) : (
                      navigationItem
                    )}
                  </li>
                );
              })}
            </ul>
          </li>

          {/* User info */}
          <li className="mt-auto" style={{ overflow: 'visible' }}>
            {collapsed ? (
              <Tooltip content="Logout" position="right">
                <button
                  onClick={onLogout}
                  className="flex items-center justify-center py-3 px-1 w-10 h-10 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <LogOut className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              </Tooltip>
            ) : (
              <button
                onClick={onLogout}
                className="flex items-center py-3 px-2 gap-x-4 w-full rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <LogOut className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Logout</span>
              </button>
            )}
          </li>
        </ul>
      </nav>
      </div> {/* Close the wrapper div */}
    </div>
  );
}
