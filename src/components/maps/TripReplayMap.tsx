"use client";

import React, { useState, useEffect, useMemo } from "react";
import Map, {
  Source,
  Layer,
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { telemetryAPI } from "@/services/api";
import { TripReplayResponse, TripReplayRecord } from "@/types/api";
import {
  Play,
  Pause,
  RotateCcw,
  AlertOctagon,
  Zap,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import ReplayGauges from "./ReplayGauges";

interface TripReplayMapProps {
  tripId: string;
  height?: string;
  /** Initial map center when no trip data yet. Defaults to Johannesburg. */
  initialCenter?: { lat: number; lon: number };
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const JOHANNESBURG = { lat: -26.2041, lon: 28.0473 };

export default function TripReplayMap({
  tripId,
  height = "500px",
  initialCenter = JOHANNESBURG,
}: TripReplayMapProps) {
  const [replayData, setReplayData] = useState<TripReplayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<TripReplayRecord | null>(
    null,
  );

  const [viewState, setViewState] = useState({
    latitude: initialCenter.lat,
    longitude: initialCenter.lon,
    zoom: 13,
  });

  useEffect(() => {
    async function fetchTripData() {
      try {
        setLoading(true);
        const data = await telemetryAPI.getTripReplay(tripId);
        setReplayData(data);

        if (data.records.length > 0) {
          const first = data.records[0];
          setViewState((prev) => ({
            ...prev,
            latitude: first.lat || prev.latitude,
            longitude: first.lon || prev.longitude,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch trip replay:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTripData();
  }, [tripId]);

  // Animation logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      isPlaying &&
      replayData &&
      currentIndex < replayData.records.length - 1
    ) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1000 / playbackSpeed);
    } else if (currentIndex >= (replayData?.records.length || 0) - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, replayData, playbackSpeed]);

  const defaultSpeedLimit = replayData?.default_speed_limit_kmh ?? 120;

  // GeoJSON for the path - segments colored by speed (red = over limit, orange = at/below)
  const routeGeoJSON = useMemo(() => {
    if (!replayData) return null;
    const records = replayData.records.filter(
      (r) => r.lat != null && r.lon != null,
    );
    if (records.length < 2) return null;
    const features = [];
    for (let i = 0; i < records.length - 1; i++) {
      const r = records[i];
      const next = records[i + 1];
      const limit = r.speed_limit_kmh ?? defaultSpeedLimit;
      const spd = r.spd ?? 0;
      const color =
        spd > limit
          ? "#dc2626"   // red: above limit
          : Math.abs(spd - limit) < 1
            ? "#f97316" // orange: at limit (within 1 km/h)
            : "#3b82f6"; // blue: below limit
      features.push({
        type: "Feature" as const,
        properties: { color },
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [r.lon!, r.lat!],
            [next.lon!, next.lat!],
          ] as [number, number][],
        },
      });
    }
    if (features.length === 0) return null;
    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [replayData, defaultSpeedLimit]);

  const currentRecord = replayData?.records[currentIndex];

  // Filter harsh events for markers
  const harshEvents = useMemo(() => {
    if (!replayData) return [];
    return replayData.records.filter(
      (r) =>
        (r.hbk || 0) > 0 ||
        (r.hac || 0) > 0 ||
        (r.hco || 0) > 0 ||
        (r.pot || 0) > 0,
    );
  }, [replayData]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed rounded-xl"
      >
        <MapPin className="h-10 w-10 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">Mapbox Token Required</p>
      </div>
    );
  }

  if (loading)
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-gray-50 rounded-xl animate-pulse"
      >
        Loading Trip Map...
      </div>
    );

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden shadow-md border border-gray-200"
      style={{ height }}
    >
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" />

        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": 4,
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}

        {/* Current Position Marker */}
        {currentRecord?.lat && currentRecord?.lon && (
          <Marker latitude={currentRecord.lat} longitude={currentRecord.lon}>
            <div className="relative">
              <div className="h-4 w-4 bg-blue-600 rounded-full border-2 border-white shadow-lg" />
              <div className="absolute -top-1 -left-1 h-6 w-6 bg-blue-400 rounded-full animate-ping opacity-25" />
            </div>
          </Marker>
        )}

        {/* Event Markers */}
        {harshEvents.map((event, idx) => (
          <Marker
            key={`event-${idx}`}
            latitude={event.lat!}
            longitude={event.lon!}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedEvent(event);
            }}
          >
            <div className="cursor-pointer text-red-600 bg-white rounded-full p-1 shadow-md border-2 border-red-200 hover:scale-110 transition-transform">
              {event.hbk ? (
                <AlertOctagon size={14} />
              ) : event.hac ? (
                <Zap size={14} />
              ) : event.pot ? (
                <MapPin size={14} />
              ) : (
                <AlertTriangle size={14} />
              )}
            </div>
          </Marker>
        ))}

        {selectedEvent && selectedEvent.lat != null && selectedEvent.lon != null && (
          <Popup
            latitude={selectedEvent.lat}
            longitude={selectedEvent.lon}
            anchor="bottom"
            offset={16}
            onClose={() => setSelectedEvent(null)}
            closeButton
            closeOnClick={false}
          >
            <div className="min-w-[200px] p-2 text-xs">
              <p className="font-bold text-red-600 mb-2">
                {selectedEvent.hbk
                  ? "Harsh Braking"
                  : selectedEvent.hac
                    ? "Harsh Acceleration"
                    : selectedEvent.pot
                      ? "Pothole"
                      : "Harsh Cornering"}
              </p>
              <div className="space-y-1 text-gray-700">
                <p>
                  <span className="font-medium">Speed:</span>{" "}
                  {(selectedEvent.spd ?? 0).toFixed(1)} km/h
                </p>
                <p>
                  <span className="font-medium">Location:</span>{" "}
                  {selectedEvent.lat.toFixed(6)}, {selectedEvent.lon.toFixed(6)}
                </p>
                {(selectedEvent.ptg != null ||
                  selectedEvent.plg != null ||
                  selectedEvent.ia_lg != null ||
                  selectedEvent.ia_lat != null ||
                  selectedEvent.ia_tot != null) && (
                  <p>
                    <span className="font-medium">G-force:</span>{" "}
                    {[
                      (selectedEvent.plg ?? selectedEvent.ia_lg) != null &&
                        `Long: ${(selectedEvent.plg ?? selectedEvent.ia_lg)!.toFixed(2)}g`,
                      selectedEvent.ia_lat != null &&
                        `Lat: ${selectedEvent.ia_lat.toFixed(2)}g`,
                      (selectedEvent.ptg ?? selectedEvent.ia_tot) != null &&
                        `Total: ${(selectedEvent.ptg ?? selectedEvent.ia_tot)!.toFixed(2)}g`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <p className="text-gray-500 mt-1.5 text-[10px]">
                {(() => {
                  const ts =
                    selectedEvent.ts_server ?? selectedEvent.ts ?? Date.now();
                  try {
                    return format(new Date(ts), "yyyy-MM-dd HH:mm:ss");
                  } catch {
                    return "--:--:--";
                  }
                })()}
              </p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Replay Controls & Gauges */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center w-[90%] max-w-lg bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-gray-100 z-10">

        {/* Dash Gauges */}
        <div className="w-full border-b border-gray-100 pb-2 mb-3">
          <ReplayGauges
            speed={currentRecord?.spd || 0}
            rpm={currentRecord?.rpm || 0}
            gForce={currentRecord?.ia_tot || 0}
          />
        </div>

        <div className="w-full flex items-center gap-4 mb-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? (
              <Pause size={20} />
            ) : (
              <Play size={20} className="ml-0.5" />
            )}
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min="0"
              max={(replayData?.records.length || 1) - 1}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-medium whitespace-nowrap">
              <span>
                {currentRecord
                  ? format(new Date(currentRecord.ts_server || ""), "HH:mm:ss")
                  : "--:--"}
              </span>
              <span>{replayData?.records.length || 0} points</span>
            </div>
          </div>

          <button
            onClick={() => {
              setCurrentIndex(0);
              setIsPlaying(false);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="w-full flex justify-center items-center">
          <div className="flex items-center gap-3">
            {[1, 2, 5, 10].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${playbackSpeed === speed ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:bg-gray-50"}`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
