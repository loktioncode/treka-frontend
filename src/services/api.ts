import axios from 'axios';
import toast from 'react-hot-toast';
import type {
  User,
  Client,
  Asset,
  Component,
  Notification,
  CreateUserRequest,
  CreateAdminRequest,
  CreateClientRequest,
  CreateAssetRequest,
  CreateComponentRequest,
  CreateMaintenanceLogRequest,
  LoginResponse as ApiLoginResponse,
  PaginatedResponse,
  AssetFilters,
  ComponentFilters,
  UserFilters,
  PaginationParams
} from '@/types/api';

// API is running on port 8000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for CORS with credentials
});

// Add a request interceptor to add the auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Show toast notification
      toast.error('Session expired. Please log in again.');
      
      // Clear auth state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Add a small delay to ensure the toast is visible before redirect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to login with expired parameter
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  }
);

interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'user';
  expires_in: number;
  require_password_change?: boolean;
  message?: string;
}

// Auth API endpoints
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // Create form data for OAuth2 password flow
    const formData = new URLSearchParams();
    formData.append('username', email);  // OAuth2 expects 'username' field
    formData.append('password', password);
    formData.append('grant_type', 'password');  // Required for OAuth2 password flow

    const response = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyResetCode: async (email: string, code: string) => {
    const response = await api.post('/auth/verify-reset-code', { email, code });
    return response.data;
  },

  resetPassword: async (token: string, new_password: string) => {
    const response = await api.post('/auth/reset-password', { 
      token,
      new_password 
    });
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
};

export const userAPI = {
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  createUser: async (userData: CreateUserRequest) => {
    const response = await api.post('/auth/users', userData);
    return response.data;
  },

  createAdmin: async (userData: CreateAdminRequest) => {
    const response = await api.post('/auth/register-admin', userData);
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/auth/users/${userId}`);
    return response.data;
  },

  toggleUserActivation: async (userId: string, activate: boolean) => {
    const response = await api.post(`/auth/users/${userId}/activate`, { activate });
    return response.data;
  },

  // For Super Admin - get all users across the system
  getAllUsers: async (params: UserFilters = {}) => {
    const response = await api.get('/auth/list-all-users', { params });
    return response.data;
  }
};

// Client API endpoints
export const clientAPI = {
  getClients: async (params: PaginationParams = {}) => {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  getClient: async (clientId: string) => {
    const response = await api.get(`/clients/${clientId}`);
    return response.data;
  },

  createClient: async (clientData: CreateClientRequest) => {
    const response = await api.post('/clients', clientData);
    return response.data;
  },

  updateClient: async (clientId: string, clientData: Partial<CreateClientRequest>) => {
    const response = await api.put(`/clients/${clientId}`, clientData);
    return response.data;
  },

  deleteClient: async (clientId: string) => {
    const response = await api.delete(`/clients/${clientId}`);
    return response.data;
  },

  // Get users for a specific client
  getClientUsers: async (clientId: string, params: UserFilters = {}) => {
    const response = await api.get(`/clients/${clientId}/users`, { params });
    return response.data;
  },

  // Create user for a specific client
  createClientUser: async (clientId: string, userData: CreateUserRequest) => {
    const response = await api.post(`/clients/${clientId}/users`, userData);
    return response.data;
  }
};

// Asset API endpoints
export const assetAPI = {
  getAssets: async (params: AssetFilters = {}) => {
    const response = await api.get('/assets', { params });
    return response.data;
  },

  getAsset: async (assetId: string) => {
    const response = await api.get(`/assets/${assetId}`);
    return response.data;
  },

  createAsset: async (assetData: CreateAssetRequest, images?: File[]) => {
    const formData = new FormData();
    
    // Add asset data
    Object.keys(assetData).forEach(key => {
      const value = (assetData as any)[key];
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    // Add images
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        formData.append('images', image);
      });
    }

    const response = await api.post('/assets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateAsset: async (assetId: string, assetData: Partial<CreateAssetRequest>, images?: File[]) => {
    const formData = new FormData();
    
    // Add asset data
    Object.keys(assetData).forEach(key => {
      const value = (assetData as any)[key];
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    // Add images
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        formData.append('images', image);
      });
    }

    const response = await api.put(`/assets/${assetId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteAsset: async (assetId: string) => {
    const response = await api.delete(`/assets/${assetId}`);
    return response.data;
  }
};

// Component API endpoints
export const componentAPI = {
  getComponents: async (params: ComponentFilters = {}) => {
    const response = await api.get('/components', { params });
    return response.data;
  },

  getComponent: async (componentId: string) => {
    const response = await api.get(`/components/${componentId}`);
    return response.data;
  },

  createComponent: async (componentData: CreateComponentRequest) => {
    const response = await api.post('/components', componentData);
    return response.data;
  },

  updateComponent: async (componentId: string, componentData: Partial<CreateComponentRequest>) => {
    const response = await api.put(`/components/${componentId}`, componentData);
    return response.data;
  },

  deleteComponent: async (componentId: string) => {
    const response = await api.delete(`/components/${componentId}`);
    return response.data;
  },

  // Maintenance logs
  getMaintenanceLogs: async (componentId: string, params: PaginationParams = {}) => {
    const response = await api.get(`/components/${componentId}/maintenance`, { params });
    return response.data;
  },

  createMaintenanceLog: async (componentId: string, logData: CreateMaintenanceLogRequest) => {
    const response = await api.post(`/components/${componentId}/maintenance`, logData);
    return response.data;
  }
};

// Notification API endpoints
export const notificationAPI = {
  getNotifications: async (params: PaginationParams = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/mark-all-read');
    return response.data;
  }
};

export default api;

// Re-export types for convenience
export type {
  User,
  Client,
  Asset,
  Component,
  Notification,
  CreateUserRequest,
  CreateAdminRequest,
  CreateClientRequest,
  CreateAssetRequest,
  CreateComponentRequest,
  CreateMaintenanceLogRequest,
  PaginatedResponse,
  AssetFilters,
  ComponentFilters,
  UserFilters,
  PaginationParams
} from '@/types/api';

export type { LoginResponse as ApiLoginResponse } from '@/types/api'; 