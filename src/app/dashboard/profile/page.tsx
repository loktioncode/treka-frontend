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
  Settings, 
  Save,
  Edit,
  X,
  MessageSquare,
  Calendar,
  Building
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
}

export default function ProfilePage() {
  const { user, loadUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    email: '',
    notification_preferences: {
      email: true,
      whatsapp: false
    }
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
        }
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
        }
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
                <Settings className="h-5 w-5" />
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
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
