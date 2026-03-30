"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { AlertTriangle, Search, Shield, Wrench } from "lucide-react";

const severityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
} as const;

const categoryIcons = {
  compliance: Shield,
  maintenance: Wrench,
} as const;

export default function CriticalIssuesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["critical-issues"],
    queryFn: () => analyticsAPI.getCriticalIssues(),
    enabled: !!user,
  });

  const issues = data?.issues || [];
  const filtered = issues.filter((i) => {
    if (filterCategory !== "all" && i.category !== filterCategory) return false;
    if (search && !i.vehicle.toLowerCase().includes(search.toLowerCase()) && !i.issue.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const highCount = issues.filter((i) => i.severity === "high").length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Critical Issues
            </h1>
            <p className="text-muted-foreground mt-1">
              Compliance violations, service overdue, and telemetry alerts
            </p>
          </div>
          {highCount > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              {highCount} high severity
            </span>
          )}
        </div>
      </motion.div>

      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search vehicle or issue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          <option value="compliance">Compliance</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Issues ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {filtered.map((issue, idx) => {
              const Icon = categoryIcons[issue.category] || AlertTriangle;
              const colors = severityColors[issue.severity] || severityColors.medium;
              return (
                <div
                  key={idx}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/assets/${issue.vehicle_id}`)}
                >
                  <div className={`p-2 rounded-lg ${issue.severity === "high" ? "bg-red-100" : "bg-amber-100"}`}>
                    <Icon className={`h-5 w-5 ${issue.severity === "high" ? "text-red-600" : "text-amber-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{issue.issue}</p>
                    <p className="text-sm text-gray-500">{issue.vehicle} — {issue.detail}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors}`}>
                    {issue.severity}
                  </span>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                No critical issues found
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
