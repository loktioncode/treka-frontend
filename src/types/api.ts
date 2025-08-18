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
    phone_number?: string;
  };
  created_at: string;
  updated_at: string;
  // Technician fields
  hourly_rate?: number;
  industry?: string;
  specializations?: string[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: 'user' | 'admin';  // Allow both user and admin roles
  notification_preferences?: {
    email?: boolean;
    whatsapp?: boolean;
    phone_number?: string;
  };
  // Technician fields (optional)
  hourly_rate?: number;
  industry?: string;
  specializations?: string[];
}

export interface CreateAdminRequest extends CreateUserRequest {
  client_id: string;
  role?: 'admin';  // Override to prefer admin role
}

export interface UpdateUserRoleRequest {
  role: 'super_admin' | 'admin' | 'user';
  client_id?: string;
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

export enum PrimaryMaterial {
  STEEL = 'steel',
  ALUMINUM = 'aluminum',
  CONCRETE = 'concrete',
  WOOD = 'wood',
  PLASTIC = 'plastic',
  COMPOSITE = 'composite',
  GLASS = 'glass',
  CERAMIC = 'ceramic',
  BRICK = 'brick',
  STONE = 'stone',
  COPPER = 'copper',
  BRASS = 'brass',
  TITANIUM = 'titanium',
  CARBON_FIBER = 'carbon_fiber',
  FIBERGLASS = 'fiberglass',
  RUBBER = 'rubber',
  LEATHER = 'leather',
  FABRIC = 'fabric',
  OTHER = 'other'
}

export const PrimaryMaterialLabels: Record<PrimaryMaterial, string> = {
  [PrimaryMaterial.STEEL]: 'Steel',
  [PrimaryMaterial.ALUMINUM]: 'Aluminum',
  [PrimaryMaterial.CONCRETE]: 'Concrete',
  [PrimaryMaterial.WOOD]: 'Wood',
  [PrimaryMaterial.PLASTIC]: 'Plastic',
  [PrimaryMaterial.COMPOSITE]: 'Composite',
  [PrimaryMaterial.GLASS]: 'Glass',
  [PrimaryMaterial.CERAMIC]: 'Ceramic',
  [PrimaryMaterial.BRICK]: 'Brick',
  [PrimaryMaterial.STONE]: 'Stone',
  [PrimaryMaterial.COPPER]: 'Copper',
  [PrimaryMaterial.BRASS]: 'Brass',
  [PrimaryMaterial.TITANIUM]: 'Titanium',
  [PrimaryMaterial.CARBON_FIBER]: 'Carbon Fiber',
  [PrimaryMaterial.FIBERGLASS]: 'Fiberglass',
  [PrimaryMaterial.RUBBER]: 'Rubber',
  [PrimaryMaterial.LEATHER]: 'Leather',
  [PrimaryMaterial.FABRIC]: 'Fabric',
  [PrimaryMaterial.OTHER]: 'Other'
};

export enum Condition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical'
}

export const ConditionLabels: Record<Condition, string> = {
  [Condition.EXCELLENT]: 'Excellent',
  [Condition.GOOD]: 'Good',
  [Condition.FAIR]: 'Fair',
  [Condition.POOR]: 'Poor',
  [Condition.CRITICAL]: 'Critical'
};

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

export interface EquipmentDetails {
  model?: string;
  serial_number?: string;
}

export interface InfrastructureDetails {
  type?: string;
  age?: number;
  material?: PrimaryMaterial;
  condition?: Condition;
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
  equipment_details?: EquipmentDetails;
  infrastructure_details?: InfrastructureDetails;
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
  equipment_details?: EquipmentDetails;
  infrastructure_details?: InfrastructureDetails;
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
  last_maintenance_date?: Date | string; // Allow both Date object and ISO string
  next_maintenance_date?: Date | string; // Allow both Date object and ISO string
  maintenance_interval_days?: number;
}

export interface MaintenanceLog {
  id: string;
  component_id: string;
  description: string;
  performed_by: string;
  maintenance_date: string;
  cost?: number;
  notes?: string;
  created_at: string;
  hours_spent?: number;
}

export interface CreateMaintenanceLogRequest {
  description: string;
  maintenance_date: string;
  cost?: number;
  notes?: string;
  hours_spent?: number;
}

// Notification types
export type NotificationType = 'email' | 'whatsapp' | 'MAINTENANCE';
export type NotificationStatus = 'pending' | 'sent' | 'failed';
export type NotificationUrgency = 'low' | 'medium' | 'high' | 'critical' | 'OVERDUE' | 'URGENT' | 'HIGH' | 'MEDIUM';

export interface NotificationRecipient {
  user_id: string;
  email: string;
  whatsapp?: string;
  status: {
    email: NotificationStatus;
    whatsapp: NotificationStatus;
    read: boolean;
  };
  email_sent_at?: string;
  whatsapp_sent_at?: string;
  read_at?: string;
}

export interface NotificationHistoryEntry {
  timestamp: string;
  action: string;
  recipients_count?: number;
  recipient?: string;
  error?: string;
  // Escalation properties
  from_urgency?: string;
  to_urgency?: string;
  reason?: string;
  days_until_maintenance?: number;
}

export interface Notification {
  id: string;
  client_id?: string;
  user_id?: string;
  component_id: string;
  asset_id?: string;
  notification_type: NotificationType;
  status: NotificationStatus;
  subject: string;
  message: string;
  urgency?: NotificationUrgency;
  due_date?: string;
  scheduled_for: string;
  recipients: NotificationRecipient[];
  send_count: number;
  first_sent_at?: string;
  last_sent_at?: string;
  history: NotificationHistoryEntry[];
  created_at: string;
  updated_at: string;
  sent_at?: string;
  error_message?: string;
  read_status?: boolean;
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
  client_id?: string;
}

export interface ComponentFilters extends PaginationParams {
  status?: ComponentStatus;
  asset_id?: string;
  search?: string;
  client_id?: string;
}

export interface UserFilters extends PaginationParams {
  role?: 'admin' | 'user';
  is_active?: boolean;
  search?: string;
}
