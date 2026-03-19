'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { userAPI, notificationGroupsAPI, clientAPI } from '@/services/api';
import type { NotificationGroup, User } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { searchPlaces, type GeocodingResult } from '@/lib/mapbox-geocoding';
import { RoleBadge, StatusBadge } from '@/components/ui/badge';
import { 
  Form, 
  FormField, 
  FormLabel, 
  FormSection, 
  FormGrid, 
  Checkbox 
} from '@/components/ui/form';
import { 
  User as UserIcon, 
  Mail, 
  Save,
  Edit,
  X,
  MessageSquare,
  Calendar,
  Building,
  Building2,
  Globe,
  Database,
  LogOut,
  MapPin,
  Bell,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Wrench,
  UserCheck,
  Crown,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';


type ProfileTab = 'profile' | 'notification-settings';

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  workshop: Wrench,
  supervisor: UserCheck,
  management: Building2,
  exco: Crown,
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  workshop: "Mechanics, technicians – first to receive maintenance & service alerts",
  supervisor: "Supervisors – escalated when workshop doesn't respond",
  management: "Management – escalated when supervisor doesn't respond",
  exco: "Executive – final escalation level",
};

const ESCALATION_HOURS_OPTIONS = [
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
] as const;

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  notification_preferences: {
    email: boolean;
  };
  currency: string;
  map_center?: { lat: number; lon: number };
  country?: string;
  city?: string;
}

export default function ProfilePage() {
  const { user, loadUser, logout } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [clientUsers, setClientUsers] = useState<User[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [updatingEscalation, setUpdatingEscalation] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    email: '',
    notification_preferences: {
      email: true
    },
    currency: 'ZAR'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState<GeocodingResult[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const searchCities = useCallback(async (q: string) => {
    if (!MAPBOX_TOKEN || !q.trim()) {
      setCityResults([]);
      return;
    }
    setCitySearching(true);
    try {
      const results = await searchPlaces(q, MAPBOX_TOKEN, 6);
      setCityResults(results);
    } finally {
      setCitySearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchCities(citySearch), 300);
    return () => clearTimeout(t);
  }, [citySearch, searchCities]);

  // Sync active tab from URL
  useEffect(() => {
    const t = searchParams?.get('tab');
    if (t === 'notification-settings' && user?.role === 'admin') {
      setActiveTab('notification-settings');
    } else if (t !== 'notification-settings') {
      setActiveTab('profile');
    }
  }, [searchParams, user?.role]);

  // Load notification groups when on that tab (admin only)
  const loadNotificationGroups = useCallback(async () => {
    if (!user?.client_id || user?.role !== 'admin') return;
    try {
      setGroupsLoading(true);
      const [groupsData, usersData] = await Promise.all([
        notificationGroupsAPI.getGroups(),
        clientAPI.getClientUsers(user.client_id, { limit: 200 }),
      ]);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      const users = Array.isArray(usersData) ? usersData : usersData?.items || [];
      setClientUsers(users);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notification settings');
    } finally {
      setGroupsLoading(false);
    }
  }, [user?.client_id, user?.role]);

  useEffect(() => {
    if (activeTab === 'notification-settings' && user?.role === 'admin') {
      loadNotificationGroups();
    }
  }, [activeTab, user?.role, loadNotificationGroups]);

  const handleAddUserToGroup = async (groupId: string, userId: string) => {
    try {
      setAddingToGroup(groupId);
      await notificationGroupsAPI.addUserToGroup(groupId, userId);
      toast.success('User added to group');
      loadNotificationGroups();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null;
      toast.error(msg || 'Failed to add user');
    } finally {
      setAddingToGroup(null);
    }
  };

  const handleRemoveUserFromGroup = async (groupId: string, userId: string) => {
    try {
      await notificationGroupsAPI.removeUserFromGroup(groupId, userId);
      toast.success('User removed from group');
      loadNotificationGroups();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null;
      toast.error(msg || 'Failed to remove user');
    }
  };

  const handleEscalationHoursChange = async (groupId: string, hours: number) => {
    try {
      setUpdatingEscalation(groupId);
      await notificationGroupsAPI.updateGroup(groupId, { escalation_hours: hours });
      toast.success('Escalation hours updated');
      loadNotificationGroups();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null;
      toast.error(msg || 'Failed to update escalation hours');
    } finally {
      setUpdatingEscalation(null);
    }
  };

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        notification_preferences: {
          email: user.notification_preferences?.email ?? true
        },
        currency: 'ZAR',
        map_center: user.map_center,
        country: user.country,
        city: user.city,
      });
      if (user.map_center && (user.city || user.country)) {
        setCitySearch([user.city, user.country].filter(Boolean).join(', '));
      } else {
        setCitySearch('');
      }
    }
  }, [user]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'notification_preferences') {
        setFormData(prev => ({
          ...prev,
          notification_preferences: {
            ...prev.notification_preferences,
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        notification_preferences: formData.notification_preferences,
      };
      if (formData.map_center) {
        payload.map_center = formData.map_center;
        payload.country = formData.country;
        payload.city = formData.city;
      }
      await userAPI.updateUser(user.id, payload);
      
      toast.success('Profile updated successfully!');
      setEditing(false);
      
      // Reload user data to get updated info
      await loadUser();
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      
      // Handle the case where update endpoint is not implemented
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('not yet implemented')) {
        toast.error('Profile update functionality is not yet available. Please contact support.');
      } else {
        toast.error('Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        notification_preferences: {
          email: user.notification_preferences?.email ?? true
        },
        currency: 'ZAR',
        map_center: user.map_center,
        country: user.country,
        city: user.city,
      });
    }
    setFormErrors({});
    setEditing(false);
  };

  const handleSelectCity = (result: GeocodingResult) => {
    setFormData(prev => ({
      ...prev,
      map_center: { lat: result.lat, lon: result.lon },
      city: result.name,
      country: result.country,
    }));
    setCitySearch(result.placeFormatted || `${result.name}${result.country ? `, ${result.country}` : ''}`);
    setShowCityDropdown(false);
  };

  const handleClearMapLocation = () => {
    setFormData(prev => ({
      ...prev,
      map_center: undefined,
      country: undefined,
      city: undefined,
    }));
    setCitySearch('');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Profile</h3>
          <p className="text-gray-600">Please wait while we load your profile information...</p>
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
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              My Profile
            </h1>
            <p className="text-xl text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
          <div className="flex items-center gap-3">
            {editing ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'profile'
              ? 'border-teal-500 text-teal-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserIcon className="h-4 w-4" />
          Profile
        </button>
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setActiveTab('notification-settings')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'notification-settings'
                ? 'border-teal-500 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Bell className="h-4 w-4" />
            Notification Settings
          </button>
        )}
      </div>

      {activeTab === 'notification-settings' ? (
        /* Notification Settings tab - client admin only */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Escalation Groups
            </CardTitle>
            <CardDescription>
              Alerts are sent to the first non-empty group (workshop → supervisor → management → exco).
              Changes save automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              groups.map((group) => {
                const Icon = GROUP_ICONS[group.group_type] || UserIcon;
                const isExpanded = expandedGroup === group.id;
                const members = clientUsers.filter((u) => group.user_ids.includes(u.id));
                const availableUsers = clientUsers.filter((u) => !group.user_ids.includes(u.id));

                return (
                  <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-100">
                          <Icon className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{group.name}</p>
                          <p className="text-xs text-gray-500">{GROUP_DESCRIPTIONS[group.group_type]}</p>
                        </div>
                        <Badge variant="secondary">
                          {group.user_ids.length} member{group.user_ids.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                    </button>
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 space-y-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Info className="h-4 w-4" />
                          Add or remove users. Escalation hours: time before alert escalates to next group if not acknowledged.
                        </div>
                        <div className="flex items-center gap-3">
                          <label htmlFor={`escalation-${group.id}`} className="text-sm font-medium text-gray-700 shrink-0">
                            Escalation hours
                          </label>
                          <select
                            id={`escalation-${group.id}`}
                            value={group.escalation_hours ?? 24}
                            onChange={(e) => handleEscalationHoursChange(group.id, Number(e.target.value))}
                            disabled={updatingEscalation === group.id}
                            className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                          >
                            {ESCALATION_HOURS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {updatingEscalation === group.id && (
                            <span className="text-xs text-gray-500">Saving...</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-3">Members</p>
                          {members.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No members. Add users below.</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                              {members.map((u) => (
                                <div
                                  key={u.id}
                                  className="relative flex flex-col items-center p-3 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-teal-200 transition-all group"
                                >
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-2 shrink-0">
                                    <UserIcon className="h-5 w-5 text-white" />
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 truncate w-full text-center" title={`${u.first_name} ${u.last_name}`}>
                                    {u.first_name} {u.last_name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate w-full text-center mb-1.5" title={u.email}>
                                    {u.email}
                                  </p>
                                  <RoleBadge role={u.role} size="sm" className="mb-2" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2 h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveUserFromGroup(group.id, u.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {availableUsers.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Add user</p>
                            <div className="flex flex-wrap gap-2">
                              {availableUsers.map((u) => (
                                <Button
                                  key={u.id}
                                  variant="outline"
                                  size="sm"
                                  disabled={addingToGroup === group.id}
                                  onClick={() => handleAddUserToGroup(group.id, u.id)}
                                  className="flex items-center gap-2"
                                >
                                  <Plus className="h-4 w-4" />
                                  {u.first_name} {u.last_name}
                                  <RoleBadge role={u.role} size="sm" />
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center mb-4">
                  <UserIcon className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {user.first_name} {user.last_name}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              </div>

              {/* Role & Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Role</span>
                  <RoleBadge role={user.role} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <StatusBadge 
                    status={user.is_active ? 'active' : 'inactive'} 
                    size="sm"
                  />
                </div>
                {user.client_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Organization</span>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Building className="h-3 w-3" />
                      Client ID: {user.client_id.slice(-8)}
                    </div>
                  </div>
                )}
              </div>

              {/* Account Info */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>Account Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form errors={{}} touched={{}} isSubmitting={false}>
                <FormSection title="Personal Information">
                  <FormGrid cols={2}>
                    <FormField name="first_name">
                      <FormLabel htmlFor="first_name" required>First Name</FormLabel>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        disabled={!editing}

                        placeholder="Enter your first name"
                      />
                    </FormField>

                    <FormField name="last_name">
                      <FormLabel htmlFor="last_name" required>Last Name</FormLabel>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        disabled={!editing}

                        placeholder="Enter your last name"
                      />
                    </FormField>
                  </FormGrid>

                  <FormField name="email">
                    <FormLabel htmlFor="email" required>Email Address</FormLabel>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!editing}
                      
                      placeholder="Enter your email address"
                    />
                  </FormField>
                </FormSection>

                <FormSection title="Notification Preferences">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-teal-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">Email Notifications</h4>
                          <p className="text-sm text-gray-500">
                            Receive important updates and alerts via email
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        label=""
                        checked={formData.notification_preferences.email}
                        onChange={(e) => handleInputChange('notification_preferences.email', e.target.checked)}
                        disabled={!editing}
                      />
                    </div>

                  </div>
                </FormSection>

                <FormSection title="Currency Settings">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                      <select 
                        value={formData.currency}
                        onChange={(e) => handleInputChange('currency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        disabled={!editing}
                      >
                        <option value="ZAR">🇿🇦 South African Rand (ZAR)</option>
                        <option value="USD">🇺🇸 US Dollar (USD)</option>
                        <option value="EUR">🇪🇺 Euro (EUR)</option>
                        <option value="GBP">🇬🇧 British Pound (GBP)</option>
                        <option value="KES">🇰🇪 Kenyan Shilling (KES)</option>
                        <option value="NGN">🇳🇬 Nigerian Naira (NGN)</option>
                        <option value="GHS">🇬🇭 Ghanaian Cedi (GHS)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        This currency will be used for displaying earnings, costs, and financial data throughout the application.
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900">Currency Display</h4>
                          <p className="text-xs text-blue-700">
                            All financial amounts will be displayed in your selected currency. 
                            Historical data will maintain their original currency values.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Integration Settings">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Globe className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">API Integration</h4>
                          <p className="text-sm text-gray-500">
                            Connect external services and manage API keys
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!editing}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        Configure
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Database className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Database Connections</h4>
                          <p className="text-sm text-gray-500">
                            Manage database connections and configurations
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!editing}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Map Location">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Set your country and city to center all maps across the app. Defaults to Johannesburg if not set.
                    </p>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country & City</label>
                      <Input
                        value={citySearch || (formData.map_center ? `${formData.city || ''}${formData.country ? `, ${formData.country}` : ''}`.trim() : '')}
                        onChange={(e) => setCitySearch(e.target.value)}
                        onFocus={() => setShowCityDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                        placeholder="Search for your city (e.g. Johannesburg, Nairobi)"
                        disabled={!editing}
                        className="pr-20"
                      />
                      {formData.map_center && editing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleClearMapLocation}
                          className="absolute right-2 top-9 text-xs text-gray-500"
                        >
                          Clear
                        </Button>
                      )}
                      {showCityDropdown && editing && (citySearch.trim() || cityResults.length > 0) && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                          {citySearching ? (
                            <div className="p-3 text-sm text-gray-500">Searching...</div>
                          ) : cityResults.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500">No results</div>
                          ) : (
                            cityResults.map((r, i) => (
                              <button
                                key={i}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex flex-col"
                                onMouseDown={(e) => { e.preventDefault(); handleSelectCity(r); }}
                              >
                                <span className="font-medium">{r.name}</span>
                                {r.placeFormatted && (
                                  <span className="text-xs text-gray-500">{r.placeFormatted}</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {formData.map_center && (
                      <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 px-3 py-2 rounded-lg">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {formData.city}{formData.country ? `, ${formData.country}` : ''}
                          {' '}({formData.map_center.lat.toFixed(4)}, {formData.map_center.lon.toFixed(4)})
                        </span>
                      </div>
                    )}
                  </div>
                </FormSection>

                <FormSection title="Regional Settings">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        disabled={!editing}
                      >
                        <option value="Africa/Harare">Africa/Harare (UTC+2)</option>
                        <option value="Africa/Johannesburg">Africa/Johannesburg (UTC+2)</option>
                        <option value="Africa/Lagos">Africa/Lagos (UTC+1)</option>
                        <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
                        <option value="America/New_York">America/New_York (UTC-5)</option>
                        <option value="Europe/London">Europe/London (UTC+0)</option>
                        <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        disabled={!editing}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (European)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                      </select>
                    </div>
                  </div>
                </FormSection>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Logout Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="pt-8 border-t border-gray-200"
      >
        <Card className="border-red-100 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-red-900">Sign Out</h4>
                  <p className="text-sm text-red-700">
                    Sign out of your account. You will need to sign in again to access the application.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                className="bg-teal-800 hover:bg-teal-900 text-white px-6 py-3 text-base font-medium"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <LogOut className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Confirm Sign Out</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to sign out? You will need to sign in again to access the application.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmLogout}
                className="bg-teal-800 hover:bg-teal-900 text-white px-4 py-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
