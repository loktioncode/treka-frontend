"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuickStats } from "@/components/ui/stats-card";
import { RoleBadge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import { analyticsAPI } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Wrench,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Building2,
  BarChart3,
  Zap,
  Shield,
  RefreshCw,
  Navigation,
  Activity,
  Map as MapIcon,

} from "lucide-react";
import { SmartLink } from "@/components/SmartLink";
import { useClient } from "@/hooks/useClients";
import { useFleetTelemetry } from "@/hooks/useLogisticsAnalytics";
import { useMqttTracking } from "@/hooks/useMqttTracking";
import { getDrivingStatus } from "@/lib/driving-status";
import { useAssets } from "@/hooks/useAssets";

import { DriverScoreCard } from "@/components/dashboard/DriverScoreCard";
import { formatVehicleFuelLevel } from "@/lib/telemetry-fuel";

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

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Get current user's client information to determine if they're a logistics client
  const { data: currentClient } = useClient(
    user?.client_id || "",
    !!user?.client_id,
  );

  const {
    data: fleetTelemetry,
    refetch: refetchFleetTelemetry,
    isFetching: fleetTelemetryFetching,
  } = useFleetTelemetry(
    undefined,
    !!currentClient && currentClient.client_type === "logistics",
  );
  const { vehicleList, vehicles } = useMqttTracking();
  const { data: assetsData } = useAssets(
    { asset_type: "vehicle" as any },
    { limit: 500 },
  );

  // Build a map from device_id -> { name, plate } using assets data
  const deviceToVehicle = useMemo(() => {
    const map: Record<string, { name: string; plate: string }> = {};
    if (assetsData?.items) {
      for (const asset of assetsData.items) {
        const did = asset.vehicle_details?.device_id;
        if (did) {
          map[did] = {
            name: asset.name,
            plate: asset.vehicle_details?.license_plate || "",
          };
        }
      }
    }
    return map;
  }, [assetsData]);

  const connectedVehicles = useMemo(
    () =>
      vehicleList.filter(
        (v) =>
          vehicles[v.device_id]?.status === "online" &&
          getDrivingStatus(v.last_record) === "moving" &&
          deviceToVehicle[v.device_id] // Only show devices mapped to an asset
      ),
    [vehicleList, vehicles, deviceToVehicle]
  );

  const lastActiveVehicles = useMemo(() => {
    const withTime = vehicleList
      .filter((v) => deviceToVehicle[v.device_id]) // Only show devices mapped to an asset
      .map((v) => {
        const t = Date.parse(v.last_update);
        return { v, t: Number.isFinite(t) ? t : 0 };
      })
      .sort((a, b) => b.t - a.t);
    return withTime.slice(0, 5).map((x) => x.v);
  }, [vehicleList, deviceToVehicle]);


  const loadDashboardStats = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        // Only call analytics API for logistics clients
        if (currentClient?.client_type === "logistics") {
          const stats = await analyticsAPI.getDashboardStats();
          setDashboardStats(stats);
        } else {
          // For industrial clients, set default stats without calling analytics API
          setDashboardStats({
            assets: { total: 0, active: 0, maintenance: 0, total_value: 0 },
            components: {
              total: 0,
              operational: 0,
              critical: 0,
              maintenance_due: 0,
            },
            notifications: { pending: 0 },
            recent_activities: [],
            total_clients: user?.role === "super_admin" ? 0 : undefined,
            total_users: user?.role === "super_admin" ? 0 : undefined,
          });
        }
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
        setError("Failed to load dashboard statistics");
        // Fallback to dummy data on error
        setDashboardStats({
          assets: { total: 0, active: 0, maintenance: 0, total_value: 0 },
          components: {
            total: 0,
            operational: 0,
            critical: 0,
            maintenance_due: 0,
          },
          notifications: { pending: 0 },
          recent_activities: [],
          total_clients: user?.role === "super_admin" ? 0 : undefined,
          total_users: user?.role === "super_admin" ? 0 : undefined,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      user,
      currentClient,
      setLoading,
      setRefreshing,
      setError,
      setDashboardStats,
    ],
  );

  useEffect(() => {
    // Only make API calls if user is authenticated
    if (user && user.id) {
      loadDashboardStats();
    }
  }, [user, loadDashboardStats]);

  const handleRefresh = () => {
    loadDashboardStats(true);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        {/* Analytics charts loading state */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`chart-${i}`} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboardStats) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to Load Dashboard
          </h3>
          <p className="text-gray-600">
            {error || "Failed to load dashboard data"}
          </p>
        </div>
      </div>
    );
  }

  // Logistics clients: 4 main KPI cards (Good Condition, Maintenance Due, Critical Issues, Compliance)
  const logisticsStats =
    currentClient?.client_type === "logistics"
      ? (() => {
        const vehicles = fleetTelemetry?.vehicles || [];
        const goodCondition =
          vehicles.length > 0
            ? vehicles.filter((v: { health?: number }) => (v.health ?? 0) >= 80).length
            : dashboardStats.assets.active;
        const maintenanceDue = dashboardStats.assets.maintenance;
        const criticalCount =
          vehicles.length > 0
            ? vehicles.filter((v: { health?: number }) => (v.health ?? 0) < 50).length
            : 0;
        const complianceScore =
          fleetTelemetry?.summary?.fleet_health ??
          (vehicles.length > 0
            ? Math.round(
              vehicles.reduce((a: number, v: { health?: number }) => a + (v.health ?? 0), 0) /
              vehicles.length
            )
            : 0);
        return [
          {
            title: "Vehicles in Good Condition",
            value: goodCondition.toString(),
            description: "Health ≥80% or active",
            icon: Package,
            color: "green" as const,
            trend: {
              value: `${dashboardStats.assets.total} total`,
              isPositive: goodCondition > 0,
              label: "fleet vehicles",
            },
            onClick: () => router.push("/dashboard/assets"),
          },
          {
            title: "Maintenance Due",
            value: maintenanceDue.toString(),
            description: "Vehicles approaching service threshold",
            icon: Clock,
            color: "yellow" as const,
            trend: {
              value: `${dashboardStats.assets.maintenance} assets`,
              isPositive: maintenanceDue === 0,
              label: "in maintenance",
            },
            onClick: () => router.push("/dashboard/maintenance"),
          },
          {
            title: "Critical Issues",
            value: criticalCount.toString(),
            description: "Require immediate attention",
            icon: AlertTriangle,
            color: "red" as const,
            trend: {
              value: `${criticalCount} critical`,
              isPositive: false,
              label: "needs attention",
            },
            onClick: () => router.push("/dashboard/critical-issues"),
          },
          {
            title: "Overall Compliance",
            value: `${complianceScore}%`,
            description: "Fleet compliance score",
            icon: Shield,
            color: "teal" as const,
            trend: {
              value: complianceScore >= 90 ? "Excellent" : complianceScore >= 70 ? "Good" : "Needs attention",
              isPositive: complianceScore >= 90,
              label: "from telemetry",
            },
            onClick: () => router.push("/dashboard/analytics"),
          },
        ];
      })()
      : [];

  // Create stats array from real data (industrial / super_admin)
  const baseStats = [
    {
      title: "Total Assets",
      value: dashboardStats.assets.total.toString(),
      description: "Active in system",
      icon: Package,
      color: "blue" as const,
      trend: {
        value: `${dashboardStats.assets.active}`,
        isPositive:
          dashboardStats.assets.active > dashboardStats.assets.maintenance,
        label: "active assets",
      },
    },
    {
      title: "Active Components",
      value: dashboardStats.components.operational.toString(),
      description: "Operational status",
      icon: Wrench,
      color: "green" as const,
      trend: {
        value: `${dashboardStats.components.total}`,
        isPositive: true,
        label: "total components",
      },
    },
    {
      title: "Maintenance Due",
      value: dashboardStats.components.maintenance_due.toString(),
      description: "Within 7 days",
      icon: Clock,
      color: "yellow" as const,
      trend: {
        value: `${dashboardStats.assets.maintenance}`,
        isPositive: false,
        label: "assets in maintenance",
      },
    },
    {
      title: "Critical Issues",
      value: dashboardStats.components.critical.toString(),
      description: "Require immediate attention",
      icon: AlertTriangle,
      color: "red" as const,
      trend: {
        value: `${dashboardStats.components.critical}`,
        isPositive: false,
        label: "critical components",
      },
      onClick: () => router.push("/dashboard/critical-issues"),
    },
  ];

  // Add role-specific stats for super admin
  const superAdminStats =
    user?.role === "super_admin"
      ? [
        {
          title: "Total Clients",
          value: dashboardStats.total_clients?.toString() || "0",
          description: "Active organizations",
          icon: Building2,
          color: "purple" as const,
          trend: {
            value: "Active",
            isPositive: true,
            label: "organizations",
          },
        },
        {
          title: "Total Users",
          value: dashboardStats.total_users?.toString() || "0",
          description: "Across all clients",
          icon: Users,
          color: "indigo" as const,
          trend: {
            value: "System-wide",
            isPositive: true,
            label: "access",
          },
        },
        {
          title: "Total Asset Value",
          value: `$${dashboardStats.assets.total_value.toLocaleString()}`,
          description: "All assets combined",
          icon: TrendingUp,
          color: "green" as const,
          trend: {
            value: "Portfolio",
            isPositive: true,
            label: "value",
          },
        },
      ]
      : [];

  const allStats =
    currentClient?.client_type === "logistics"
      ? [...superAdminStats, ...logisticsStats]
      : [...superAdminStats, ...baseStats];

  // Note: recentActivities functionality has been replaced with analytics charts

  // Note: formatTimeAgo function removed as it's no longer needed

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Welcome back, {user?.first_name || "User"}!
            </h1>
            <p className="text-xl text-muted-foreground">
              Here&apos;s an overview of your{" "}
              {user?.role === "super_admin" ? "system" : "assets"} today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <RoleBadge role={user?.role || "user"} />
            <div className="p-3 bg-gradient-to-r from-teal-500 to-teal-700 rounded-full">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <QuickStats stats={allStats} />

      {/* Single Driver View */}
      {user?.role === "driver" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="md:col-span-1">
            <DriverScoreCard />
          </div>
        </motion.div>
      )}

      {/* Fleet Real-time Overview - Only for logistics clients */}
      {currentClient?.client_type === "logistics" && user?.role !== "driver" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="lg:col-span-1 h-full min-h-[220px]">
            <DriverScoreCard fleetAverageScore={fleetTelemetry?.summary?.avg_driver_score || 100} />
          </div>


          <Card className="lg:col-span-2 overflow-hidden border-teal-100 shadow-sm flex flex-col">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-white border-b border-teal-50 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg font-bold text-teal-900">
                  Fleet Live Overview
                </CardTitle>
                <CardDescription>
                  Real-time performance across all vehicles
                </CardDescription>
              </div>
              <SmartLink
                href="/dashboard/map"
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all shadow-sm hover:shadow-md text-sm font-bold"
              >
                <MapIcon className="h-4 w-4" />
                Open Live Map
              </SmartLink>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                    Active Today
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                      <Navigation className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-bold">
                      {fleetTelemetry?.summary?.active_count || 0}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                    Fuel Used (Period)
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-bold">
                      {fleetTelemetry?.summary?.total_fuel_l || 0}L
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-50 to-white border-b border-red-50 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg font-bold text-red-900">
                  Traffic Violations & Risk
                </CardTitle>
                <CardDescription>
                  Speed events & harsh driving summary
                </CardDescription>
              </div>
              <SmartLink
                href="/dashboard/analytics"
                className="text-xs font-medium text-red-600 hover:text-red-800"
              >
                Details
              </SmartLink>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {(() => {
                const safetyData = fleetTelemetry?.safety_incidents || [];
                const totalSpeeding = safetyData.reduce((a: number, d: { braking?: number }) => a + (d.braking ?? 0), 0);
                const totalHarshAccel = safetyData.reduce((a: number, d: { accel?: number }) => a + (d.accel ?? 0), 0);
                const totalCornering = safetyData.reduce((a: number, d: { cornering?: number }) => a + (d.cornering ?? 0), 0);
                const totalEvents = totalSpeeding + totalHarshAccel + totalCornering;
                const riskLevel = totalEvents > 50 ? "High" : totalEvents > 20 ? "Medium" : "Low";
                const riskColor = totalEvents > 50 ? "text-red-600" : totalEvents > 20 ? "text-amber-600" : "text-green-600";
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Risk Level</span>
                      <span className={`text-sm font-bold ${riskColor}`}>{riskLevel}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <p className="text-lg font-bold text-red-700">{totalSpeeding}</p>
                        <p className="text-[10px] text-red-600 font-medium">Hard Brakes</p>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <p className="text-lg font-bold text-amber-700">{totalHarshAccel}</p>
                        <p className="text-[10px] text-amber-600 font-medium">Harsh Accel</p>
                      </div>
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <p className="text-lg font-bold text-orange-700">{totalCornering}</p>
                        <p className="text-[10px] text-orange-600 font-medium">Hard Corners</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t">
                      <span className="text-xs text-gray-500">Total events</span>
                      <span className="text-sm font-bold text-gray-900">{totalEvents}</span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-50 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Last Active Vehicles
                </CardTitle>
                <CardDescription>
                  Last 5 vehicles that sent data (engine off still included)
                </CardDescription>
              </div>
              <SmartLink
                href="/dashboard/map"
                className="text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                View map
              </SmartLink>
            </CardHeader>
            <CardContent className="p-0 max-h-[160px] overflow-y-auto">
              <div className="divide-y">
                {lastActiveVehicles.map((vehicle) => {
                  const linked = deviceToVehicle[vehicle.device_id];
                  const displayLabel = linked?.plate || linked?.name || "Unidentified Asset";
                  const isOnline = vehicles[vehicle.device_id]?.status === "online";
                  return (
                    <div
                      key={vehicle.device_id}
                      className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                          }`}
                          title={isOnline ? "Online" : "Offline / stale"}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {displayLabel}
                          </span>
                          <span className="text-xs text-gray-400 truncate">
                            {vehicle.last_update}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-600 font-bold shrink-0 leading-tight">
                        <p>{vehicle.last_record.spd?.toFixed(0) || 0} km/h</p>
                        <p className="text-amber-800 mt-0.5" title="Fuel level">
                          {formatVehicleFuelLevel(vehicle.last_record)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {lastActiveVehicles.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No vehicle activity yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}


      {/* Quick Actions - Hide for logistics clients */}
      {currentClient?.client_type === "industrial" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Fleet management - Available for all users */}
              <SmartLink
                href="/dashboard/assets"
                className="w-full p-4 text-left rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 transition-all duration-200 group block"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-teal-500 rounded-lg group-hover:bg-teal-600 transition-colors">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-teal-900">
                      Manage Assets
                    </p>
                    <p className="text-sm text-teal-700">
                      View and manage system assets
                    </p>
                  </div>
                  <Zap className="h-4 w-4 text-teal-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </SmartLink>

              {/* User Management - Available for admin and super_admin */}
              {user?.role !== "user" && (
                <SmartLink
                  href="/dashboard/users"
                  className="w-full p-4 text-left rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group block"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-purple-900">
                        Manage Users
                      </p>
                      <p className="text-sm text-purple-700">
                        Add or edit user accounts
                      </p>
                    </div>
                    <Zap className="h-4 w-4 text-purple-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </SmartLink>
              )}

              {/* Client Management - Only for super_admin */}
              {user?.role === "super_admin" && (
                <SmartLink
                  href="/dashboard/clients"
                  className="w-full p-4 text-left rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group block"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900">
                        Manage Clients
                      </p>
                      <p className="text-sm text-blue-700">
                        Manage client organizations
                      </p>
                    </div>
                    <Zap className="h-4 w-4 text-blue-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </SmartLink>
              )}

            </CardContent>
          </Card>
        </motion.div>
      )}

    </div>
  );
}
