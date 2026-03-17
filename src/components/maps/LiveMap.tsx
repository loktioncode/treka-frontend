"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
  FullscreenControl,
} from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMqttTracking, LiveVehicle } from "@/hooks/useMqttTracking";
import type { TelemetryRecord } from "@/types/api";
import { decodeToGeoJSON } from "@/lib/polyline";
import { getDrivingStatus, getDrivingStatusLabel } from "@/lib/driving-status";
import { Car, AlertTriangle, Info, MapPin } from "lucide-react";
import { format } from "date-fns";

/** Vehicle status for map icon: red = serious, orange = warning, gray = engine off, green = moving, blue = stationary (engine on) */
function getVehicleStatus(record: TelemetryRecord): "serious" | "warning" | "ok" | "stationary" | "idle" {
  const vlt = record.vlt ?? 0;
  const tmp = record.tmp ?? 0;
  const hbk = record.hbk ?? 0;
  const hac = record.hac ?? 0;
  const hco = record.hco ?? 0;
  const pot = record.pot ?? 0;
  const ptg = record.ptg ?? 0;
  const spd = record.spd ?? 0;
  if (vlt > 0 && vlt < 11.5) return "serious";
  if ((hbk || hac || hco || pot) > 0 || (ptg > 0 && ptg > 2) || (tmp > 0 && tmp > 105)) return "serious";
  if (vlt >= 11.5 && vlt < 12) return "warning";
  if (tmp >= 95 && tmp <= 105) return "warning";
  if (spd > 120) return "warning";
  const driving = getDrivingStatus(record);
  if (driving === "moving") return "ok";
  if (driving === "stationary") return "stationary";
  return "idle";
}

interface LiveMapProps {
  deviceId?: string;
  height?: string;
  interactive?: boolean;
  /** Called when user clicks a vehicle marker (deviceId) or closes the popup (null). */
  onVehicleSelect?: (deviceId: string | null) => void;
  /** Optional Google-style encoded polyline(s) to draw as route overlay. Key = label (e.g. "planned"). */
  encodedRoutes?: Record<string, string>;
  /** Precision for encoded polylines (default 5; use 6 for polyline6). */
  encodedRoutePrecision?: number;
  /** Initial map center (from user profile). Defaults to Johannesburg. */
  initialCenter?: { lat: number; lon: number };
  /** Optional map device_id -> { name, plate } to show number plate in popup instead of device ID. */
  deviceToVehicle?: Record<string, { name: string; plate: string }>;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const JOHANNESBURG = { lat: -26.2041, lon: 28.0473 };

export default function LiveMap({
  deviceId,
  height = "600px",
  interactive = true,
  onVehicleSelect,
  encodedRoutes,
  encodedRoutePrecision = 5,
  initialCenter = JOHANNESBURG,
  deviceToVehicle,
}: LiveMapProps) {
  const { vehicles, isConnected, vehicleList } = useMqttTracking(deviceId);
  const [selectedVehicle, setSelectedVehicle] = useState<LiveVehicle | null>(
    null,
  );
  const [markerPositions, setMarkerPositions] = useState<Record<string, { lat: number; lon: number }>>({});
  const markerUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Persist last known position per device so markers always show on fleet map (MQTT may send position even when engine off) */
  const lastKnownPositionRef = useRef<Record<string, { lat: number; lon: number }>>({});

  const handleSelectVehicle = (vehicle: LiveVehicle | null) => {
    setSelectedVehicle(vehicle);
    onVehicleSelect?.(vehicle?.device_id ?? null);
  };
  const [viewState, setViewState] = useState({
    latitude: initialCenter.lat,
    longitude: initialCenter.lon,
    zoom: 6,
  });
  const lastCenteredDeviceRef = useRef<string | null>(null);
  const mapRef = useRef<MapRef>(null);
  const hasFittedFleetRef = useRef(false);

  const vehicleListRef = useRef(vehicleList);
  vehicleListRef.current = vehicleList;

  // Always sync marker positions from MQTT / last_record; persist last known so markers always show
  useEffect(() => {
    setMarkerPositions((prev) => {
      let next = prev;
      for (const v of vehicleList) {
        const lat = v.last_record.lat;
        const lon = v.last_record.lon ?? (v.last_record as unknown as { lng?: number }).lng;
        if (lat != null && lon != null) {
          lastKnownPositionRef.current[v.device_id] = { lat, lon };
          const cur = prev[v.device_id];
          if (!cur || Math.abs(cur.lat - lat) > 1e-6 || Math.abs(cur.lon - lon) > 1e-6) {
            next = next === prev ? { ...prev } : next;
            next[v.device_id] = { lat, lon };
          }
        }
      }
      return next;
    });
  }, [vehicleList]);

  useEffect(() => {
    if (markerUpdateRef.current) clearInterval(markerUpdateRef.current);
    markerUpdateRef.current = setInterval(() => {
      const list = vehicleListRef.current;
      setMarkerPositions((prev) => {
        let next: Record<string, { lat: number; lon: number }> = prev;
        for (const v of list) {
          const lat = v.last_record.lat;
          const lon = v.last_record.lon ?? (v.last_record as unknown as { lng?: number }).lng;
          if (lat != null && lon != null) {
            lastKnownPositionRef.current[v.device_id] = { lat, lon };
            const key = v.device_id;
            const cur = prev[key];
            if (!cur || Math.abs(cur.lat - lat) > 1e-5 || Math.abs(cur.lon - lon) > 1e-5) {
              next = next === prev ? { ...prev } : next;
              next[key] = { lat, lon };
            }
          }
        }
        return next;
      });
    }, 400);
    return () => {
      if (markerUpdateRef.current) clearInterval(markerUpdateRef.current);
      markerUpdateRef.current = null;
    };
  }, []);

  // Fleet view: fit bounds to show all vehicle pins (once we have positions)
  useEffect(() => {
    if (deviceId || vehicleList.length === 0) return;
    const positions = vehicleList
      .map((v) => {
        const lat = v.last_record.lat;
        const lon = v.last_record.lon ?? (v.last_record as unknown as { lng?: number }).lng;
        return lat != null && lon != null ? [lon, lat] as [number, number] : null;
      })
      .filter((p): p is [number, number] => p !== null);
    if (positions.length === 0) return;

    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const lons = positions.map((p) => p[0]);
    const lats = positions.map((p) => p[1]);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const padding = 80;
    const singlePoint = minLon === maxLon && minLat === maxLat;
    const bbox: [[number, number], [number, number]] = singlePoint
      ? [[minLon - 0.01, minLat - 0.01], [maxLon + 0.01, maxLat + 0.01]]
      : [[minLon, minLat], [maxLon, maxLat]];

    if (!hasFittedFleetRef.current) {
      hasFittedFleetRef.current = true;
      map.fitBounds(bbox, { padding, maxZoom: 12, duration: 600 });
    }
  }, [deviceId, vehicleList]);

  useEffect(() => {
    if (!deviceId) return;
    hasFittedFleetRef.current = false;
    if (!vehicles[deviceId]) return;
    const record = vehicles[deviceId].last_record;
    const lon = record.lon ?? (record as unknown as { lng?: number }).lng;
    if (record.lat == null || lon == null) return;

    // Continuously update the center if it changes significantly to avoid jitter
    setViewState((prev) => {
      // Only update if the distance is noticeable to avoid map jittering on tiny GPS fluctuations
      if (Math.abs(prev.latitude - record.lat!) > 0.0001 || Math.abs(prev.longitude - lon) > 0.0001) {
         return {
          ...prev,
          latitude: record.lat!,
          longitude: lon,
        };
      }
      return prev;
    });
  }, [deviceId, vehicles]);

  const getLon = (p: TelemetryRecord) => p.lon ?? (p as unknown as { lng?: number }).lng;

  // Path: only encoded polyline routes (hardcoded test path)
  const pathGeoJson = useMemo(() => {
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    if (encodedRoutes && Object.keys(encodedRoutes).length > 0) {
      for (const [_label, encoded] of Object.entries(encodedRoutes)) {
        if (!encoded?.trim()) continue;
        try {
          const routeCoords = decodeToGeoJSON(encoded.trim(), encodedRoutePrecision);
          if (routeCoords.length >= 2) {
            features.push({
              type: "Feature",
              properties: { source: "polyline" },
              geometry: { type: "LineString", coordinates: routeCoords },
            });
          }
        } catch {
          // ignore invalid encoded strings
        }
      }
    }
    return { type: "FeatureCollection" as const, features };
  }, [encodedRoutes, encodedRoutePrecision]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center"
      >
        <MapPin className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">
          Mapbox Token Missing
        </h3>
        <p className="text-sm text-gray-500 max-w-md mt-2">
          Please set <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in your
          environment variables to enable the live tracking map.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden shadow-lg border border-gray-200"
      style={{ height }}
    >
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
        <div
          className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
        />
        <span className="text-xs font-medium text-gray-700">
          {isConnected ? "Live" : "Disconnected"}
        </span>
      </div>

      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
      >
        <NavigationControl position="bottom-right" />
        <FullscreenControl position="bottom-right" />

        {pathGeoJson.features.length > 0 && (
          <Source id="live-path" type="geojson" data={pathGeoJson}>
            <Layer
              id="live-path-line"
              type="line"
              paint={{
                "line-color": "#0d9488",
                "line-width": 6,
                "line-join": "round",
                "line-cap": "round",
              } as Record<string, unknown>}
            />
          </Source>
        )}

        {vehicleList.map((vehicle) => {
          const rec = vehicle.last_record;
          const pos = markerPositions[vehicle.device_id];
          const lastKnown = lastKnownPositionRef.current[vehicle.device_id];
          const lat = pos?.lat ?? rec.lat ?? lastKnown?.lat;
          const lon = pos?.lon ?? getLon(rec) ?? lastKnown?.lon;
          const { hdg, spd, rpm, vlt } = rec;
          if (lat == null || lon == null) return null;
          // Always show marker at last known position from MQTT (engine off or moving false still sends position)
          const status = getVehicleStatus(rec);
          const iconBg =
            status === "serious"
              ? "bg-red-500 border-white"
              : status === "warning"
                ? "bg-orange-500 border-white"
                : status === "idle"
                ? "bg-gray-400 border-white"
                : status === "stationary"
                ? "bg-blue-500 border-white"
                : "bg-green-600 border-white";

          return (
            <React.Fragment key={vehicle.device_id}>
              <Marker
                latitude={lat}
                longitude={lon}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handleSelectVehicle(vehicle);
                }}
              >
                <div
                  className="relative cursor-pointer transition-transform hover:scale-110"
                  style={{ transform: `rotate(${hdg || 0}deg)` }}
                >
                  <div className={`p-2 rounded-full shadow-md border-2 ${iconBg}`}>
                    <Car className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-gray-800" />
                </div>
              </Marker>

              {selectedVehicle?.device_id === vehicle.device_id && (
                <Popup
                  latitude={lat}
                  longitude={lon}
                  anchor="bottom"
                  offset={20}
                  onClose={() => handleSelectVehicle(null)}
                  closeButton={true}
                  className="z-20"
                >
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <h4 className="font-bold text-gray-900">
                        {deviceToVehicle?.[vehicle.device_id]?.plate || deviceToVehicle?.[vehicle.device_id]?.name || vehicle.device_id}
                      </h4>
                      <span className="text-[10px] text-gray-500">
                        {format(new Date(vehicle.last_update), "HH:mm:ss")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-gray-500">Speed</span>
                        <span className="font-semibold">
                          {spd?.toFixed(1) || 0} km/h
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">RPM</span>
                        <span className="font-semibold">{rpm || 0}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">Voltage</span>
                        <span className="font-semibold text-blue-600">
                          {vlt?.toFixed(1) || 0}V
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">Status</span>
                        <span className={`font-semibold ${
                          getDrivingStatus(rec) === "moving" ? "text-green-600" :
                          getDrivingStatus(rec) === "stationary" ? "text-blue-600" : "text-gray-500"
                        }`}>
                          {getDrivingStatusLabel(rec)}
                        </span>
                      </div>
                    </div>

                    {(vehicle.last_record.hbk || 0) > 0 && (
                      <div className="mt-2 p-1.5 bg-amber-50 rounded flex items-center gap-2 text-[10px] text-amber-700 border border-amber-100">
                        <AlertTriangle className="h-3 w-3" />
                        Harsh Braking Detected
                      </div>
                    )}
                  </div>
                </Popup>
              )}
            </React.Fragment>
          );
        })}
      </Map>

      {pathGeoJson.features.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow border border-gray-100 text-[10px]">
          <span className="font-semibold text-gray-700">Trip plan(s)</span>
        </div>
      )}

      {!deviceId && vehicleList.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-gray-100 max-w-[240px]">
          <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            Fleet Overview
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Active Vehicles</span>
              <span className="font-bold">{vehicleList.length}</span>
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
