'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, userAPI, resetAuthRedirectFlag } from '@/services/api';
import { useIsClient } from '@/hooks/useIsClient';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'user' | 'technician' | 'driver';
  client_id?: string;
  is_active: boolean;
  notification_preferences?: {
    email: boolean;
  };
  map_center?: { lat: number; lon: number };
  country?: string;
  city?: string;
}

interface LoginResponse {
  access_token?: string;
  token_type?: string;
  user_id: string;
  role?: 'super_admin' | 'admin' | 'user' | 'technician' | 'driver';
  expires_in?: number;
  /** Backend: first-time login — user must enter email OTP (no token yet). */
  require_otp?: boolean;
  is_first_login?: boolean;
  require_password_change?: boolean;
  reset_token?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  /** Persist JWT from verify-login-otp when backend returns access_token (e.g. non–first-login OTP path). */
  completeSessionWithToken: (accessToken: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  loadUser: () => Promise<User>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      try {
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed?.id && parsed?.email ? parsed : null;
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  });
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
      setUser(userData);
      // Persist user to localStorage for instant load on next visit (keep user logged in)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {
          // Ignore quota/private mode errors
        }
      }
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

  // Listen for 401 from API interceptor - soft redirect without full reload
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      resetAuthRedirectFlag();
      router.push('/login?expired=true');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [router]);

  useEffect(() => {
    const initAuth = async () => {
      // Only run on client side to prevent hydration issues
      if (!isClient) {
        return;
      }

      try {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          // Restore user from localStorage for instant display (keep user logged in)
          try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              const parsed = JSON.parse(storedUser) as User;
              if (parsed?.id && parsed?.email) setUser(parsed);
            }
          } catch {
            // Ignore parse errors
          }
          // Verify token is still valid and refresh user
          try {
            setToken(storedToken);
            const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
            document.cookie = `auth_token=${storedToken}; path=/; ${isSecure ? 'secure;' : ''} samesite=strict`;
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

  const completeSessionWithToken = useCallback(async (accessToken: string) => {
    if (!accessToken) {
      throw new Error('No access token received');
    }
    setToken(accessToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', accessToken);
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `auth_token=${accessToken}; path=/; ${isSecure ? 'secure;' : ''} samesite=strict`;
    }
    await loadUser();
    resetAuthRedirectFlag();
  }, [loadUser]);

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

      // First-time login: backend sends OTP to email — no token until verify-login-otp
      if (response.require_otp === true) {
        setIsLoading(false);
        return response;
      }

      // Unlikely on /login, but handle if API ever returns this without OTP step
      if (response.require_password_change) {
        setIsLoading(false);
        return response;
      }

      const accessToken =
        response.access_token ??
        (response as { accessToken?: string }).accessToken;
      if (!accessToken) {
        setIsLoading(false);
        throw new Error('No access token received');
      }

      await completeSessionWithToken(accessToken);

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

    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.push('/login');
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
        completeSessionWithToken,
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