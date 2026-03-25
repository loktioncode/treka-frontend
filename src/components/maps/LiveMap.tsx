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
import { useMqttTracking, type LiveVehicle } from "@/hooks/useMqttTracking";
import {
  useRouteReplayTelemetry,
  getTelemetryRecordTimeMs,
  type RouteReplayTelemetry,
} from "@/hooks/useRouteReplayTelemetry";
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
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { googleMapsPlaceUrl } from "@/lib/utils";
import {
  formatVehicleFuelLevel,
  getTelemetryFuelLiters,
  getTelemetryFuelPercent,
} from "@/lib/telemetry-fuel";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";



/** Vehicle status for map icon: red = serious, orange = warning, gray = engine off, green = moving, blue = idling (stationary, engine on) */
function getVehicleStatus(record: TelemetryRecord): "serious" | "warning" | "ok" | "idle" | "off" {
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
  if (driving === "idle") return "idle";
  return "off";
}

interface LiveMapProps {
  /**
   * When set with live MQTT, restrict subscriptions to this device only (e.g. future single-vehicle live view).
   * Fleet map should leave this unset and use followDeviceId instead so all vehicles stay subscribed.
   */
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
  /**
   * Optional shared replay state so header (or other) controls stay in sync with the map trail.
   */
  routeReplay?: RouteReplayTelemetry;
  /**
   * Live fleet: follow / center on this device without narrowing MQTT to one vehicle.
   * Combine with historicalRecords for “today’s path” + playback.
   */
  followDeviceId?: string | null;
  /** When true with followDeviceId, show fleet follow / playback styling on the popup; user can still close the card. */
  pinFollowedVehiclePopup?: boolean;
  /**
   * Use one MQTT/telemetry source from the parent (e.g. fleet map page) instead of a second hook instance.
   */
  sharedTracking?: {
    vehicles: Record<string, LiveVehicle>;
    vehicleList: LiveVehicle[];
    isConnected: boolean;
    refreshLiveData: () => Promise<void>;
  };
  /** Today’s(or selected) speed violations from completed / in-progress trips (fleet map). */
  speedViolationMarkers?: Array<{
    lat: number;
    lon: number;
    speed_kmh: number;
    limit_kmh: number;
    ts: string;
    device_id?: string;
  }>;
  /** When set, used instead of hook/shared `refreshLiveData` for the map refresh control (e.g. fleet: also reload violations). */
  refreshLiveDataOverride?: () => Promise<void>;
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
  routeReplay,
  followDeviceId,
  pinFollowedVehiclePopup = false,
  sharedTracking,
  speedViolationMarkers,
  refreshLiveDataOverride,
}: LiveMapProps) {
  const useInternalMqtt = live && !sharedTracking;
  const internal = useMqttTracking(
    useInternalMqtt ? deviceId : undefined,
    undefined,
    useInternalMqtt,
  );
  const vehicles = sharedTracking?.vehicles ?? internal.vehicles;
  const isConnected = sharedTracking?.isConnected ?? internal.isConnected;
  const vehicleList = sharedTracking?.vehicleList ?? internal.vehicleList;
  const refreshLiveData =
    refreshLiveDataOverride ??
    sharedTracking?.refreshLiveData ??
    internal.refreshLiveData;

  const cameraTargetId = followDeviceId ?? deviceId ?? null;

  const internalReplay = useRouteReplayTelemetry(
    routeReplay ? undefined : historicalRecords,
  );
  const replay = routeReplay ?? internalReplay;

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

  const fleetFuelOverview = useMemo(() => {
    let pctSum = 0;
    let pctCount = 0;
    let litersCount = 0;
    for (const v of vehicleList) {
      const r = v.last_record;
      if (getTelemetryFuelLiters(r) != null) litersCount += 1;
      const p = getTelemetryFuelPercent(r);
      if (p != null) {
        pctSum += p;
        pctCount += 1;
      }
    }
    return {
      pctAvg: pctCount > 0 ? Math.round(pctSum / pctCount) : null,
      pctCount,
      litersCount,
    };
  }, [vehicleList]);

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
    if (deviceId || followDeviceId || vehicleList.length === 0) return;
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
  }, [deviceId, followDeviceId, vehicleList]);

  // Historical trail from records
  const historicalTrailGeoJson = useMemo(() => {
    if (replay.sortedRecords.length < 2) return { type: "FeatureCollection" as const, features: [] };
    const coords = replay.sortedRecords
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
  }, [replay.sortedRecords]);

  /** Remount GeoJSON source when trail data changes — Mapbox can fail to refresh in-place. */
  const historicalTrailSourceKey = useMemo(() => {
    const s = replay.sortedRecords;
    if (s.length === 0) return "hist-empty";
    return `hist-${s.length}-${getTelemetryRecordTimeMs(s[0])}-${getTelemetryRecordTimeMs(s[s.length - 1])}`;
  }, [replay.sortedRecords]);

  const lastReplayIndex = Math.max(0, replay.sortedRecords.length - 1);
  const replayShowsPast =
    !!followDeviceId &&
    live &&
    replay.sortedRecords.length > 0 &&
    (replay.isPlaying || replay.currentIndex < lastReplayIndex);

  const getEffectiveRecord = (vehicle: LiveVehicle): TelemetryRecord => {
    if (
      !live ||
      !followDeviceId ||
      vehicle.device_id !== followDeviceId ||
      replay.sortedRecords.length === 0
    ) {
      return vehicle.last_record;
    }
    if (!replayShowsPast) {
      return vehicle.last_record;
    }
    const r = replay.sortedRecords[replay.currentIndex];
    return r ?? vehicle.last_record;
  };

  // Fleet: fit map to today’s path when history arrives
  const didFitTrailRef = useRef<string | null>(null);
  useEffect(() => {
    if (!live || !followDeviceId || replay.sortedRecords.length < 2) return;
    if (didFitTrailRef.current === historicalTrailSourceKey) return;
    const coords = replay.sortedRecords
      .filter((r) => r.lat != null && (r.lng != null || r.lon != null))
      .map((r) => [r.lng ?? r.lon!, r.lat!] as [number, number]);
    if (coords.length < 2) return;
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const pad = 0.002;
    const bbox: [[number, number], [number, number]] = [
      [Math.min(...lons) - pad, Math.min(...lats) - pad],
      [Math.max(...lons) + pad, Math.max(...lats) + pad],
    ];
    didFitTrailRef.current = historicalTrailSourceKey;
    map.fitBounds(bbox, { padding: 72, maxZoom: 15, duration: 900 });
  }, [live, followDeviceId, historicalTrailSourceKey, replay.sortedRecords]);

  useEffect(() => {
    if (!followDeviceId || !pinFollowedVehiclePopup) return;
    const v = vehicleList.find((x) => x.device_id === followDeviceId);
    if (v) setSelectedVehicle(v);
  }, [followDeviceId, pinFollowedVehiclePopup, vehicleList]);

  useEffect(() => {
    if (followDeviceId && pinFollowedVehiclePopup) return;
    if (!followDeviceId) setSelectedVehicle(null);
  }, [followDeviceId, pinFollowedVehiclePopup]);

  useEffect(() => {
    didFitTrailRef.current = null;
  }, [followDeviceId]);

  const fleetTrailEndInitRef = useRef<string | null>(null);
  useEffect(() => {
    fleetTrailEndInitRef.current = null;
  }, [followDeviceId]);

  useEffect(() => {
    if (!followDeviceId || !live || replay.sortedRecords.length === 0) return;
    if (fleetTrailEndInitRef.current === historicalTrailSourceKey) return;
    fleetTrailEndInitRef.current = historicalTrailSourceKey;
    replay.setCurrentIndex(Math.max(0, replay.sortedRecords.length - 1));
    replay.setIsPlaying(false);
    // replay setters are stable; omit replay object to avoid re-running every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followDeviceId, live, historicalTrailSourceKey, replay.sortedRecords.length]);

  useEffect(() => {
    if (!cameraTargetId || !live) return;
    if (replayShowsPast) return;
    if (!vehicles[cameraTargetId]) return;
    const record = vehicles[cameraTargetId].last_record;
    const lon = record.lon ?? record.lng;
    if (record.lat == null || lon == null) return;

    setViewState((prev) => {
      if (Math.abs(prev.latitude - record.lat!) > 0.0001 || Math.abs(prev.longitude - lon) > 0.0001) {
        return {
          ...prev,
          latitude: record.lat!,
          longitude: lon,
        };
      }
      return prev;
    });
  }, [cameraTargetId, live, vehicles, replayShowsPast]);

  useEffect(() => {
    if (!replayShowsPast || replay.sortedRecords.length === 0) return;
    const rec = replay.sortedRecords[replay.currentIndex];
    const lon = rec?.lon ?? rec?.lng;
    if (rec?.lat == null || lon == null) return;
    setViewState((prev) => ({
      ...prev,
      latitude: rec.lat!,
      longitude: lon,
    }));
  }, [replayShowsPast, replay.currentIndex, replay.sortedRecords]);
  
  // Determine marker position: either current replay point or last known
  const displayedHistoricalPos = useMemo(() => {
    if (live || replay.sortedRecords.length === 0) return null;
    const record = replay.sortedRecords[replay.currentIndex] || replay.sortedRecords[replay.sortedRecords.length - 1];
    if (record.lat == null || (record.lng ?? record.lon) == null) return null;
    return { lat: record.lat!, lon: (record.lng ?? record.lon)!, record };
  }, [live, replay.sortedRecords, replay.currentIndex]);


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
          <button
            type="button"
            onClick={() => void refreshLiveData()}
            className="ml-0.5 p-1 rounded-full hover:bg-gray-100 text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            title="Refresh live data (reconnect and load last known positions)"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Refresh live data</span>
          </button>
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
          <Source
            key={historicalTrailSourceKey}
            id="historical-path"
            type="geojson"
            data={historicalTrailGeoJson}
          >
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
            const eff = getEffectiveRecord(vehicle);
            const pos = markerPositions[vehicle.device_id];
            const lastKnown = lastKnownPositionRef.current[vehicle.device_id];
            const lat = eff.lat ?? pos?.lat ?? lastKnown?.lat;
            const lon = getLon(eff) ?? pos?.lon ?? lastKnown?.lon;
            const hdg = eff.hdg ?? 0;
            if (lat == null || lon == null) return null;
            const status = getVehicleStatus(eff);
            const iconBg =
              status === "serious"
                ? "bg-red-500 border-white"
                : status === "warning"
                  ? "bg-orange-500 border-white"
                  : status === "idle"
                  ? "bg-blue-500 border-white" // blue for idle (engine on)
                  : status === "off"
                  ? "bg-gray-400 border-white" // gray for off
                  : "bg-green-500 border-white"; // bright green for ok (moving)

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
                    style={{ transform: `rotate(${hdg}deg)` }}
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

        {live &&
          (speedViolationMarkers ?? []).map((p, i) => (
            <Marker
              key={`speed-violation-${p.device_id ?? "x"}-${p.ts}-${i}`}
              latitude={p.lat}
              longitude={p.lon}
              anchor="center"
            >
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow-md cursor-default"
                title={`Speed ${p.speed_kmh} km/h (limit ${p.limit_kmh})${p.device_id ? ` · ${p.device_id}` : ""}`}
              >
                <AlertTriangle className="h-3 w-3 text-white" aria-hidden />
              </div>
            </Marker>
          ))}

        {/* Info Popup for Selected Vehicle */}
        {selectedVehicle && (() => {
          const popupRec = getEffectiveRecord(selectedVehicle);
          const pLat = popupRec.lat;
          const pLon = getLon(popupRec);
          if (pLat == null || pLon == null) return null;
          const pinPopup =
            pinFollowedVehiclePopup &&
            followDeviceId &&
            selectedVehicle.device_id === followDeviceId;
          const popupTimeMs = getTelemetryRecordTimeMs(popupRec);
          return (
          <Popup
            latitude={pLat}
            longitude={pLon}
            closeButton
            closeOnClick={false}
            onClose={() => handleSelectVehicle(null)}
            anchor="bottom"
            offset={20}
            maxWidth="260px"
            className="z-50"
          >
            <div className="p-1">
              {replayShowsPast && pinPopup && (
                <p className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 mb-2">
                  Trip playback
                </p>
              )}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className={`p-1.5 rounded-lg ${getVehicleStatus(popupRec) === 'serious' ? 'bg-red-50' : 'bg-blue-50'}`}>
                  <Car className={`h-4 w-4 ${getVehicleStatus(popupRec) === 'serious' ? 'text-red-500' : 'text-blue-500'}`} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">
                    {deviceToVehicle?.[selectedVehicle.device_id]?.name || `Device ${selectedVehicle.device_id}`}
                  </h4>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    {deviceToVehicle?.[selectedVehicle.device_id]?.plate || popupRec.vin || "No Plate"}
                  </p>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    getDrivingStatus(popupRec) === 'moving' ? 'bg-green-100 text-green-700' :
                    getDrivingStatus(popupRec) === 'idle' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getDrivingStatusLabel(popupRec)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Speed</span>
                  <span className="font-semibold">{(popupRec.spd || 0).toFixed(0)} km/h</span>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Fuel level</span>
                  <span className="font-semibold">{formatVehicleFuelLevel(popupRec)}</span>
                </div>

                {popupRec.odo !== undefined && popupRec.odo !== null && (
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span>Odometer</span>
                    <span className="font-semibold">{(popupRec.odo || 0).toLocaleString()} km</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Location</span>
                  {popupRec.lat != null &&
                  (popupRec.lon ?? popupRec.lng) != null ? (
                    <a
                      href={googleMapsPlaceUrl(
                        popupRec.lat,
                        popupRec.lon ?? popupRec.lng!,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[10px] text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      Google Maps
                    </a>
                  ) : (
                    <span className="font-semibold text-[10px] text-gray-400">
                      —
                    </span>
                  )}
                </div>
                
                <div className="pt-1 mt-1 text-[9px] text-gray-400 font-medium">
                  {replayShowsPast && pinPopup
                    ? `Point time ${format(new Date(popupTimeMs), "HH:mm:ss")}`
                    : `Last seen ${format(new Date(popupRec.ts_server || popupRec.ts || Date.now()), "HH:mm:ss")}`}
                </div>
              </div>

              {!deviceId && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.location.href = `/dashboard/assets/${selectedVehicle.device_id}`}
                  >
                    View Full Details
                  </Button>
                </div>
              )}
            </div>
          </Popup>
          );
        })()}

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

      {/* Historical playback: asset view (!live) or fleet with today’s path */}
      {replay.sortedRecords.length > 0 && (!live || !!followDeviceId) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center w-[90%] max-w-sm bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-gray-100 z-10">
          <div className="w-full flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => replay.setIsPlaying(!replay.isPlaying)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
            >
              {replay.isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>

            <div className="flex-1 px-1">
              <input
                type="range"
                min={0}
                max={replay.sortedRecords.length - 1}
                step={1}
                value={replay.currentIndex}
                onChange={(e) => replay.setCurrentIndex(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-medium">
                <span>
                  {format(
                    new Date(
                      replay.sortedRecords[replay.currentIndex]
                        ? getTelemetryRecordTimeMs(replay.sortedRecords[replay.currentIndex])
                        : Date.now(),
                    ),
                    "HH:mm:ss",
                  )}
                </span>
                <span>{replay.sortedRecords.length} pts</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => replay.resetToStart()}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              title="Reset"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-1">
            {[1, 2, 5, 10].map((speed) => (
              <button
                type="button"
                key={speed}
                onClick={() => replay.setPlaybackSpeed(speed)}
                className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors ${
                  replay.playbackSpeed === speed ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:bg-gray-50"
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
            {fleetFuelOverview.pctAvg != null ? (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Avg fuel level</span>
                  <span className="font-bold text-amber-800">{fleetFuelOverview.pctAvg}%</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, fleetFuelOverview.pctAvg))}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  {fleetFuelOverview.pctCount} of {vehicleList.length} with level %
                </p>
              </>
            ) : fleetFuelOverview.litersCount > 0 ? (
              <p className="text-[10px] text-gray-600 leading-snug">
                {fleetFuelOverview.litersCount} vehicle(s) report fuel in liters — open a marker for volume.
              </p>
            ) : (
              <p className="text-[10px] text-gray-500">No fuel level telemetry</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
