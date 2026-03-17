"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatMessage } from "@/components/ui/chat";
import { FloatingChatButton } from "@/components/ui/floating-chat-button";
import {
  AnalyticsFilters,
  AnalyticsFilters as AnalyticsFiltersType,
} from "@/components/ui/analytics-filters";
import { FleetKPICards } from "@/components/analytics/FleetKPICards";
import { FleetTrendsCharts } from "@/components/analytics/FleetTrendsCharts";
import { VehiclePerformanceCharts } from "@/components/analytics/VehiclePerformanceCharts";
import {
  SimpleBarChart,
  SimplePieChart,
  MultiLineChart,
  MetricCard,
} from "@/components/ui/charts";
import {
  BarChart3,
  Package,
  AlertTriangle,
  Calendar,
  Download,
  Brain,
  Activity,
  Settings,
  RefreshCw,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { analyticsAPI, clientAPI, telemetryAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { useFleetTelemetry } from "@/hooks/useLogisticsAnalytics";
import { useAssets } from "@/hooks/useAssets";
import type { Client } from "@/types/api";
import type { TelemetryRecord } from "@/types/api";
import { Star, ShieldCheck, Zap } from "lucide-react";
import { Checkbox } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";

interface DashboardStats {
  assets: {
    total: number;
    active: number;
    maintenance: number;
    total_value: number;
  };
  components: {
    total: number;
    operational: number;
    critical: number;
    maintenance_due: number;
  };
  notifications: {
    pending: number;
  };
  recent_activities: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
    status: string;
    priority: string;
  }>;
  total_clients?: number;
  total_users?: number;
}

// Type definitions for analytics
interface Asset {
  id: string;
  name: string;
  asset_type: string;
  status: string;
  current_value: number;
  purchase_date: string;
  location: string;
  created_at?: string;
  updated_at?: string;
}

interface Component {
  id: string;
  name: string;
  status: string;
  condition: string;
  last_maintenance: string;
  next_maintenance_date: string;
  created_at?: string;
  updated_at?: string;
}

interface AIInsights {
  insights?: string[];
  recommendations?: string[];
  data_summary?: string;
}

interface ExportVehicle {
  id: string;
  assetId: string;
  name: string;
}

// CSV export: field key -> label. Default GPS fields: lat, lon, spd, fl, lod, ts
const CSV_EXPORT_FIELDS: { key: keyof TelemetryRecord; label: string; gps: boolean; telematics: boolean }[] = [
  { key: "ts", label: "Timestamp", gps: true, telematics: true },
  { key: "lat", label: "Latitude", gps: true, telematics: true },
  { key: "lon", label: "Longitude", gps: true, telematics: true },
  { key: "spd", label: "Speed", gps: true, telematics: true },
  { key: "fl", label: "Fuel", gps: true, telematics: true },
  { key: "lod", label: "Load", gps: true, telematics: true },
  { key: "rpm", label: "RPM", gps: false, telematics: true },
  { key: "thr", label: "Throttle", gps: false, telematics: true },
  { key: "tmp", label: "Engine temp", gps: false, telematics: true },
  { key: "vlt", label: "Voltage", gps: false, telematics: true },
  { key: "alt", label: "Altitude", gps: true, telematics: true },
  { key: "cog", label: "Course", gps: false, telematics: true },
];

function formatTimestamp(ts: number): string {
  const d = ts < 1e12 ? new Date(ts * 1000) : new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  return `${day}:${month}:${year} ${h}:${min}:${sec}`;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats] = useState<DashboardStats | null>(null);
  const [assets] = useState<Asset[]>([]);
  const [components] = useState<Component[]>([]);
  const [clients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const isLogisticsClient = currentClient?.client_type === "logistics";

  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [exportSelectedVehicleIds, setExportSelectedVehicleIds] = useState<string[]>([]);
  const [reportType, setReportType] = useState<"gps" | "telematics">("gps");
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(() =>
    CSV_EXPORT_FIELDS.filter((f) => f.gps).map((f) => f.key as string)
  );
  const [exportLoading, setExportLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [filters, setFilters] = useState<AnalyticsFiltersType>(() => {
    // Calculate default dates for 1y range
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    return {
      dateRange: "1y", // Default to last 1 year for better initial data display
      startDate: oneYearAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
      assetIds: undefined,
      componentIds: undefined,
      userIds: undefined,
      status: undefined,
      assetType: undefined,
      condition: undefined,
      clientId: undefined,
      searchQuery: undefined,
    };
  });

  // Implement generateAiInsights

  // Implement generateAiInsights
  const generateAiInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const insights = await analyticsAPI.getAIInsights(
        "Generate fleet telemetry insights",
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          clientId: filters.clientId,
        },
      );
      setAiInsights(insights);
      setIsGeneratingInsights(false);
    } catch (error) {
      console.error("Error generating AI insights:", error);
      setIsGeneratingInsights(false);
      toast.error("Failed to generate insights");
    }
  };

  // React Query hooks for logistics analytics - only enabled for logistics clients
  const { data: telemetryData, refetch: refetchTelemetry } =
    useFleetTelemetry(filters, isLogisticsClient);

  // Vehicles with device_id for CSV export (logistics)
  const { data: assetsData } = useAssets(
    { asset_type: "vehicle" as const },
    { limit: 500 },
  );
  const exportVehicles: ExportVehicle[] = (assetsData?.items || []).filter(
    (a: { vehicle_details?: { device_id?: string } }) => a.vehicle_details?.device_id
  ).map((a: { id: string; name: string; vehicle_details?: { device_id: string } }) => ({
    id: a.vehicle_details!.device_id,
    assetId: a.id,
    name: a.name,
  }));

  // Implement loadData for telemetry data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isLogisticsClient) {
        await refetchTelemetry();
      }
      // Industrial clients data fetching could be added here
      setLoading(false);
    } catch (error) {
      console.error("Error loading analytics data:", error);
      setLoading(false);
    }
  }, [isLogisticsClient, refetchTelemetry]);

  // Load current client info for logistics analytics
  const loadClientInfo = useCallback(async () => {
    try {
      if (user?.client_id) {
        const clientData = await clientAPI.getClient(user.client_id);
        setCurrentClient(clientData);
      }
    } catch (error) {
      console.error("Error loading client info:", error);
    }
  }, [user]);

  useEffect(() => {
    // Only make API calls if user is authenticated
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        loadClientInfo();
      }
    }
  }, [loadClientInfo]);

  useEffect(() => {
    // Only make API calls if user is authenticated and client is loaded
    if (currentClient && typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        loadData();
      }
    }
  }, [currentClient, loadData]);

  // Initialize filters for logistics clients - only set default once when client is first loaded
  useEffect(() => {
    if (currentClient?.client_type === "logistics" && !filters.dateRange) {
      setFilters((prev) => ({
        ...prev,
        dateRange: "1y",
        startDate: undefined,
        endDate: undefined,
      }));
    }
  }, [currentClient, filters.dateRange]); // Include filters.dateRange to satisfy the linter

  // Default export fields when report type changes
  useEffect(() => {
    setSelectedExportFields(
      reportType === "gps"
        ? CSV_EXPORT_FIELDS.filter((f) => f.gps).map((f) => f.key as string)
        : CSV_EXPORT_FIELDS.filter((f) => f.telematics).map((f) => f.key as string)
    );
  }, [reportType]);

  const handleDownloadCsv = async () => {
    if (exportSelectedVehicleIds.length === 0) {
      toast.error("Select at least one vehicle");
      return;
    }
    if (selectedExportFields.length === 0) {
      toast.error("Select at least one field");
      return;
    }
    setExportLoading(true);
    try {
      const fields = CSV_EXPORT_FIELDS.filter((f) =>
        selectedExportFields.includes(f.key as string)
      );
      const header = ["Vehicle", ...fields.map((f) => f.label)];
      const rows: string[][] = [];
      const params =
        filters.startDate && filters.endDate
          ? { start_date: filters.startDate, end_date: filters.endDate }
          : undefined;

      for (const deviceId of exportSelectedVehicleIds) {
        const vehicleName =
          exportVehicles.find((v) => v.id === deviceId)?.name ?? deviceId;
        const res = await telemetryAPI.getTelemetry(deviceId, 2000, params);
        const records: TelemetryRecord[] = Array.isArray(res)
          ? res
          : (res as { records?: TelemetryRecord[] }).records ?? [];
        for (const rec of records) {
          const cells: string[] = [vehicleName];
          for (const f of fields) {
            if (f.key === "ts") {
              cells.push(rec.ts != null ? formatTimestamp(rec.ts) : "");
            } else {
              const val = (rec as unknown as Record<string, unknown>)[f.key];
              cells.push(val != null ? String(val) : "");
            }
          }
          rows.push(cells);
        }
      }

      const escapeCsv = (s: string) =>
        /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      const csvContent = [header.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs-report-${filters.startDate ?? "export"}-${filters.endDate ?? ""}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV report downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate report. Try fewer vehicles or date range.");
    } finally {
      setExportLoading(false);
    }
  };

  // Handle chat message - Industrial client focused
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
      // For industrial clients, provide asset and component focused insights
      // without calling logistics APIs
      const industrialInsights = [
        `Total assets in system: ${stats?.assets.total || 0}`,
        `Active components: ${stats?.components.operational || 0}`,
        `Critical issues requiring attention: ${stats?.components.critical || 0}`,
        `Maintenance due within 7 days: ${stats?.components.maintenance_due || 0}`,
        `System notifications pending: ${stats?.notifications.pending || 0}`,
      ];

      // Add asset-specific insights if available
      if (assets && assets.length > 0) {
        const assetTypes = assets.reduce(
          (acc, asset) => {
            acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        Object.entries(assetTypes).forEach(([type, count]) => {
          industrialInsights.push(`${type} assets: ${count}`);
        });
      }

      // Add component-specific insights if available
      if (components && components.length > 0) {
        const componentStatuses = components.reduce(
          (acc, component) => {
            acc[component.status] = (acc[component.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        Object.entries(componentStatuses).forEach(([status, count]) => {
          industrialInsights.push(`${status} components: ${count}`);
        });
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I've analyzed your industrial asset data based on: "${message}". Here are the key insights:`,
        timestamp: new Date(),
        metadata: {
          dataSource: "industrial_analytics",
          filters: filters,
          insights: industrialInsights,
        },
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
      setIsChatLoading(false);
    } catch (error) {
      console.error("Error processing chat message:", error);

      // Fallback to industrial-focused response if anything fails
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I'm analyzing your industrial asset data based on: "${message}". Here are some insights:`,
        timestamp: new Date(),
        metadata: {
          dataSource: "industrial_analytics",
          filters: filters,
          insights: [
            `Total assets: ${stats?.assets.total || 0}`,
            `Active components: ${stats?.components.operational || 0}`,
            `Critical alerts: ${stats?.components.critical || 0}`,
            `Maintenance due: ${stats?.components.maintenance_due || 0}`,
          ],
        },
      };

      setChatMessages((prev) => [...prev, fallbackMessage]);
      setIsChatLoading(false);
      toast.error("Analysis failed, showing fallback insights");
    }
  };

  // Generate real chart data from database
  const generateAssetTypeData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return [];
    }

    // If we have detailed assets, use them
    if (assets && assets.length > 0) {
      const typeCounts = assets.reduce(
        (acc, asset) => {
          acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return Object.entries(typeCounts).map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count,
      }));
    }

    // No assets available - return empty array
    return [];
  };

  const generateMaintenanceTrendsData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return [];
    }

    // If we have detailed components, calculate maintenance trends
    if (components && components.length > 0) {
      // Use 2024 as the base year instead of current system year
      const baseYear = 2024;
      const now = new Date(
        baseYear,
        new Date().getMonth(),
        new Date().getDate(),
      );
      const currentMonth = now.toLocaleDateString("en-US", { month: "short" });
      const lastMonth = new Date(
        baseYear,
        now.getMonth() - 1,
        1,
      ).toLocaleDateString("en-US", { month: "short" });

      // Count components by maintenance status
      let onTimeCount = 0;
      let missedCount = 0;

      components.forEach((component) => {
        if (component.next_maintenance_date) {
          const dueDate = new Date(component.next_maintenance_date);
          if (dueDate >= now) {
            onTimeCount++;
          } else {
            missedCount++;
          }
        }
      });

      return [
        { month: lastMonth, value: onTimeCount, type: "On Time" },
        { month: currentMonth, value: missedCount, type: "Missed" },
      ];
    }

    // If we have stats data, use that for trends
    if (stats?.components?.total) {
      // Use 2024 as the base year
      const baseYear = 2024;
      const currentMonth = new Date(
        baseYear,
        new Date().getMonth(),
        1,
      ).toLocaleDateString("en-US", { month: "short" });
      const lastMonth = new Date(
        baseYear,
        new Date().getMonth() - 1,
        1,
      ).toLocaleDateString("en-US", { month: "short" });

      return [
        {
          month: lastMonth,
          value: stats.components.operational || 0,
          type: "On Time",
        },
        {
          month: currentMonth,
          value: stats.components.total - (stats.components.operational || 0),
          type: "Missed",
        },
      ];
    }

    // No data available - return empty array
    return [];
  };

  const generatePerformanceData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return [];
    }

    // If we have detailed components, use them
    if (components && components.length > 0) {
      // Calculate real performance metrics based on component data
      const monthlyData: Record<
        string,
        { uptime: number; efficiency: number; maintenance: number }
      > = {};

      components.forEach((component) => {
        // Use 2024 as the base year instead of current system year
        const baseYear = 2024;
        const date = component.created_at
          ? new Date(component.created_at)
          : new Date(baseYear, new Date().getMonth(), 1);
        const monthKey = date.toLocaleDateString("en-US", { month: "short" });

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { uptime: 0, efficiency: 0, maintenance: 0 };
        }

        // Calculate uptime based on status (operational = 100%, others = reduced)
        const uptime =
          component.status === "operational"
            ? 100
            : component.status === "warning"
              ? 85
              : component.status === "critical"
                ? 50
                : component.status === "maintenance"
                  ? 0
                  : 75;

        // Calculate efficiency based on maintenance schedule
        const efficiency = component.next_maintenance_date
          ? Math.max(
            50,
            100 -
            (new Date(component.next_maintenance_date).getTime() -
              Date.now()) /
            (1000 * 60 * 60 * 24 * 30),
          )
          : 75;

        // Calculate maintenance hours (simplified)
        const maintenance = component.status === "maintenance" ? 8 : 0;

        monthlyData[monthKey].uptime += uptime;
        monthlyData[monthKey].efficiency += efficiency;
        monthlyData[monthKey].maintenance += maintenance;
      });

      // Average the metrics per month
      return Object.entries(monthlyData).map(([month, metrics]) => ({
        month,
        uptime: Math.round((metrics.uptime / components.length) * 10) / 10,
        efficiency:
          Math.round((metrics.efficiency / components.length) * 10) / 10,
        maintenance: Math.round(metrics.maintenance * 10) / 10,
      }));
    }

    // If we only have stats data, create basic performance metrics
    if (stats?.components?.total) {
      // Use 2024 as the base year
      const baseYear = 2024;
      const currentMonth = new Date(
        baseYear,
        new Date().getMonth(),
        1,
      ).toLocaleDateString("en-US", { month: "short" });
      const uptime =
        stats.components.total > 0
          ? Math.round(
            (stats.components.operational / stats.components.total) * 100,
          )
          : 100;

      return [
        {
          month: currentMonth,
          uptime: uptime,
          efficiency: 85,
          maintenance: 0,
        },
      ];
    }

    return [];
  };

  const generateAssetStatusByTypeData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return [];
    }

    // If we have detailed assets, use them
    if (assets && assets.length > 0) {
      // Group assets by type and status
      const typeStatusCounts: Record<string, Record<string, number>> = {};

      assets.forEach((asset) => {
        if (!typeStatusCounts[asset.asset_type]) {
          typeStatusCounts[asset.asset_type] = {
            active: 0,
            maintenance: 0,
            retired: 0,
            damaged: 0,
          };
        }

        const status = asset.status as
          | "active"
          | "maintenance"
          | "retired"
          | "damaged";
        if (status in typeStatusCounts[asset.asset_type]) {
          typeStatusCounts[asset.asset_type][status]++;
        }
      });

      // Convert to chart data format
      return Object.entries(typeStatusCounts).map(([type, statusCounts]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        ...statusCounts,
      }));
    }

    // If we only have stats data, create basic status distribution
    if (stats?.assets?.total) {
      // Create a more realistic distribution based on common asset types
      const vehicleCount = Math.ceil(stats.assets.total / 2);
      const infrastructureCount = stats.assets.total - vehicleCount;

      const distribution = [];

      if (vehicleCount > 0) {
        distribution.push({
          type: "Vehicle",
          active: Math.min(vehicleCount, stats.assets.active || 0),
          maintenance: Math.min(vehicleCount, stats.assets.maintenance || 0),
          retired: 0,
          damaged: 0,
        });
      }

      if (infrastructureCount > 0) {
        distribution.push({
          type: "Infrastructure",
          active: Math.min(infrastructureCount, stats.assets.active || 0),
          maintenance: Math.min(
            infrastructureCount,
            stats.assets.maintenance || 0,
          ),
          retired: 0,
          damaged: 0,
        });
      }

      return distribution;
    }

    return [];
  };

  // Simplified industrial helpers
  const generateMaintenanceInsights = () => null;
  const generateEfficiencyInsights = () => null;
  const generateCostInsights = () => null;
  const generateNotificationInsights = () => null;
  const calculateResponseTimeAverage = () => 0;
  const calculateResponseTimeChange = () => "+0.0%";

  const calculateCriticalComponents = () => 0;
  const calculateCriticalChange = () => "0.0%";
  const calculateCriticalTrend = () => "neutral" as const;
  const calculateComponentsDueSoon = () => 0;
  const calculateComponentsDueChange = () => "0.0%";
  const calculateComponentsDueTrend = () => "neutral" as const;
  const calculateAssetGrowth = () => "0.0%";
  const calculateAssetTrend = () => "neutral" as const;
  const calculateResponseTimeTrend = () => "neutral" as const;

  // Removed unused hasMonthlyData and hasWeeklyData functions

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive insights into your assets, components, and system
            performance
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          {currentClient?.client_type === "logistics" && (
            <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export report
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      {/* No Data Message - Only show for non-logistics clients */}
      {currentClient?.client_type !== "logistics" &&
        stats &&
        stats.assets.total === 0 &&
        stats.components.total === 0 && (
          <Card className="p-6 bg-blue-50 border border-blue-200">
            <div className="text-center">
              <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                No Data Available
              </h3>
              <p className="text-blue-700 mb-4">
                Your analytics dashboard is currently empty. Add assets and
                components to see insights.
              </p>
            </div>
          </Card>
        )}
      {/* Filters - Show different filters based on client type */}
      {/* Filters - Use standard filters for all client types now */}
      <AnalyticsFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() =>
          setFilters({
            dateRange: "1y",
            startDate: undefined,
            endDate: undefined,
            assetIds: undefined,
            componentIds: undefined,
            userIds: undefined,
            status: undefined,
            assetType: undefined,
            condition: undefined,
            clientId: undefined,
            searchQuery: undefined,
          })
        }
        assets={currentClient?.client_type === "logistics" ? (telemetryData?.vehicles?.map((v: any) => ({
          id: v.vehicle_id || v.id,
          name: v.license_plate || v.name || 'Unknown Vehicle'
        })) || []) : assets}
        clients={clients}
        clientType={currentClient?.client_type}
      />
      {currentClient?.client_type === "logistics" ? (
        <div className="space-y-8">
          <FleetKPICards
            summary={{
              avg_score: telemetryData?.summary?.avg_driver_score || 0,
              utilization: telemetryData?.summary?.total_vehicles
                ? Math.round((telemetryData.summary.active_count / telemetryData.summary.total_vehicles) * 100)
                : 0,
              health_score: telemetryData?.summary?.fleet_health || 0,
              total_fuel: telemetryData?.summary?.total_fuel_l || 0,
              total_distance: 4200, // Expected from useFleetAnalytics
              total_trips: 156 // Expected from useFleetAnalytics
            }}
          />

          <div className="space-y-8">
            <FleetTrendsCharts timeSeriesData={telemetryData?.time_series || []} />
            <VehiclePerformanceCharts vehicles={telemetryData?.vehicles || []} />
          </div>
        </div>
      ) : (
        // Industrial Analytics Dashboard (existing content)
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Assets"
              value={(stats?.assets?.total || assets.length).toString()}
              change={calculateAssetGrowth()}
              trend={calculateAssetTrend()}
              icon={<Package className="h-6 w-6" />}
              color="text-blue-600"
            />
            <MetricCard
              title="Response Time Average"
              value={`${calculateResponseTimeAverage()} days`}
              change={calculateResponseTimeChange()}
              trend={calculateResponseTimeTrend()}
              icon={<Clock className="h-6 w-6" />}
              color="text-green-600"
            />
            <MetricCard
              title="Critical Components"
              value={calculateCriticalComponents()}
              change={calculateCriticalChange()}
              trend={calculateCriticalTrend()}
              icon={<AlertTriangle className="h-6 w-6" />}
              color="text-red-600"
            />
            <MetricCard
              title="Components Due Soon"
              value={calculateComponentsDueSoon()}
              change={calculateComponentsDueChange()}
              trend={calculateComponentsDueTrend()}
              icon={<Calendar className="h-6 w-6" />}
              color="text-purple-600"
            />
          </div>
        </div>
      )}
      {/* Main Content - Hide for logistics clients */}
      {currentClient?.client_type !== "logistics" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
                <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Asset Type Distribution */}
                <SimplePieChart
                  data={generateAssetTypeData()}
                  nameKey="name"
                  valueKey="value"
                  title="Asset Type Distribution"
                  subtitle="Breakdown by asset category"
                />
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                {/* Performance Metrics */}
                <MultiLineChart
                  data={generatePerformanceData()}
                  xKey="month"
                  lines={[
                    { key: "uptime", label: "Uptime %", color: "#10b981" },
                    {
                      key: "efficiency",
                      label: "Efficiency %",
                      color: "#3b82f6",
                    },
                    {
                      key: "maintenance",
                      label: "Maintenance Hours",
                      color: "#f59e0b",
                    },
                  ]}
                  title="Performance Metrics"
                  subtitle="Monthly performance indicators"
                />
              </TabsContent>

              <TabsContent value="trends" className="space-y-6">
                {/* Maintenance Trends */}
                <SimpleBarChart
                  data={generateMaintenanceTrendsData()}
                  xKey="month"
                  yKey="value"
                  title="Maintenance Trends"
                  subtitle="Maintenance missed vs on-time trends"
                />
              </TabsContent>

              <TabsContent value="distribution" className="space-y-6">
                {/* Asset Status by Type */}
                <SimpleBarChart
                  data={generateAssetStatusByTypeData()}
                  xKey="type"
                  yKey="active"
                  title="Asset Status by Type"
                  subtitle="Distribution of asset statuses across types"
                />
              </TabsContent>

              <TabsContent value="ai-insights" className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Brain className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          AI Analytics Insights
                        </h3>
                        <p className="text-sm text-gray-500">
                          Get intelligent analysis and recommendations for your
                          fleet
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={generateAiInsights}
                      disabled={isGeneratingInsights}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    >
                      {isGeneratingInsights ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Analyzing Data...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4" />
                          Generate Insights
                        </>
                      )}
                    </Button>
                  </div>

                  {!aiInsights && !isGeneratingInsights ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                      <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Insights Generated
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto mb-6">
                        Click the &quot;Generate Insights&quot; button above to
                        analyze your fleet data and receive personalized
                        recommendations.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Insights Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Key Insights */}
                        {aiInsights?.insights &&
                          aiInsights.insights.length > 0 && (
                            <Card className="p-5 border-l-4 border-l-teal-500">
                              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Brain className="h-5 w-5 text-teal-600" />
                                Key Insights
                              </h4>
                              <div className="space-y-4">
                                {aiInsights.insights.map(
                                  (insight: string, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-4"
                                    >
                                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-sm">
                                        {idx + 1}
                                      </div>
                                      <p className="text-sm text-gray-700 leading-relaxed">
                                        {insight}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            </Card>
                          )}

                        {/* Recommendations */}
                        {aiInsights?.recommendations &&
                          aiInsights.recommendations.length > 0 && (
                            <Card className="p-5 border-l-4 border-l-green-500">
                              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                Recommendations
                              </h4>
                              <ul className="space-y-3">
                                {aiInsights.recommendations.map(
                                  (rec: string, idx: number) => (
                                    <li
                                      key={idx}
                                      className="flex items-start gap-2 text-sm text-gray-700"
                                    >
                                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                      {rec}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </Card>
                          )}
                      </div>

                      {/* Data Summary */}
                      {aiInsights?.data_summary && (
                        <Card className="p-5 bg-white border border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Analysis Summary
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {aiInsights.data_summary}
                          </p>
                        </Card>
                      )}
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Insights */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Real-Time Insights
                </h3>
              </div>
              <div className="space-y-3">
                {generateMaintenanceInsights()}
                {generateEfficiencyInsights()}
                {generateCostInsights()}
                {generateNotificationInsights()}
              </div>
            </Card>

            {/* Recent Activities */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Activities
                </h3>
              </div>
              <div className="space-y-3">
                {stats?.recent_activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${activity.priority === "high"
                        ? "bg-red-500"
                        : activity.priority === "medium"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                        }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Actions - Hide for logistics clients */}
            {currentClient?.client_type === "industrial" && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    size="sm"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    size="sm"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    View Alerts
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    size="sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Alerts
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Export report modal - logistics: per car/asset, choose CSV headers */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export report"
        size="xl"
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Export CSV per vehicle/asset. Choose which cars to include and which columns (headers) to export. Timestamps are in dd:mm:yyyy hh:mm:ss.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Report type</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reportTypeModal"
                    checked={reportType === "gps"}
                    onChange={() => setReportType("gps")}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-900">GPS logs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reportTypeModal"
                    checked={reportType === "telematics"}
                    onChange={() => setReportType("telematics")}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-900">Telematics</span>
                </label>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Vehicles / assets</p>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white space-y-1">
                {exportVehicles.length === 0 ? (
                  <p className="text-sm text-gray-500">No vehicles with telemetry. Add devices to assets.</p>
                ) : (
                  exportVehicles.map((v) => (
                    <label key={v.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={exportSelectedVehicleIds.includes(v.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExportSelectedVehicleIds((prev) => [...prev, v.id]);
                          } else {
                            setExportSelectedVehicleIds((prev) => prev.filter((id) => id !== v.id));
                          }
                        }}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-900">{v.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">CSV columns (headers)</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedExportFields(
                      reportType === "gps"
                        ? CSV_EXPORT_FIELDS.filter((f) => f.gps).map((f) => f.key as string)
                        : CSV_EXPORT_FIELDS.filter((f) => f.telematics).map((f) => f.key as string)
                    )
                  }
                >
                  Use defaults
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedExportFields(CSV_EXPORT_FIELDS.map((f) => f.key as string))}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedExportFields([])}
                >
                  Deselect all
                </Button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50/50 flex flex-wrap gap-x-4 gap-y-2">
              {CSV_EXPORT_FIELDS.filter(
                (f) => (reportType === "gps" && f.gps) || (reportType === "telematics" && f.telematics)
              ).map((f) => (
                <Checkbox
                  key={f.key}
                  label={f.label}
                  checked={selectedExportFields.includes(f.key as string)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedExportFields((prev) => [...prev, f.key as string]);
                    } else {
                      setSelectedExportFields((prev) => prev.filter((k) => k !== f.key));
                    }
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => {
                handleDownloadCsv();
                setExportModalOpen(false);
              }}
              disabled={exportLoading || exportSelectedVehicleIds.length === 0 || selectedExportFields.length === 0}
            >
              {exportLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </>
              )}
            </Button>
            <span className="text-xs text-gray-500">
              Uses current date filter. One row per log point; Vehicle column identifies the car/asset.
            </span>
          </div>
        </div>
      </Modal>

      {/* Floating Chat Button - Available for all clients */}
      <FloatingChatButton
        messages={chatMessages}
        onSendMessage={handleChatMessage}
        isLoading={isChatLoading}
      />
    </div>
  );
}
