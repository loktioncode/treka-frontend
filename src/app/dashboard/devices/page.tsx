"use client";

import { useConnectedDevices } from "@/hooks/useConnectedDevices";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, RefreshCw, Link2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { SmartLink } from "@/components/SmartLink";

interface DeviceRow {
  id: string;
  device_id: string;
  last_seen: string | null;
  linked_asset_id: string | null;
  linked_asset_name: string | null;
  online: boolean;
}

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useConnectedDevices(true);

  const devices: DeviceRow[] = (data?.devices ?? []).map((d) => ({
    id: d.device_id,
    device_id: d.device_id,
    last_seen: d.last_seen,
    linked_asset_id: d.linked_asset_id ?? null,
    linked_asset_name: d.linked_asset_name ?? null,
    online: d.online,
  }));

  const columns: Column<DeviceRow>[] = [
    {
      key: "device_id",
      title: "Device ID",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${row.online ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
          <span className="font-mono font-medium">{row.device_id}</span>
        </div>
      ),
    },
    {
      key: "linked_asset_name",
      title: "Linked vehicle",
      render: (row) =>
        row.linked_asset_id ? (
          <SmartLink href={`/dashboard/assets/${row.linked_asset_id}`} className="flex items-center gap-1.5 text-teal-700 hover:text-teal-900 font-medium">
            <Link2 className="h-4 w-4" />
            {row.linked_asset_name || "Vehicle"}
          </SmartLink>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "last_seen",
      title: "Last seen",
      render: (row) =>
        row.last_seen ? (
          <span className="flex items-center gap-1.5 text-gray-600">
            <Clock className="h-4 w-4" />
            {formatLastSeen(row.last_seen)}
          </span>
        ) : (
          <span className="text-gray-400">Never</span>
        ),
    },
    {
      key: "online",
      title: "Status",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.online ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
          }`}
        >
          {row.online ? "Online" : "Offline"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Connected devices</h1>
          <p className="mt-1 text-gray-600">
            Telematics devices linked to your vehicles. Data is stored and shown only for linked devices.
          </p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["telemetry-devices"] })}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="border-b bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>All devices</CardTitle>
                  <CardDescription>
                    {data?.online_count ?? 0} online · {data?.total_count ?? 0} linked to vehicles
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<DeviceRow>
              data={devices}
              columns={columns}
              loading={isLoading}
              searchable
              searchPlaceholder="Search by device ID or vehicle..."
              searchFields={["device_id", "linked_asset_name"]}
              emptyState={{
                title: "No devices yet",
                description:
                  "Add a vehicle asset and set its IoT Device ID (e.g. 4444 or ESP32_OBD_001). When the device reports, it will appear here.",
                action: {
                  label: "Go to Assets",
                  onClick: () => window.location.assign("/dashboard/assets"),
                },
              }}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function formatLastSeen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
