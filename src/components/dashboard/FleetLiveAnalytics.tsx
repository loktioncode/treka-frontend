"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import type { LiveVehicle } from "@/hooks/useMqttTracking";

interface FleetVehicle {
  id: string;
  name: string;
  device_id?: string;
  score: number;
  health: number;
  fuel_l?: number;
  status?: string;
}

interface FleetLiveAnalyticsProps {
  vehicleList: LiveVehicle[];
  fleetTelemetry?: {
    summary?: {
      avg_driver_score?: number;
      fleet_health?: number;
      active_count?: number;
      total_vehicles?: number;
      total_fuel_l?: number;
    };
    vehicles?: FleetVehicle[];
  };
  deviceToVehicle: Record<string, { name: string; plate: string }>;
  hasLiveData: boolean;
}

export function FleetLiveAnalytics({
  vehicleList,
  fleetTelemetry,
  deviceToVehicle,
  hasLiveData,
}: FleetLiveAnalyticsProps) {
  const summary = fleetTelemetry?.summary;
  const dbVehicles = fleetTelemetry?.vehicles || [];

  // Map device_id -> health from DB (includes component-adjusted health)
  const deviceToHealth = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of dbVehicles) {
      if (v.device_id != null) m[v.device_id] = v.health;
    }
    return m;
  }, [dbVehicles]);

  const vehicleChartData = useMemo(() => {
    if (hasLiveData && vehicleList.length > 0) {
      return vehicleList.map((v) => {
        const r = v.last_record;
        const info = deviceToVehicle[v.device_id];
        const telemetryOnlyHealth =
          r.vlt && r.vlt >= 13.5 ? 95 : r.vlt && r.vlt < 12.5 ? 40 : 75;
        const health = deviceToHealth[v.device_id] ?? telemetryOnlyHealth;
        return {
          name: info?.name || v.device_id?.slice(0, 8) || "Vehicle",
          health,
        };
      });
    }
    return dbVehicles.map((v) => ({
      name: v.name,
      health: v.health,
    }));
  }, [hasLiveData, vehicleList, dbVehicles, deviceToVehicle, deviceToHealth]);

  const fleetHealth =
    summary?.fleet_health ??
    (vehicleChartData.length > 0
      ? Math.round(
          vehicleChartData.reduce((a, v) => a + v.health, 0) /
            vehicleChartData.length
        )
      : 0);

  const narrative = useMemo(() => {
    const total = vehicleChartData.length;
    const healthy = vehicleChartData.filter((v) => v.health >= 80).length;
    const critical = vehicleChartData.filter((v) => v.health < 50).length;
    if (total === 0)
      return "Connect vehicles to see your fleet story unfold.";
    if (critical > 0)
      return `${critical} vehicle${critical > 1 ? "s" : ""} need${critical === 1 ? "s" : ""} immediate attention.`;
    if (healthy === total)
      return "All vehicles are in excellent condition.";
    return `${healthy} of ${total} vehicles are healthy. ${total - healthy} need attention.`;
  }, [vehicleChartData]);

  return (
    <div className="space-y-8">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${hasLiveData ? "bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" : "bg-slate-400"}`}
        />
        <span className="text-sm font-medium text-slate-600">
          {hasLiveData
            ? `Live from ${vehicleList.length} device${vehicleList.length > 1 ? "s" : ""}`
            : "Latest data from database"}
        </span>
      </div>

      {/* Story card - Fleet at a glance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-slate-300 text-sm font-medium uppercase tracking-wider mb-1">
                  Fleet snapshot
                </p>
                <p className="text-xl sm:text-2xl font-bold leading-tight">
                  {narrative}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl sm:text-4xl font-bold text-emerald-400">
                    {fleetHealth}%
                  </p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">
                    Fleet health
                  </p>
                </div>
                {summary?.total_vehicles != null && (
                  <div className="text-center">
                    <p className="text-3xl sm:text-4xl font-bold text-white">
                      {summary.active_count ?? 0}/{summary.total_vehicles}
                    </p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                      Active
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
