// User types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'user';
  client_id?: string;
  is_active: boolean;
  notification_preferences: {
    email: boolean;
    whatsapp: boolean;
  };
  created_at: string;
  updated_at: string;
  is_first_login?: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  notification_preferences: {
    email: boolean;
    whatsapp: boolean;
  };
}

export interface CreateAdminRequest extends CreateUserRequest {
  client_id: string;
}

// Client types
export interface Client {
  id: string;
  name: string;
  description?: string;
  contact_email: string;
  contact_phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClientRequest {
  name: string;
  description?: string;
  contact_email: string;
  contact_phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
}

// Asset types
export type AssetType = 'vehicle' | 'machinery' | 'equipment' | 'infrastructure';
export type AssetStatus = 'active' | 'maintenance' | 'retired' | 'damaged';

export interface VehicleDetails {
  make: string;
  model: string;
  year: number;
  vin: string;
  license_plate?: string;
  engine_type?: string;
  fuel_type?: string;
  mileage?: number;
}

export interface MachineryDetails {
  make: string;
  model: string;
  year: number;
  serial_number: string;
  operating_hours?: number;
  capacity?: string;
  power_rating?: string;
}

export interface AssetImage {
  url: string;
  description?: string;
  is_primary: boolean;
}

export interface Asset {
  id: string;
  name: string;
  description?: string;
  asset_type: AssetType;
  status: AssetStatus;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  location?: string;
  client_id: string;
  created_by: string;
  vehicle_details?: VehicleDetails;
  machinery_details?: MachineryDetails;
  images: AssetImage[];
  created_at: string;
  updated_at: string;
}

export interface CreateAssetRequest {
  name: string;
  description?: string;
  asset_type: AssetType;
  status: AssetStatus;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  location?: string;
  vehicle_details?: VehicleDetails;
  machinery_details?: MachineryDetails;
}

// Component types
export type ComponentStatus = 'operational' | 'warning' | 'critical' | 'maintenance' | 'inactive';

export interface Component {
  id: string;
  name: string;
  description?: string;
  component_type: string;
  status: ComponentStatus;
  asset_id: string;
  client_id: string;
  created_by: string;
  specifications?: Record<string, unknown>;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  maintenance_interval_days?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateComponentRequest {
  name: string;
  description?: string;
  component_type: string;
  status: ComponentStatus;
  asset_id: string;
  specifications?: Record<string, unknown>;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  maintenance_interval_days?: number;
}

export interface MaintenanceLog {
  id: string;
  component_id: string;
  maintenance_type: string;
  description: string;
  performed_by: string;
  performed_date: string;
  cost?: number;
  notes?: string;
  created_at: string;
}

export interface CreateMaintenanceLogRequest {
  maintenance_type: string;
  description: string;
  performed_date: string;
  cost?: number;
  notes?: string;
}

// Notification types
export type NotificationType = 'maintenance_due' | 'asset_alert' | 'system_notification' | 'custom';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'read';

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  status: NotificationStatus;
  user_id: string;
  client_id?: string;
  related_asset_id?: string;
  related_component_id?: string;
  scheduled_for?: string;
  sent_at?: string;
  read_at?: string;
  created_at: string;
}

// API Response types
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'user';
  expires_in: number;
  require_password_change?: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

// Query parameters
export interface PaginationParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 1 | -1;
}

export interface AssetFilters extends PaginationParams {
  status?: AssetStatus;
  asset_type?: AssetType;
  search?: string;
}

export interface ComponentFilters extends PaginationParams {
  status?: ComponentStatus;
  asset_id?: string;
  search?: string;
}

export interface UserFilters extends PaginationParams {
  role?: 'admin' | 'user';
  is_active?: boolean;
  search?: string;
}
