'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  User, 
  Mail, 
  Save,
  Edit,
  X,
  MessageSquare,
  Calendar,
  Building,
  Globe,
  Database,
  LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';


interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  notification_preferences: {
    email: boolean;
    whatsapp: boolean;
  };
  currency: string;
}

export default function ProfilePage() {
  const { user, loadUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    email: '',
    notification_preferences: {
      email: true,
      whatsapp: false
    },
    currency: 'ZAR'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        notification_preferences: {
          email: user.notification_preferences?.email ?? true,
          whatsapp: user.notification_preferences?.whatsapp ?? false
        },
        currency: 'ZAR' // Default currency, can be updated later
      });
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
      // Note: The backend updateUser endpoint is not implemented yet
      // For now, we'll show a success message and reset form
      await userAPI.updateUser(user.id, formData);
      
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
    // Reset form data to original user data
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        notification_preferences: {
          email: user.notification_preferences?.email ?? true,
          whatsapp: user.notification_preferences?.whatsapp ?? false
        },
        currency: 'ZAR'
      });
    }
    setFormErrors({});
    setEditing(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                <User className="h-5 w-5" />
                Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center mb-4">
                  <User className="h-12 w-12 text-white" />
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
                <User className="h-5 w-5" />
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

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">WhatsApp Notifications</h4>
                          <p className="text-sm text-gray-500">
                            Get instant alerts and updates on WhatsApp
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        label=""
                        checked={formData.notification_preferences.whatsapp}
                        onChange={(e) => handleInputChange('notification_preferences.whatsapp', e.target.checked)}
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
    </div>
  );
}
