"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { tripPlanAPI, analyticsAPI } from "@/services/api";
import type { TripPlan, TripPlanCreate, Waypoint } from "@/types/api";
import { useDataCache } from "@/contexts/DataCacheContext";
import {
  Form,
  FormField,
  FormLabel,
  FormGrid,
  FormActions,
  Textarea,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Route,
  Plus,
  MapPin,
  Clock,
  Trash2,
  Settings,
  Gauge,
  ChevronRight,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronUp,
  Fuel,
  Navigation,
  FileText,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { fetchDrivingRoute } from "@/lib/mapbox-directions";
import { optimizeWaypointOrderForShortestRoute } from "@/lib/route-optimizer";
import { searchPlaces, type GeocodingResult } from "@/lib/mapbox-geocoding";
import { useMapCenter } from "@/hooks/useMapCenter";
import { useTripPlanDraft } from "@/contexts/TripPlanDraftContext";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

/** Bbox from LineString coords [[lng, lat], ...] for fitBounds */
function getRouteBbox(coords: [number, number][]): [[number, number], [number, number]] | null {
  if (coords.length < 2) return null;
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

/** Reusable address search input with dropdown */
function AddressSearchInput({
  value,
  onChange,
  onSelect,
  placeholder,
  results,
  searching,
  showDropdown,
  onFocus,
  onBlur,
  label,
  "data-testid": testId,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (r: GeocodingResult) => void;
  placeholder: string;
  results: GeocodingResult[];
  searching: boolean;
  showDropdown: boolean;
  onFocus: () => void;
  onBlur: () => void;
  label?: string;
  "data-testid"?: string;
}) {
  return (
    <div className="space-y-1">
      {label && <FormLabel>{label}</FormLabel>}
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className="pr-8"
          data-testid={testId}
        />
        {showDropdown && (results.length > 0 || searching) && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
            {searching ? (
              <div className="p-3 text-sm text-gray-500">Searching...</div>
            ) : (
              results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex flex-col"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(r);
                  }}
                >
                  <span className="font-medium">{r.name}</span>
                  {r.placeFormatted && (
                    <span className="text-xs text-gray-500">{r.placeFormatted}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TripPlansPage() {
  const fallbackCenter = useMapCenter();
  const { draft, saveDraft, clearDraft, hasDraft } = useTripPlanDraft();
  const { assets = [], tripPlans: plans = [], refetchTripPlans, tripPlansLoading } = useDataCache();
  const loading = tripPlansLoading;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TripPlan | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<TripPlan | null>(null);
  const [assignAssetId, setAssignAssetId] = useState("");
  const [assignScheduledDate, setAssignScheduledDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TripPlan | null>(null);
  const summaryMapRef = useRef<MapRef>(null);
  const [summaryRoadRoute, setSummaryRoadRoute] = useState<{
    coordinates: [number, number][];
    distanceKm: number;
    durationMin: number;
  } | null>(null);
  const [summaryRouteLoading, setSummaryRouteLoading] = useState(false);
  const [formData, setFormData] = useState<TripPlanCreate & { waypoints: Waypoint[] }>({
    name: "",
    description: "",
    waypoints: [],
    load_weight_kg: undefined,
    is_active: true,
  });
  const [roadRoute, setRoadRoute] = useState<{ coordinates: [number, number][]; distanceKm: number; durationMin: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [startCity, setStartCity] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState<GeocodingResult[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Start address & destination (quick route)
  const [startAddress, setStartAddress] = useState<GeocodingResult | null>(null);
  const [startSearch, setStartSearch] = useState("");
  const [startResults, setStartResults] = useState<GeocodingResult[]>([]);
  const [startSearching, setStartSearching] = useState(false);
  const [showStartDropdown, setShowStartDropdown] = useState(false);

  const [destinationAddress, setDestinationAddress] = useState<GeocodingResult | null>(null);
  const [destSearch, setDestSearch] = useState("");
  const [destResults, setDestResults] = useState<GeocodingResult[]>([]);
  const [destSearching, setDestSearching] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Optional intermediate waypoints (geofencing, extra stops)
  const [intermediateWaypoints, setIntermediateWaypoints] = useState<Waypoint[]>([]);
  const [showAddWaypoints, setShowAddWaypoints] = useState(false);
  const [waypointSearch, setWaypointSearch] = useState("");
  const [waypointSearchResults, setWaypointSearchResults] = useState<GeocodingResult[]>([]);
  const [waypointSearching, setWaypointSearching] = useState(false);
  const [showWaypointDropdown, setShowWaypointDropdown] = useState(false);

  const [vehicleConsumption, setVehicleConsumption] = useState<Record<string, { avg_l_100km: number | null; avg_speed_kmh: number | null }>>({});

  // Fetch vehicle consumption for plans with assigned vehicles (not cached - per-plan data)
  const loadVehicleConsumption = useCallback(async () => {
    const assetIds = [...new Set(plans.map((p) => p.asset_id).filter(Boolean))] as string[];
    if (assetIds.length === 0) return;
    const consumption: Record<string, { avg_l_100km: number | null; avg_speed_kmh: number | null }> = {};
    await Promise.all(
      assetIds.map(async (aid) => {
        try {
          const d = await analyticsAPI.getVehicleConsumption(aid);
          consumption[aid] = { avg_l_100km: d.avg_l_100km, avg_speed_kmh: d.avg_speed_kmh };
        } catch {
          consumption[aid] = { avg_l_100km: null, avg_speed_kmh: null };
        }
      })
    );
    setVehicleConsumption(consumption);
  }, [plans]);

  useEffect(() => {
    loadVehicleConsumption();
  }, [loadVehicleConsumption]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trip plan?")) return;
    try {
      await tripPlanAPI.deleteTripPlan(id);
      toast.success("Trip plan deleted");
      setSelectedPlan(null);
      refetchTripPlans();
    } catch {
      toast.error("Failed to delete trip plan");
    }
  };

  const openCreateModal = () => {
    if (draft) {
      setFormData({
        name: draft.formData.name,
        description: draft.formData.description ?? "",
        waypoints: draft.formData.waypoints ?? [],
        asset_id: draft.formData.asset_id,
        load_weight_kg: draft.formData.load_weight_kg,
        is_active: draft.formData.is_active ?? true,
      });
      setStartAddress(draft.startAddress);
      setStartSearch(draft.startSearch);
      setDestinationAddress(draft.destinationAddress);
      setDestSearch(draft.destSearch);
      setIntermediateWaypoints(draft.intermediateWaypoints ?? []);
      setShowAddWaypoints(draft.showAddWaypoints ?? false);
      setCitySearch(draft.citySearch ?? "");
      setStartCity(draft.startCity);
      toast.success("Draft restored");
    }
    setShowCreateModal(true);
  };

  const openEditModal = (plan: TripPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description ?? "",
      waypoints: plan.waypoints ?? [],
      asset_id: plan.asset_id,
      load_weight_kg: plan.load_weight_kg,
      is_active: plan.is_active ?? true,
    });
    const wp = plan.waypoints ?? [];
    if (wp.length >= 2) {
      setStartAddress({ name: wp[0].label ?? "Start", lat: wp[0].lat, lon: wp[0].lon });
      setStartSearch(wp[0].label ?? "Start");
      setDestinationAddress({ name: wp[wp.length - 1].label ?? "Destination", lat: wp[wp.length - 1].lat, lon: wp[wp.length - 1].lon });
      setDestSearch(wp[wp.length - 1].label ?? "Destination");
      setIntermediateWaypoints(wp.slice(1, -1).map((w, i) => ({ ...w, order: i })));
      setShowAddWaypoints(wp.length > 2);
    } else {
      setStartAddress(null);
      setStartSearch("");
      setDestinationAddress(null);
      setDestSearch("");
      setIntermediateWaypoints([]);
      setShowAddWaypoints(false);
    }
    setRoadRoute(null);
    setShowCreateModal(true);
  };

  const closeCreateOrEditModal = (skipDraftSave = false) => {
    if (!skipDraftSave && !editingPlan && (formData.name.trim() || effectiveWaypoints.length > 0 || startAddress || destinationAddress)) {
      saveDraft({
        formData: {
          name: formData.name,
          description: formData.description ?? "",
          waypoints: formData.waypoints,
          load_weight_kg: formData.load_weight_kg,
          asset_id: formData.asset_id,
          is_active: formData.is_active ?? true,
        },
        startAddress: startAddress ? { name: startAddress.name, lat: startAddress.lat, lon: startAddress.lon } : null,
        startSearch,
        destinationAddress: destinationAddress ? { name: destinationAddress.name, lat: destinationAddress.lat, lon: destinationAddress.lon } : null,
        destSearch,
        intermediateWaypoints,
        showAddWaypoints,
        citySearch,
        startCity,
        savedAt: Date.now(),
      });
      toast.success("Draft saved. Restore it when you create a new trip plan.");
    }
    setShowCreateModal(false);
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      waypoints: [],
      load_weight_kg: undefined,
      is_active: true,
    });
    setRoadRoute(null);
    setStartCity(null);
    setCitySearch("");
    setCityResults([]);
    setStartAddress(null);
    setStartSearch("");
    setDestinationAddress(null);
    setDestSearch("");
    setIntermediateWaypoints([]);
    setShowAddWaypoints(false);
    setWaypointSearch("");
    setWaypointSearchResults([]);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a trip name");
      return;
    }
    if (optimizedWaypoints.length < 2) {
      toast.error("Add start address and destination (or at least 2 waypoints by clicking on the map)");
      return;
    }
    try {
      setIsSubmitting(true);
      const waypointsToSave = optimizedWaypoints;
      const waypointsWithOrder = waypointsToSave.map((w, i) => ({
        ...w,
        order: i,
      }));
      if (editingPlan) {
        await tripPlanAPI.updateTripPlan(editingPlan.id, {
          name: formData.name.trim(),
          description: formData.description || undefined,
          waypoints: waypointsWithOrder,
          asset_id: formData.asset_id || undefined,
          load_weight_kg: formData.load_weight_kg,
          is_active: formData.is_active ?? true,
        });
        toast.success("Trip plan updated successfully");
      } else {
        await tripPlanAPI.createTripPlan({
          name: formData.name.trim(),
          description: formData.description || undefined,
          waypoints: waypointsWithOrder,
          asset_id: formData.asset_id || undefined,
          load_weight_kg: formData.load_weight_kg,
          is_active: true,
        });
        toast.success("Trip plan created successfully");
      }
      clearDraft();
      closeCreateOrEditModal(true);
      refetchTripPlans();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null;
      toast.error(msg || (editingPlan ? "Failed to update trip plan" : "Failed to create trip plan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMapClick = (e: { lngLat: { lat: number; lng: number } }) => {
    if (!showCreateModal) return;
    const { lat, lng } = e.lngLat;
    if (startAddress && destinationAddress && showAddWaypoints) {
      setIntermediateWaypoints((prev) => [
        ...prev,
        { lat, lon: lng, label: `Stop ${prev.length + 2}`, order: prev.length },
      ]);
    } else {
      setFormData((prev) => ({
        ...prev,
        waypoints: [
          ...prev.waypoints,
          { lat, lon: lng, label: `Stop ${prev.waypoints.length + 1}`, order: prev.waypoints.length },
        ],
      }));
    }
    setRoadRoute(null);
  };

  const removeWaypoint = (index: number) => {
    if (startAddress && destinationAddress && showAddWaypoints) {
      setIntermediateWaypoints((prev) =>
        prev.filter((_, i) => i !== index - 1).map((w, i) => ({ ...w, order: i }))
      );
    } else {
      setFormData((prev) => ({
        ...prev,
        waypoints: prev.waypoints
          .filter((_, i) => i !== index)
          .map((w, i) => ({ ...w, order: i })),
      }));
    }
    setRoadRoute(null);
  };

  const removeWaypointByCoords = (lat: number, lon: number) => {
    const all = optimizedWaypoints;
    const idx = all.findIndex((w) => Math.abs(w.lat - lat) < 1e-5 && Math.abs(w.lon - lon) < 1e-5);
    if (idx < 0) return;
    if (startAddress && destinationAddress && showAddWaypoints && idx > 0 && idx < all.length - 1) {
      setIntermediateWaypoints((prev) =>
        prev.filter((w) => !(Math.abs(w.lat - lat) < 1e-5 && Math.abs(w.lon - lon) < 1e-5)).map((w, i) => ({ ...w, order: i }))
      );
    } else if (!startAddress || !destinationAddress) {
      setFormData((prev) => ({
        ...prev,
        waypoints: prev.waypoints
          .filter((w) => !(Math.abs(w.lat - lat) < 1e-5 && Math.abs(w.lon - lon) < 1e-5))
          .map((w, i) => ({ ...w, order: i })),
      }));
    } else {
      if (idx === 0) {
        setStartAddress(null);
        setStartSearch("");
      } else if (idx === all.length - 1) {
        setDestinationAddress(null);
        setDestSearch("");
      } else {
        setIntermediateWaypoints((prev) =>
          prev.filter((w) => !(Math.abs(w.lat - lat) < 1e-5 && Math.abs(w.lon - lon) < 1e-5)).map((w, i) => ({ ...w, order: i }))
        );
      }
    }
    setRoadRoute(null);
  };

  // Search for cities when user types (debounced)
  useEffect(() => {
    if (!citySearch.trim() || !MAPBOX_TOKEN) {
      setCityResults([]);
      return;
    }
    const t = setTimeout(() => {
      setCitySearching(true);
      searchPlaces(citySearch, MAPBOX_TOKEN, 6)
        .then((r) => setCityResults(r))
        .finally(() => setCitySearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [citySearch]);

  // Search for start address
  useEffect(() => {
    if (!startSearch.trim() || !MAPBOX_TOKEN) {
      setStartResults([]);
      return;
    }
    const t = setTimeout(() => {
      setStartSearching(true);
      searchPlaces(startSearch, MAPBOX_TOKEN, 6)
        .then((r) => setStartResults(r))
        .finally(() => setStartSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [startSearch]);

  // Search for destination
  useEffect(() => {
    if (!destSearch.trim() || !MAPBOX_TOKEN) {
      setDestResults([]);
      return;
    }
    const t = setTimeout(() => {
      setDestSearching(true);
      searchPlaces(destSearch, MAPBOX_TOKEN, 6)
        .then((r) => setDestResults(r))
        .finally(() => setDestSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [destSearch]);

  // Search for intermediate waypoint (when adding by address)
  useEffect(() => {
    if (!waypointSearch.trim() || !MAPBOX_TOKEN || !showAddWaypoints) {
      setWaypointSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setWaypointSearching(true);
      searchPlaces(waypointSearch, MAPBOX_TOKEN, 6)
        .then((r) => setWaypointSearchResults(r))
        .finally(() => setWaypointSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [waypointSearch, showAddWaypoints]);

  // Effective waypoints: start + intermediates + destination (or legacy formData.waypoints if no start/dest)
  const effectiveWaypoints = useMemo((): Waypoint[] => {
    const fromAddress = startAddress
      ? { lat: startAddress.lat, lon: startAddress.lon, label: startAddress.name, order: 0 }
      : null;
    const toAddress = destinationAddress
      ? {
          lat: destinationAddress.lat,
          lon: destinationAddress.lon,
          label: destinationAddress.name,
          order: (fromAddress ? 1 : 0) + intermediateWaypoints.length,
        }
      : null;
    const mids = intermediateWaypoints.map((w, i) => ({
      ...w,
      order: (fromAddress ? 1 : 0) + i,
    }));
    const combined = [fromAddress, ...mids, toAddress].filter(Boolean) as Waypoint[];
    if (combined.length > 0) return combined;
    return formData.waypoints;
  }, [startAddress, destinationAddress, intermediateWaypoints, formData.waypoints]);

  // Optimize waypoint order for shortest distance (km) - saves fuel, no AI cost.
  const optimizedWaypoints = useMemo(
    () => optimizeWaypointOrderForShortestRoute(effectiveWaypoints),
    [effectiveWaypoints]
  );

  // Fetch road-following route when waypoints change (2+ waypoints)
  useEffect(() => {
    if (!MAPBOX_TOKEN || optimizedWaypoints.length < 2) {
      setRoadRoute(null);
      return;
    }
    let cancelled = false;
    setRouteLoading(true);
    fetchDrivingRoute(optimizedWaypoints, MAPBOX_TOKEN)
      .then((result) => {
        if (!cancelled && result) setRoadRoute(result);
        else if (!cancelled) setRoadRoute(null);
      })
      .catch(() => {
        if (!cancelled) setRoadRoute(null);
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [optimizedWaypoints]);

  const mapCenter =
    startCity ??
    (startAddress
      ? { lat: startAddress.lat, lon: startAddress.lon }
      : effectiveWaypoints[0]
        ? { lat: effectiveWaypoints[0].lat, lon: effectiveWaypoints[0].lon }
        : null) ??
    fallbackCenter;

  const getAssetName = (assetId?: string) => {
    if (!assetId) return null;
    const a = assets.find((x) => x.id === assetId);
    return a && (a.vehicle_details?.license_plate || a.name);
  };

  const handleAssign = async () => {
    if (!showAssignModal || !assignAssetId) {
      toast.error("Select a vehicle to assign");
      return;
    }
    try {
      setIsSubmitting(true);
      await tripPlanAPI.assignTripPlan(
        showAssignModal.id,
        assignAssetId,
        assignScheduledDate || undefined
      );
      toast.success("Trip assigned to vehicle. Driver will be notified.");
      setShowAssignModal(null);
      setAssignAssetId("");
      setAssignScheduledDate("");
      refetchTripPlans();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null;
      toast.error(msg || "Failed to assign trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    planned: "bg-blue-100 text-blue-700",
    assigned: "bg-amber-100 text-amber-700",
    in_progress: "bg-teal-100 text-teal-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const orderWasOptimized =
    effectiveWaypoints.length >= 3 &&
    optimizedWaypoints.some(
      (o, i) =>
        effectiveWaypoints[i] &&
        (o.lat !== effectiveWaypoints[i].lat || o.lon !== effectiveWaypoints[i].lon)
    );

  // GeoJSON for route display in create modal - use road-following route when available - use road-following route when available
  const createRouteGeoJSON =
    roadRoute && roadRoute.coordinates.length >= 2
      ? {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: roadRoute.coordinates,
          },
        }
      : optimizedWaypoints.length >= 2
        ? {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "LineString" as const,
              coordinates: optimizedWaypoints.map((w) => [w.lon, w.lat] as [number, number]),
            },
          } as const
        : null;

  // Summary map: fetch road-following route from Mapbox when plan selected (so path matches roads)
  useEffect(() => {
    if (!selectedPlan || !MAPBOX_TOKEN) {
      setSummaryRoadRoute(null);
      return;
    }
    const wp = selectedPlan.waypoints ?? [];
    const sorted = [...wp].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (sorted.length < 2) {
      setSummaryRoadRoute(null);
      return;
    }
    let cancelled = false;
    setSummaryRouteLoading(true);
    setSummaryRoadRoute(null);
    fetchDrivingRoute(
      sorted.map((w) => ({ lat: w.lat, lon: w.lon })),
      MAPBOX_TOKEN
    )
      .then((result) => {
        if (!cancelled && result) setSummaryRoadRoute(result);
      })
      .catch(() => {
        if (!cancelled) setSummaryRoadRoute(null);
      })
      .finally(() => {
        if (!cancelled) setSummaryRouteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlan]);

  const summaryRouteGeoJSON = useMemo(() => {
    if (!summaryRoadRoute || summaryRoadRoute.coordinates.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: summaryRoadRoute.coordinates,
      },
    };
  }, [summaryRoadRoute]);

  // Fit map to route when plan selected
  useEffect(() => {
    if (!summaryRouteGeoJSON || !summaryMapRef.current) return;
    const coords = summaryRouteGeoJSON.geometry.coordinates;
    const bbox = getRouteBbox(coords);
    if (bbox) {
      const map = summaryMapRef.current.getMap?.();
      if (map) map.fitBounds(bbox, { padding: 40, maxZoom: 14, duration: 500 });
    }
  }, [summaryRouteGeoJSON]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Route className="h-7 w-7 text-teal-600" />
            Trip Planning
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Plan routes with waypoints and view them on the live map
          </p>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm"
          onClick={openCreateModal}
        >
          <Plus className="h-4 w-4" />
          Create Trip Plan
          {hasDraft && (
            <Badge variant="secondary" className="ml-1 text-[10px]">Draft</Badge>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan list */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            Array(3)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded-t-xl" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))
          ) : plans.length > 0 ? (
            plans.map((plan) => (
              <Card
                key={plan.id}
                className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer group ${
                  selectedPlan?.id === plan.id ? "ring-2 ring-teal-500" : ""
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 truncate pr-2">
                      {plan.name}
                    </h3>
                    <div className="flex gap-1 items-center">
                      <Badge
                        className={`text-[10px] capitalize ${statusColor[plan.status] || "bg-gray-100 text-gray-700"}`}
                      >
                        {plan.status.replace("_", " ")}
                      </Badge>
                      {plan.status === "draft" || plan.status === "planned" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-teal-600 hover:bg-teal-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAssignModal(plan);
                            setAssignAssetId(plan.asset_id || "");
                          }}
                          title="Assign to vehicle"
                        >
                          <Zap className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-teal-600 hover:bg-teal-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(plan);
                        }}
                        title="Edit trip plan"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(plan.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2 min-h-[32px]">
                    {plan.description || "No description."}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {plan.estimated_distance_km != null && (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Gauge className="h-4 w-4" />
                        {plan.estimated_distance_km} km
                      </span>
                    )}
                    {plan.estimated_duration_min != null && (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-4 w-4" />
                        ~{Math.round(plan.estimated_duration_min)} min
                      </span>
                    )}
                    {plan.estimated_distance_km != null &&
                      plan.estimated_duration_min != null &&
                      plan.estimated_duration_min > 0 && (
                        <span className="flex items-center gap-1 text-gray-600" title="Suggested avg speed">
                          <Navigation className="h-4 w-4" />
                          ~{((plan.estimated_distance_km / plan.estimated_duration_min) * 60).toFixed(0)} km/h
                        </span>
                      )}
                    {plan.asset_id &&
                      plan.estimated_distance_km != null &&
                      vehicleConsumption[plan.asset_id]?.avg_l_100km != null && (
                        <span className="flex items-center gap-1 text-gray-600" title="Est. fuel from OBD history">
                          <Fuel className="h-4 w-4" />
                          ~{((plan.estimated_distance_km * vehicleConsumption[plan.asset_id].avg_l_100km!) / 100).toFixed(1)} L
                        </span>
                      )}
                    {plan.waypoints?.length > 0 && (
                      <span className="flex items-center gap-1 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {plan.waypoints.length} stops
                      </span>
                    )}
                    {plan.asset_id && (
                      <Badge variant="secondary" className="text-xs">
                        {getAssetName(plan.asset_id) || plan.asset_id.slice(0, 8)}
                      </Badge>
                    )}
                    {plan.load_weight_kg != null && (
                      <span className="text-gray-600">Load: {plan.load_weight_kg} kg</span>
                    )}
                    {plan.status === "completed" && (
                      <Badge className="text-[10px] bg-green-100 text-green-700" title="Trip done – report available">
                        <FileText className="h-3 w-3 mr-0.5" />
                        Report ready
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-20 text-center bg-white rounded-xl border border-dashed">
              <Route className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                No trip plans yet
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto mt-2">
                Create planned routes with waypoints to display on the live map
                and assign to vehicles.
              </p>
              <Button
                className="mt-6 gap-2"
                variant="outline"
                onClick={openCreateModal}
              >
                <Plus className="h-4 w-4" />
                Create Your First Trip Plan
                {hasDraft && (
                  <Badge variant="secondary" className="ml-1 text-[10px]">Draft</Badge>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Map preview - path summary only (no waypoint markers) */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden h-[400px]">
            <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Route className="h-4 w-4" />
                {selectedPlan ? selectedPlan.name : "Select a plan"}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedPlan
                  ? summaryRouteLoading
                    ? "Loading road route..."
                    : "Route path summary"
                  : "Click a plan to view its route"}
              </p>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-64px)]">
              {MAPBOX_TOKEN ? (
                <Map
                  ref={summaryMapRef}
                  initialViewState={{
                    latitude: selectedPlan?.waypoints?.[0]?.lat ?? fallbackCenter.lat,
                    longitude: selectedPlan?.waypoints?.[0]?.lon ?? fallbackCenter.lon,
                    zoom: 12,
                  }}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                  mapboxAccessToken={MAPBOX_TOKEN}
                  style={{ width: "100%", height: "100%" }}
                >
                  <NavigationControl position="top-right" />
                  {summaryRouteGeoJSON && (
                    <Source id="summary-route" type="geojson" data={summaryRouteGeoJSON}>
                      <Layer
                        id="summary-route-line"
                        type="line"
                        paint={{
                          "line-color": "#0d9488",
                          "line-width": 4,
                        }}
                      />
                    </Source>
                  )}
                </Map>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
                  Mapbox Token Missing
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Trip Plan Modal */}
      <Modal
        size="3xl"
        isOpen={showCreateModal}
        onClose={() => closeCreateOrEditModal()}
        title={editingPlan ? "Edit Trip Plan" : "Create Trip Plan"}
      >
        <Form
          onSubmit={handleCreateSubmit}
          errors={{}}
          touched={{}}
          isSubmitting={isSubmitting}
        >
          {!editingPlan && hasDraft && (
            <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-2">
              <span className="text-sm text-amber-800">Draft restored</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 hover:text-amber-900"
                onClick={() => {
                  clearDraft();
                  setFormData({ name: "", description: "", waypoints: [], load_weight_kg: undefined, is_active: true });
                  setStartAddress(null);
                  setStartSearch("");
                  setDestinationAddress(null);
                  setDestSearch("");
                  setIntermediateWaypoints([]);
                  setShowAddWaypoints(false);
                  setCitySearch("");
                  setStartCity(null);
                  toast.success("Draft discarded");
                }}
              >
                Discard draft
              </Button>
            </div>
          )}
          <FormGrid>
            <FormField name="name">
              <FormLabel>Trip Name *</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Johannesburg to Pretoria"
                required
              />
            </FormField>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AddressSearchInput
                label="Start Address *"
                value={startSearch}
                onChange={(v) => {
                  setStartSearch(v);
                  setShowStartDropdown(true);
                }}
                onSelect={(r) => {
                  setStartAddress(r);
                  setStartSearch(r.placeFormatted || r.name);
                  setShowStartDropdown(false);
                  setStartResults([]);
                }}
                placeholder="Search start address..."
                results={startResults}
                searching={startSearching}
                showDropdown={showStartDropdown}
                onFocus={() => setShowStartDropdown(true)}
                onBlur={() => setTimeout(() => setShowStartDropdown(false), 200)}
              />
              <AddressSearchInput
                label="Destination *"
                value={destSearch}
                onChange={(v) => {
                  setDestSearch(v);
                  setShowDestDropdown(true);
                }}
                onSelect={(r) => {
                  setDestinationAddress(r);
                  setDestSearch(r.placeFormatted || r.name);
                  setShowDestDropdown(false);
                  setDestResults([]);
                }}
                placeholder="Search destination..."
                results={destResults}
                searching={destSearching}
                showDropdown={showDestDropdown}
                onFocus={() => setShowDestDropdown(true)}
                onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)}
              />
            </div>

            {/* Optional: center map by city */}
            <div className="md:col-span-2">
              <FormLabel>Center map (optional)</FormLabel>
              <div className="relative">
                <Input
                  value={citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  onFocus={() => setShowCityDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                  placeholder="Search city to center map (e.g. Cape Town)"
                  className="pr-10"
                />
                {startCity && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartCity(null);
                      setCitySearch("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Clear"
                  >
                    ×
                  </button>
                )}
                {showCityDropdown && (cityResults.length > 0 || citySearching) && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
                    {citySearching ? (
                      <div className="p-3 text-sm text-gray-500">Searching...</div>
                    ) : (
                      cityResults.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex flex-col"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setStartCity({ lat: r.lat, lon: r.lon, name: r.name });
                            setCitySearch(r.placeFormatted || r.name);
                            setShowCityDropdown(false);
                            setCityResults([]);
                          }}
                        >
                          <span className="font-medium">{r.name}</span>
                          {r.placeFormatted && (
                            <span className="text-xs text-gray-500">{r.placeFormatted}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Optional: add more waypoints (geofencing, intermediate stops) */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setShowAddWaypoints(!showAddWaypoints)}
                className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                {showAddWaypoints ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAddWaypoints ? "Hide" : "Add"} waypoints (geofencing, intermediate stops)
              </button>
              {showAddWaypoints && startAddress && destinationAddress && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500">
                    Add stops between start and destination. Search by address or click on the map.
                  </p>
                  <div className="relative">
                    <Input
                      value={waypointSearch}
                      onChange={(e) => {
                        setWaypointSearch(e.target.value);
                        setShowWaypointDropdown(true);
                      }}
                      onFocus={() => setShowWaypointDropdown(true)}
                      onBlur={() => setTimeout(() => setShowWaypointDropdown(false), 200)}
                      placeholder="Search address to add stop..."
                      className="pr-8"
                    />
                    {showWaypointDropdown && (waypointSearchResults.length > 0 || waypointSearching) && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
                        {waypointSearching ? (
                          <div className="p-3 text-sm text-gray-500">Searching...</div>
                        ) : (
                          waypointSearchResults.map((r, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex flex-col"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setIntermediateWaypoints((prev) => [
                                  ...prev,
                                  { lat: r.lat, lon: r.lon, label: r.name, order: prev.length },
                                ]);
                                setWaypointSearch("");
                                setShowWaypointDropdown(false);
                                setWaypointSearchResults([]);
                                setRoadRoute(null);
                              }}
                            >
                              <span className="font-medium">{r.name}</span>
                              {r.placeFormatted && (
                                <span className="text-xs text-gray-500">{r.placeFormatted}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <FormLabel>
                {startAddress && destinationAddress
                  ? "Route preview"
                  : "Or add waypoints by clicking on the map"}
              </FormLabel>
              <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 relative">
                {MAPBOX_TOKEN ? (
                  <Map
                    key={`${mapCenter.lat}-${mapCenter.lon}`}
                    initialViewState={{
                      latitude: mapCenter.lat,
                      longitude: mapCenter.lon,
                      zoom: 12,
                    }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    onClick={handleMapClick}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <NavigationControl position="top-right" />
                    {optimizedWaypoints.map((w, i) => (
                      <Marker key={i} latitude={w.lat} longitude={w.lon}>
                        <div
                          className="bg-teal-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-teal-700"
                          title={`${w.label || `Stop ${i + 1}`} - Click X to remove`}
                        >
                          {i + 1}
                        </div>
                      </Marker>
                    ))}
                    {createRouteGeoJSON && (
                      <Source
                        id="create-route"
                        type="geojson"
                        data={createRouteGeoJSON}
                      >
                        <Layer
                          id="create-route-line"
                          type="line"
                          paint={{
                            "line-color": "#0d9488",
                            "line-width": 3,
                          }}
                        />
                      </Source>
                    )}
                  </Map>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
                    Mapbox Token Missing
                  </div>
                )}
              </div>
              {optimizedWaypoints.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {optimizedWaypoints.map((w, i) => (
                    <Badge
                      key={`${w.lat}-${w.lon}`}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {i + 1}. {w.label || `${w.lat.toFixed(4)}, ${w.lon.toFixed(4)}`}
                      <button
                        type="button"
                        onClick={() => removeWaypointByCoords(w.lat, w.lon)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-500 italic">
                {optimizedWaypoints.length < 2
                  ? "Enter start address and destination, or add at least 2 waypoints by clicking the map. Route optimized for shortest distance (km)."
                  : routeLoading
                    ? "Computing shortest road route..."
                    : roadRoute
                      ? `Shortest route: ${roadRoute.distanceKm.toFixed(1)} km, ~${Math.round(roadRoute.durationMin)} min${orderWasOptimized ? " (stops reordered for fuel savings)" : ""}`
                      : `${optimizedWaypoints.length} waypoints. Route will follow roads on save.`}
              </p>
            </div>

            <div className="md:col-span-2">
              <FormLabel>Description</FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional: describe this route..."
                rows={2}
              />
            </div>

            <div className="md:col-span-2">
              <FormLabel>Assign to Vehicle (Optional)</FormLabel>
              <select
                value={formData.asset_id || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    asset_id: e.target.value || undefined,
                  })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">No vehicle assigned</option>
                {assets
                  .filter((a) => a.asset_type === "vehicle" && a.vehicle_details?.driver_id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.vehicle_details?.license_plate && `(${a.vehicle_details.license_plate})`}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {assets.filter((a) => a.asset_type === "vehicle" && a.vehicle_details?.driver_id).length === 0
                  ? "No vehicles with assigned drivers. Assign drivers to vehicles in the Assets section first."
                  : "Only vehicles with an assigned driver are shown."}
              </p>
            </div>
            <div className="md:col-span-2">
              <FormLabel>Load Weight (kg) - Optional</FormLabel>
              <Input
                type="number"
                min={0}
                value={formData.load_weight_kg ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    load_weight_kg: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="e.g. 5000 for trucking"
              />
            </div>
          </FormGrid>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (editingPlan ? "Updating..." : "Creating...") : (editingPlan ? "Update Trip Plan" : "Create Trip Plan")}
            </Button>
          </FormActions>
        </Form>
      </Modal>

      {/* Assign Trip Plan Modal */}
      <Modal
        isOpen={!!showAssignModal}
        onClose={() => {
          setShowAssignModal(null);
          setAssignAssetId("");
          setAssignScheduledDate("");
        }}
        title="Assign Trip to Vehicle"
      >
        {showAssignModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Assign &quot;{showAssignModal.name}&quot; to a vehicle. The driver will receive trip details including expected arrival time.
            </p>
            <div>
              <FormLabel>Vehicle *</FormLabel>
              <select
                value={assignAssetId}
                onChange={(e) => setAssignAssetId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select vehicle</option>
                {assets
                  .filter((a) => a.asset_type === "vehicle" && a.vehicle_details?.driver_id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.vehicle_details?.license_plate && `(${a.vehicle_details.license_plate})`}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {assets.filter((a) => a.asset_type === "vehicle" && a.vehicle_details?.driver_id).length === 0
                  ? "No vehicles with assigned drivers. Assign drivers to vehicles in the Assets section first."
                  : "Only vehicles with an assigned driver are shown."}
              </p>
            </div>
            <div>
              <FormLabel>Scheduled Date & Time (Optional)</FormLabel>
              <Input
                type="datetime-local"
                value={assignScheduledDate}
                onChange={(e) => setAssignScheduledDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAssignModal(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={isSubmitting || !assignAssetId}
              >
                {isSubmitting ? "Assigning..." : "Assign Trip"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
