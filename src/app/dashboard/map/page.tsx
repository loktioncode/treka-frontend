"use client";

import React, { useState, useEffect, useMemo } from "react";
import LiveMap from "@/components/maps/LiveMap";
import { useMapCenter } from "@/hooks/useMapCenter";
import { useMqttTracking, LIVE_STALE_MINUTES } from "@/hooks/useMqttTracking";
import { getDrivingStatus, getDrivingStatusLabel } from "@/lib/driving-status";
import { useDataCache } from "@/contexts/DataCacheContext";
import {
  Car,
  Search,
  Navigation,
  Clock,
  Activity,
  ChevronRight,
  Map as MapIcon,
  Filter,
  Gauge,
  Zap,
  Battery,
  Thermometer,
  Fuel,
  Compass,
  RotateCw,
  ArrowUp,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingChatButton } from "@/components/ui/floating-chat-button";
import { type ChatMessage } from "@/components/ui/chat";
import { analyticsAPI } from "@/services/api";
import type { Asset } from "@/types/api";

export default function FleetMapPage() {
  const mapCenter = useMapCenter();
  const { vehicleList, isConnected, vehicles } = useMqttTracking();
  const { assets = [], tripPlans = [] } = useDataCache();
  const [searchQuery, setSearchQuery] = useState("");

  const deviceToVehicle = useMemo(() => {
    const map: Record<string, { name: string; plate: string }> = {};
    for (const asset of assets as Asset[]) {
      const did = asset.vehicle_details?.device_id;
      if (did) {
        map[did] = {
          name: asset.name,
          plate: asset.vehicle_details?.license_plate || "",
        };
      }
    }
    return map;
  }, [assets]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const { encodedRoutes, routePrecision } = useMemo(() => {
    const routes: Record<string, string> = {};
    let precision = 5;
    tripPlans
      .filter((p) => p.route_polyline?.trim())
      .forEach((plan, i) => {
        routes[`plan_${plan.id || i}`] = plan.route_polyline!;
        if (plan.route_polyline_precision != null && i === 0) {
          precision = plan.route_polyline_precision;
        }
      });
    return { encodedRoutes: routes, routePrecision: precision };
  }, [tripPlans]);

  const filteredVehicles = vehicleList.filter((v) => {
    const q = searchQuery.toLowerCase();
    const info = deviceToVehicle[v.device_id];
    const plate = info?.plate?.toLowerCase() ?? "";
    const name = info?.name?.toLowerCase() ?? "";
    return v.device_id.toLowerCase().includes(q) || plate.includes(q) || name.includes(q);
  });

  const selectedVehicle = selectedVehicleId
    ? vehicleList.find((v) => v.device_id === selectedVehicleId)
    : null;

  // New vehicle selected → clear chat so conversation is about this vehicle
  useEffect(() => {
    setChatMessages([]);
  }, [selectedVehicleId]);

  const fmt = (v: number | null | undefined) =>
    v != null ? Number(v).toFixed(3) : null;

  /** Full date + time for last data (e.g. "14 Mar 2025, 15:32:10") */
  const lastDataFmt = (iso: string) =>
    format(new Date(iso), "d MMM yyyy, HH:mm:ss");

  const liveCount = vehicleList.filter((v) => vehicles[v.device_id]?.status === "online").length;
  const offlineCount = vehicleList.length - liveCount;

  const handleChatMessage = async (message: string) => {
    if (!selectedVehicle) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const r = selectedVehicle.last_record;
      const contextLines: string[] = [
        `Device ID: ${selectedVehicle.device_id}`,
        `Last update: ${format(new Date(selectedVehicle.last_update), "HH:mm:ss")}`,
        r.spd != null ? `Speed: ${Number(r.spd).toFixed(3)} km/h` : null,
        r.rpm != null ? `RPM: ${Number(r.rpm).toFixed(3)}` : null,
        r.vlt != null ? `Battery: ${Number(r.vlt).toFixed(3)} V` : null,
        r.tmp != null ? `Coolant: ${Number(r.tmp).toFixed(3)} °C` : null,
        r.thr != null ? `Throttle: ${Number(r.thr).toFixed(3)} %` : null,
        r.lod != null ? `Engine load: ${Number(r.lod).toFixed(3)} %` : null,
        r.fl != null ? `Fuel level: ${Number(r.fl).toFixed(3)} %` : null,
        r.ia_tot != null ? `Total G: ${Number(r.ia_tot).toFixed(3)} g` : null,
        (r.hbk ?? 0) > 0 ? `Harsh braking events in interval: ${r.hbk}` : null,
        (r.hac ?? 0) > 0 ? `Harsh acceleration events: ${r.hac}` : null,
        (r.hco ?? 0) > 0 ? `Hard cornering events: ${r.hco}` : null,
        (r.pot ?? 0) > 0 ? `Pothole impacts: ${r.pot}` : null,
        `Status: ${getDrivingStatusLabel(r)}`,
      ].filter(Boolean) as string[];

      const fullPrompt = `Fleet manager is viewing the live map and selected vehicle ${selectedVehicle.device_id}. They asked: "${message}"

Current live telemetry for this vehicle:
${contextLines.join("\n")}

Provide a short, actionable insight for the fleet manager about this vehicle's current status.`;

      const response = await analyticsAPI.getAIInsights(fullPrompt, {
        device_id: selectedVehicle.device_id,
      });

      const content =
        response?.insights ??
        response?.message ??
        response?.content ??
        (typeof response === "string" ? response : JSON.stringify(response));

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: typeof content === "string" ? content : content.join("\n"),
        timestamp: new Date(),
        metadata: { dataSource: "fleet_live", insights: contextLines.slice(0, 5) },
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const r = selectedVehicle.last_record;
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Live snapshot for **${selectedVehicle.device_id}**: Speed ${fmt(r.spd) ?? "—"} km/h, RPM ${fmt(r.rpm) ?? "—"}, Battery ${fmt(r.vlt) ?? "—"} V. Status: ${getDrivingStatusLabel(r)}. Ask me anything about this vehicle's current status.`,
        timestamp: new Date(),
        metadata: {
          dataSource: "fleet_live",
          insights: [
            `Speed: ${fmt(r.spd) ?? "—"} km/h`,
            `RPM: ${fmt(r.rpm) ?? "—"}`,
            `Battery: ${fmt(r.vlt) ?? "—"} V`,
            `Coolant: ${fmt(r.tmp) ?? "—"} °C`,
            getDrivingStatusLabel(r),
          ],
        },
      };
      setChatMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 border-r bg-white flex flex-col shadow-sm z-10">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-blue-600" />
              Fleet Map
            </h1>
            <Badge
              variant={isConnected ? "success" : "outline"}
              className={
                isConnected
                  ? "bg-green-100 text-green-700 border-green-200"
                  : ""
              }
            >
              {isConnected ? "Live" : "Connecting..."}
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search vehicles..."
              className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              <span>{filteredVehicles.length} Vehicles</span>
            </div>
            <span className="text-[10px]">{liveCount} live · {offlineCount} offline</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredVehicles.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.device_id}
                  onClick={() => setSelectedVehicleId(
                    selectedVehicleId === vehicle.device_id ? null : vehicle.device_id
                  )}
                  className={`p-4 cursor-pointer transition-all hover:bg-blue-50/50 group ${selectedVehicleId === vehicle.device_id
                    ? "bg-blue-50 border-r-4 border-blue-600"
                    : ""
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${vehicles[vehicle.device_id]?.status === "online"
                          ? getDrivingStatus(vehicle.last_record) === "moving"
                            ? "bg-green-100 text-green-600"
                            : getDrivingStatus(vehicle.last_record) === "stationary"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-400"
                          : "bg-gray-100 text-gray-400"
                          }`}
                      >
                        <Car className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-700">
                          {deviceToVehicle[vehicle.device_id]?.plate || deviceToVehicle[vehicle.device_id]?.name || vehicle.device_id}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500" title={lastDataFmt(vehicle.last_update)}>
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{lastDataFmt(vehicle.last_update)}</span>
                        </div>
                        {vehicles[vehicle.device_id]?.status === "online" }
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-transform ${selectedVehicleId === vehicle.device_id
                        ? "rotate-90 text-blue-600"
                        : ""
                        }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-gray-50 p-1.5 rounded-md flex flex-col items-center justify-center">
                      <span className="text-[9px] uppercase text-gray-400 font-bold">
                        Speed
                      </span>
                      <span className="text-xs font-bold text-gray-700">
                        {vehicle.last_record.spd?.toFixed(0) || 0}{" "}
                        <span className="text-[9px] font-normal">km/h</span>
                      </span>
                    </div>
                    <div className="bg-gray-50 p-1.5 rounded-md flex flex-col items-center justify-center">
                      <span className="text-[9px] uppercase text-gray-400 font-bold">
                        Voltage
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        {vehicle.last_record.vlt?.toFixed(1) || 0}V
                      </span>
                    </div>
                  </div>

                  {vehicle.last_record.hbk ? (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 font-medium">
                      <Activity className="h-3 w-3 animate-pulse" />
                      Harsh Event Detected
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="bg-gray-50 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                <Navigation className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">
                No vehicles found matching your search
              </p>
            </div>
          )}
        </div>

        {/* User Stats Summary */}
        <div className="p-4 border-t bg-gray-50 mt-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold">
                Live
              </p>
              <p className="text-lg font-bold text-green-700">
                {liveCount}
              </p>
              <p className="text-[9px] text-gray-500">data in last {LIVE_STALE_MINUTES} min</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold">
                Offline
              </p>
              <p className="text-lg font-bold text-gray-600">
                {offlineCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative bg-gray-200 min-w-0">
        <LiveMap
          deviceId={selectedVehicleId || undefined}
          height="100%"
          onVehicleSelect={setSelectedVehicleId}
          encodedRoutes={encodedRoutes}
          encodedRoutePrecision={routePrecision}
          initialCenter={mapCenter}
          deviceToVehicle={deviceToVehicle}
        />

        {/* Floating Reset Button */}
        {selectedVehicleId && (
          <button
            onClick={() => setSelectedVehicleId(null)}
            className="absolute top-4 right-4 z-10 bg-white shadow-lg border px-4 py-2 rounded-full text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Show Entire Fleet
          </button>
        )}
      </div>

      {/* Right column: Live KPI cards when a vehicle is selected */}
      {selectedVehicleId && selectedVehicle && (
        <div className="w-72 border-l bg-white flex flex-col shadow-sm z-10 overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-600" />
              Live vehicle data
            </h2>
            <p className="text-xs text-gray-500 mt-1 truncate" title={selectedVehicle.device_id}>
              {deviceToVehicle[selectedVehicle.device_id]?.plate || deviceToVehicle[selectedVehicle.device_id]?.name || selectedVehicle.device_id}
            </p>
            <p className="text-[10px] text-gray-600 mt-1 font-medium" title={selectedVehicle.last_update}>
              Last data: {lastDataFmt(selectedVehicle.last_update)}
            </p>
            {vehicles[selectedVehicle.device_id]?.status === "online" ? (
              <Badge className="mt-1 bg-green-100 text-green-700 border-green-200 text-[10px]">Live (last {LIVE_STALE_MINUTES} min)</Badge>
            ) : (
              <Badge variant="outline" className="mt-1 text-gray-500 text-[10px]">Offline / stale</Badge>
            )}
          </div>
          <div className="p-4 space-y-3 flex-1">
            {/* Available CAN  Flespi fields */}
            {(() => {
              const r = selectedVehicle.last_record;
              const canFields: { label: string; value: unknown }[] = [
                { label: "Speed", value: r.spd },
                { label: "RPM", value: r.rpm },
                { label: "Voltage", value: r.vlt },
                { label: "Coolant", value: r.tmp },
                { label: "Fuel", value: r.fl },
                { label: "Load", value: r.lod },
                { label: "Throttle", value: r.thr },
                { label: "Heading", value: r.hdg },
                { label: "Altitude", value: r.alt },
                { label: "Satellites", value: r.nsat },
              ];
              const available = canFields.filter((f) => f.value != null && f.value !== "");
              if (available.length === 0) return null;
              return (
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-3.5 w-3 text-slate-600" />
                      <span className="text-[10px] uppercase text-slate-700 font-bold">Live CAN / Flespi</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-1.5">Available in this session:</p>
                    <div className="flex flex-wrap gap-1">
                      {available.map((f) => (
                        <Badge key={f.label} variant="secondary" className="text-[9px] font-normal bg-slate-200/80 text-slate-700">
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
            {/* Speed */}
            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="h-4 w-4 text-teal-600" />
                  <span className="text-[10px] uppercase text-teal-700 font-bold">Speed</span>
                </div>
                <p className="text-2xl font-bold text-teal-800">
                  {fmt(selectedVehicle.last_record.spd) ?? "—"}{" "}
                  <span className="text-sm font-normal">km/h</span>
                </p>
              </CardContent>
            </Card>

            {/* RPM + Throttle */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Zap className="h-3 w-3 text-amber-600" />
                    <span className="text-[9px] uppercase text-amber-700 font-bold">RPM</span>
                  </div>
                  <p className="text-lg font-bold text-amber-800">
                    {fmt(selectedVehicle.last_record.rpm) ?? "—"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Activity className="h-3 w-3 text-purple-600" />
                    <span className="text-[9px] uppercase text-purple-700 font-bold">Throttle</span>
                  </div>
                  <p className="text-lg font-bold text-purple-800">
                    {selectedVehicle.last_record.thr != null ? `${fmt(selectedVehicle.last_record.thr)}%` : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Load + Fuel */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-pink-50 border-pink-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Gauge className="h-3 w-3 text-pink-600" />
                    <span className="text-[9px] uppercase text-pink-700 font-bold">Load</span>
                  </div>
                  <p className="text-lg font-bold text-pink-800">
                    {selectedVehicle.last_record.lod != null ? `${fmt(selectedVehicle.last_record.lod)}%` : "—"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Fuel className="h-3 w-3 text-green-600" />
                    <span className="text-[9px] uppercase text-green-700 font-bold">Fuel</span>
                  </div>
                  <p className="text-lg font-bold text-green-800">
                    {selectedVehicle.last_record.fl != null ? `${fmt(selectedVehicle.last_record.fl)}%` : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Battery */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Battery className="h-4 w-4 text-blue-600" />
                  <span className="text-[10px] uppercase text-blue-700 font-bold">Battery</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold text-blue-800">
                    {fmt(selectedVehicle.last_record.vlt) ?? "—"} V
                  </p>
                  {selectedVehicle.last_record.vlt != null && (
                    <span className={`text-[10px] font-medium ${selectedVehicle.last_record.vlt > 12 ? "text-green-600" : "text-red-600"}`}>
                      {selectedVehicle.last_record.vlt > 12 ? "Healthy" : "Low"}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Temperatures */}
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="h-4 w-4 text-orange-600" />
                  <span className="text-[10px] uppercase text-orange-700 font-bold">Temperatures</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-gray-400">Coolant</p>
                    <p className="text-sm font-bold text-orange-700">{fmt(selectedVehicle.last_record.tmp) ?? "—"}°C</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400">Intake</p>
                    <p className="text-sm font-bold text-blue-600">{fmt(selectedVehicle.last_record.iat) ?? "—"}°C</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400">Oil</p>
                    <p className="text-sm font-bold text-amber-700">{fmt(selectedVehicle.last_record.oil) ?? "—"}°C</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Heading */}
            <Card className="bg-sky-50 border-sky-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Compass className="h-4 w-4 text-sky-600" />
                  <span className="text-[10px] uppercase text-sky-700 font-bold">Heading</span>
                </div>
                <p className="text-xl font-bold text-sky-800">
                  {selectedVehicle.last_record.hdg != null ? `${selectedVehicle.last_record.hdg.toFixed(0)}°` : "—"}
                </p>
              </CardContent>
            </Card>

            {/* Roll & Pitch */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <RotateCw className="h-3 w-3 text-indigo-600" />
                    <span className="text-[9px] uppercase text-indigo-700 font-bold">Roll</span>
                  </div>
                  <p className="text-lg font-bold text-indigo-800">
                    {selectedVehicle.last_record.rol != null ? `${selectedVehicle.last_record.rol.toFixed(1)}°` : "—"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-violet-50 border-violet-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <ArrowUp className="h-3 w-3 text-violet-600" />
                    <span className="text-[9px] uppercase text-violet-700 font-bold">Pitch</span>
                  </div>
                  <p className="text-lg font-bold text-violet-800">
                    {selectedVehicle.last_record.pit != null ? `${selectedVehicle.last_record.pit.toFixed(1)}°` : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* G-Forces */}
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-red-600" />
                  <span className="text-[10px] uppercase text-red-700 font-bold">G-Forces</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-gray-400">Long.</p>
                    <p className="text-sm font-bold text-red-700">{selectedVehicle.last_record.ia_lg?.toFixed(2) ?? "—"}g</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400">Lateral</p>
                    <p className="text-sm font-bold text-red-700">{selectedVehicle.last_record.ia_lat?.toFixed(2) ?? "—"}g</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400">Total</p>
                    <p className="text-sm font-bold text-red-800">{selectedVehicle.last_record.ia_tot?.toFixed(2) ?? "—"}g</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Harsh events */}
            {(selectedVehicle.last_record.hbk || selectedVehicle.last_record.hac || selectedVehicle.last_record.hco) ? (
              <div className="flex items-center gap-1 text-[10px] text-red-500 bg-red-50 px-2 py-1.5 rounded border border-red-100 font-medium">
                <Activity className="h-3 w-3 animate-pulse" />
                Harsh Event Detected
              </div>
            ) : null}

            {/* Status */}
            <div className={`text-center text-xs font-bold py-2 rounded-lg ${
              getDrivingStatus(selectedVehicle.last_record) === "moving" ? "bg-green-100 text-green-700" :
              getDrivingStatus(selectedVehicle.last_record) === "stationary" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
            }`}>
              ● {getDrivingStatusLabel(selectedVehicle.last_record)}
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Chat — only visible when right panel is closed */}
      {!selectedVehicleId && (
        <FloatingChatButton
          onSendMessage={handleChatMessage}
          messages={chatMessages}
          isLoading={isChatLoading}
        />
      )}
    </div>
  );
}
