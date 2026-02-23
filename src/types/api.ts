// User types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "super_admin" | "admin" | "user" | "technician" | "driver";
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
  // Driver fields
  license_number?: string;
  license_type?: string;
  license_expiry_date?: string; // ISO date string
  license_front_image?: string; // Path to front license image
  license_back_image?: string; // Path to back license image
  vehicle_assignments?: string[];
  // Uber driver linking field (only for drivers imported from payouts)
  uber_driver_uuid?: string;
  // Map/location preferences - used to center all maps
  map_center?: { lat: number; lon: number };
  country?: string;
  city?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: "user" | "admin" | "technician" | "driver"; // Allow all user roles
  notification_preferences?: {
    email?: boolean;
    whatsapp?: boolean;
    phone_number?: string;
  };
  // Technician fields (optional)
  hourly_rate?: number;
  industry?: string;
  specializations?: string[];
  // Driver fields (optional)
  license_number?: string;
  license_type?: string;
  license_expiry_date?: string; // ISO date string, required for driver role
  license_front_image?: string;
  license_back_image?: string;
  vehicle_assignments?: string[];
  // Uber driver linking field (only for drivers imported from payouts)
  uber_driver_uuid?: string;
}

export interface CreateAdminRequest extends CreateUserRequest {
  client_id: string;
  role?: "admin" | "technician" | "driver"; // Allow admin, technician, and driver roles
}

export interface UpdateUserRoleRequest {
  role: "super_admin" | "admin" | "user" | "technician" | "driver";
  client_id?: string;
}

// Client types
export type ClientType = "industrial" | "logistics";

export interface Client {
  id: string;
  name: string;
  description?: string;
  contact_email: string;
  contact_phone?: string;
  client_type: ClientType;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  default_currency?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClientRequest {
  name: string;
  description?: string;
  contact_email: string;
  contact_phone?: string;
  client_type: ClientType;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
}

// Asset types
export type AssetType =
  | "vehicle"
  | "machinery"
  | "equipment"
  | "infrastructure";
export type AssetStatus = "active" | "maintenance" | "retired" | "damaged";

export enum PrimaryMaterial {
  STEEL = "steel",
  ALUMINUM = "aluminum",
  CONCRETE = "concrete",
  WOOD = "wood",
  PLASTIC = "plastic",
  COMPOSITE = "composite",
  GLASS = "glass",
  CERAMIC = "ceramic",
  BRICK = "brick",
  STONE = "stone",
  COPPER = "copper",
  BRASS = "brass",
  TITANIUM = "titanium",
  CARBON_FIBER = "carbon_fiber",
  FIBERGLASS = "fiberglass",
  RUBBER = "rubber",
  LEATHER = "leather",
  FABRIC = "fabric",
  OTHER = "other",
}

export const PrimaryMaterialLabels: Record<PrimaryMaterial, string> = {
  [PrimaryMaterial.STEEL]: "Steel",
  [PrimaryMaterial.ALUMINUM]: "Aluminum",
  [PrimaryMaterial.CONCRETE]: "Concrete",
  [PrimaryMaterial.WOOD]: "Wood",
  [PrimaryMaterial.PLASTIC]: "Plastic",
  [PrimaryMaterial.COMPOSITE]: "Composite",
  [PrimaryMaterial.GLASS]: "Glass",
  [PrimaryMaterial.CERAMIC]: "Ceramic",
  [PrimaryMaterial.BRICK]: "Brick",
  [PrimaryMaterial.STONE]: "Stone",
  [PrimaryMaterial.COPPER]: "Copper",
  [PrimaryMaterial.BRASS]: "Brass",
  [PrimaryMaterial.TITANIUM]: "Titanium",
  [PrimaryMaterial.CARBON_FIBER]: "Carbon Fiber",
  [PrimaryMaterial.FIBERGLASS]: "Fiberglass",
  [PrimaryMaterial.RUBBER]: "Rubber",
  [PrimaryMaterial.LEATHER]: "Leather",
  [PrimaryMaterial.FABRIC]: "Fabric",
  [PrimaryMaterial.OTHER]: "Other",
};

export enum Condition {
  EXCELLENT = "excellent",
  GOOD = "good",
  FAIR = "fair",
  POOR = "poor",
  CRITICAL = "critical",
}

export const ConditionLabels: Record<Condition, string> = {
  [Condition.EXCELLENT]: "Excellent",
  [Condition.GOOD]: "Good",
  [Condition.FAIR]: "Fair",
  [Condition.POOR]: "Poor",
  [Condition.CRITICAL]: "Critical",
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
  service_interval_km?: number; // km between services (e.g. 10000)
  last_service_at_km?: number; // odometer at last service (reset service alerts)
  driver_id?: string; // ID of assigned driver
  device_id?: string; // Hardware ID of the telematics device
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
export type ComponentStatus =
  | "operational"
  | "warning"
  | "critical"
  | "maintenance"
  | "inactive";

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
export type NotificationType = "email" | "whatsapp" | "MAINTENANCE";
export type NotificationStatus = "pending" | "sent" | "failed";
export type NotificationUrgency =
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "OVERDUE"
  | "URGENT"
  | "HIGH"
  | "MEDIUM";

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
  component_id?: string; // made optional
  asset_id?: string;

  // New schema fields
  type?: string;
  severity?: string;
  title?: string;
  metadata?: Record<string, unknown>;

  // Old schema fields
  notification_type?: NotificationType;
  status?: NotificationStatus;
  subject?: string;
  message: string;
  urgency?: NotificationUrgency;
  due_date?: string;
  scheduled_for?: string;
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
  acknowledged_at?: string;
  acknowledged_by?: string;
}

// API Response types
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: "super_admin" | "admin" | "user";
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
  role?: "admin" | "user" | "technician" | "driver";
  is_active?: boolean;
  search?: string;
}

// Logistics Analytics Types
export interface DriverEarnings {
  uuid: string;
  first_name: string;
  surname: string;
  full_name: string;
  total_earnings: number;
  period_earnings: {
    "7d": number;
    "30d": number;
    "1y": number;
    "5y": number;
  };
  selected_period_earnings?: number; // Earnings for the selected custom date range
  payment_count: number;
  // Monthly data (daily payments)
  payments?: Array<{
    date: string;
    amount: number;
    fee_type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }>;
  // Weekly data (weekly aggregated payments)
  weekly_payments?: Array<{
    week_start: string;
    week_end: string;
    total_earnings: number;
    metadata?: Record<string, unknown>;
  }>;
}

export interface MonthlyEarnings {
  month: string;
  earnings: number;
}

export interface DriverPerformanceTrend {
  driver_id: string;
  driver_name: string;
  monthly_earnings: MonthlyEarnings[];
}

export interface LogisticsEarningsSummary {
  total_drivers: number;
  total_earnings: number;
  selected_period_earnings: number;
  selected_period: string;
  selected_period_dates?: {
    start_date?: string;
    end_date?: string;
    start_datetime?: string;
    end_datetime?: string;
  };
  currency: string;
  client_withdrawals: number;
  periods: {
    "7d": number;
    "30d": number;
    "1y": number;
    "5y": number;
  };
  monthly_earnings: MonthlyEarnings[];
  driver_performance_trends: DriverPerformanceTrend[];
}

export interface LogisticsEarningsData {
  drivers: DriverEarnings[];
  raw_data: Record<string, unknown>;
}

export interface LogisticsEarningsResponse {
  message: string;
  data: LogisticsEarningsData;
  summary: LogisticsEarningsSummary;
}

export interface FleetMetrics {
  total_vehicles: number;
  active_vehicles: number;
  assigned_vehicles: number;
  utilization_rate: number;
}

export interface DriverMetrics {
  total_drivers: number;
  available_drivers: number;
  assignment_rate: number;
}

export interface EarningsMetrics {
  data_points: number;
  trend_percentage: number;
  last_upload?: string;
}

export interface LogisticsPerformanceMetrics {
  fleet: FleetMetrics;
  drivers: DriverMetrics;
  earnings: EarningsMetrics;
}

export interface LogisticsPerformanceResponse {
  message: string;
  metrics: LogisticsPerformanceMetrics;
}

export interface UploadEarningsResponse {
  message: string;
  upload_id: string;
  total_drivers: number;
  total_payments: number;
  new_payments: number;
  duplicate_payments: number;
  data_type: "monthly" | "weekly";
  filename: string;
  upload_timestamp: string;
  processing_time_ms: number;
}

// Telemetry types
export interface TelemetryRecord {
  ts: number;
  ts_server?: string;
  // OBD-II Data
  rpm?: number;
  spd?: number;
  lod?: number;
  thr?: number;
  tmp?: number;
  iat?: number;
  amb?: number;
  oil?: number;
  fl?: number;
  fp?: number;
  maf?: number;
  bar?: number;
  vlt?: number;
  run?: number;
  mil?: number;

  // OBD-Derived Acceleration
  oa_ms2?: number;
  oa_kmh?: number;
  oa_g?: number;
  oa_ok?: number;

  // IMU & Acceleration
  ia_lg?: number;
  ia_lat?: number;
  ia_vt?: number;
  ia_tot?: number;

  // IMU Raw Smoothed Values
  ax?: number;
  ay?: number;
  az?: number;
  gx?: number;
  gy?: number;
  gz?: number;
  mx?: number;
  my?: number;
  mz?: number;
  itmp?: number;

  plg?: number;
  plag?: number;
  pvg?: number;
  ptg?: number;
  vib?: number;
  rol?: number;
  pit?: number;
  // Harsh events
  hbk?: number;
  hac?: number;
  hco?: number;
  pot?: number;
  // GPS
  lat?: number;
  lon?: number;
  alt?: number;
  cog?: number;
  hdg?: number;
  nsat?: number;
}

export interface TelemetryHistoryResponse {
  device_id: string;
  count: number;
  records: TelemetryRecord[];
}

export interface LatestTelemetryResponse {
  device_id: string;
  record: TelemetryRecord;
}

// Trip types
export interface Trip {
  id: string;
  device_id: string;
  driver_id?: string;
  client_id: string;
  start_ts: string;
  end_ts?: string;
  duration_min: number;
  distance_km: number;
  idle_min: number;
  avg_speed: number;
  max_speed: number;
  fuel_est_l: number;
  driver_score: number;
  harsh_brakes: number;
  harsh_accels: number;
  hard_corners: number;
  potholes: number;
  max_ptg: number;
  avg_vib: number;
  created_at: string;
  updated_at: string;
}

export interface TripReplayRecord {
  ts: number;
  ts_server?: string;
  lat?: number;
  lon?: number;
  spd?: number;
  rpm?: number;
  hdg?: number;
  cog?: number;
  hbk?: number;
  hac?: number;
  hco?: number;
  pot?: number;
  ptg?: number;
  plg?: number;  // Peak longitudinal G (brake/accel)
  ia_tot?: number;
  ia_lg?: number;
  ia_lat?: number;
  lod?: number;
  thr?: number;
  speed_limit_kmh?: number;  // Road speed limit when available from Mapbox
}

export interface TripReplayResponse {
  trip_id: string;
  device_id: string;
  start_ts: string;
  end_ts?: string;
  count: number;
  records: TripReplayRecord[];
  default_speed_limit_kmh?: number;  // Fallback when per-record limit unavailable (default 120)
}

// Geofence types
export type GeofenceType = "circle" | "polygon";

export interface GeofencePoint {
  lat: number;
  lon: number;
}

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  geofence_type: GeofenceType;
  center?: GeofencePoint;
  radius_meters?: number;
  vertices?: GeofencePoint[];
  is_active: boolean;
  color: string;
  notify_on_entry: boolean;
  notify_on_exit: boolean;
  asset_ids: string[];
  client_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface GeofenceCreate {
  name: string;
  description?: string;
  geofence_type: GeofenceType;
  center?: GeofencePoint;
  radius_meters?: number;
  vertices?: GeofencePoint[];
  is_active?: boolean;
  color?: string;
  notify_on_entry?: boolean;
  notify_on_exit?: boolean;
  asset_ids?: string[];
}

export interface GeofenceUpdate {
  name?: string;
  description?: string;
  geofence_type?: GeofenceType;
  center?: GeofencePoint;
  radius_meters?: number;
  vertices?: GeofencePoint[];
  is_active?: boolean;
  color?: string;
  notify_on_entry?: boolean;
  notify_on_exit?: boolean;
  asset_ids?: string[];
}

export interface GeofenceAlert {
  id: string;
  geofence_id: string;
  geofence_name: string;
  asset_id: string;
  device_id: string;
  event_type: "entry" | "exit";
  ts: string;
  lat: number;
  lon: number;
}

// Trip Planning Types
export interface Waypoint {
  lat: number;
  lon: number;
  label?: string;
  order: number;
}

export interface TripPlan {
  id: string;
  name: string;
  description?: string;
  waypoints: Waypoint[];
  route_polyline?: string;
  route_polyline_precision?: number;
  estimated_distance_km?: number;
  estimated_duration_min?: number;
  asset_id?: string;
  scheduled_date?: string;
  expected_start?: string;
  expected_arrival?: string;
  status: "draft" | "planned" | "assigned" | "in_progress" | "completed" | "cancelled";
  load_weight_kg?: number;
  is_active: boolean;
  client_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface FuelAnomalyEvent {
  ts: string;
  lat: number;
  lon: number;
  fuel_before_pct: number;
  fuel_after_pct: number;
  distance_km_since_last: number;
  location_name?: string;
}

export interface WaypointArrivalEvent {
  waypoint_index: number;
  waypoint_label?: string;
  event_type: "arrived" | "departed";
  ts: string;
  lat: number;
  lon: number;
  location_name?: string;
}

export interface TripReport {
  trip_id: string;
  device_id: string;
  driver_id?: string;
  trip_plan_id?: string;
  trip_plan_name?: string;
  start_ts: string;
  end_ts?: string;
  duration_min: number;
  distance_km: number;
  fuel_used_l: number;
  driver_score: number;
  load_weight_kg?: number;
  trip_cost?: number;
  waypoint_events: WaypointArrivalEvent[];
  fuel_anomalies: FuelAnomalyEvent[];
  harsh_events: {
    harsh_brakes: number;
    harsh_accels: number;
    hard_corners: number;
    potholes: number;
  };
}

export interface TripPlanCreate {
  name: string;
  description?: string;
  waypoints?: Waypoint[];
  asset_id?: string;
  scheduled_date?: string;
  load_weight_kg?: number;
  is_active?: boolean;
}

export interface TripPlanUpdate {
  name?: string;
  description?: string;
  waypoints?: Waypoint[];
  asset_id?: string;
  scheduled_date?: string;
  load_weight_kg?: number;
  is_active?: boolean;
}

export interface NotificationGroup {
  id: string;
  client_id: string;
  group_type: "workshop" | "supervisor" | "management" | "exco";
  name: string;
  user_ids: string[];
  escalation_hours?: number;
  created_at: string;
  updated_at: string;
}

// Driver Scoring Types
export interface DriverLeaderboardEntry {
  driver_id: string;
  first_name: string;
  last_name: string;
  email: string;
  license_number: string;
  avg_score: number;
  total_trips: number;
  harsh_brakes: number;
  harsh_accels: number;
  hard_corners: number;
  potholes: number;
}

export interface DriverLeaderboardResponse {
  leaderboard: DriverLeaderboardEntry[];
}

export interface DriverTripSummary {
  id: string;
  driver_id?: string;
  driver_name?: string;
  start_ts: string;
  end_ts?: string;
  distance_km: number;
  duration_min: number;
  driver_score: number;
  vehicle_id: string;
  events: {
    hbk: number;
    hac: number;
    hco: number;
    pot: number;
  };
}

export interface DriverMetricsResponse {
  driver: {
    id: string;
    first_name: string;
    last_name: string;
    license_number: string;
  };
  summary: {
    avg_score: number;
    total_trips: number;
    total_distance_km: number;
    total_duration_hours: number;
    events: {
      hbk: number;
      hac: number;
      hco: number;
      pot: number;
    };
  };
  recent_trips: DriverTripSummary[];
}

export interface FleetTripsResponse {
  trips: DriverTripSummary[];
}
