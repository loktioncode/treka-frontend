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
import { TelemetryRecord } from "@/types/api";
import { decodeToGeoJSON } from "@/lib/polyline";
import { getDrivingStatus, getDrivingStatusLabel } from "@/lib/driving-status";
import {
  Car,
  AlertTriangle,
  Info,
  MapPin,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";



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
  /** Historical telemetry records to draw as a trail. */
  historicalRecords?: TelemetryRecord[];
  /** Whether to enable live MQTT updates for markers. Defaults to true. */
  live?: boolean;
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
  historicalRecords,
  live = true,
}: LiveMapProps) {
  const { vehicles, isConnected, vehicleList } = useMqttTracking(live ? deviceId : undefined, undefined, live);

  const [selectedVehicle, setSelectedVehicle] = useState<LiveVehicle | null>(
    null,
  );
  const [markerPositions, setMarkerPositions] = useState<Record<string, { lat: number; lon: number }>>({});
  const markerUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Persist last known position per device so markers always show on fleet map (MQTT may send position even when engine off) */
  const lastKnownPositionRef = useRef<Record<string, { lat: number; lon: number }>>({});

  // Animation / Replay state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Filter and sort historical records
  const sortedRecords = useMemo(() => {
    if (!historicalRecords) return [];
    return [...historicalRecords].sort((a, b) => a.ts - b.ts);
  }, [historicalRecords]);

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
        const lon = v.last_record.lon ?? v.last_record.lng;
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
          const lon = v.last_record.lon ?? v.last_record.lng;
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
        const lon = v.last_record.lon ?? v.last_record.lng;
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
    const lon = record.lon ?? record.lng;
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
  
  // Animation logic for replay
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && sortedRecords.length > 0 && currentIndex < sortedRecords.length - 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1000 / playbackSpeed);
    } else {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, sortedRecords, playbackSpeed]);

  // Sync currentIndex when records change
  useEffect(() => {
    setCurrentIndex(sortedRecords.length > 0 ? sortedRecords.length - 1 : 0);
    setIsPlaying(false);
  }, [sortedRecords]);

  // Historical trail from records
  const historicalTrailGeoJson = useMemo(() => {
    if (sortedRecords.length < 2) return { type: "FeatureCollection" as const, features: [] };
    const coords = sortedRecords
      .filter(r => r.lat != null && (r.lng != null || r.lon != null))
      .map(r => [r.lng ?? r.lon!, r.lat!] as [number, number]);
      
    if (coords.length < 2) return { type: "FeatureCollection" as const, features: [] };
    
    return {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        properties: { source: "historical" },
        geometry: { type: "LineString" as const, coordinates: coords },
      }]
    };
  }, [sortedRecords]);
  
  // Determine marker position: either current replay point or last known
  const displayedHistoricalPos = useMemo(() => {
    if (live || sortedRecords.length === 0) return null;
    const record = sortedRecords[currentIndex] || sortedRecords[sortedRecords.length - 1];
    if (record.lat == null || (record.lng ?? record.lon) == null) return null;
    return { lat: record.lat!, lon: (record.lng ?? record.lon)!, record };
  }, [live, sortedRecords, currentIndex]);


  const getLon = (p: TelemetryRecord) =>
    p.lon ?? p.lng;

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

  // Auto-center in historical mode
  useEffect(() => {
    if (live || !displayedHistoricalPos) return;
    setViewState((prev) => {
      // Only recenter if the marker has moved significantly to avoid tiny jitters or if we just started
      if (Math.abs(prev.latitude - displayedHistoricalPos.lat) > 0.0002 || Math.abs(prev.longitude - displayedHistoricalPos.lon) > 0.0002) {
        return {
          ...prev,
          latitude: displayedHistoricalPos.lat,
          longitude: displayedHistoricalPos.lon,
        };
      }
      return prev;
    });
  }, [live, displayedHistoricalPos]);

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
      {live && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-xs font-medium text-gray-700">
            {isConnected ? "Live" : "Disconnected"}
          </span>
        </div>
      )}


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
                "line-width": 4,
                "line-join": "round",
                "line-cap": "round",
              } as Record<string, unknown>}
            />
          </Source>
        )}

        {historicalTrailGeoJson.features.length > 0 && (
          <Source id="historical-path" type="geojson" data={historicalTrailGeoJson}>
            <Layer
              id="historical-path-line"
              type="line"
              paint={{
                "line-color": "#3b82f6", // blue for historical
                "line-width": 5,
                "line-join": "round",
                "line-cap": "round",
              } as Record<string, unknown>}
            />
          </Source>
        )}


        {/* Live Markers */}
        {live && vehicleList
          .filter((v) => !deviceToVehicle || deviceToVehicle?.[v.device_id])
          .map((vehicle) => {
            const rec = vehicle.last_record;
            const pos = markerPositions[vehicle.device_id];
            const lastKnown = lastKnownPositionRef.current[vehicle.device_id];
            const lat = pos?.lat ?? rec.lat ?? lastKnown?.lat;
            const lon = pos?.lon ?? getLon(rec) ?? lastKnown?.lon;
            const { hdg } = rec;
            if (lat == null || lon == null) return null;
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
                    <div className={`p-1.5 rounded-full shadow-md border-2 ${iconBg}`}>
                      <Car className="h-4 w-4 text-white" />
                    </div>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-gray-800" />
                  </div>
                </Marker>
              </React.Fragment>
            );
          })}

        {/* Static/Replay Historical Marker (if not live) */}
        {!live && displayedHistoricalPos && (
          <Marker
            latitude={displayedHistoricalPos.lat}
            longitude={displayedHistoricalPos.lon}
            anchor="center"
          >
            <div
              className="relative cursor-pointer transition-transform hover:scale-110"
              style={{ transform: `rotate(${displayedHistoricalPos.record.hdg || 0}deg)` }}
            >
              <div className={`p-1.5 rounded-full shadow-md border-2 bg-blue-600 border-white`}>
                <Car className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-gray-800" />
            </div>
          </Marker>
        )}
      </Map>

      {/* Historical Playback Controls */}
      {!live && sortedRecords.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center w-[90%] max-w-sm bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-gray-100 z-10">
          <div className="w-full flex items-center gap-3 mb-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>

            <div className="flex-1 px-1">
              <input
                type="range"
                min={0}
                max={sortedRecords.length - 1}
                step={1}
                value={currentIndex}
                onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-medium">
                <span>{format(new Date(sortedRecords[currentIndex]?.ts_server || sortedRecords[currentIndex]?.ts || Date.now()), "HH:mm:ss")}</span>
                <span>{sortedRecords.length} pts</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsPlaying(false);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              title="Reset"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-1">
            {[1, 2, 5, 10].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors ${
                  playbackSpeed === speed ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:bg-gray-50"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      )}


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
              <span className="font-bold">{vehicleList.filter((v) => getDrivingStatus(v.last_record) === "moving").length}</span>
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
