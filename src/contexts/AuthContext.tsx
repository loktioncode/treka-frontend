'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, userAPI } from '@/services/api';
import { useIsClient } from '@/hooks/useIsClient';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'user';
  client_id?: string;
  is_active: boolean;
  notification_preferences?: {
    email: boolean;
    whatsapp: boolean;
  };
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'user';
  expires_in: number;
  require_password_change?: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  loadUser: () => Promise<User>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const isClient = useIsClient();

  // Set initial loading to false on SSR, true on client until hydration
  useEffect(() => {
    if (!isClient) {
      setIsLoading(false);
    }
  }, [isClient]);

  // Function to load user data
  const loadUser = useCallback(async () => {
    try {
      const userData = await userAPI.getCurrentUser();
      if (userData.role !== 'super_admin' && userData.role !== 'admin') {
        throw new Error('Unauthorized access');
      }
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error loading user:', error);
      // Clear all auth state
      setToken(null);
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      throw error;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // Only run on client side to prevent hydration issues
      if (!isClient) {
        return;
      }
      
      try {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          // Verify token is still valid
          try {
            setToken(storedToken);
            // Ensure cookie is also set for middleware
            document.cookie = `auth_token=${storedToken}; path=/; secure; samesite=strict`;
            await loadUser();
          } catch (error) {
            // Token is invalid, clear it
            console.error('Stored token is invalid:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [loadUser, isClient]);

  // Set up token refresh interval
  useEffect(() => {
    if (token) {
      // Refresh token every 25 minutes (before 30-minute expiry)
      const refreshInterval = setInterval(async () => {
        try {
          await loadUser();
        } catch (error) {
          console.error('Token refresh failed:', error);
          logout();
        }
      }, 25 * 60 * 1000);

      return () => clearInterval(refreshInterval);
    }
  }, [token, loadUser]);

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(email, password);
      
      // Check if we got a first login response
      if (response.require_password_change) {
        return response;
      }

      // Store the access token
      const accessToken = response.access_token;
      if (!accessToken) {
        throw new Error('No access token received');
      }
      
      setToken(accessToken);
      
      // Only manipulate client-side APIs if we're on the client
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', accessToken);
        // Also set cookie for middleware detection
        document.cookie = `auth_token=${accessToken}; path=/; secure; samesite=strict`;
      }
      
      // Load the full user data from /users/me endpoint
      await loadUser();
      
      return response;
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { detail?: string } } };
        if (axiosError.response?.status === 401) {
          throw new Error('Invalid credentials');
        } else if (axiosError.response?.data?.detail) {
          throw new Error(axiosError.response.data.detail);
        }
      }
      
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      
      throw new Error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    
    // Only manipulate client-side APIs if we're on the client
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Clear the cookie as well
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await authAPI.forgotPassword(email);
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      await authAPI.resetPassword(token, password);
      router.push('/login?reset=success');
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        login, 
        logout, 
        forgotPassword, 
        resetPassword, 
        loadUser,
        isLoading 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 