"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  assetAPI,
  componentAPI,
  clientAPI,
  telemetryAPI,
  tripPlanAPI,
  type Asset,
  type Component,
  type CreateComponentRequest,
} from "@/services/api";
import { type ComponentStatus, type TelemetryRecord } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Form,
  FormField,
  FormLabel,
  FormGrid,
  FormActions,
  Select,
  Textarea,
} from "@/components/ui/form";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  ArrowLeft,
  Edit,
  Plus,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Settings,
  Calendar,
  DollarSign,
  MapPin,
  Package,
  Car,
  Building2,
  Gauge,
  Fuel,
  Activity,
  Zap,
  Thermometer,
  BarChart3,
  Cpu,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { formatDate, formatDateForInput } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TelemetryCharts } from "@/components/telemetry/TelemetryCharts";
import { HarshEventsTimeline } from "@/components/telemetry/HarshEventsTimeline";
import { TelemetryHeatmap } from "@/components/telemetry/TelemetryHeatmap";
import LiveMap from "@/components/maps/LiveMap";
import TripReplayMap from "@/components/maps/TripReplayMap";
import { TripReportModal } from "@/components/trips/TripReportModal";
import { useMqttTracking } from "@/hooks/useMqttTracking";
import { useMapCenter } from "@/hooks/useMapCenter";
import { useConnectedDevices } from "@/hooks/useConnectedDevices";
import { isEngineOn, getDrivingStatusLabel } from "@/lib/driving-status";
import { type Trip } from "@/types/api";
import { FloatingChatButton } from "@/components/ui/floating-chat-button";
import { type ChatMessage } from "@/components/ui/chat";
import { analyticsAPI } from "@/services/api";
import { useClientLabels } from "@/hooks/useClientLabels";

export default function AssetViewPage() {
  const { assetId } = useParams();
  const mapCenter = useMapCenter();
  const router = useRouter();
  const { assetLabelSingular, componentLabel } = useClientLabels();
  const searchParams = useSearchParams();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [drivers, setDrivers] = useState<
    {
      id: string;
      first_name: string;
      last_name: string;
      license_number?: string;
      role?: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showDriverAssignModal, setShowDriverAssignModal] = useState(false);
  const [showUnassignConfirmModal, setShowUnassignConfirmModal] =
    useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newMqttProvider, setNewMqttProvider] = useState<"custom" | "teltonika">("custom");
  const [savingDeviceId, setSavingDeviceId] = useState(false);

  // Machinery/Sensor data state
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([]);
  const [latestTelemetry, setLatestTelemetry] =
    useState<TelemetryRecord | null>(null);
  const { isConnected, vehicleList } = useMqttTracking(
    asset?.vehicle_details?.device_id,
    asset?.vehicle_details?.mqtt_provider
  );
  const connectedDevicesQuery = useConnectedDevices(Boolean(asset?.vehicle_details?.device_id));
  const connectedDeviceInfo = useMemo(() => {
    const did = asset?.vehicle_details?.device_id;
    if (!did) return null;
    const devices = connectedDevicesQuery.data?.devices ?? [];
    return devices.find((d) => String(d.device_id) === String(did)) ?? null;
  }, [asset?.vehicle_details?.device_id, connectedDevicesQuery.data]);
  const liveVehicleRecord = asset?.vehicle_details?.device_id
    ? vehicleList.find((v) => v.device_id === asset.vehicle_details?.device_id)?.last_record
    : null;
  const displayTelemetry = liveVehicleRecord ?? latestTelemetry;

  // Keep last known values so cards show previous value until new data arrives
  const [lastKnownTelemetry, setLastKnownTelemetry] =
    useState<Partial<TelemetryRecord>>({});
  useEffect(() => {
    if (!displayTelemetry) return;
    const keys = ["spd", "vlt", "rpm", "tmp", "fl", "thr", "lod"] as const;
    const defined: Partial<TelemetryRecord> = {};
    for (const k of keys) {
      const v = displayTelemetry[k];
      if (v != null && (typeof v !== "string" || v !== "")) defined[k] = v;
    }
    if (Object.keys(defined).length > 0) {
      setLastKnownTelemetry((prev) => ({ ...prev, ...defined }));
    }
  }, [displayTelemetry]);

  const cardTelemetry = displayTelemetry ?? lastKnownTelemetry;
  const fmt = (val: number | null | undefined, decimals = 3) =>
    val != null ? Number(val).toFixed(decimals) : null;

  const [, setLoadingTelemetry] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedHeatmapEvent, setSelectedHeatmapEvent] =
    useState<TelemetryRecord | null>(null);
  const [tripPlans, setTripPlans] = useState<import("@/types/api").TripPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showTripReportId, setShowTripReportId] = useState<string | null>(null);
  const [tripReport, setTripReport] = useState<import("@/types/api").TripReport | null>(null);
  const [fleetMetrics, setFleetMetrics] = useState<{
    total_distance_km: number;
    avg_l_100km: number | null;
    service_interval_km: number;
    km_until_next_service: number | null;
  } | null>(null);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleChatMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      // Build a telemetry context summary for the AI
      const latest = displayTelemetry;
      const contextLines: string[] = [
        `Vehicle: ${asset?.name || "Unknown"}`,
        `Device ID: ${asset?.vehicle_details?.device_id || "N/A"}`,
        latest?.spd != null ? `Speed: ${Number(latest.spd).toFixed(3)} km/h` : null,
        latest?.rpm != null ? `RPM: ${Number(latest.rpm).toFixed(3)}` : null,
        latest?.vlt != null ? `Battery: ${Number(latest.vlt).toFixed(3)}V` : null,
        latest?.tmp != null ? `Coolant: ${Number(latest.tmp).toFixed(3)}°C` : null,
        latest?.thr != null ? `Throttle: ${Number(latest.thr).toFixed(3)}%` : null,
        latest?.lod != null ? `Engine Load: ${Number(latest.lod).toFixed(3)}%` : null,
        latest?.fl != null ? `Fuel Level: ${Number(latest.fl).toFixed(3)}%` : null,
        latest?.ia_tot != null ? `Total G-Force: ${Number(latest.ia_tot).toFixed(3)}g` : null,
        `Telemetry records loaded: ${telemetry.length}`,
        telemetry.length > 0 ? `Harsh braking events: ${telemetry.filter(r => (r.hbk ?? 0) > 0).length}` : null,
        telemetry.length > 0 ? `Harsh acceleration events: ${telemetry.filter(r => (r.hac ?? 0) > 0).length}` : null,
        telemetry.length > 0 ? `Harsh cornering events: ${telemetry.filter(r => (r.hco ?? 0) > 0).length}` : null,
        telemetry.length > 0 ? `Pothole detections: ${telemetry.filter(r => (r.pot ?? 0) > 0).length}` : null,
      ].filter(Boolean) as string[];

      const fullPrompt = `User question about vehicle sensor data: "${message}"

Current vehicle telemetry context:
${contextLines.join("\n")}

Provide a concise, actionable insight for a fleet manager.`;

      const response = await analyticsAPI.getAIInsights(fullPrompt, {
        device_id: asset?.vehicle_details?.device_id,
        asset_id: assetId,
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response?.insights || response?.message || response?.content || JSON.stringify(response),
        timestamp: new Date(),
        metadata: {
          dataSource: "vehicle_telemetry",
          insights: contextLines.slice(0, 6),
        },
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Here's what I can see from the current sensor data for ${asset?.name || "this vehicle"}:`,
        timestamp: new Date(),
        metadata: {
          dataSource: "vehicle_telemetry",
          insights: [
            `Speed: ${displayTelemetry?.spd?.toFixed(0) ?? "--"} km/h`,
            `RPM: ${displayTelemetry?.rpm ?? "--"}`,
            `Battery: ${displayTelemetry?.vlt?.toFixed(1) ?? "--"}V`,
            `Coolant Temp: ${displayTelemetry?.tmp ?? "--"}°C`,
            `Throttle: ${displayTelemetry?.thr ?? "--"}%`,
            `Records loaded: ${telemetry.length}`,
          ],
        },
      };
      setChatMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  type SensorTimeRange = "1M" | "5M" | "10M" | "15M" | "30M" | "1HR" | "all";
  const [sensorTimeRange, setSensorTimeRange] =
    useState<SensorTimeRange>("all");

  const sensorTimeRangeMs: Record<SensorTimeRange, number> = useMemo(
    () => ({
      "1M": 60 * 1000,
      "5M": 5 * 60 * 1000,
      "10M": 10 * 60 * 1000,
      "15M": 15 * 60 * 1000,
      "30M": 30 * 60 * 1000,
      "1HR": 60 * 60 * 1000,
      all: Infinity,
    }),
    [],
  );

  const filteredSensorTelemetry = useMemo(() => {
    const windowMs = sensorTimeRangeMs[sensorTimeRange];
    if (windowMs === Infinity || !telemetry.length) return telemetry;
    const hasServerTs = telemetry.some((r) => r.ts_server != null);
    let refTime: number;
    if (hasServerTs) {
      refTime = Math.max(
        ...telemetry.map((r) =>
          r.ts_server ? new Date(r.ts_server).getTime() : 0,
        ),
      );
    } else {
      refTime = Math.max(...telemetry.map((r) => r.ts ?? 0));
    }
    const cutoff = refTime - windowMs;
    return telemetry.filter((r) => {
      const t = hasServerTs && r.ts_server
        ? new Date(r.ts_server).getTime()
        : (r.ts ?? 0);
      return t >= cutoff;
    });
  }, [telemetry, sensorTimeRange, sensorTimeRangeMs]);

  // Simulated sensor data for machinery (will come from various sensors)
  const [machinerySensorData] = useState({
    motorTemp: 68, // celsius
    motorVibrations: 0.08, // g-force
    beltTension: 85, // percentage of optimal
    bearingHealth: 92, // percentage
    actuatorPosition: 45, // degrees
    pressure: 2.4, // bar
    flowRate: 12.5, // L/min
    powerConsumption: 3.2, // kW
    lastUpdate: new Date().toISOString(),
  });

  /** Last date/time sensor data was saved (for Sensor Data tab) */
  const lastDataSaved = useMemo(() => {
    if (asset?.asset_type === "vehicle" && asset.vehicle_details?.device_id) {
      const liveVehicle = vehicleList.find(
        (v) => v.device_id === asset.vehicle_details?.device_id
      );
      if (liveVehicle?.last_update) {
        return new Date(liveVehicle.last_update).toLocaleString();
      }
      if (latestTelemetry?.ts_server) {
        return new Date(latestTelemetry.ts_server).toLocaleString();
      }
      if (latestTelemetry?.ts) {
        return new Date(latestTelemetry.ts).toLocaleString();
      }
    }
    if (asset?.asset_type === "machinery") {
      return machinerySensorData.lastUpdate
        ? new Date(machinerySensorData.lastUpdate).toLocaleString()
        : null;
    }
    return null;
  }, [
    asset?.asset_type,
    asset?.vehicle_details?.device_id,
    vehicleList,
    latestTelemetry,
    machinerySensorData.lastUpdate,
  ]);

  /** Last time car was ON (engine running: spd > 0 or rpm > 0) - for Overview tab */
  const lastCarOn = useMemo(() => {
    if (asset?.asset_type !== "vehicle" || !asset.vehicle_details?.device_id) {
      return null;
    }
    const isCarOn = (r: TelemetryRecord) => isEngineOn(r);
    const liveVehicle = vehicleList.find(
      (v) => v.device_id === asset.vehicle_details?.device_id
    );
    if (liveVehicle && isCarOn(liveVehicle.last_record)) {
      return new Date(liveVehicle.last_update).toLocaleString();
    }
    const onRecords = telemetry.filter(isCarOn);
    if (onRecords.length === 0) return null;
    const getTs = (r: TelemetryRecord) =>
      r.ts_server ? new Date(r.ts_server).getTime() : (r.ts ?? 0);
    const latest = onRecords.reduce((a, b) =>
      getTs(a) >= getTs(b) ? a : b
    );
    const ts = getTs(latest);
    return ts ? new Date(ts).toLocaleString() : null;
  }, [
    asset?.asset_type,
    asset?.vehicle_details?.device_id,
    vehicleList,
    telemetry,
  ]);

  const fetchTelemetry = useCallback(async (deviceId: string) => {
    try {
      setLoadingTelemetry(true);
      const [history, latest] = await Promise.all([
        telemetryAPI.getTelemetry(deviceId, 200),
        telemetryAPI.getLatestTelemetry(deviceId).catch(() => null),
      ]);
      setTelemetry(history.records || []);
      setLatestTelemetry(latest?.record || null);
    } catch (error) {
      console.error("Failed to fetch telemetry:", error);
    } finally {
      setLoadingTelemetry(false);
    }
  }, []);

  // Form state for component creation/editing
  const [componentFormData, setComponentFormData] = useState<{
    name: string;
    description: string;
    component_type: string;
    status: ComponentStatus;
    specifications: Record<string, unknown>;
    last_maintenance_date: string;
    next_maintenance_date: string;
    maintenance_interval_days: number;
  }>({
    name: "",
    description: "",
    component_type: "",
    status: "operational",
    specifications: {},
    last_maintenance_date: "",
    next_maintenance_date: "",
    maintenance_interval_days: 30,
  });

  // Dynamic component types based on asset type
  const getComponentTypes = (assetType: string) => {
    const baseTypes = [
      { value: "general", label: "General Component" },
      { value: "electrical_general", label: "Electrical Component" },
      { value: "mechanical", label: "Mechanical Component" },
      { value: "hydraulic", label: "Hydraulic Component" },
      { value: "pneumatic", label: "Pneumatic Component" },
    ];

    const assetSpecificTypes = {
      vehicle: [
        { value: "engine", label: "Engine Component" },
        { value: "transmission", label: "Transmission Component" },
        { value: "brake", label: "Brake Component" },
        { value: "suspension", label: "Suspension Component" },
        { value: "electrical_system", label: "Electrical System" },
        { value: "fuel_system", label: "Fuel System" },
        { value: "cooling_system", label: "Cooling System" },
        { value: "consumable", label: "Consumable (Oil, Filters, etc.)" },
      ],
      machinery: [
        { value: "motor", label: "Motor/Engine" },
        { value: "belt", label: "Belts & Pulleys" },
        { value: "bearing", label: "Bearings" },
        { value: "seal", label: "Seals & Gaskets" },
        { value: "filter", label: "Filters" },
        { value: "actuator", label: "Actuators" },
        { value: "sensor", label: "Sensors" },
        { value: "control_system", label: "Control System" },
        { value: "consumable", label: "Consumable Parts" },
      ],
      equipment: [
        { value: "power_supply", label: "Power Supply" },
        { value: "circuit_board", label: "Circuit Board" },
        { value: "display", label: "Display/Screen" },
        { value: "connector", label: "Connectors" },
        { value: "battery", label: "Battery" },
        { value: "cooling_fan", label: "Cooling Fan" },
        { value: "storage", label: "Storage Device" },
        { value: "consumable", label: "Consumable Parts" },
      ],
      infrastructure: [
        { value: "structural", label: "Structural Component" },
        { value: "electrical_infrastructure", label: "Electrical System" },
        { value: "plumbing", label: "Plumbing System" },
        { value: "hvac", label: "HVAC System" },
        { value: "security", label: "Security System" },
        { value: "lighting", label: "Lighting System" },
        { value: "consumable", label: "Consumable Parts" },
      ],
    };

    return [
      ...baseTypes,
      ...(assetSpecificTypes[assetType as keyof typeof assetSpecificTypes] ||
        []),
    ];
  };

  const fetchTrips = useCallback(async (deviceId: string) => {
    try {
      setLoadingTrips(true);
      const tripList = await telemetryAPI.getTrips(deviceId);
      setTrips(Array.isArray(tripList) ? tripList : []);
    } catch (error) {
      console.error("Error fetching trips:", error);
      toast.error("Failed to load trips");
      setTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  // Load asset and components
  const fetchFleetMetrics = useCallback(async (aid: string) => {
    try {
      const data = await analyticsAPI.getVehicleFleetMetrics(aid);
      setFleetMetrics(data);
    } catch {
      setFleetMetrics(null);
    }
  }, []);

  const loadAsset = useCallback(async () => {
    try {
      const response = await assetAPI.getAsset(assetId as string);
      setAsset(response);
      if (response.asset_type === "vehicle") {
        fetchFleetMetrics(response.id);
        if (response.vehicle_details?.device_id) {
          fetchTelemetry(response.vehicle_details.device_id);
          fetchTrips(response.vehicle_details.device_id);
        }
      } else {
        setFleetMetrics(null);
      }
    } catch (error) {
      toast.error("Failed to load asset");
      console.error("Error loading asset:", error);
    }
  }, [assetId, fetchTelemetry, fetchTrips, fetchFleetMetrics]);

  const handleSaveDeviceId = useCallback(async () => {
    if (!asset?.id || !asset.vehicle_details || !newDeviceId.trim()) return;
    setSavingDeviceId(true);
    try {
      await assetAPI.updateAsset(asset.id, {
        vehicle_details: {
          ...asset.vehicle_details,
          device_id: newDeviceId.trim(),
          mqtt_provider: newMqttProvider,
        },
      });
      toast.success("Device ID saved. Tracking will start when the device reports.");
      setNewDeviceId("");
      setNewMqttProvider("custom");
      await loadAsset();
    } catch (error) {
      toast.error("Failed to save device ID");
      console.error(error);
    } finally {
      setSavingDeviceId(false);
    }
  }, [asset, newDeviceId, newMqttProvider, loadAsset]);

  const loadComponents = useCallback(async () => {
    try {
      const response = await componentAPI.getComponents({
        asset_id: assetId as string,
      });
      setComponents(response);
    } catch (error) {
      toast.error("Failed to load components");
      console.error("Error loading components:", error);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  const loadDrivers = useCallback(async () => {
    try {
      if (asset?.client_id) {
        setLoadingDrivers(true);

        const response = await clientAPI.getClientUsers(asset.client_id, {
          role: "driver",
        });

        if (Array.isArray(response)) {
          // Ensure all drivers have the required fields
          const validDrivers = response.filter(
            (driver) =>
              driver.id &&
              driver.first_name &&
              driver.last_name &&
              driver.role === "driver",
          );

          setDrivers(validDrivers);
        } else {
          setDrivers([]);
        }
      }
    } catch (error) {
      console.error("Error loading drivers:", error);
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  }, [asset?.client_id]);

  useEffect(() => {
    // Only make API calls if assetId is provided and user is authenticated
    if (assetId && typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        loadAsset();
        loadComponents();
      }
    }
  }, [assetId, loadAsset, loadComponents]);

  useEffect(() => {
    // Only make API calls if asset is loaded and user is authenticated
    if (asset && typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        loadDrivers();
      }
    }
  }, [asset, loadDrivers]);

  useEffect(() => {
    if (asset?.id) {
      tripPlanAPI
        .getTripPlans(asset.id)
        .then((plans: import("@/types/api").TripPlan[]) => {
          const withRoute = plans.filter((p) => p.route_polyline);
          setTripPlans(withRoute);
          setSelectedPlanId((prev) =>
            prev && withRoute.some((p) => p.id === prev) ? prev : withRoute[0]?.id ?? null
          );
        })
        .catch(() => setTripPlans([]));
    } else {
      setTripPlans([]);
      setSelectedPlanId(null);
    }
  }, [asset?.id]);

  useEffect(() => {
    if (activeTab === "trips" && asset?.vehicle_details?.device_id) {
      fetchTrips(asset.vehicle_details.device_id);
    }
  }, [activeTab, asset, fetchTrips]);

  // Read tripId and tab from URL (e.g. from leaderboard link ?tab=trips&tripId=xxx)
  useEffect(() => {
    const tab = searchParams.get("tab");
    const tripId = searchParams.get("tripId");
    if (tab === "trips") {
      setActiveTab("trips");
    }
    if (tripId && tripId.length === 24 && /^[a-f0-9]+$/i.test(tripId)) {
      setSelectedTripId(tripId);
    }
  }, [searchParams]);

  const handleComponentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert date strings to proper format for the API
      const processedData = {
        ...componentFormData,
        asset_id: assetId as string,
        // Convert date strings to ISO datetime format or undefined if empty
        last_maintenance_date:
          componentFormData.last_maintenance_date &&
            typeof componentFormData.last_maintenance_date === "string" &&
            componentFormData.last_maintenance_date.trim() !== ""
            ? new Date(componentFormData.last_maintenance_date).toISOString()
            : undefined,
        next_maintenance_date:
          componentFormData.next_maintenance_date &&
            typeof componentFormData.next_maintenance_date === "string" &&
            componentFormData.next_maintenance_date.trim() !== ""
            ? new Date(componentFormData.next_maintenance_date).toISOString()
            : undefined,
      };

      if (selectedComponent) {
        await componentAPI.updateComponent(selectedComponent.id, processedData);
        toast.success("Component updated successfully");
      } else {
        await componentAPI.createComponent(
          processedData as CreateComponentRequest,
        );
        toast.success("Component created successfully");
      }

      setShowComponentModal(false);
      setSelectedComponent(null);
      setComponentFormData({
        name: "",
        description: "",
        component_type: "",
        status: "operational",
        specifications: {},
        last_maintenance_date: "",
        next_maintenance_date: "",
        maintenance_interval_days: 30,
      });
      loadComponents();
    } catch {
      toast.error("Failed to save component");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComponent = (component: Component) => {
    setSelectedComponent(component);

    setComponentFormData({
      name: component.name,
      description: component.description || "",
      component_type: component.component_type,
      status: component.status,
      specifications: component.specifications || {},
      last_maintenance_date: formatDateForInput(component.last_maintenance_date),
      next_maintenance_date: formatDateForInput(component.next_maintenance_date),
      maintenance_interval_days: component.maintenance_interval_days || 30,
    });
    setShowComponentModal(true);
  };

  // Driver assignment handlers
  const handleUnassignDriver = () => {
    setShowUnassignConfirmModal(true);
  };

  const handleConfirmUnassign = async () => {
    if (!asset?.vehicle_details?.driver_id) return;

    setIsSubmitting(true);
    try {
      // Call API to unassign driver from vehicle
      await assetAPI.unassignDriverFromVehicle(asset.id);

      // Reload asset data
      await loadAsset();
      await loadDrivers();

      toast.success("Driver successfully unassigned from vehicle");
      setShowUnassignConfirmModal(false);
    } catch (error) {
      toast.error("Failed to unassign driver from vehicle");
      console.error("Error unassigning driver:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriverId) {
      toast.error("Please select a driver");
      return;
    }

    // Check if driver is already assigned to another vehicle
    const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
    if (!selectedDriver) {
      toast.error("Selected driver not found");
      return;
    }

    setIsSubmitting(true);
    try {
      // Call API to assign driver to vehicle
      await assetAPI.assignDriverToVehicle(asset!.id, selectedDriverId);

      // Reload asset data
      await loadAsset();
      await loadDrivers();

      toast.success(
        `Driver ${selectedDriver.first_name} ${selectedDriver.last_name} successfully assigned to vehicle`,
      );
      setShowDriverAssignModal(false);
      setSelectedDriverId("");
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { detail?: string } } }).response
            ?.data?.detail || "Failed to assign driver to vehicle"
          : "Failed to assign driver to vehicle";
      toast.error(errorMessage);
      console.error("Error assigning driver:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get available drivers (not assigned to any vehicle)
  const getAvailableDrivers = () => {
    // First ensure we have valid drivers with the correct role
    const validDrivers = drivers.filter(
      (driver) =>
        driver.id &&
        driver.first_name &&
        driver.last_name &&
        driver.role === "driver",
    );

    // Then filter out currently assigned drivers
    const availableDrivers = validDrivers.filter((driver) => {
      const isAvailable = driver.id !== asset?.vehicle_details?.driver_id;
      return isAvailable;
    });

    return availableDrivers;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "maintenance":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="w-4 h-4" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4" />;
      case "critical":
        return <XCircle className="w-4 h-4" />;
      case "maintenance":
        return <Wrench className="w-4 h-4" />;
      case "inactive":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getAssetTypeIcon = (assetType: string) => {
    switch (assetType) {
      case "vehicle":
        return <Car className="w-6 h-6" />;
      case "machinery":
        return <Wrench className="w-6 h-6" />;
      case "equipment":
        return <Package className="w-6 h-6" />;
      case "infrastructure":
        return <Building2 className="w-6 h-6" />;
      default:
        return <Package className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{assetLabelSingular} not found</h1>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isVehicleNoDevice = asset.asset_type === "vehicle" && !asset.vehicle_details?.device_id;

  return (
    <div className="space-y-8 p-6">
      {/* Header — always visible, never blocked */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            {getAssetTypeIcon(asset.asset_type)}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{asset.name}</h1>
              <p className="text-gray-600">{asset.description}</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/assets/${asset.id}/edit`)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit {assetLabelSingular}
        </Button>
      </motion.div>

      {/* Section below header: overlay only covers this part when no device_id */}
      <div className="relative min-h-[320px]">
        {isVehicleNoDevice && (
          <div className="absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-black/25 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="device-id-modal-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-xl border border-gray-100"
            >
              <div className="flex items-center gap-3 border-b border-teal-100 pb-4 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100">
                  <Activity className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h3
                    id="device-id-modal-title"
                    className="text-lg font-semibold leading-6 text-gray-900"
                  >
                    Start tracking this vehicle
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Add the IoT device ID from your telematics hardware. It must match the device_id in the firmware Config.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Device / MQTT provider
                  </FormLabel>
                  <Select
                    value={newMqttProvider}
                    onChange={(e) => setNewMqttProvider(e.target.value as "custom" | "teltonika")}
                    options={[
                      { value: "custom", label: "Custom (HiveMQ — ESP32/firmware)" },
                      { value: "teltonika", label: "Teltonika (Flespi)" },
                    ]}
                    className="mt-1.5 border-gray-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Teltonika uses Flespi MQTT; custom devices use HiveMQ.
                  </p>
                </div>
                <div>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Device ID
                  </FormLabel>
                  <Input
                    value={newDeviceId}
                    onChange={(e) => setNewDeviceId(e.target.value)}
                    placeholder={newMqttProvider === "teltonika" ? "e.g. 7763037 (Flespi device ID)" : "e.g. ESP32_OBD_001"}
                    className="mt-1.5 border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                    disabled={savingDeviceId}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newMqttProvider === "teltonika"
                      ? "Flespi device ID for live position (flespi/state/gw/devices/{id}/telemetry/position)."
                      : "Must match the device_id in the firmware Config."}
                  </p>
                </div>
                <Button
                  onClick={handleSaveDeviceId}
                  loading={savingDeviceId}
                  disabled={!newDeviceId.trim()}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white border-teal-700"
                >
                  Save & start tracking
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className={isVehicleNoDevice ? "pointer-events-none select-none opacity-60" : ""}>
          {/* Asset Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">{assetLabelSingular} Type</p>
                  <p className="font-semibold capitalize">{asset.asset_type}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold capitalize">{asset.status}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Connected device type</p>
                  <p className="font-semibold">
                    {asset.asset_type === "vehicle" && asset.vehicle_details?.device_id
                      ? asset.vehicle_details.mqtt_provider === "teltonika"
                        ? "Teltonika"
                        : asset.vehicle_details.mqtt_provider === "custom"
                          ? "Custom"
                          : "Teltonika"
                      : "—"}
                  </p>
                </div>
              </div>
            </div>


            {asset.asset_type === "vehicle" && (
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center gap-3">
                  <Car className="w-5 h-5 text-teal-600" />
                  <div>
                    <p className="text-sm text-gray-600">Last car ON</p>
                    <p className="font-semibold">
                      {lastCarOn ?? "No data yet"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Asset Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="flex w-full bg-gray-100 p-1 rounded-lg">
                <TabsTrigger
                  value="overview"
                  className="flex-1 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="sensors"
                  className="flex-1 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  Sensor Data
                </TabsTrigger>
                <TabsTrigger
                  value="components"
                  className="flex-1 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  {componentLabel}
                </TabsTrigger>
                {asset.asset_type === "vehicle" && (
                  <TabsTrigger
                    value="trips"
                    className="flex-1 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    Trips
                  </TabsTrigger>
                )}
                {asset.asset_type === "vehicle" && (
                  <TabsTrigger
                    value="gps_logs"
                    className="flex-1 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    GPS Logs
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Overview Tab Content */}
              <TabsContent value="overview" className="space-y-6">


                {/* Live Map + Floating Vehicle Card (Vehicle only) */}
                {asset.asset_type === "vehicle" && asset.vehicle_details?.device_id && (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-lg" style={{ minHeight: "420px" }}>
                    {tripPlans.length > 1 && (
                      <div className="absolute top-4 right-4 z-20">
                        <select
                          value={selectedPlanId ?? ""}
                          onChange={(e) => setSelectedPlanId(e.target.value || null)}
                          className="text-sm border rounded-lg px-3 py-2 bg-white shadow-md"
                        >
                          {tripPlans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.estimated_distance_km?.toFixed(0) ?? "—"} km)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <LiveMap
                      deviceId={asset.vehicle_details.device_id}
                      height="420px"
                      initialCenter={mapCenter}
                      encodedRoutes={
                        (selectedPlanId ? tripPlans.find((p) => p.id === selectedPlanId) : tripPlans[0])?.route_polyline
                          ? { planned: (selectedPlanId ? tripPlans.find((p) => p.id === selectedPlanId) : tripPlans[0])!.route_polyline! }
                          : undefined
                      }
                      encodedRoutePrecision={(selectedPlanId ? tripPlans.find((p) => p.id === selectedPlanId) : tripPlans[0])?.route_polyline_precision ?? 5}
                    />
                    <div className="absolute top-4 left-4 z-10 w-full max-w-sm">
                      <Card className="bg-white/95 backdrop-blur border shadow-lg">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Car className="w-5 h-5 text-teal-600" />
                              {asset.name || "Vehicle"}
                            </CardTitle>
                            <Badge
                              variant={isConnected ? "success" : "outline"}
                              className={isConnected ? "bg-green-100 text-green-700" : ""}
                            >
                              {isConnected ? "Live" : "Reconnecting..."}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-2 text-gray-600">
                            {asset.vehicle_details?.make && (
                              <span><strong>Make:</strong> {asset.vehicle_details.make}</span>
                            )}
                            {asset.vehicle_details?.model && (
                              <span><strong>Model:</strong> {asset.vehicle_details.model}</span>
                            )}
                            {asset.vehicle_details?.license_plate && (
                              <span><strong>Plate:</strong> {asset.vehicle_details.license_plate}</span>
                            )}
                            <span><strong>Device:</strong> {asset.vehicle_details?.device_id || "—"}</span>
                          </div>
                          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                              <p className="text-[10px] uppercase text-gray-500 font-medium">Speed</p>
                              <p className="text-lg font-bold text-teal-700">
                                {fmt(cardTelemetry?.spd) ?? "—"} <span className="text-xs font-normal">km/h</span>
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                              <p className="text-[10px] uppercase text-gray-500 font-medium">Voltage</p>
                              <p className="text-lg font-bold text-blue-600">
                                {fmt(cardTelemetry?.vlt) ?? "—"}V
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                              <p className="text-[10px] uppercase text-gray-500 font-medium">RPM</p>
                              <p className="text-lg font-bold text-gray-800">
                                {fmt(cardTelemetry?.rpm) ?? "—"}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                              <p className="text-[10px] uppercase text-gray-500 font-medium">Status</p>
                              <p className="text-lg font-bold text-green-600">
                                {getDrivingStatusLabel(cardTelemetry)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Vehicle Health Section */}
                {asset.asset_type === "vehicle" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Maintenance & Diagnostics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border bg-gray-50">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                              Battery Voltage
                            </p>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-bold">
                                {fmt(cardTelemetry?.vlt) ?? "—"}V
                              </span>
                              <span
                                className={`text-xs mb-1 font-medium ${(cardTelemetry?.vlt ?? 0) > 12 ? "text-green-600" : "text-red-600"}`}
                              >
                                {(cardTelemetry?.vlt ?? 0) > 12 ? "Healthy" : "Low"}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 rounded-xl border bg-gray-50">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                              Check Engine (MIL)
                            </p>
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-3 w-3 rounded-full ${cardTelemetry?.mil ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
                              />
                              <span className="text-sm font-bold">
                                {cardTelemetry?.mil ? "Active Error" : "No Errors"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm">
                            Vital Temperatures
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="text-center p-3 border rounded-lg">
                              <p className="text-[10px] text-gray-400">Coolant</p>
                              <p className="font-bold text-orange-600">
                                {fmt(cardTelemetry?.tmp) ?? "—"}°C
                              </p>
                            </div>
                            <div className="text-center p-3 border rounded-lg">
                              <p className="text-[10px] text-gray-400">Intake</p>
                              <p className="font-bold text-blue-600">
                                {fmt(cardTelemetry?.iat) ?? "—"}°C
                              </p>
                            </div>
                            <div className="text-center p-3 border rounded-lg">
                              <p className="text-[10px] text-gray-400">Ambient</p>
                              <p className="font-bold text-gray-600">
                                {fmt(cardTelemetry?.amb) ?? "—"}°C
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Fleet Metrics</CardTitle>
                          {(asset.status === "maintenance" ||
                            (fleetMetrics?.km_until_next_service != null &&
                              fleetMetrics.km_until_next_service <= 1000)) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-teal-600 border-teal-300 hover:bg-teal-50"
                                onClick={async () => {
                                  if (!asset?.id) return;
                                  try {
                                    await assetAPI.logService(asset.id);
                                    toast.success("Service logged. Vehicle status set to active.");
                                    await loadAsset();
                                    fetchFleetMetrics(asset.id);
                                  } catch {
                                    toast.error("Failed to log service");
                                  }
                                }}
                              >
                                Log service
                              </Button>
                            )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-500">
                            Total Distance
                          </span>
                          <span className="font-bold">
                            {fleetMetrics != null
                              ? `${fleetMetrics.total_distance_km.toLocaleString()} km`
                              : `${asset.vehicle_details?.mileage ?? 0} km`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-500">
                            Service Interval
                          </span>
                          <span className="font-bold">
                            {fleetMetrics?.service_interval_km != null
                              ? `${fleetMetrics.service_interval_km.toLocaleString()} km`
                              : "10,000 km"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-500">
                            Km Until Next Service
                          </span>
                          <span className="font-bold">
                            {fleetMetrics?.km_until_next_service != null
                              ? `${fleetMetrics.km_until_next_service.toLocaleString()} km`
                              : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-500">
                            Fuel Efficiency
                          </span>
                          <span className="font-bold text-teal-600">
                            {fleetMetrics?.avg_l_100km != null
                              ? `${fleetMetrics.avg_l_100km.toFixed(1)} L/100km`
                              : "—"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Asset Information */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">{assetLabelSingular} Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Purchase Date, Purchase Cost */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Purchase Date
                      </label>
                      <p className="text-gray-900">
                        {asset.purchase_date
                          ? new Date(asset.purchase_date).toLocaleDateString()
                          : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Purchase Cost
                      </label>
                      <p className="text-gray-900">
                        {asset.purchase_cost
                          ? `$${asset.purchase_cost.toLocaleString()}`
                          : "Not specified"}
                      </p>
                    </div>
                  </div>

                  {/* Only show relevant asset type details */}
                  {asset.asset_type === "vehicle" && asset.vehicle_details && (
                    <div className="md:col-span-2 mt-6">
                      <h4 className="font-semibold mb-2">Vehicle Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Make
                          </label>
                          <p className="text-gray-900">
                            {asset.vehicle_details.make || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Model
                          </label>
                          <p className="text-gray-900">
                            {asset.vehicle_details.model || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Year
                          </label>
                          <p className="text-gray-900">
                            {asset.vehicle_details.year || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            License Plate
                          </label>
                          <p className="text-gray-900">
                            {asset.vehicle_details.license_plate || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            VIN
                          </label>
                          <p className="text-gray-900">
                            {asset.vehicle_details.vin || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Device ID
                          </label>
                          <p className="text-gray-900">
                            {asset.vehicle_details.device_id || "Not set — add to enable tracking"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fuel Type
                          </label>
                          <p className="text-gray-900">
                            {asset.vehicle_details.fuel_type || "Not specified"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Driver Assignment Section for Vehicles */}
                  {asset.asset_type === "vehicle" && (
                    <div className="md:col-span-2 mt-6">
                      <h4 className="font-semibold mb-4">Driver Assignment</h4>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        {asset.vehicle_details?.driver_id ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Car className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {
                                    drivers.find(
                                      (d) =>
                                        d.id === asset.vehicle_details?.driver_id,
                                    )?.first_name
                                  }{" "}
                                  {
                                    drivers.find(
                                      (d) =>
                                        d.id === asset.vehicle_details?.driver_id,
                                    )?.last_name
                                  }
                                </p>
                                <p className="text-sm text-gray-600">
                                  License:{" "}
                                  {drivers.find(
                                    (d) =>
                                      d.id === asset.vehicle_details?.driver_id,
                                  )?.license_number || "Not specified"}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => handleUnassignDriver()}
                            >
                              Remove Driver
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Car className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500 mb-3">
                              No driver assigned to this vehicle
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                              onClick={() => setShowDriverAssignModal(true)}
                              disabled={drivers.length === 0}
                            >
                              {drivers.length === 0
                                ? "No Available Drivers"
                                : "Assign Driver"}
                            </Button>
                            {drivers.length === 0 && (
                              <p className="text-xs text-gray-400 mt-2">
                                Create driver users first to assign them to vehicles
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {asset.asset_type === "machinery" && asset.machinery_details && (
                    <div className="md:col-span-2 mt-6">
                      <h4 className="font-semibold mb-2">Machinery Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Make
                          </label>
                          <p className="text-gray-900">
                            {asset.machinery_details.make || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Model
                          </label>
                          <p className="text-gray-900">
                            {asset.machinery_details.model || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Year
                          </label>
                          <p className="text-gray-900">
                            {asset.machinery_details.year || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Serial Number
                          </label>
                          <p className="text-gray-900">
                            {asset.machinery_details.serial_number ||
                              "Not specified"}
                          </p>
                        </div>
                        {asset.machinery_details.operating_hours && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Operating Hours
                            </label>
                            <p className="text-gray-900">
                              {asset.machinery_details.operating_hours}
                            </p>
                          </div>
                        )}
                        {asset.machinery_details.capacity && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Capacity
                            </label>
                            <p className="text-gray-900">
                              {asset.machinery_details.capacity}
                            </p>
                          </div>
                        )}
                        {asset.machinery_details.power_rating && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Power Rating
                            </label>
                            <p className="text-gray-900">
                              {asset.machinery_details.power_rating}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {asset.asset_type === "infrastructure" &&
                    asset.infrastructure_details && (
                      <div className="md:col-span-2 mt-6">
                        <h4 className="font-semibold mb-2">
                          Infrastructure Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Type
                            </label>
                            <p className="text-gray-900">
                              {asset.infrastructure_details.type || "Not specified"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Age
                            </label>
                            <p className="text-gray-900">
                              {asset.infrastructure_details.age
                                ? `${asset.infrastructure_details.age} years`
                                : "Not specified"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Material
                            </label>
                            <p className="text-gray-900">
                              {asset.infrastructure_details.material ||
                                "Not specified"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Condition
                            </label>
                            <p className="text-gray-900">
                              {asset.infrastructure_details.condition ||
                                "Not specified"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* Maintenance Summary */}
                <div className="bg-white rounded-lg border p-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Maintenance Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">
                        Upcoming Maintenance
                      </h4>
                      <div className="space-y-2">
                        {components
                          .filter((c) => c.next_maintenance_date)
                          .sort(
                            (a, b) =>
                              new Date(a.next_maintenance_date!).getTime() -
                              new Date(b.next_maintenance_date!).getTime(),
                          )
                          .slice(0, 3)
                          .map((component) => (
                            <div
                              key={component.id}
                              className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200"
                            >
                              <div>
                                <p className="font-medium text-sm">
                                  {component.name}
                                </p>
                                <p className="text-xs text-amber-600">
                                  Due:{" "}
                                  {new Date(
                                    component.next_maintenance_date!,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-800"
                              >
                                {component.status}
                              </Badge>
                            </div>
                          ))}
                        {components.filter((c) => c.next_maintenance_date)
                          .length === 0 && (
                            <p className="text-sm text-gray-500">
                              No upcoming maintenance scheduled
                            </p>
                          )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">
                        Recent Activity
                      </h4>
                      <div className="space-y-2">
                        {components
                          .filter((c) => c.last_maintenance_date)
                          .sort(
                            (a, b) =>
                              new Date(b.last_maintenance_date!).getTime() -
                              new Date(a.last_maintenance_date!).getTime(),
                          )
                          .slice(0, 3)
                          .map((component) => (
                            <div
                              key={component.id}
                              className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200"
                            >
                              <div>
                                <p className="font-medium text-sm">
                                  {component.name}
                                </p>
                                <p className="text-xs text-green-600">
                                  Last:{" "}
                                  {new Date(
                                    component.last_maintenance_date!,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-800"
                              >
                                {component.status}
                              </Badge>
                            </div>
                          ))}
                        {components.filter((c) => c.last_maintenance_date)
                          .length === 0 && (
                            <p className="text-sm text-gray-500">
                              No recent maintenance activity
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Sensor Data Tab */}
              <TabsContent value="sensors" className="space-y-6">
                {asset.asset_type === "vehicle" ? (
                  <div className="space-y-6">
                    {/* Last data from device - timestamp is from device (Flespi/custom), not fetch time */}
                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="py-3 px-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600" title="Timestamp from device, not when we fetched it">
                          Last data from device:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {lastDataSaved ?? "Never"}
                        </span>
                        {asset.vehicle_details?.device_id && (
                          <span className="text-xs text-gray-400 ml-auto">
                            Device: {asset.vehicle_details.device_id}
                          </span>
                        )}
                      </CardContent>
                    </Card>

                    {/* Real-time KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-full">
                              <Gauge className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-blue-600">
                                Speed
                              </p>
                              <h3 className="text-2xl font-bold text-blue-900">
                                {fmt(cardTelemetry?.spd) ?? "—"}{" "}
                                <span className="text-sm font-normal">km/h</span>
                              </h3>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-full">
                              <Activity className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-purple-600">
                                Engine RPM
                              </p>
                              <h3 className="text-2xl font-bold text-purple-900">
                                {fmt(cardTelemetry?.rpm) ?? "—"}{" "}
                                <span className="text-sm font-normal">RPM</span>
                              </h3>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-red-50 border-red-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-100 rounded-full">
                              <Thermometer className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-red-600">
                                Coolant Temp
                              </p>
                              <h3 className="text-2xl font-bold text-red-900">
                                {fmt(cardTelemetry?.tmp) ?? "—"}{" "}
                                <span className="text-sm font-normal">°C</span>
                              </h3>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-full">
                              <Fuel className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-600">
                                Fuel Level
                              </p>
                              <h3 className="text-2xl font-bold text-green-900">
                                {fmt(cardTelemetry?.fl) ?? "—"}{" "}
                                <span className="text-sm font-normal">%</span>
                              </h3>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Time range filter for sensor charts */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 mr-2">
                        Time range:
                      </span>
                      {(
                        [
                          "1M",
                          "5M",
                          "10M",
                          "15M",
                          "30M",
                          "1HR",
                          "all",
                        ] as const
                      ).map((range) => (
                        <span key={range} className="inline-flex items-center">
                          {range === "all" && (
                            <span className="text-gray-300 mx-1" aria-hidden>
                              |
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSensorTimeRange(range)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sensorTimeRange === range
                              ? "bg-teal-600 text-white shadow-sm"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                          >
                            {range === "all" ? "All time" : range}
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <TelemetryCharts data={filteredSensorTelemetry} type="engine" />
                      <TelemetryCharts data={filteredSensorTelemetry} type="thermal" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <TelemetryCharts data={filteredSensorTelemetry} type="electrical" />
                      <TelemetryCharts data={filteredSensorTelemetry} type="dynamics" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <TelemetryCharts data={filteredSensorTelemetry} type="road" />
                      <HarshEventsTimeline
                        data={filteredSensorTelemetry}
                        onEventClick={setSelectedHeatmapEvent}
                      />
                    </div>

                    {/* Integration of Telemetry Heatmap */}
                    <div className="grid grid-cols-1 gap-6">
                      <TelemetryHeatmap
                        data={filteredSensorTelemetry}
                        metric="ptg"
                        initialCenter={mapCenter}
                        title="Impact Hotspots (G-Force)"
                        description="Geographic heatmap of total impact forces recorded by this device"
                        height="400px"
                        selectedEvent={selectedHeatmapEvent}
                        onClosePopup={() => setSelectedHeatmapEvent(null)}
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <TelemetryCharts data={filteredSensorTelemetry} type="throttle" />
                      <TelemetryCharts data={filteredSensorTelemetry} type="fuel" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <TelemetryCharts data={filteredSensorTelemetry} type="acceleration" />
                      <TelemetryCharts data={filteredSensorTelemetry} type="orientation" />
                    </div>

                  </div>
                ) : asset.asset_type === "machinery" ? (
                  <div className="space-y-6">
                    {/* Last data from device */}
                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="py-3 px-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600" title="Timestamp from device">
                          Last data from device:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {lastDataSaved ?? "Never"}
                        </span>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="bg-gradient-to-r from-green-50 to-white border-b">
                        <CardTitle className="flex items-center gap-2 text-green-800">
                          <Zap className="w-5 h-5 text-green-600" />
                          Machinery Sensor Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                            <Thermometer className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-green-800">
                              {machinerySensorData.motorTemp}°C
                            </div>
                            <p className="text-sm text-green-600">
                              Motor Temperature
                            </p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-800">
                              {machinerySensorData.motorVibrations}g
                            </div>
                            <p className="text-sm text-blue-600">
                              Motor Vibrations
                            </p>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-purple-800">
                              {machinerySensorData.beltTension}%
                            </div>
                            <p className="text-sm text-purple-600">Belt Tension</p>
                          </div>
                          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <CheckCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-orange-800">
                              {machinerySensorData.bearingHealth}%
                            </div>
                            <p className="text-sm text-orange-600">
                              Bearing Health
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-800">
                              System Parameters
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="flex items-center gap-2 text-gray-700">
                                  <Settings className="w-4 h-4 text-blue-500" />
                                  Actuator Position
                                </span>
                                <span className="font-semibold">
                                  {machinerySensorData.actuatorPosition}°
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="flex items-center gap-2 text-gray-700">
                                  <Gauge className="w-4 h-4 text-red-500" />
                                  Pressure
                                </span>
                                <span className="font-semibold">
                                  {machinerySensorData.pressure} bar
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-800">
                              Performance Metrics
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="flex items-center gap-2 text-gray-700">
                                  <Activity className="w-4 h-4 text-green-500" />
                                  Flow Rate
                                </span>
                                <span className="font-semibold">
                                  {machinerySensorData.flowRate} L/min
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="flex items-center gap-2 text-gray-700">
                                  <Zap className="w-4 h-4 text-yellow-500" />
                                  Power Consumption
                                </span>
                                <span className="font-semibold">
                                  {machinerySensorData.powerConsumption} kW
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                    <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                    <p>Sensor data not available for this asset type</p>
                  </div>
                )}
              </TabsContent>

              {/* Trip History Tab */}
              <TabsContent value="trips" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Trip List */}
                  <Card className="lg:col-span-1 h-[600px] flex flex-col">
                    <CardHeader className="border-b">
                      <CardTitle className="text-md">Trip History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                      {!asset?.vehicle_details?.device_id ? (
                        <div className="p-8 text-center text-gray-500">
                          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Add IoT Device ID in Vehicle Details to view trips.</p>
                        </div>
                      ) : loadingTrips ? (
                        <div className="p-8 text-center text-gray-400">
                          Loading trips...
                        </div>
                      ) : trips.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                          No trips recorded yet.
                        </div>
                      ) : (
                        <div className="divide-y">
                          {trips.map((trip) => (
                            <div
                              key={trip.id}
                              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedTripId === trip.id ? "bg-blue-50 border-l-4 border-blue-600" : ""}`}
                              onClick={() => setSelectedTripId(trip.id)}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <p className="font-semibold text-sm">
                                  {formatDate(trip.start_ts)}
                                </p>
                                <div className="flex gap-1 items-center">
                                  <Badge className="text-[10px] bg-green-100 text-green-700" title="Trip done – report available">
                                    Report
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px]">
                                    {trip.driver_score} pts
                                  </Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                                <span>{trip.distance_km.toFixed(1)} km</span>
                                <span>{trip.duration_min.toFixed(0)} min</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Trip Replay Map */}
                  <Card className="lg:col-span-2 h-[600px]">
                    <CardContent className="p-0 h-full relative">
                      {selectedTripId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 z-10 bg-white"
                          onClick={() => setShowTripReportId(selectedTripId)}
                        >
                          View Report
                        </Button>
                      )}
                      {selectedTripId ? (
                        <TripReplayMap tripId={selectedTripId} height="100%" initialCenter={mapCenter} />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                          <MapPin className="h-12 w-12 mb-4 opacity-20" />
                          <p>Select a trip from the list to view replay</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Trip Report Modal */}
                {showTripReportId && (
                  <TripReportModal
                    tripId={showTripReportId}
                    onClose={() => {
                      setShowTripReportId(null);
                      setTripReport(null);
                    }}
                    onReportLoaded={setTripReport}
                  />
                )}
              </TabsContent>

              {/* GPS Logs Tab */}
              <TabsContent value="gps_logs" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-teal-600" />
                          GPS Telemetry Logs
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          Historical location data for this vehicle (connected device telemetry)
                        </p>
                      </div>
                      {asset?.vehicle_details?.device_id && (
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {String(asset.vehicle_details.device_id)}
                            </Badge>
                            {connectedDeviceInfo ? (
                              <Badge
                                className={
                                  connectedDeviceInfo.online
                                    ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                                    : "bg-gray-200 hover:bg-gray-200 text-gray-800"
                                }
                              >
                                {connectedDeviceInfo.online ? "Online" : "Offline"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {connectedDevicesQuery.isFetching ? "Checking status…" : "Status unknown"}
                              </Badge>
                            )}
                          </div>
                          {connectedDeviceInfo?.last_seen && (
                            <span className="text-xs text-gray-500">
                              Last seen: {new Date(connectedDeviceInfo.last_seen).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!asset?.vehicle_details?.device_id ? (
                      <div className="text-center py-10 text-gray-500">
                        <MapPin className="mx-auto h-12 w-12 opacity-20 mb-3" />
                        <p>Assign a device ID in Vehicle Details to view GPS logs.</p>
                      </div>
                    ) : telemetry.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        <p>No GPS logs available yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border">
                          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3">Timestamp</th>
                              <th className="px-4 py-3">Latitude</th>
                              <th className="px-4 py-3">Longitude</th>
                              <th className="px-4 py-3 border-l">Speed</th>
                              <th className="px-4 py-3">Fuel Level</th>
                              <th className="px-4 py-3 border-l">Voltage</th>
                              <th className="px-4 py-3 text-right">Map</th>
                            </tr>
                          </thead>
                          <tbody>
                            {telemetry
                              .filter((r) => r.lat != null && r.lon != null)
                              .sort((a, b) => {
                                const ta = a.ts_server ? new Date(a.ts_server).getTime() : a.ts ?? 0;
                                const tb = b.ts_server ? new Date(b.ts_server).getTime() : b.ts ?? 0;
                                return tb - ta;
                              })
                              .slice(0, 100) // limit to recent 100 for performance
                              .map((r, i) => {
                                const lat = r.lat ?? null;
                                const lon = r.lon ?? null;
                                const hasCoords = lat != null && lon != null;
                                const mapsUrl = hasCoords
                                  ? `https://www.google.com/maps?q=${lat},${lon}`
                                  : null;
                                return (
                                  <tr key={i} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {r.ts_server
                                        ? new Date(r.ts_server).toLocaleString()
                                        : r.ts
                                        ? new Date(r.ts * 1000).toLocaleString()
                                        : "Unknown"}
                                    </td>
                                    <td className="px-4 py-3 font-mono">{lat != null ? lat.toFixed(5) : "—"}</td>
                                    <td className="px-4 py-3 font-mono">{lon != null ? lon.toFixed(5) : "—"}</td>
                                    <td className="px-4 py-3 border-l">
                                      {r.spd != null ? `${r.spd.toFixed(1)} km/h` : "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                      {r.fl != null ? `${r.fl.toFixed(1)}%` : "—"}
                                    </td>
                                    <td className="px-4 py-3 border-l text-blue-600">
                                      {r.vlt != null ? `${r.vlt.toFixed(1)}V` : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      {hasCoords && mapsUrl ? (
                                        <a
                                          href={mapsUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 underline"
                                        >
                                          Open in Google Maps
                                        </a>
                                      ) : (
                                        <span className="text-xs text-gray-400">No coords</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>



              {/* Components Tab */}
              <TabsContent value="components" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">{componentLabel}</h2>
                  <Button
                    onClick={() => setShowComponentModal(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Component
                  </Button>
                </div>

                {/* Components Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {components.map((component) => (
                    <motion.div
                      key={component.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Settings className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold">{component.name}</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditComponent(component)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>

                      <p className="text-gray-600 text-sm mb-4">
                        {component.description}
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(component.status || "operational")}`}
                          >
                            {getStatusIcon(component.status || "operational")}
                            {component.status || "Operational"}
                          </span>
                        </div>

                        {/* Next Maintenance Due */}
                        {component.next_maintenance_date ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Next Maintenance:</span>
                            <span className="font-medium">
                              {formatDate(component.next_maintenance_date)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>Next Maintenance: Not scheduled</span>
                          </div>
                        )}

                        {/* Last Maintenance */}
                        {component.last_maintenance_date ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Wrench className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Last Maintenance:</span>
                            <span className="font-medium">
                              {formatDate(component.last_maintenance_date)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Wrench className="w-4 h-4 text-gray-400" />
                            <span>Last Maintenance: Never</span>
                          </div>
                        )}

                        {/* Maintenance Interval */}
                        {component.maintenance_interval_days && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Interval:</span>
                            <span className="font-medium">
                              {component.maintenance_interval_days} days
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {components.length === 0 && (
                  <div className="text-center py-12">
                    <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No components yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Start by adding components to track maintenance and
                      performance.
                    </p>
                    <Button onClick={() => setShowComponentModal(true)}>
                      Add First Component
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Component Modal */}
          <Modal
            isOpen={showComponentModal}
            onClose={() => {
              setShowComponentModal(false);
              setSelectedComponent(null);
              setComponentFormData({
                name: "",
                description: "",
                component_type: "",
                status: "operational",
                specifications: {},
                last_maintenance_date: "",
                next_maintenance_date: "",
                maintenance_interval_days: 30,
              });
            }}
            title={selectedComponent ? "Edit Component" : "Add Component"}
          >
            <Form
              onSubmit={handleComponentSubmit}
              errors={{}}
              touched={{}}
              isSubmitting={isSubmitting}
            >
              <FormGrid>
                <FormField name="name">
                  <FormLabel>Name *</FormLabel>
                  <Input
                    value={componentFormData.name}
                    onChange={(e) =>
                      setComponentFormData({
                        ...componentFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Component name"
                    required
                  />
                </FormField>

                <FormField name="component_type">
                  <FormLabel>Type *</FormLabel>
                  <Select
                    options={getComponentTypes(asset?.asset_type || "equipment")}
                    value={componentFormData.component_type}
                    onChange={(e) =>
                      setComponentFormData({
                        ...componentFormData,
                        component_type: e.target.value,
                      })
                    }
                    placeholder="Select component type"
                    required
                  />
                </FormField>
              </FormGrid>

              <FormField name="description">
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={componentFormData.description}
                  onChange={(e) =>
                    setComponentFormData({
                      ...componentFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Component description"
                  rows={3}
                />
              </FormField>

              <FormGrid>
                <FormField name="status">
                  <FormLabel>Status *</FormLabel>
                  <Select
                    value={componentFormData.status || "operational"}
                    onChange={(e) =>
                      setComponentFormData({
                        ...componentFormData,
                        status: e.target.value as ComponentStatus,
                      })
                    }
                    options={[
                      { value: "operational", label: "Operational" },
                      { value: "warning", label: "Warning" },
                      { value: "critical", label: "Critical" },
                      { value: "maintenance", label: "Maintenance" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                  />
                </FormField>

                <FormField name="maintenance_interval_days">
                  <FormLabel>Maintenance Interval (days)</FormLabel>
                  <Input
                    type="number"
                    value={componentFormData.maintenance_interval_days}
                    onChange={(e) =>
                      setComponentFormData({
                        ...componentFormData,
                        maintenance_interval_days: parseInt(e.target.value) || 30,
                      })
                    }
                    placeholder="30"
                  />
                </FormField>
              </FormGrid>

              <FormGrid>
                <FormField name="last_maintenance_date">
                  <FormLabel>Last Maintenance Date</FormLabel>
                  <Input
                    type="date"
                    value={componentFormData.last_maintenance_date || ""}
                    onChange={(e) =>
                      setComponentFormData({
                        ...componentFormData,
                        last_maintenance_date: e.target.value,
                      })
                    }
                  />
                </FormField>

                <FormField name="next_maintenance_date">
                  <FormLabel>Next Maintenance Date</FormLabel>
                  <Input
                    type="date"
                    value={componentFormData.next_maintenance_date || ""}
                    onChange={(e) =>
                      setComponentFormData({
                        ...componentFormData,
                        next_maintenance_date: e.target.value,
                      })
                    }
                  />
                </FormField>
              </FormGrid>

              <FormActions>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowComponentModal(false);
                    setSelectedComponent(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : selectedComponent
                      ? "Update"
                      : "Create"}
                </Button>
              </FormActions>
            </Form>
          </Modal>

          {/* Driver Assignment Modal */}
          <Modal
            isOpen={showDriverAssignModal}
            onClose={() => {
              setShowDriverAssignModal(false);
              setSelectedDriverId("");
            }}
            title="Assign Driver to Vehicle"
          >
            <div className="space-y-4">
              <p className="text-gray-600">
                Select a driver to assign to <strong>{asset?.name}</strong>. Only
                unassigned drivers are shown.
              </p>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Available Drivers
                </label>

                {/* Driver count info */}
                <div className="text-sm text-gray-600">
                  {loadingDrivers ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                      Loading drivers...
                    </span>
                  ) : (
                    `Available drivers: ${getAvailableDrivers().length}`
                  )}
                </div>

                <SearchableSelect
                  value={selectedDriverId}
                  onChange={(value) => {
                    setSelectedDriverId(value);
                  }}
                  options={[
                    { value: "", label: "Select a driver..." },
                    ...getAvailableDrivers().map((driver) => ({
                      value: driver.id,
                      label: `${driver.first_name} ${driver.last_name}${driver.license_number ? ` (${driver.license_number})` : ""}`,
                    })),
                  ]}
                  placeholder="Choose driver"
                  searchPlaceholder="Type to search drivers by name or email..."
                />
              </div>

              {getAvailableDrivers().length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="font-medium">No Available Drivers</p>
                  </div>
                  <p className="text-amber-700 text-sm mt-1">
                    All drivers are currently assigned to other vehicles, or no
                    drivers exist for this client.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDriverAssignModal(false);
                    setSelectedDriverId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignDriver}
                  disabled={!selectedDriverId || isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSubmitting ? "Assigning..." : "Assign Driver"}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Unassign Driver Confirmation Modal */}
          <Modal
            isOpen={showUnassignConfirmModal}
            onClose={() => setShowUnassignConfirmModal(false)}
            title="Remove Driver Assignment"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Confirm Driver Removal</p>
                  <p className="text-red-700 text-sm mt-1">
                    Are you sure you want to remove{" "}
                    {
                      drivers.find(
                        (d) => d.id === asset?.vehicle_details?.driver_id,
                      )?.first_name
                    }{" "}
                    {
                      drivers.find(
                        (d) => d.id === asset?.vehicle_details?.driver_id,
                      )?.last_name
                    }{" "}
                    from <strong>{asset?.name}</strong>?
                  </p>
                </div>
              </div>

              <p className="text-gray-600 text-sm">
                This action will unassign the driver from the vehicle. The driver
                will become available for assignment to other vehicles.
              </p>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowUnassignConfirmModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmUnassign}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting ? "Removing..." : "Remove Driver"}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </div>

      {/* Floating AI Chat — visible on sensor data tab */}
      {activeTab === "sensors" && (
        <FloatingChatButton
          onSendMessage={handleChatMessage}
          messages={chatMessages}
          isLoading={isChatLoading}
        />
      )}
    </div>
  );
}
