"use client";

import React, { useState, useEffect, useCallback } from "react";
import { geofenceAPI, assetAPI, assetGroupAPI, type AssetGroup } from "@/services/api";
import { useMapCenter } from "@/hooks/useMapCenter";
import {
  type Geofence,
  type GeofenceAlert,
  type GeofenceCreate,
  type Asset,
} from "@/types/api";
import {
  Form,
  FormField,
  FormLabel,
  FormGrid,
  FormActions,
  Select,
  Textarea,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MultiSearchableSelect } from "@/components/ui/multi-searchable-select";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  ShieldCheck,
  Plus,
  History,
  AlertTriangle,
  MapPin,
  Clock,
  ChevronRight,
  Bell,
  Trash2,
  Settings,
  Circle,
  Hexagon,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function GeofencesPage() {
  const mapCenter = useMapCenter();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<GeofenceCreate>({
    name: "",
    description: "",
    geofence_type: "circle",
    center: { lat: mapCenter.lat, lon: mapCenter.lon },
    radius_meters: 500,
    color: "#3b82f6",
    notify_on_entry: true,
    notify_on_exit: true,
    asset_ids: [],
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [gfList, alertList, assetList, groupList] = await Promise.all([
        geofenceAPI.getGeofences(),
        geofenceAPI.getGeofenceAlerts(),
        assetAPI.getAssets({ limit: 100 }),
        assetGroupAPI.list().catch(() => []),
      ]);
      setGeofences(gfList);
      setAlerts(alertList);
      setAssets(Array.isArray(assetList) ? assetList : (assetList?.items || []));
      setGroups(groupList);
    } catch (error) {
      console.error("Error loading geofence data:", error);
      toast.error("Failed to load geofence information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this geofence?")) return;
    try {
      await geofenceAPI.deleteGeofence(id);
      toast.success("Geofence deleted");
      loadData();
    } catch {
      toast.error("Failed to delete geofence");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await geofenceAPI.createGeofence({ ...formData, group_ids: selectedGroupIds } as any);
      toast.success("Geofence created successfully");
      setShowCreateModal(false);
      setFormData({
        name: "",
        description: "",
        geofence_type: "circle",
        center: { lat: mapCenter.lat, lon: mapCenter.lon },
        radius_meters: 500,
        color: "#3b82f6",
        notify_on_entry: true,
        notify_on_exit: true,
        asset_ids: [],
      });
      setSelectedGroupIds([]);
      loadData();
    } catch {
      toast.error("Failed to create geofence");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-teal-600" />
            Geofence Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor and configure virtual boundaries for your fleet
          </p>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4" />
          Create Geofence
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border p-1 mb-6">
          <TabsTrigger value="list" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Active Geofences
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <History className="h-4 w-4" />
            Alert History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array(3)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-t-xl" />
                    <CardContent className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))
            ) : geofences.length > 0 ? (
              geofences.map((gf) => (
                <Card
                  key={gf.id}
                  className="overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <div
                    className="h-32 flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: `${gf.color}15` }}
                  >
                    {gf.geofence_type === "circle" ? (
                      <Circle
                        className="h-16 w-16 opacity-20"
                        style={{ color: gf.color }}
                      />
                    ) : (
                      <Hexagon
                        className="h-16 w-16 opacity-20"
                        style={{ color: gf.color }}
                      />
                    )}
                    <Badge
                      className="absolute top-3 right-3 capitalize"
                      variant={gf.is_active ? "success" : "secondary"}
                    >
                      {gf.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 truncate pr-2">
                        {gf.name}
                      </h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-blue-600"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-600"
                          onClick={() => handleDelete(gf.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 min-h-[32px]">
                      {gf.description || "No description provided."}
                    </p>

                    <div className="space-y-2 border-t pt-4">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400 uppercase font-bold">
                          Type
                        </span>
                        <span className="font-medium text-gray-700 capitalize">
                          {gf.geofence_type}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400 uppercase font-bold">
                          Triggers
                        </span>
                        <span className="font-medium text-gray-700">
                          {gf.notify_on_entry && "Entry"}
                          {gf.notify_on_entry && gf.notify_on_exit && ", "}
                          {gf.notify_on_exit && "Exit"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400 uppercase font-bold">
                          Assets
                        </span>
                        <span className="font-medium text-teal-600">
                          {gf.asset_ids.length === 0
                            ? "All Fleet"
                            : `${gf.asset_ids.length} Linked`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed">
                <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  No geofences created
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto mt-2">
                  Create virtual boundaries to receive notifications when
                  vehicles enter or leave specific areas.
                </p>
                <Button className="mt-6 gap-2" variant="outline">
                  <Plus className="h-4 w-4" />
                  Create Your First Geofence
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="text-md flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                Recent Geofence Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-6 py-3">Event</th>
                      <th className="px-6 py-3">Geofence</th>
                      <th className="px-6 py-3">Device / Asset</th>
                      <th className="px-6 py-3">Location</th>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td
                              colSpan={6}
                              className="px-6 py-4 h-12 bg-gray-50/50"
                            />
                          </tr>
                        ))
                    ) : alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <tr
                          key={alert.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                alert.event_type === "entry"
                                  ? "success"
                                  : "warning"
                              }
                              className="gap-1 px-2 py-0.5"
                            >
                              <ChevronRight
                                className={`h-3 w-3 ${alert.event_type === "exit" ? "rotate-180" : ""}`}
                              />
                              {alert.event_type.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {alert.geofence_name}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-700">
                                {alert.device_id}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                ID: {alert.asset_id.substring(0, 8)}...
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer">
                              <MapPin className="h-3 w-3" />
                              <span className="text-xs">
                                {alert.lat.toFixed(4)}, {alert.lon.toFixed(4)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-gray-400" />
                              {format(new Date(alert.ts), "MMM d, HH:mm:ss")}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-blue-600 h-8"
                            >
                              View on Map
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center text-gray-400"
                        >
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          No geofence alerts recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Geofence Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Geofence"
      >
        <Form
          onSubmit={handleCreateSubmit}
          errors={{}}
          touched={{}}
          isSubmitting={isSubmitting}
        >
          <FormGrid>
            <FormField name="name">
              <FormLabel>Geofence Name *</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Main Warehouse"
                required
              />
            </FormField>

            <FormField name="geofence_type">
              <FormLabel>Boundary Type *</FormLabel>
              <Select
                value={formData.geofence_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    geofence_type: e.target.value as "circle" | "polygon",
                  })
                }
                options={[
                  { value: "circle", label: "Circular Radius" },
                  { value: "polygon", label: "Custom Polygon (Advanced)" },
                ]}
              />
            </FormField>

            <div className="md:col-span-2 space-y-2">
              <FormLabel>
                Location Picker (Click on map or drag marker)
              </FormLabel>
              <div className="h-[300px] rounded-lg overflow-hidden border border-gray-200 relative">
                {MAPBOX_TOKEN ? (
                  <Map
                    initialViewState={{
                      latitude: formData.center?.lat ?? mapCenter.lat,
                      longitude: formData.center?.lon ?? mapCenter.lon,
                      zoom: 13,
                    }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    onClick={(e) => {
                      setFormData({
                        ...formData,
                        center: { lat: e.lngLat.lat, lon: e.lngLat.lng },
                      });
                    }}
                  >
                    <NavigationControl position="top-right" />
                    {formData.center && (
                      <Marker
                        latitude={formData.center.lat}
                        longitude={formData.center.lon}
                        draggable
                        onDragEnd={(e) => {
                          setFormData({
                            ...formData,
                            center: { lat: e.lngLat.lat, lon: e.lngLat.lng },
                          });
                        }}
                      >
                        <MapPin className="text-red-600 h-8 w-8 -mt-8 -ml-4 drop-shadow-md" />
                      </Marker>
                    )}
                  </Map>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
                    Mapbox Token Missing
                  </div>
                )}
              </div>
              {formData.center && (
                <p className="text-[10px] text-gray-500 italic">
                  Selected Center: {formData.center.lat.toFixed(6)},{" "}
                  {formData.center.lon.toFixed(6)}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <FormLabel>Description</FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose of this boundary..."
                rows={2}
              />
            </div>

            {formData.geofence_type === "circle" && (
              <FormField name="radius">
                <FormLabel>Radius (meters) *</FormLabel>
                <Input
                  type="number"
                  value={formData.radius_meters}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      radius_meters: parseInt(e.target.value),
                    })
                  }
                  min={50}
                  max={10000}
                />
              </FormField>
            )}

            <FormField name="color">
              <FormLabel>Map Color</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </FormField>

            <div className="md:col-span-2 flex gap-6 p-3 bg-gray-50 rounded-lg border border-dashed">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notify_entry"
                  checked={formData.notify_on_entry}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notify_on_entry: e.target.checked,
                    })
                  }
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="notify_entry" className="text-sm font-medium">
                  Notify on Entry
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notify_exit"
                  checked={formData.notify_on_exit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notify_on_exit: e.target.checked,
                    })
                  }
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="notify_exit" className="text-sm font-medium">
                  Notify on Exit
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <FormLabel>Assign to Specific Assets (Optional)</FormLabel>
              <MultiSearchableSelect
                options={assets.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${a.vehicle_details?.license_plate || a.id.substring(0, 5)})`,
                }))}
                value={formData.asset_ids || []}
                onChange={(values) =>
                  setFormData({ ...formData, asset_ids: values })
                }
                placeholder="Select assets..."
                searchPlaceholder="Search by name or plate..."
              />
              <p className="text-[10px] text-gray-400 mt-1">
                If no assets or groups are selected, the geofence will apply to your
                entire fleet.
              </p>
            </div>

            {groups.length > 0 && (
              <div className="md:col-span-2">
                <FormLabel>Assign to Groups (Optional)</FormLabel>
                <MultiSearchableSelect
                  options={groups.map((g) => ({
                    value: g.id,
                    label: g.name,
                  }))}
                  value={selectedGroupIds}
                  onChange={(values) => setSelectedGroupIds(values)}
                  placeholder="Select groups..."
                  searchPlaceholder="Search groups..."
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  All vehicles in the selected groups will be monitored by this geofence.
                </p>
              </div>
            )}
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
              {isSubmitting ? "Creating..." : "Create Geofence"}
            </Button>
          </FormActions>
        </Form>
      </Modal>
    </div>
  );
}
