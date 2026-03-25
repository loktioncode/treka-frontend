import axios, { AxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import logger from "@/lib/logger";
import type {
  CreateUserRequest,
  CreateAdminRequest,
  CreateClientRequest,
  CreateAssetRequest,
  CreateComponentRequest,
  CreateMaintenanceLogRequest,
  AssetFilters,
  ComponentFilters,
  UserFilters,
  PaginationParams,
  User,
  GeofenceCreate,
  GeofenceUpdate,
  FleetTripsResponse,
  TripPlanCreate,
  TripPlanUpdate,
} from "@/types/api";

// Extend AxiosRequestConfig to include metadata
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

// API is running on port 8000
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL;

// Flag to prevent multiple redirects to login
let isRedirectingToLogin = false;

export function resetAuthRedirectFlag() {
  isRedirectingToLogin = false;
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Required for CORS with credentials
});

// Add a request interceptor to add the auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log API calls
    const startTime = Date.now();
    (config as ExtendedAxiosRequestConfig).metadata = { startTime };

    logger.debug("API request started", {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
    });

    return config;
  },
  (error) => {
    logger.error("API request error", {}, error);
    return Promise.reject(error);
  },
);

// Add a response interceptor to handle auth errors and network issues
api.interceptors.response.use(
  (response) => {
    // Log successful API calls
    const config = response.config as ExtendedAxiosRequestConfig;
    const duration = config.metadata?.startTime
      ? Date.now() - config.metadata.startTime
      : undefined;

    logger.apiCall(
      config.method?.toUpperCase() || "GET",
      `${config.baseURL}${config.url}`,
      response.status,
      duration,
    );

    return response;
  },
  async (error) => {
    // Log API errors
    const config = error.config as ExtendedAxiosRequestConfig;

    logger.apiError(
      config?.method?.toUpperCase() || "GET",
      `${config?.baseURL}${config?.url}`,
      error,
    );

    // Handle different types of errors
    if (error.response?.status === 401) {
      // Unauthorized - token expired or invalid
      // Don't show toast here to avoid multiple notifications
      // The login page will show the message once when redirected

      logger.userAction("session_expired", {
        trigger: "api_401_response",
        url: config?.url,
      });

      // Check if we're already redirecting to prevent multiple redirects
      if (isRedirectingToLogin || window.location.pathname === "/login") {
        return Promise.reject(error);
      }

      // Set flag to prevent multiple redirects
      isRedirectingToLogin = true;

      // Clear auth state
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      document.cookie =
        "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      // Notify AuthContext to update state and navigate (avoids full page reload)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized", { detail: { expired: true } }));
      }
    } else if (error.response?.status === 403) {
      // Forbidden - insufficient permissions
      toast.error(
        "Access denied. You do not have permission to perform this action.",
      );
      logger.warn("Access denied", {
        status: 403,
        url: config?.url,
        errorCode: error.response?.data?.error?.code,
      });
    } else if (error.response?.status === 404) {
      // Not found
      toast.error("The requested resource was not found.");
      logger.warn("Resource not found", {
        status: 404,
        url: config?.url,
      });
    } else if (error.response?.status >= 500) {
      // Server errors
      toast.error("Server error. Please try again later or contact support.");
      logger.error("Server error", {
        status: error.response?.status,
        url: config?.url,
        errorId: error.response?.data?.error?.error_id,
      });
    } else if (error.code === "NETWORK_ERROR" || !error.response) {
      // Network errors
      toast.error("Network error. Please check your connection and try again.");
      logger.error("Network error", {
        code: error.code,
        url: config?.url,
      });
    } else if (error.response?.status === 429) {
      // Rate limiting
      toast.error("Too many requests. Please wait a moment and try again.");
      logger.warn("Rate limited", {
        status: 429,
        url: config?.url,
      });
    }

    return Promise.reject(error);
  },
);

interface LoginResponse {
  access_token?: string;
  token_type?: string;
  user_id: string;
  role?: "super_admin" | "admin" | "user";
  expires_in?: number;
  require_otp?: boolean;
  is_first_login?: boolean;
  require_password_change?: boolean;
  reset_token?: string;
  message?: string;
}

// Auth API endpoints
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // Create form data for OAuth2 password flow
    const formData = new URLSearchParams();
    formData.append("username", email); // OAuth2 expects 'username' field
    formData.append("password", password);
    formData.append("grant_type", "password"); // Required for OAuth2 password flow

    const response = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },

  /** After POST /auth/login returned require_otp — exchange email + code for token or reset_token. */
  verifyLoginOtp: async (email: string, verification_code: string): Promise<LoginResponse> => {
    const response = await api.post("/auth/verify-login-otp", {
      email,
      verification_code,
    });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  verifyResetCode: async (email: string, code: string) => {
    console.log("API: verifyResetCode called with:", { email, code });
    const requestBody = { email, verification_code: code };
    console.log("API: Request body:", requestBody);
    const response = await api.post("/auth/verify-reset-code", requestBody);
    console.log("API: Response received:", response.data);
    return response.data;
  },

  resetPassword: async (token: string, new_password: string) => {
    const response = await api.post("/auth/reset-password", {
      token,
      new_password,
    });
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post("/auth/refresh");
    return response.data;
  },
};

export const userAPI = {
  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  createUser: async (userData: CreateUserRequest) => {
    const response = await api.post("/auth/users", userData);
    return response.data;
  },

  createAdmin: async (userData: CreateAdminRequest) => {
    const response = await api.post("/auth/register-admin", userData);
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/auth/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, userData: Partial<User>) => {
    const response = await api.put(`/auth/users/${userId}`, userData);
    return response.data;
  },

  updateUserRole: async (userId: string, role: string, clientId?: string) => {
    const response = await api.put(`/auth/users/${userId}`, {
      role,
      client_id: clientId,
    });
    return response.data;
  },

  toggleUserActivation: async (userId: string, activate: boolean) => {
    const response = await api.post(`/auth/users/${userId}/activate`, {
      activate,
    });
    return response.data;
  },

  // For Super Admin - get all users across the system
  getAllUsers: async (params: UserFilters = {}) => {
    const response = await api.get("/auth/list-all-users", { params });
    return response.data;
  },

  // Assign user to client (super admin only)
  assignUserToClient: async (userId: string, clientId: string) => {
    const response = await api.post(`/auth/users/${userId}/assign-client`, {
      client_id: clientId,
    });
    return response.data;
  },
};

// Client API endpoints
export const clientAPI = {
  getClients: async (params: PaginationParams = {}) => {
    const response = await api.get("/clients", { params });
    return response.data;
  },

  getClient: async (clientId: string) => {
    const response = await api.get(`/clients/${clientId}`);
    return response.data;
  },

  createClient: async (clientData: CreateClientRequest) => {
    const response = await api.post("/clients", clientData);
    return response.data;
  },

  updateClient: async (
    clientId: string,
    clientData: Partial<CreateClientRequest>,
  ) => {
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
  },

  // Toggle client activation status
  toggleClientActivation: async (clientId: string, activate: boolean) => {
    const response = await api.post(
      `/clients/${clientId}/toggle-activation?activate=${activate}`,
    );
    return response.data;
  },
};

// Asset API endpoints
export const assetAPI = {
  getAssets: async (params: AssetFilters = {}) => {
    const response = await api.get("/assets", { params });
    return response.data;
  },

  // For super admin - get assets for a specific client
  getClientAssets: async (clientId: string, params: AssetFilters = {}) => {
    const response = await api.get("/assets", {
      params: { ...params, client_id: clientId },
    });
    return response.data;
  },

  getAsset: async (assetId: string) => {
    const response = await api.get(`/assets/${assetId}`);
    return response.data;
  },

  createAsset: async (assetData: CreateAssetRequest) => {
    // For now, just send the asset data as JSON
    // TODO: Handle images separately if needed
    const response = await api.post("/assets", assetData);
    return response.data;
  },

  updateAsset: async (
    assetId: string,
    assetData: Partial<CreateAssetRequest>,
  ) => {
    // For now, just send the asset data as JSON
    // TODO: Handle images separately if needed
    const response = await api.put(`/assets/${assetId}`, assetData);
    return response.data;
  },

  deleteAsset: async (assetId: string) => {
    const response = await api.delete(`/assets/${assetId}`);
    return response.data;
  },

  // Driver assignment for vehicles
  assignDriverToVehicle: async (assetId: string, driverId: string) => {
    const response = await api.post(`/assets/${assetId}/assign-driver`, {
      driver_id: driverId,
    });
    return response.data;
  },

  unassignDriverFromVehicle: async (assetId: string) => {
    const response = await api.delete(`/assets/${assetId}/unassign-driver`);
    return response.data;
  },

  /** Log that vehicle service was performed (resets service alerts, sets status to active) */
  logService: async (assetId: string) => {
    const response = await api.post(`/assets/${assetId}/log-service`);
    return response.data as { message: string; last_service_at_km: number };
  },
};

// Component API endpoints
export const componentAPI = {
  getComponents: async (params: ComponentFilters = {}) => {
    const response = await api.get("/components", { params });
    return response.data;
  },

  // For super admin - get components for a specific client
  getClientComponents: async (
    clientId: string,
    params: ComponentFilters = {},
  ) => {
    const response = await api.get("/components", {
      params: { ...params, client_id: clientId },
    });
    return response.data;
  },

  getComponent: async (componentId: string) => {
    const response = await api.get(`/components/${componentId}`);
    return response.data;
  },

  createComponent: async (componentData: CreateComponentRequest) => {
    const response = await api.post("/components", componentData);
    return response.data;
  },

  updateComponent: async (
    componentId: string,
    componentData: Partial<CreateComponentRequest>,
  ) => {
    const response = await api.put(`/components/${componentId}`, componentData);
    return response.data;
  },

  deleteComponent: async (componentId: string) => {
    const response = await api.delete(`/components/${componentId}`);
    return response.data;
  },

  // Maintenance logs
  getMaintenanceLogs: async (
    componentId: string,
    params: PaginationParams = {},
  ) => {
    const response = await api.get(`/components/${componentId}/maintenance`, {
      params,
    });
    return response.data;
  },

  createMaintenanceLog: async (
    componentId: string,
    logData: CreateMaintenanceLogRequest,
  ) => {
    const response = await api.post(
      `/components/${componentId}/maintenance`,
      logData,
    );
    return response.data;
  },
};

// Notification API endpoints
export const notificationAPI = {
  getNotifications: async (params: PaginationParams = {}) => {
    const response = await api.get("/notifications", { params });
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch("/notifications/mark-all-read");
    return response.data;
  },

  acknowledge: async (notificationId: string) => {
    const response = await api.patch(`/notifications/${notificationId}/acknowledge`);
    return response.data;
  },

  createTestNotification: async () => {
    const response = await api.post("/notifications/create-test");
    return response.data;
  },
};

// Analytics API endpoints
export const analyticsAPI = {
  getDashboardStats: async (clientId?: string) => {
    const params = clientId ? { client_id: clientId } : {};
    const response = await api.get("/analytics/dashboard-stats", { params });
    return response.data;
  },

  getRecentFleetTrips: async (limit: number = 50): Promise<FleetTripsResponse> => {
    const response = await api.get("/analytics/logistics/fleet-trips", {
      params: { limit }
    });
    return response.data;
  },

  getAIInsights: async (message: string, filters: Record<string, unknown>) => {
    const response = await api.post("/analytics/ai-insights", {
      message,
      filters,
    });
    return response.data;
  },

  // Logistics analytics endpoints
  // New analytics endpoints
  getClientStats: async () => {
    const response = await api.get("/analytics/client-stats");
    return response.data;
  },

  uploadEarnings: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      "/analytics/logistics/upload-earnings",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  // Fleet telemetry analytics
  getFleetTelemetry: async (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.startDate) params.append("start_date", filters.startDate);
      if (filters.endDate) params.append("end_date", filters.endDate);
      if (filters.assetIds && filters.assetIds.length > 0) {
        params.append("asset_ids", filters.assetIds.join(","));
      }
    }
    const response = await api.get("/analytics/logistics/fleet-telemetry", { params });
    return response.data;
  },

  getDriverLeaderboard: async () => {
    const response = await api.get("/analytics/logistics/driver-leaderboard");
    return response.data as import("@/types/api").DriverLeaderboardResponse;
  },

  getDriverMetrics: async (driverId: string) => {
    const response = await api.get(`/analytics/logistics/driver-metrics/${driverId}`);
    return response.data as import("@/types/api").DriverMetricsResponse;
  },

  /** Vehicle fuel consumption from OBD data in previous trips (for trip plan fuel estimates) */
  getVehicleConsumption: async (assetId: string) => {
    const response = await api.get(`/analytics/vehicles/${assetId}/consumption`);
    return response.data as { avg_l_100km: number | null; avg_speed_kmh: number | null; trip_count: number };
  },

  /** Dynamic fleet metrics from telemetry and trip data (total distance, fuel efficiency, service) */
  getVehicleFleetMetrics: async (assetId: string) => {
    const response = await api.get(`/analytics/vehicles/${assetId}/fleet-metrics`);
    return response.data as {
      total_distance_km: number;
      avg_l_100km: number | null;
      service_interval_km: number;
      km_until_next_service: number | null;
    };
  },
};

// Telemetry API endpoints
export const telemetryAPI = {
  getTelemetry: async (
    deviceId: string,
    limit: number = 1000,
    params?: { start_date?: string; end_date?: string }
  ) => {
    const requestParams: Record<string, string | number> = { limit };
    if (params?.start_date) requestParams.start_date = params.start_date;
    if (params?.end_date) requestParams.end_date = params.end_date;
    const response = await api.get(`/telemetry/${deviceId}`, {
      params: requestParams,
    });
    return response.data;
  },

  getLatestTelemetry: async (deviceId: string) => {
    // Consolidated: fetch with limit 1 from the main telemetry endpoint
    const response = await api.get(`/telemetry/${deviceId}`, {
      params: { limit: 1 },
    });
    // The main endpoint returns { records: [...] }, while old /latest returned { record: ... }.
    // We wrap it to maintain frontend compatibility.
    const records = response.data.records || [];
    return {
      device_id: deviceId,
      record: records.length > 0 ? records[0] : null
    };
  },

  ingestBatch: async (deviceId: string, batch: any[]) => {
    const response = await api.post(
      `/telemetry/batch?device_id=${deviceId}`,
      batch,
    );
    return response.data;
  },

  getTrips: async (deviceId?: string, limit: number = 50) => {
    const response = await api.get("/telemetry/trips/list", {
      params: { device_id: deviceId, limit },
    });
    return response.data;
  },

  getTripDetails: async (tripId: string) => {
    const response = await api.get(`/telemetry/trips/${tripId}`);
    return response.data;
  },

  getTripReplay: async (tripId: string) => {
    const response = await api.get(`/telemetry/trips/${tripId}/replay`);
    return response.data;
  },

  getTripReport: async (tripId: string) => {
    const response = await api.get(`/telemetry/trips/${tripId}/report`);
    return response.data;
  },

  updateTripReportFields: async (
    tripId: string,
    data: { trip_cost?: number; load_weight_kg?: number }
  ) => {
    await api.patch(`/telemetry/trips/${tripId}/report-fields`, data);
  },

  /** List connected devices (linked to vehicles) with last_seen and online status */
  getDevices: async () => {
    const response = await api.get("/telemetry/devices");
    return response.data as {
      devices: Array<{
        device_id: string;
        last_seen: string | null;
        linked_asset_id: string | null;
        linked_asset_name: string | null;
        online: boolean;
      }>;
      online_count: number;
      total_count: number;
    };
  },
};

export const geofenceAPI = {
  createGeofence: async (geofenceData: GeofenceCreate) => {
    const response = await api.post("/geofences/", geofenceData);
    return response.data;
  },

  getGeofences: async () => {
    const response = await api.get("/geofences/");
    return response.data;
  },

  getGeofence: async (geofenceId: string) => {
    const response = await api.get(`/geofences/${geofenceId}`);
    return response.data;
  },

  updateGeofence: async (geofenceId: string, geofenceData: GeofenceUpdate) => {
    const response = await api.patch(`/geofences/${geofenceId}`, geofenceData);
    return response.data;
  },

  deleteGeofence: async (geofenceId: string) => {
    const response = await api.delete(`/geofences/${geofenceId}`);
    return response.data;
  },

  getGeofenceAlerts: async (deviceId?: string, limit: number = 50) => {
    const response = await api.get("/geofences/alerts/history", {
      params: { device_id: deviceId, limit },
    });
    return response.data;
  },
};

export const tripPlanAPI = {
  createTripPlan: async (data: TripPlanCreate) => {
    const response = await api.post("/trip-plans/", data);
    return response.data;
  },

  getTripPlans: async (assetId?: string) => {
    const response = await api.get("/trip-plans/", {
      params: assetId ? { asset_id: assetId } : {},
    });
    return response.data;
  },

  getTripPlan: async (planId: string) => {
    const response = await api.get(`/trip-plans/${planId}`);
    return response.data;
  },

  updateTripPlan: async (planId: string, data: TripPlanUpdate) => {
    const response = await api.put(`/trip-plans/${planId}`, data);
    return response.data;
  },

  computeRoute: async (planId: string) => {
    const response = await api.post(`/trip-plans/${planId}/compute-route`);
    return response.data;
  },

  deleteTripPlan: async (planId: string) => {
    await api.delete(`/trip-plans/${planId}`);
  },

  assignTripPlan: async (
    planId: string,
    assetId: string,
    scheduledDate?: string
  ) => {
    const response = await api.post(`/trip-plans/${planId}/assign`, {
      asset_id: assetId,
      scheduled_date: scheduledDate,
    });
    return response.data;
  },
};

// Notification groups API (client admin only)
export const notificationGroupsAPI = {
  getGroups: async () => {
    const response = await api.get("/notification-groups/");
    return response.data;
  },

  getGroup: async (groupId: string) => {
    const response = await api.get(`/notification-groups/${groupId}`);
    return response.data;
  },

  updateGroup: async (
    groupId: string,
    data: { name?: string; user_ids?: string[]; escalation_hours?: number }
  ) => {
    const response = await api.patch(`/notification-groups/${groupId}`, data);
    return response.data;
  },

  addUserToGroup: async (groupId: string, userId: string) => {
    const response = await api.post(`/notification-groups/${groupId}/add-user`, {
      user_id: userId,
    });
    return response.data;
  },

  removeUserFromGroup: async (groupId: string, userId: string) => {
    const response = await api.post(`/notification-groups/${groupId}/remove-user`, {
      user_id: userId,
    });
    return response.data;
  },
};

// Chat API endpoints
export const chatAPI = {
  createSession: async (sessionData: {
    session_name: string;
    initial_message?: string;
    filters_applied?: Record<string, unknown>;
  }) => {
    const response = await api.post("/chat/sessions", sessionData);
    return response.data;
  },

  getSessions: async () => {
    const response = await api.get("/chat/sessions");
    return response.data;
  },

  getSession: async (sessionId: string) => {
    const response = await api.get(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  addMessage: async (
    sessionId: string,
    messageData: {
      content: string;
      role: "user" | "assistant";
      metadata?: Record<string, unknown>;
    },
  ) => {
    const response = await api.post(
      `/chat/sessions/${sessionId}/messages`,
      messageData,
    );
    return response.data;
  },

  updateSession: async (
    sessionId: string,
    updateData: {
      session_name?: string;
      is_active?: boolean;
      filters_applied?: Record<string, unknown>;
    },
  ) => {
    const response = await api.put(`/chat/sessions/${sessionId}`, updateData);
    return response.data;
  },

  deleteSession: async (sessionId: string) => {
    const response = await api.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  },
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
  LoginResponse,
  PaginatedResponse,
  AssetFilters,
  ComponentFilters,
  UserFilters,
  PaginationParams,
  DriverLeaderboardResponse,
  DriverLeaderboardEntry,
  DriverMetricsResponse,
  DriverTripSummary,
  FleetTripsResponse,
} from "@/types/api";
