'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
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
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkeletonProfile } from '@/components/ui/skeleton';

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
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
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
  }
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

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
              user={user}
              onClose={() => setSidebarOpen(false)}
              isMobile={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent 
          navigation={filteredNavigation} 
          pathname={pathname}
          user={user}
          isMobile={false}
        />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden cursor-pointer"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="h-6 w-px bg-gray-200 lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            {/* Right side */}
            <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
              {/* Notifications - hidden for super admins */}
              {user?.role !== 'super_admin' && (
                <>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/notifications')}
                    className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <Bell className="h-6 w-6" />
                  </button>

                  {/* Separator */}
                  <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />
                </>
              )}

              {/* Profile dropdown */}
              <div className="relative">
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
                          router.push('/dashboard/profile');
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
    </div>
  );
}

interface SidebarContentProps {
  navigation: NavigationItem[];
  pathname: string;
  user: { role: string; first_name: string; last_name: string; id: string };
  onClose?: () => void;
  isMobile: boolean;
}

function SidebarContent({ navigation, pathname, user, onClose, isMobile }: SidebarContentProps) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-xl">
      <div className="flex h-16 shrink-0 items-center justify-between">
        <div className="flex items-center gap-x-3">
          <div className="h-8 w-8 rounded bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">TREKA</span>
        </div>
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

      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                // Special handling for dashboard route to avoid conflicts with sub-routes
                const isActive = item.href === '/dashboard' 
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        isActive
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-gray-700 hover:text-teal-700 hover:bg-teal-50',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors cursor-pointer'
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? 'text-teal-700' : 'text-gray-400 group-hover:text-teal-700',
                          'h-6 w-6 shrink-0'
                        )}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>

          {/* User info */}
          <li className="mt-auto">
            <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-gray-900">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {user.role.replace('_', ' ')}
                </div>
              </div>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}
