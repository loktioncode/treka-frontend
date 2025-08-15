'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, userAPI } from '@/services/api';

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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Function to load user data
  const loadUser = async (authToken: string) => {
    try {
      const userData = await userAPI.getCurrentUser();
      if (userData.role !== 'super_admin' && userData.role !== 'admin') {
        throw new Error('Unauthorized access');
      }
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error loading user:', error);
      logout();
      throw error;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          setToken(storedToken);
          await loadUser(storedToken);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

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
      localStorage.setItem('auth_token', accessToken);
      
      // Load the full user data from /users/me endpoint
      await loadUser(accessToken);
      
      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Invalid credentials');
      } else if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('An error occurred during login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
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