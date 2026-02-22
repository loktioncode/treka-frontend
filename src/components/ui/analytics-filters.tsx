"use client";

import { useState, useEffect } from "react";
import { Card } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Badge } from "./badge";
import {
  Filter,
  X,
  Calendar,
  Package,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface AnalyticsFilters extends Record<string, unknown> {
  dateRange: string;
  startDate?: string;
  endDate?: string;
  assetIds?: string[];
  componentIds?: string[];
  userIds?: string[];
  status?: string[];
  assetType?: string[];
  condition?: string[];
  clientId?: string;
  searchQuery?: string;
}

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  onReset: () => void;
  assets?: Array<{ id: string; name: string }>;
  clients?: Array<{ id: string; name: string }>;
  className?: string;
  clientType?: string;
}

const DATE_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "1y", label: "Last year" },
  { value: "5y", label: "Last 5 years" },
  { value: "custom", label: "Custom range" },
];

const COMPONENT_STATUSES = [
  "operational",
  "warning",
  "critical",
  "maintenance",
];
const ASSET_TYPES = ["vehicle", "machinery", "equipment", "infrastructure"];
const CONDITIONS = ["excellent", "good", "fair", "poor", "critical"];

export function AnalyticsFilters({
  filters,
  onFiltersChange,
  onReset,
  assets = [],
  clients = [],
  className = "",
  clientType,
}: AnalyticsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>({
    dateRange: filters.dateRange || "1y", // Use passed filters or default to last 1 year
    startDate: filters.startDate,
    endDate: filters.endDate,
    assetIds: filters.assetIds,
    componentIds: filters.componentIds,
    userIds: filters.userIds,
    status: filters.status,
    assetType: filters.assetType,
    condition: filters.condition,
    clientId: filters.clientId,
    searchQuery: filters.searchQuery,
  });

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof AnalyticsFilters, value: unknown) => {
    let newFilters = { ...localFilters, [key]: value };

    // Handle date range selection - automatically populate custom dates
    if (key === "dateRange" && value !== "custom") {
      const today = new Date();
      let startDate: string | undefined;
      let endDate: string | undefined;

      switch (value) {
        case "7d":
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
          endDate = today.toISOString().split("T")[0];
          break;
        case "30d":
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
          endDate = today.toISOString().split("T")[0];
          break;
        case "1y":
          startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
          endDate = today.toISOString().split("T")[0];
          break;
        case "5y":
          startDate = new Date(today.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
          endDate = today.toISOString().split("T")[0];
          break;
      }

      newFilters = {
        ...newFilters,
        startDate,
        endDate,
      };
    }

    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsExpanded(false);
  };

  const handleReset = () => {
    const defaultFilters: AnalyticsFilters = {
      dateRange: "1y", // Default to last 1 year for better initial data display
      startDate: undefined,
      endDate: undefined,
      assetIds: undefined,
      componentIds: undefined,
      userIds: undefined,
      status: undefined,
      assetType: undefined,
      condition: undefined,
      clientId: undefined,
      searchQuery: undefined,
    };
    setLocalFilters(defaultFilters);
    onReset();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.startDate || filters.endDate) count++;
    if (filters.assetIds?.length) count++;
    return count;
  };

  const removeFilter = (key: keyof AnalyticsFilters) => {
    const newFilters = { ...localFilters, [key]: undefined };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className={className}>
      {/* Enhanced Filter Toggle Button */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300 hover:border-teal-500 text-gray-700 hover:text-teal-700 transition-all duration-200 shadow-sm"
        >
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filters</span>
          {getActiveFiltersCount() > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 bg-teal-100 text-teal-800 border-teal-200"
            >
              {getActiveFiltersCount()}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 ml-1" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </Button>

        {getActiveFiltersCount() > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Enhanced Active Filters Display */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-700 mr-2">
            Active Filters:
          </span>
          {filters.startDate && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
            >
              From: {new Date(filters.startDate).toLocaleDateString()}
              <button
                onClick={() => removeFilter("startDate")}
                className="ml-1 hover:text-blue-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.endDate && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
            >
              To: {new Date(filters.endDate).toLocaleDateString()}
              <button
                onClick={() => removeFilter("endDate")}
                className="ml-1 hover:text-blue-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.assetIds?.map((id) => {
            const asset = assets.find((a) => a.id === id);
            return (
              <Badge
                key={id}
                variant="secondary"
                className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
              >
                Asset: {asset?.name || id}
                <button
                  onClick={() => removeFilter("assetIds")}
                  className="ml-1 hover:text-green-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}




        </div>
      )}

      {/* Enhanced Expanded Filters */}
      {isExpanded && (
        <Card className="p-6 mb-6 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Range */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-600" />
                Date Range
              </label>
              <div className="flex gap-3">
                <select
                  value={localFilters.dateRange}
                  onChange={(e) =>
                    handleFilterChange("dateRange", e.target.value)
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-white shadow-sm"
                >
                  {DATE_RANGES.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>

                {/* Custom Date Range Inputs - Always visible */}
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="Start"
                    value={localFilters.startDate || ""}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                    className="px-3 py-3 border-gray-300 focus:border-teal-500 focus:ring-teal-500 min-w-[130px]"
                  />
                  <Input
                    type="date"
                    placeholder="End"
                    value={localFilters.endDate || ""}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                    className="px-3 py-3 border-gray-300 focus:border-teal-500 focus:ring-teal-500 min-w-[130px]"
                  />
                </div>
              </div>
            </div>





            {/* Assets/Vehicles Filter */}
            {assets.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="h-4 w-4 text-teal-600" />
                  Vehicle
                </label>
                <select
                  value={localFilters.assetIds?.[0] || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFilterChange(
                      "assetIds",
                      value ? [value] : undefined,
                    );
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-white shadow-sm"
                >
                  <option value="">All Vehicles</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setIsExpanded(false)}
              className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              Apply Filters
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
