"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Wrench, Search, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const statusConfig = {
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  due_soon: { label: "Due Soon", color: "bg-amber-100 text-amber-800", icon: Clock },
  ok: { label: "OK", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
} as const;

export default function MaintenancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["service-due"],
    queryFn: () => analyticsAPI.getServiceDueVehicles(),
    enabled: !!user,
  });

  const filtered = vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.plate.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Maintenance & Service Due
            </h1>
            <p className="text-muted-foreground mt-1">
              Vehicles sorted by service urgency — overdue first
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {vehicles.filter((v) => v.service_status === "overdue").length} overdue
            </span>
          </div>
        </div>
      </motion.div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name or plate..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5" />
              Service Schedule ({filtered.length} vehicles)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left p-3 font-medium text-gray-600">Vehicle</th>
                    <th className="text-left p-3 font-medium text-gray-600">Plate</th>
                    <th className="text-right p-3 font-medium text-gray-600">Odometer</th>
                    <th className="text-right p-3 font-medium text-gray-600">Last Service</th>
                    <th className="text-right p-3 font-medium text-gray-600">Interval</th>
                    <th className="text-right p-3 font-medium text-gray-600">Remaining</th>
                    <th className="text-center p-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((v) => {
                    const cfg = statusConfig[v.service_status] || statusConfig.ok;
                    const Icon = cfg.icon;
                    return (
                      <tr
                        key={v.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/assets/${v.id}`)}
                      >
                        <td className="p-3 font-medium">{v.name}</td>
                        <td className="p-3 text-gray-600">{v.plate || "—"}</td>
                        <td className="p-3 text-right">{v.odometer_km.toLocaleString()} km</td>
                        <td className="p-3 text-right">{v.last_service_km.toLocaleString()} km</td>
                        <td className="p-3 text-right">{v.interval_km.toLocaleString()} km</td>
                        <td className="p-3 text-right font-medium">
                          {v.remaining_km != null ? `${v.remaining_km.toLocaleString()} km` : "N/A"}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        No vehicles found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
