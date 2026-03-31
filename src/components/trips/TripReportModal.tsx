"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { telemetryAPI } from "@/services/api";
import type { TripReport } from "@/types/api";
import {
  Gauge,
  Clock,
  Fuel,
  MapPin,
  AlertTriangle,
  DollarSign,
  Package,
  X,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface TripReportModalProps {
  tripId: string;
  onClose: () => void;
  onReportLoaded?: (report: TripReport | null) => void;
}

export function TripReportModal({
  tripId,
  onClose,
  onReportLoaded,
}: TripReportModalProps) {
  const [report, setReport] = useState<TripReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tripCost, setTripCost] = useState<string>("");
  const [loadWeight, setLoadWeight] = useState<string>("");

  useEffect(() => {
    telemetryAPI
      .getTripReport(tripId)
      .then((data) => {
        setReport(data);
        setTripCost(data.trip_cost?.toString() ?? "");
        setLoadWeight(data.load_weight_kg?.toString() ?? "");
        onReportLoaded?.(data);
      })
      .catch(() => {
        toast.error("Failed to load trip report");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [tripId, onClose, onReportLoaded]);

  const handleSaveReportFields = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await telemetryAPI.updateTripReportFields(tripId, {
        trip_cost: tripCost ? parseFloat(tripCost) : undefined,
        load_weight_kg: loadWeight ? parseFloat(loadWeight) : undefined,
      });
      toast.success("Report updated");
      setReport((prev) =>
        prev
          ? {
              ...prev,
              trip_cost: tripCost ? parseFloat(tripCost) : undefined,
              load_weight_kg: loadWeight ? parseFloat(loadWeight) : undefined,
            }
          : null
      );
    } catch {
      toast.error("Failed to update report");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Modal isOpen onClose={onClose} title="Trip Report">
        <div className="p-8 text-center text-gray-500">Loading report...</div>
      </Modal>
    );
  }

  if (!report) return null;

  return (
    <Modal isOpen onClose={onClose} title="Trip Report">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Gauge className="h-4 w-4" />
                Distance
              </div>
              <p className="text-xl font-bold mt-1">{report.distance_km.toFixed(1)} km</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Clock className="h-4 w-4" />
                Duration
              </div>
              <p className="text-xl font-bold mt-1">{Math.round(report.duration_min)} min</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Fuel className="h-4 w-4" />
                Fuel Used
              </div>
              <p className="text-xl font-bold mt-1">{report.fuel_used_l.toFixed(1)} L</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">Driver Score</div>
              <p className="text-xl font-bold mt-1">{report.driver_score} pts</p>
            </CardContent>
          </Card>
        </div>

        {/* Editable: Cost & Load Weight */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Trip Cost & Load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Trip Cost (ZAR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={tripCost}
                  onChange={(e) => setTripCost(e.target.value)}
                  placeholder="Enter cost in ZAR"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Load Weight (kg)</label>
                <Input
                  type="number"
                  min={0}
                  value={loadWeight}
                  onChange={(e) => setLoadWeight(e.target.value)}
                  placeholder="e.g. 5000"
                />
              </div>
            </div>
            <Button size="sm" onClick={handleSaveReportFields} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        {/* Waypoint Arrivals */}
        {report.waypoint_events?.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Waypoint Arrivals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.waypoint_events.map((ev, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 border-b last:border-0 text-sm"
                  >
                    <span>
                      {ev.waypoint_label || `Stop ${ev.waypoint_index + 1}`} –{" "}
                      {ev.location_name || `${ev.lat.toFixed(4)}, ${ev.lon.toFixed(4)}`}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {ev.ts ? format(new Date(ev.ts), "MMM d, HH:mm") : ""}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fuel Anomalies (Suspected Theft) */}
        {report.fuel_anomalies?.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Suspected Fuel Anomalies
              </CardTitle>
              <p className="text-xs text-amber-700">
                Fuel dropped significantly without proportional distance
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.fuel_anomalies.map((ev, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white rounded-lg border border-amber-200 text-sm"
                  >
                    <div className="font-medium text-amber-900">
                      {ev.fuel_before_pct}% → {ev.fuel_after_pct}% (drop of{" "}
                      {ev.fuel_before_pct - ev.fuel_after_pct}%)
                    </div>
                    <div className="text-gray-600 mt-1">
                      Distance: {ev.distance_km_since_last} km
                    </div>
                    <div className="text-gray-600 mt-1">
                      Location: {ev.location_name || `${ev.lat.toFixed(4)}, ${ev.lon.toFixed(4)}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {ev.ts ? format(new Date(ev.ts), "MMM d, yyyy HH:mm:ss") : ""}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Harsh Events */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Harsh Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{report.harsh_events.harsh_brakes}</p>
                <p className="text-xs text-gray-500">Harsh Brakes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{report.harsh_events.harsh_accels}</p>
                <p className="text-xs text-gray-500">Harsh Accels</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{report.harsh_events.hard_corners}</p>
                <p className="text-xs text-gray-500">Hard Corners</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{report.harsh_events.potholes}</p>
                <p className="text-xs text-gray-500">Potholes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Modal>
  );
}
