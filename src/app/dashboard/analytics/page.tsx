"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatMessage } from "@/components/ui/chat";
import { FloatingChatButton } from "@/components/ui/floating-chat-button";
import {
  AnalyticsFilters,
  AnalyticsFilters as AnalyticsFiltersType,
} from "@/components/ui/analytics-filters";
import { Modal } from "@/components/ui/modal";
import {
  SimpleBarChart,
  SimplePieChart,
  MultiLineChart,
  MetricCard,
  GroupedMonthlyEarningsChart,
} from "@/components/ui/charts";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { MultiSearchableSelect } from "@/components/ui/multi-searchable-select";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  Package,
  AlertTriangle,
  Calendar,
  Download,
  Brain,
  Activity,
  Settings,
  RefreshCw,
  Clock,
  Upload,
  Users,
  TrendingUp,
  DollarSign,
  Eye,
} from "lucide-react";
import {
  analyticsAPI,
  assetAPI,
  componentAPI,
  clientAPI,
  notificationAPI,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import {
  useDriverEarnings,
  useLogisticsPerformance,
  useUploadEarnings,
} from "@/hooks/useLogisticsAnalytics";
import { formatCurrency } from "@/lib/utils";
import type {
  AssetStatus,
  AssetType,
  Client,
  DriverEarnings,
  DriverPerformanceTrend,
  MonthlyEarnings,
} from "@/types/api";

interface DashboardStats {
  assets: {
    total: number;
    active: number;
    maintenance: number;
    total_value: number;
  };
  components: {
    total: number;
    operational: number;
    critical: number;
    maintenance_due: number;
  };
  notifications: {
    pending: number;
  };
  recent_activities: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
    status: string;
    priority: string;
  }>;
  total_clients?: number;
  total_users?: number;
}

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  status: string;
  current_value: number;
  purchase_date: string;
  location: string;
  created_at?: string;
  updated_at?: string;
}

interface Component {
  id: string;
  name: string;
  status: string;
  condition: string;
  last_maintenance: string;
  next_maintenance_date: string;
  created_at?: string;
  updated_at?: string;
}

interface MaintenanceLog {
  id: string;
  component_id: string;
  description: string;
  date: string;
  technician: string;
  cost: number;
  status: string;
  created_at: string;
  resolved_at?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  created_at: string;
  read: boolean;
  status: string;
  acknowledged_at?: string;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AnalyticsFiltersType>(() => {
    // Calculate default dates for 1y range
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    return {
      dateRange: "1y", // Default to last 1 year for better initial data display
      startDate: oneYearAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      assetIds: undefined,
      componentIds: undefined,
      userIds: undefined,
      status: undefined,
      assetType: undefined,
      condition: undefined,
      clientId: undefined,
      searchQuery: undefined,
    };
  });

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Logistics analytics state
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [driverFilter, setDriverFilter] = useState<string[]>([]);
  const [driverSearch, setDriverSearch] = useState<string>("");
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [driversToShow, setDriversToShow] = useState(10);
  const [dataViewType, setDataViewType] = useState<"monthly" | "weekly">(
    "monthly",
  ); // New state for data view toggle
  const [weekFilter, setWeekFilter] = useState<string>("all"); // 'all' or specific week range
  const [selectedDriverForDetail, setSelectedDriverForDetail] =
    useState<DriverEarnings | null>(null);
  const [showDriverDetailModal, setShowDriverDetailModal] = useState(false);

  // React Query hooks for logistics analytics
  const {
    data: earningsData,
    isLoading: earningsLoading,
    refetch: refetchEarnings,
  } = useDriverEarnings(
    undefined, // Always fetch all driver data, filter on frontend
    // For logistics clients, use date range from filters; for others, use undefined
    currentClient?.client_type === "logistics" ? filters.dateRange : undefined,
    // Pass custom date parameters for logistics clients
    currentClient?.client_type === "logistics" ? filters.startDate : undefined,
    currentClient?.client_type === "logistics" ? filters.endDate : undefined,
    !!currentClient && currentClient.client_type === "logistics",
  );

  // Debug logging for earnings data
  useEffect(() => {
    if (earningsData && currentClient?.client_type === "logistics") {
      console.log('Earnings data received:', {
        hasSummary: !!earningsData.summary,
        hasMonthlyEarnings: !!earningsData.summary?.monthly_earnings,
        hasDrivers: !!earningsData.data?.drivers,
        hasPerformanceTrends: !!earningsData.summary?.driver_performance_trends,
        monthlyEarningsCount: earningsData.summary?.monthly_earnings?.length || 0,
        driversCount: earningsData.data?.drivers?.length || 0,
        performanceTrendsCount: earningsData.summary?.driver_performance_trends?.length || 0,
        filters,
        currentClient: currentClient.client_type,
        rawData: earningsData
      });
    }
  }, [earningsData, currentClient, filters]);

  // Debug logging for filter changes and manual refetch
  useEffect(() => {
    if (currentClient?.client_type === "logistics") {
      // Manually refetch earnings data when filters change
      if (refetchEarnings) {
        refetchEarnings();
      }
    }
  }, [
    filters.dateRange,
    filters.startDate,
    filters.endDate,
    currentClient,
    refetchEarnings,
  ]);

  // Clear driver search and reset show more/less when date filters change (but not when they're both undefined)
  useEffect(() => {
    if (currentClient?.client_type === "logistics") {
      // Only clear search if we're going from having dates to not having dates
      const hadDates = filters.startDate && filters.endDate;
      if (!hadDates) {
        setDriverSearch("");
      }
      // Reset show more/less state when filters change
      setShowAllDrivers(false);
    }
  }, [filters.startDate, filters.endDate, currentClient]);

  // Reset show more/less when driver search changes
  useEffect(() => {
    setShowAllDrivers(false);
  }, [driverSearch]);

  const { data: performanceData } = useLogisticsPerformance(
    !!currentClient && currentClient.client_type === "logistics",
  );

  const uploadEarningsMutation = useUploadEarnings();

  // Helper functions to separate monthly and weekly data calculations
  const getMonthlyEarningsData = () => {
    if (!earningsData?.data?.drivers) return [];

    return earningsData.data.drivers.map((driver: DriverEarnings) => {
      if (driver.payments && Array.isArray(driver.payments)) {
        const monthlyEarnings = driver.payments.reduce(
          (sum: number, payment: { amount: number }) =>
            sum + Math.max(0, payment.amount || 0),
          0,
        );
        return {
          ...driver,
          total_earnings: monthlyEarnings,
          payment_count: driver.payments.length,
          period_earnings: {},
        };
      } else {
        return {
          ...driver,
          total_earnings: 0,
          payment_count: 0,
          period_earnings: {},
        };
      }
    });
  };

  const getWeeklyEarningsData = useCallback(() => {
    if (!earningsData?.data?.drivers) return [];

    console.log('=== getWeeklyEarningsData DEBUG ===');
    console.log('earningsData.data.drivers:', earningsData.data.drivers);

    return earningsData.data.drivers.map((driver: DriverEarnings) => {
      console.log(`Processing driver ${driver.uuid}:`, {
        hasWeeklyPayments: !!driver.weekly_payments,
        weeklyPaymentsType: typeof driver.weekly_payments,
        weeklyPaymentsLength: Array.isArray(driver.weekly_payments) ? driver.weekly_payments.length : 'not array',
        weeklyPayments: driver.weekly_payments
      });
      
      if (driver.weekly_payments && Array.isArray(driver.weekly_payments)) {
        let weeklyPayments = driver.weekly_payments;

        if (weekFilter !== "all") {
          weeklyPayments = weeklyPayments.filter(
            (weekly: {
              week_start: string;
              week_end: string;
              total_earnings: number;
            }) => {
              const weekKey = `${weekly.week_start}_${weekly.week_end}`;
              const matches = weekKey === weekFilter;
              return matches;
            },
          );
        }

        const weeklyEarnings = weeklyPayments.reduce(
          (sum: number, weekly: { total_earnings: number }) =>
            sum + (weekly.total_earnings || 0),
          0,
        );
        return {
          ...driver,
          total_earnings: weeklyEarnings,
          payment_count: weeklyPayments.length,
          period_earnings: {},
          weekly_payments: weeklyPayments, // Preserve the weekly payments for display
        };
      } else {
        return {
          ...driver,
          total_earnings: 0,
          payment_count: 0,
          period_earnings: {},
          weekly_payments: [], // Ensure weekly_payments is always present
        };
      }
    });
  }, [earningsData, weekFilter]);

  const getCurrentEarningsData = () => {
    if (dataViewType === "weekly") {
      return memoizedWeeklyData;
    }
    return getMonthlyEarningsData();
  };

  const getMonthlySummary = () => {
    if (!earningsData?.summary) return null;

    const monthlyDrivers = getMonthlyEarningsData();

    // Calculate totals from the monthly data (payments array)
    const totalMonthlyEarnings = monthlyDrivers.reduce(
      (sum: number, driver: { total_earnings: number }) =>
        sum + (driver.total_earnings || 0),
      0,
    );
    const totalMonthlyPayments = monthlyDrivers.reduce(
      (sum: number, driver: { payment_count: number }) =>
        sum + (driver.payment_count || 0),
      0,
    );

    return {
      total_drivers: monthlyDrivers.length,
      total_earnings: Math.max(0, totalMonthlyEarnings), // Ensure earnings are never negative
      total_payments: totalMonthlyPayments,
      monthly_earnings: earningsData.summary.monthly_earnings || [],
      driver_performance_trends:
        earningsData.summary.driver_performance_trends || [],
      earnings_change_percentage:
        earningsData.summary.earnings_change_percentage,
      selected_period_earnings:
        Math.max(0, earningsData.summary.selected_period_earnings || 0), // Ensure selected period earnings are never negative
      type: "monthly" as const,
    };
  };

  const getWeeklySummary = useCallback(() => {
    if (!earningsData?.summary) return null;

    console.log('=== getWeeklySummary DEBUG ===');
    console.log('earningsData.data.drivers:', earningsData.data.drivers);

    // Get filtered weekly data for display purposes
    const weeklyDrivers = getWeeklyEarningsData();

    let totalWeeklyEarnings = 0;
    let totalWeeklyReports = 0;
    let activeDriversCount = 0;
    let overallTotalEarnings = 0;

    if (earningsData?.data?.drivers) {
      // Calculate total earnings from FILTERED data for the selected period
      totalWeeklyEarnings = weeklyDrivers.reduce((sum: number, driver: { total_earnings: number }) => {
        return sum + Math.max(0, driver.total_earnings || 0);
      }, 0);

      // Calculate overall total earnings from ALL data for average calculation
      overallTotalEarnings = earningsData.data.drivers.reduce((sum: number, driver: DriverEarnings) => {
        if (driver.weekly_payments && Array.isArray(driver.weekly_payments)) {
          const driverEarnings = driver.weekly_payments.reduce((weekSum: number, weekly: { total_earnings: number }) => {
            const weeklyEarnings = weekly.total_earnings || 0;
            // Ensure weekly earnings are never negative
            return weekSum + Math.max(0, weeklyEarnings);
          }, 0);
          return sum + driverEarnings;
        }
        return sum;
      }, 0);

      // Count total unique weeks across ALL drivers from original data
      const allWeeklyPayments = earningsData.data.drivers.flatMap(
        (driver: DriverEarnings) => driver.weekly_payments || [],
      );

      console.log('allWeeklyPayments:', allWeeklyPayments);

      // Create unique week ranges and count them
      const uniqueWeeks = new Set();
      allWeeklyPayments.forEach(
        (weekly: { week_start: string; week_end: string }) => {
          if (weekly.week_start && weekly.week_end) {
            uniqueWeeks.add(`${weekly.week_start}_${weekly.week_end}`);
          }
        },
      );
      totalWeeklyReports = uniqueWeeks.size; // Total unique weeks

      console.log('uniqueWeeks:', Array.from(uniqueWeeks));
      console.log('totalWeeklyReports:', totalWeeklyReports);

      // Count active drivers from filtered data for the selected period
      activeDriversCount = weeklyDrivers.filter(
        (driver: { total_earnings: number }) => (driver.total_earnings || 0) > 0,
      ).length;
    }

    const result = {
      total_drivers: activeDriversCount,
      total_earnings: Math.max(0, totalWeeklyEarnings), // Earnings for selected period
      total_weekly_reports: totalWeeklyReports,
      average_weekly_earnings:
        totalWeeklyReports > 0 ? Math.max(0, overallTotalEarnings / totalWeeklyReports) : 0, // Overall average across all weeks
      type: "weekly" as const,
    };

    console.log('Weekly summary result:', result);
    return result;
  }, [earningsData, getWeeklyEarningsData]);

  const getCurrentSummary = () => {
    return dataViewType === "monthly"
      ? getMonthlySummary()
      : memoizedWeeklySummary;
  };

  // Type guard functions
  const isMonthlySummary = (
    summary:
      | ReturnType<typeof getMonthlySummary>
      | ReturnType<typeof getWeeklySummary>
      | null,
  ): summary is ReturnType<typeof getMonthlySummary> => {
    return summary !== null && summary.type === "monthly";
  };

  const isWeeklySummary = (
    summary:
      | ReturnType<typeof getMonthlySummary>
      | ReturnType<typeof getWeeklySummary>
      | null,
  ): summary is ReturnType<typeof getWeeklySummary> => {
    return summary !== null && summary.type === "weekly";
  };

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load dashboard stats
      const statsData = await analyticsAPI.getDashboardStats(
        user?.role === "super_admin" ? filters.clientId : undefined,
      );
      setStats(statsData);

      // Skip loading assets and components data for logistics clients
      if (currentClient?.client_type === "logistics") {
        setAssets([]);
        setComponents([]);
        setMaintenanceLogs([]);
      } else {
        // Load comprehensive assets data with more details (only for non-logistics clients)
        try {
          const assetsData = await assetAPI.getAssets({
            client_id:
              user?.role === "super_admin" ? filters.clientId : undefined,
            status: filters.status?.[0] as AssetStatus | undefined,
            asset_type: filters.assetType?.[0] as AssetType | undefined,
            search: filters.searchQuery,
            limit: 100, // Get more assets for better insights
          });
          if (assetsData.items && assetsData.items.length > 0) {
            setAssets(assetsData.items);
          } else {
            setAssets([]);
          }
        } catch (error) {
          console.error("Failed to load detailed assets:", error);
          setAssets([]);
        }

        // Load comprehensive components data with maintenance history (only for non-logistics clients)
        let componentsToUse: Component[] = [];
        try {
          const componentsData = await componentAPI.getComponents({
            client_id:
              user?.role === "super_admin" ? filters.clientId : undefined,
            search: filters.searchQuery,
            limit: 100, // Get more components for better insights
          });

          if (componentsData.items && componentsData.items.length > 0) {
            componentsToUse = componentsData.items;
            setComponents(componentsData.items);
          } else {
            componentsToUse = [];
            setComponents([]);
          }
        } catch (error) {
          console.error("Failed to load detailed components:", error);
          componentsToUse = [];
          setComponents([]);
        }

        // Load maintenance logs for better insights (only for non-logistics clients)
        try {
          if (componentsToUse.length > 0) {
            // Check if we have real component IDs or fallback ones
            const hasRealComponentIds = componentsToUse.some(
              (comp) => !comp.id.startsWith("component-"),
            );

            if (hasRealComponentIds) {
              // Fast algorithm: Use Promise.allSettled to fetch from all components concurrently
              // This is much faster than sequential calls and handles failures gracefully
              const maintenancePromises = componentsToUse.map(
                async (component) => {
                  try {
                    const response = await componentAPI.getMaintenanceLogs(
                      component.id,
                      { limit: 20 },
                    );
                    return response.items || [];
                  } catch (error) {
                    console.warn(
                      `Failed to fetch maintenance logs for component ${component.id}:`,
                      error,
                    );
                    return []; // Return empty array for failed components
                  }
                },
              );

              // Execute all requests concurrently and wait for results
              const maintenanceResults =
                await Promise.allSettled(maintenancePromises);

              // Combine all successful results into one array
              const allMaintenanceLogs = maintenanceResults
                .filter((result) => result.status === "fulfilled")
                .flatMap(
                  (result) =>
                    (result as PromiseFulfilledResult<MaintenanceLog[]>).value,
                );

              setMaintenanceLogs(allMaintenanceLogs);
            } else {
              setMaintenanceLogs([]);
            }
          } else {
            setMaintenanceLogs([]);
          }
        } catch (error) {
          console.error("Failed to load maintenance logs:", error);
          setMaintenanceLogs([]);
        }
      }

      // Load clients (for super admin)
      if (user?.role === "super_admin") {
        const clientsData = await clientAPI.getClients();
        setClients(clientsData.items || []);
      }

      // Load recent notifications for insights
      try {
        const notificationsData = await notificationAPI.getNotifications({
          limit: 20,
        });
        setRecentNotifications(notificationsData.items || []);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [
    user,
    filters.clientId,
    filters.status,
    filters.assetType,
    filters.searchQuery,
    currentClient,
  ]);

  // Load current client info for logistics analytics
  const loadClientInfo = useCallback(async () => {
    try {
      if (user?.client_id) {
        const clientData = await clientAPI.getClient(user.client_id);
        setCurrentClient(clientData);
      }
    } catch (error) {
      console.error("Error loading client info:", error);
    }
  }, [user]);

  useEffect(() => {
    // Only make API calls if user is authenticated
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        loadClientInfo();
      }
    }
  }, [loadClientInfo]);

  useEffect(() => {
    // Only make API calls if user is authenticated and client is loaded
    if (currentClient && typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        loadData();
      }
    }
  }, [currentClient, loadData]);

  // Initialize filters for logistics clients - only set default once when client is first loaded
  useEffect(() => {
    if (currentClient?.client_type === "logistics" && !filters.dateRange) {
      setFilters((prev) => ({
        ...prev,
        dateRange: "1y",
        startDate: undefined,
        endDate: undefined,
      }));
    }
  }, [currentClient, filters.dateRange]); // Include filters.dateRange to satisfy the linter

  // Helper function to get period display text
  const getPeriodDisplayText = () => {
    if (filters.startDate && filters.endDate) {
      return `${filters.startDate} to ${filters.endDate}`;
    }

    const periodLabels = {
      "7d": "Last 7 Days",
      "30d": "Last 30 Days",
      "1y": "Last Year",
      "5y": "Last 5 Years",
    };

    return (
      periodLabels[filters.dateRange as keyof typeof periodLabels] ||
      "Last Year"
    );
  };

  // Helper function to get optimal number of drivers to show initially
  const getOptimalDriversToShow = (totalDrivers: number) => {
    if (totalDrivers <= 10) return totalDrivers;
    if (totalDrivers <= 25) return 15;
    if (totalDrivers <= 50) return 20;
    return 25; // Cap at 25 for very large datasets
  };

  // Helper function to check if there's meaningful data
  const hasMeaningfulData = () => {
    if (!earningsData?.data?.drivers) return false;

    // Check if any driver has actual earnings (not just 0 values)
    // Include both period earnings and total earnings for better insights
    return earningsData.data.drivers.some(
      (driver: DriverEarnings) =>
        driver.total_earnings > 0 ||
        Object.values(driver.period_earnings).some(
          (earnings: number) => earnings > 0,
        ),
    );
  };

  // Helper function to check if there's any historical data available
  const hasHistoricalData = () => {
    if (!earningsData?.data?.drivers) return false;

    // Check if we have any drivers with payment history
    return earningsData.data.drivers.some(
      (driver: DriverEarnings) => driver.payment_count > 0,
    );
  };

  // Handle chat message
  const handleChatMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      // Get AI insights from the backend
      const filtersForAI = {
        dateRange: filters.dateRange,
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
      };

      const aiResponse = await analyticsAPI.getAIInsights(
        message,
        filtersForAI,
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          aiResponse.data_summary ||
          `I've analyzed your data based on: "${message}". Here are the key insights:`,
        timestamp: new Date(),
        metadata: {
          dataSource: "analytics_dashboard",
          filters: filters,
          insights: aiResponse.insights || [],
        },
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
      setIsChatLoading(false);
    } catch (error) {
      console.error("Error processing chat message:", error);

      // Fallback to mock response if API fails
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I'm analyzing your data based on: "${message}". Here are some insights based on the current filters and data:`,
        timestamp: new Date(),
        metadata: {
          dataSource: "analytics_dashboard",
          filters: filters,
          insights: [
            `Total assets: ${stats?.assets.total || 0}`,
            `Active components: ${stats?.components.operational || 0}`,
            `Critical alerts: ${stats?.components.critical || 0}`,
            `Maintenance due: ${stats?.components.maintenance_due || 0}`,
          ],
        },
      };

      setChatMessages((prev) => [...prev, fallbackMessage]);
      setIsChatLoading(false);
      toast.error("AI analysis failed, showing fallback insights");
    }
  };

  // Generate real chart data from database
  const generateAssetTypeData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return [];
    }

    // If we have detailed assets, use them
    if (assets && assets.length > 0) {
      const typeCounts = assets.reduce(
        (acc, asset) => {
          acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return Object.entries(typeCounts).map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count,
      }));
    }

    // No assets available - return empty array
    return [];
  };

  const generateMaintenanceTrendsData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return [];
    }

    // If we have detailed components, calculate maintenance trends
    if (components && components.length > 0) {
      // Use 2024 as the base year instead of current system year
      const baseYear = 2024;
      const now = new Date(
        baseYear,
        new Date().getMonth(),
        new Date().getDate(),
      );
      const currentMonth = now.toLocaleDateString("en-US", { month: "short" });
      const lastMonth = new Date(
        baseYear,
        now.getMonth() - 1,
        1,
      ).toLocaleDateString("en-US", { month: "short" });

      // Count components by maintenance status
      let onTimeCount = 0;
      let missedCount = 0;

      components.forEach((component) => {
        if (component.next_maintenance_date) {
          const dueDate = new Date(component.next_maintenance_date);
          if (dueDate >= now) {
            onTimeCount++;
          } else {
            missedCount++;
          }
        }
      });

      return [
        { month: lastMonth, value: onTimeCount, type: "On Time" },
        { month: currentMonth, value: missedCount, type: "Missed" },
      ];
    }

    // If we have stats data, use that for trends
    if (stats?.components?.total) {
      // Use 2024 as the base year
      const baseYear = 2024;
      const currentMonth = new Date(
        baseYear,
        new Date().getMonth(),
        1,
      ).toLocaleDateString("en-US", { month: "short" });
      const lastMonth = new Date(
        baseYear,
        new Date().getMonth() - 1,
        1,
      ).toLocaleDateString("en-US", { month: "short" });

      return [
        {
          month: lastMonth,
          value: stats.components.operational || 0,
          type: "On Time",
        },
        {
          month: currentMonth,
          value: stats.components.total - (stats.components.operational || 0),
          type: "Missed",
        },
      ];
    }

    // No data available - return empty array
    return [];
  };

  const generatePerformanceData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return [];
    }

    // If we have detailed components, use them
    if (components && components.length > 0) {
      // Calculate real performance metrics based on component data
      const monthlyData: Record<
        string,
        { uptime: number; efficiency: number; maintenance: number }
      > = {};

      components.forEach((component) => {
        // Use 2024 as the base year instead of current system year
        const baseYear = 2024;
        const date = component.created_at
          ? new Date(component.created_at)
          : new Date(baseYear, new Date().getMonth(), 1);
        const monthKey = date.toLocaleDateString("en-US", { month: "short" });

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { uptime: 0, efficiency: 0, maintenance: 0 };
        }

        // Calculate uptime based on status (operational = 100%, others = reduced)
        const uptime =
          component.status === "operational"
            ? 100
            : component.status === "warning"
              ? 85
              : component.status === "critical"
                ? 50
                : component.status === "maintenance"
                  ? 0
                  : 75;

        // Calculate efficiency based on maintenance schedule
        const efficiency = component.next_maintenance_date
          ? Math.max(
              50,
              100 -
                (new Date(component.next_maintenance_date).getTime() -
                  Date.now()) /
                  (1000 * 60 * 60 * 24 * 30),
            )
          : 75;

        // Calculate maintenance hours (simplified)
        const maintenance = component.status === "maintenance" ? 8 : 0;

        monthlyData[monthKey].uptime += uptime;
        monthlyData[monthKey].efficiency += efficiency;
        monthlyData[monthKey].maintenance += maintenance;
      });

      // Average the metrics per month
      return Object.entries(monthlyData).map(([month, metrics]) => ({
        month,
        uptime: Math.round((metrics.uptime / components.length) * 10) / 10,
        efficiency:
          Math.round((metrics.efficiency / components.length) * 10) / 10,
        maintenance: Math.round(metrics.maintenance * 10) / 10,
      }));
    }

    // If we only have stats data, create basic performance metrics
    if (stats?.components?.total) {
      // Use 2024 as the base year
      const baseYear = 2024;
      const currentMonth = new Date(
        baseYear,
        new Date().getMonth(),
        1,
      ).toLocaleDateString("en-US", { month: "short" });
      const uptime =
        stats.components.total > 0
          ? Math.round(
              (stats.components.operational / stats.components.total) * 100,
            )
          : 100;

      return [
        {
          month: currentMonth,
          uptime: uptime,
          efficiency: 85,
          maintenance: 0,
        },
      ];
    }

    return [];
  };

  const generateAssetStatusByTypeData = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return [];
    }

    // If we have detailed assets, use them
    if (assets && assets.length > 0) {
      // Group assets by type and status
      const typeStatusCounts: Record<string, Record<string, number>> = {};

      assets.forEach((asset) => {
        if (!typeStatusCounts[asset.asset_type]) {
          typeStatusCounts[asset.asset_type] = {
            active: 0,
            maintenance: 0,
            retired: 0,
            damaged: 0,
          };
        }

        const status = asset.status as
          | "active"
          | "maintenance"
          | "retired"
          | "damaged";
        if (status in typeStatusCounts[asset.asset_type]) {
          typeStatusCounts[asset.asset_type][status]++;
        }
      });

      // Convert to chart data format
      return Object.entries(typeStatusCounts).map(([type, statusCounts]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        ...statusCounts,
      }));
    }

    // If we only have stats data, create basic status distribution
    if (stats?.assets?.total) {
      // Create a more realistic distribution based on common asset types
      const vehicleCount = Math.ceil(stats.assets.total / 2);
      const infrastructureCount = stats.assets.total - vehicleCount;

      const distribution = [];

      if (vehicleCount > 0) {
        distribution.push({
          type: "Vehicle",
          active: Math.min(vehicleCount, stats.assets.active || 0),
          maintenance: Math.min(vehicleCount, stats.assets.maintenance || 0),
          retired: 0,
          damaged: 0,
        });
      }

      if (infrastructureCount > 0) {
        distribution.push({
          type: "Infrastructure",
          active: Math.min(infrastructureCount, stats.assets.active || 0),
          maintenance: Math.min(
            infrastructureCount,
            stats.assets.maintenance || 0,
          ),
          retired: 0,
          damaged: 0,
        });
      }

      return distribution;
    }

    return [];
  };

  // Generate real-time insights
  const generateMaintenanceInsights = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return null;
    }

    if (!components || components.length === 0) {
      return null;
    }

    // Use 2024 as the base year instead of current system year
    const baseYear = 2024;
    const now = new Date(baseYear, new Date().getMonth(), new Date().getDate());
    const fourteenDaysFromNow = new Date(
      now.getTime() + 14 * 24 * 60 * 60 * 1000,
    );

    const componentsNeedingMaintenance = components.filter((component) => {
      if (!component.next_maintenance_date) return false;
      const maintenanceDate = new Date(component.next_maintenance_date);
      return maintenanceDate <= fourteenDaysFromNow;
    });

    // Calculate maintenance delays
    const delayedComponents = components.filter((component) => {
      if (!component.next_maintenance_date) return false;
      const maintenanceDate = new Date(component.next_maintenance_date);
      return maintenanceDate < now;
    });

    if (
      componentsNeedingMaintenance.length === 0 &&
      delayedComponents.length === 0
    ) {
      return (
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Maintenance Status:</strong> All components are on schedule
          </p>
        </div>
      );
    }

    const insights = [];

    // Show delayed maintenance alerts
    if (delayedComponents.length > 0) {
      const criticalDelayed = delayedComponents.filter(
        (c) => c.status === "critical",
      ).length;
      const avgDelayDays = Math.round(
        delayedComponents.reduce((sum, c) => {
          const delay =
            now.getTime() - new Date(c.next_maintenance_date).getTime();
          return sum + delay / (1000 * 60 * 60 * 24);
        }, 0) / delayedComponents.length,
      );

      insights.push(
        <div key="delayed" className="p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Maintenance Overdue:</strong> {delayedComponents.length}{" "}
            component{delayedComponents.length !== 1 ? "s" : ""}
            {criticalDelayed > 0 ? ` (${criticalDelayed} critical)` : ""}
            overdue by {avgDelayDays} day{avgDelayDays !== 1 ? "s" : ""} on
            average
          </p>
        </div>,
      );
    }

    // Show upcoming maintenance alerts
    if (componentsNeedingMaintenance.length > 0) {
      const criticalCount = componentsNeedingMaintenance.filter(
        (c) => c.status === "critical",
      ).length;
      const warningCount = componentsNeedingMaintenance.filter(
        (c) => c.status === "warning",
      ).length;

      let alertColor = "bg-amber-50";
      let textColor = "text-amber-800";
      let priority = "Maintenance Due";

      if (criticalCount > 0) {
        alertColor = "bg-red-50";
        textColor = "text-red-800";
        priority = "Critical Alert";
      }

      insights.push(
        <div key="upcoming" className={`p-3 ${alertColor} rounded-lg`}>
          <p className={`text-sm ${textColor}`}>
            <strong>{priority}:</strong> {componentsNeedingMaintenance.length}{" "}
            component{componentsNeedingMaintenance.length !== 1 ? "s" : ""}
            {criticalCount > 0 ? ` (${criticalCount} critical)` : ""}
            {warningCount > 0 ? ` (${warningCount} warning)` : ""}
            need maintenance within 14 days
          </p>
        </div>,
      );
    }

    return <div className="space-y-2">{insights}</div>;
  };

  const generateEfficiencyInsights = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return null;
    }

    if (!assets || assets.length === 0) {
      return null;
    }

    const activeAssets = assets.filter((asset) => asset.status === "active");
    const maintenanceAssets = assets.filter(
      (asset) => asset.status === "maintenance",
    );
    const totalValue = activeAssets.reduce(
      (sum, asset) => sum + (asset.current_value || 0),
      0,
    );
    const avgValue = totalValue / activeAssets.length;

    // Calculate efficiency based on asset utilization and maintenance status
    const utilizationRate = (activeAssets.length / assets.length) * 100;
    const maintenanceRate = (maintenanceAssets.length / assets.length) * 100;
    const efficiency = Math.min(
      100,
      Math.max(50, utilizationRate + (avgValue > 100000 ? 20 : 0)),
    );

    // Calculate value efficiency
    const totalAssetValue = assets.reduce(
      (sum, asset) => sum + (asset.current_value || 0),
      0,
    );
    const activeValueRate = (totalValue / totalAssetValue) * 100;

    return (
      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Asset Efficiency:</strong> {Math.round(efficiency)}% overall
          efficiency
        </p>
        <p className="text-xs text-blue-700 mt-1">
          Utilization: {Math.round(utilizationRate)}% | Maintenance:{" "}
          {Math.round(maintenanceRate)}% | Value Active:{" "}
          {Math.round(activeValueRate)}%
        </p>
      </div>
    );
  };

  const generateCostInsights = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return null;
    }

    if (!assets || assets.length === 0) {
      return null;
    }

    const assetTypeCounts = assets.reduce(
      (acc, asset) => {
        acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const assetTypeValues = assets.reduce(
      (acc, asset) => {
        if (!acc[asset.asset_type]) acc[asset.asset_type] = 0;
        acc[asset.asset_type] += asset.current_value || 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostCommonType = Object.entries(assetTypeCounts).sort(
      ([, a], [, b]) => b - a,
    )[0];
    const highestValueType = Object.entries(assetTypeValues).sort(
      ([, a], [, b]) => b - a,
    )[0];

    const insights = [];

    // Asset consolidation insight
    if (mostCommonType && mostCommonType[1] > 2) {
      insights.push(
        <div key="consolidation" className="p-3 bg-amber-50 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Asset Consolidation:</strong>{" "}
            {mostCommonType[0].charAt(0).toUpperCase() +
              mostCommonType[0].slice(1)}
            type has {mostCommonType[1]} assets - consider consolidation for
            cost optimization
          </p>
        </div>,
      );
    }

    // Value concentration insight
    if (highestValueType && highestValueType[1] > 50000) {
      const percentage = Math.round(
        (highestValueType[1] / calculateTotalAssetValue()) * 100,
      );
      insights.push(
        <div key="value" className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Value Concentration:</strong>{" "}
            {highestValueType[0].charAt(0).toUpperCase() +
              highestValueType[0].slice(1)}
            assets represent {percentage}% of total portfolio value
          </p>
        </div>,
      );
    }

    // Maintenance cost insight
    const maintenanceAssets = assets.filter(
      (asset) => asset.status === "maintenance",
    );
    if (maintenanceAssets.length > 0) {
      const maintenanceValue = maintenanceAssets.reduce(
        (sum, asset) => sum + (asset.current_value || 0),
        0,
      );
      const maintenancePercentage = Math.round(
        (maintenanceValue / calculateTotalAssetValue()) * 100,
      );

      insights.push(
        <div key="maintenance" className="p-3 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>Maintenance Impact:</strong> {maintenanceAssets.length}{" "}
            asset{maintenanceAssets.length !== 1 ? "s" : ""}
            worth ${maintenanceValue.toLocaleString()} ({maintenancePercentage}%
            of portfolio) are currently under maintenance
          </p>
        </div>,
      );
    }

    if (insights.length === 0) {
      return (
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Asset Distribution:</strong> Well-balanced asset portfolio
            across different types
          </p>
        </div>
      );
    }

    return <div className="space-y-2">{insights}</div>;
  };

  const generateNotificationInsights = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return null;
    }

    if (!recentNotifications || recentNotifications.length === 0) {
      return null;
    }

    const highPriorityNotifications = recentNotifications.filter(
      (notification) =>
        notification.priority === "high" ||
        notification.priority === "critical",
    );

    const overdueNotifications = recentNotifications.filter((notification) => {
      if (!notification.created_at) return false;
      const createdDate = new Date(notification.created_at);
      // Use 2024 as base year instead of current system year
      const baseYear = 2024;
      const now = new Date(
        baseYear,
        new Date().getMonth(),
        new Date().getDate(),
      );
      const daysSinceCreated =
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated > 7; // Notifications older than 7 days
    });

    const insights = [];

    // High priority notifications
    if (highPriorityNotifications.length > 0) {
      insights.push(
        <div key="high-priority" className="p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>High Priority Alerts:</strong>{" "}
            {highPriorityNotifications.length} notification
            {highPriorityNotifications.length !== 1 ? "s" : ""}
            require immediate attention
          </p>
        </div>,
      );
    }

    // Overdue notifications
    if (overdueNotifications.length > 0) {
      insights.push(
        <div key="overdue" className="p-3 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>Overdue Notifications:</strong>{" "}
            {overdueNotifications.length} notification
            {overdueNotifications.length !== 1 ? "s" : ""}
            have been pending for over 7 days
          </p>
        </div>,
      );
    }

    // General notification status
    if (insights.length === 0 && recentNotifications.length > 0) {
      insights.push(
        <div key="general" className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Notification Status:</strong> {recentNotifications.length}{" "}
            pending notification{recentNotifications.length !== 1 ? "s" : ""}
            in the system
          </p>
        </div>,
      );
    }

    return insights.length > 0 ? (
      <div className="space-y-2">{insights}</div>
    ) : null;
  };

  // Helper function to get grouped monthly earnings data for multiple drivers
  const getGroupedMonthlyEarningsData = () => {
    console.log('getGroupedMonthlyEarningsData called with:', {
      hasPerformanceTrends: !!earningsData?.summary?.driver_performance_trends,
      hasDrivers: !!earningsData?.data?.drivers,
      driverFilter,
      filters,
      performanceTrends: earningsData?.summary?.driver_performance_trends
    });
    
    if (
      !earningsData?.summary?.driver_performance_trends ||
      !earningsData?.data?.drivers
    )
      return null;

    const selectedDrivers = earningsData.data.drivers.filter(
      (d: DriverEarnings) => driverFilter.includes(d.uuid),
    );

    if (selectedDrivers.length <= 1) return null;

    // Check if we have date filters applied
    const hasDateFilters = !!(filters.startDate && filters.endDate);

    // Get the months to display
    const allMonths = hasDateFilters
      ? getMonthsInRange(filters.startDate!, filters.endDate!)
      : getMonthsForPredefinedRange(filters.dateRange);

    // Filter months to only include those with actual data
    const availableMonthsSet = new Set(
      earningsData.summary.monthly_earnings.map(
        (item: MonthlyEarnings) => item.month,
      ),
    );
    const filteredMonths = allMonths.filter((month) =>
      availableMonthsSet.has(month),
    );

    // Create chart data with individual driver earnings per month
    const chartData = filteredMonths.map((month) => {
      const monthData: { month: string; [key: string]: string | number } = {
        month: formatMonthName(month),
      };

      let totalEarnings = 0;

      selectedDrivers.forEach((driver: DriverEarnings) => {
        const driverTrend = earningsData.summary.driver_performance_trends.find(
          (trend: DriverPerformanceTrend) =>
            trend.driver_name === driver.full_name,
        );

        const monthEarnings = driverTrend?.monthly_earnings.find(
          (m: MonthlyEarnings) => m.month === month,
        );

        const earnings = monthEarnings ? monthEarnings.earnings : 0;
        monthData[driver.full_name] = earnings;
        totalEarnings += earnings;
      });

      monthData.total = totalEarnings;

      return monthData;
    });

    return chartData;
  };

  // Helper function to get selected drivers' monthly earnings
  const getSelectedDriversMonthlyEarnings = () => {
    console.log('getSelectedDriversMonthlyEarnings called with:', {
      hasMonthlyEarnings: !!earningsData?.summary?.monthly_earnings,
      hasDrivers: !!earningsData?.data?.drivers,
      driverFilter,
      filters,
      earningsData: earningsData?.summary?.monthly_earnings
    });
    
    if (
      !earningsData?.summary?.monthly_earnings ||
      !earningsData?.data?.drivers
    ) {
      console.log('Returning empty array - missing data');
      return [];
    }

    // Check if we have date filters applied
    const hasDateFilters = !!(filters.startDate && filters.endDate);

    // If no drivers selected, show overall/total earnings for all drivers
    if (driverFilter.length === 0) {
      // Use the overall monthly earnings from the API response
      const overallEarnings = earningsData.summary.monthly_earnings;

      // Filter by date range if not using custom dates
      if (!hasDateFilters) {
        const availableMonths = getMonthsForPredefinedRange(filters.dateRange);
        const availableMonthsSet = new Set(availableMonths);

        const filteredEarnings = overallEarnings.filter(
          (item: MonthlyEarnings) => availableMonthsSet.has(item.month),
        );

        return filteredEarnings.map((item: MonthlyEarnings) => ({
          month: formatMonthName(item.month),
          earnings: item.earnings,
        }));
      }

      // For custom date filters, filter by the custom date range
      const customFilteredEarnings = overallEarnings.filter(
        (item: MonthlyEarnings) => {
          return (
            item.month >= filters.startDate!.slice(0, 7) &&
            item.month <= filters.endDate!.slice(0, 7)
          );
        },
      );

      return customFilteredEarnings.map((item: MonthlyEarnings) => ({
        month: formatMonthName(item.month),
        earnings: item.earnings,
      }));
    }

    if (driverFilter.length > 0) {
      // If multiple drivers selected, combine their monthly earnings
      if (driverFilter.length > 1) {
        const selectedDrivers = earningsData.data.drivers.filter(
          (d: DriverEarnings) => driverFilter.includes(d.uuid),
        );

        if (
          hasDateFilters &&
          earningsData?.summary?.driver_performance_trends
        ) {
          // Use date-filtered performance trends with zero values for missing months
          const allMonths = getMonthsInRange(
            filters.startDate!,
            filters.endDate!,
          );
          const combinedMonthlyData: Record<string, number> = {};

          // Initialize all months with 0
          allMonths.forEach((month: string) => {
            combinedMonthlyData[month] = 0;
          });

          // Fill in actual earnings data
          selectedDrivers.forEach((driver: DriverEarnings) => {
            const driverTrend =
              earningsData.summary.driver_performance_trends.find(
                (trend: DriverPerformanceTrend) =>
                  trend.driver_name === driver.full_name,
              );

            if (driverTrend) {
              driverTrend.monthly_earnings.forEach((month: MonthlyEarnings) => {
                if (combinedMonthlyData[month.month] !== undefined) {
                  combinedMonthlyData[month.month] += month.earnings;
                }
              });
            }
          });

          const result = Object.entries(combinedMonthlyData).map(
            ([month, earnings]) => ({
              month: formatMonthName(month),
              earnings,
            }),
          );

          return result;
        } else {
          // Use predefined date range (1y, 5y, etc.) with driver performance trends
          if (earningsData?.summary?.driver_performance_trends) {
            const allMonths = getMonthsForPredefinedRange(filters.dateRange);
            const combinedMonthlyData: Record<string, number> = {};

            // Initialize all months with 0
            allMonths.forEach((month: string) => {
              combinedMonthlyData[month] = 0;
            });

            // Fill in actual earnings data from available monthly_earnings
            const availableMonthsSet = new Set(
              earningsData.summary.monthly_earnings.map(
                (item: MonthlyEarnings) => item.month,
              ),
            );

            // Only include months that exist in the data
            const filteredMonths = allMonths.filter((month) =>
              availableMonthsSet.has(month),
            );

            // Fill in actual earnings data
            selectedDrivers.forEach((driver: DriverEarnings) => {
              const driverTrend =
                earningsData.summary.driver_performance_trends.find(
                  (trend: DriverPerformanceTrend) =>
                    trend.driver_name === driver.full_name,
                );

              if (driverTrend) {
                driverTrend.monthly_earnings.forEach(
                  (month: MonthlyEarnings) => {
                    if (filteredMonths.includes(month.month)) {
                      if (!combinedMonthlyData[month.month]) {
                        combinedMonthlyData[month.month] = 0;
                      }
                      combinedMonthlyData[month.month] += month.earnings;
                    }
                  },
                );
              }
            });

            const result = Object.entries(combinedMonthlyData)
              .filter(([month]) => filteredMonths.includes(month))
              .map(([month, earnings]) => ({
                month: formatMonthName(month),
                earnings,
              }));

            return result;
          }
        }
      } else if (driverFilter.length === 1) {
        // Single driver selected - use their individual monthly earnings
        const selectedDriver = earningsData.data.drivers.find(
          (d: DriverEarnings) => d.uuid === driverFilter[0],
        );

        if (
          selectedDriver &&
          hasDateFilters &&
          earningsData?.summary?.driver_performance_trends
        ) {
          // Use date-filtered performance trends with zero values for missing months
          const allMonths = getMonthsInRange(
            filters.startDate!,
            filters.endDate!,
          );
          const driverTrend =
            earningsData.summary.driver_performance_trends.find(
              (trend: DriverPerformanceTrend) =>
                trend.driver_name === selectedDriver.full_name,
            );

          if (driverTrend) {
            const monthlyData: Record<string, number> = {};

            // Initialize all months with 0
            allMonths.forEach((month: string) => {
              monthlyData[month] = 0;
            });

            // Fill in actual earnings data
            driverTrend.monthly_earnings.forEach((month: MonthlyEarnings) => {
              if (monthlyData[month.month] !== undefined) {
                monthlyData[month.month] = month.earnings;
              }
            });

            return Object.entries(monthlyData).map(([month, earnings]) => ({
              month: formatMonthName(month),
              earnings,
            }));
          }
        }
      }
    }

    // Fallback: return overall earnings if no valid driver-specific data found
    const overallEarnings = earningsData.summary.monthly_earnings;

    // Filter by date range if not using custom dates
    if (!hasDateFilters) {
      const availableMonths = getMonthsForPredefinedRange(filters.dateRange);
      const availableMonthsSet = new Set(availableMonths);

      const filteredEarnings = overallEarnings.filter((item: MonthlyEarnings) =>
        availableMonthsSet.has(item.month),
      );

      return filteredEarnings.map((item: MonthlyEarnings) => ({
        month: formatMonthName(item.month),
        earnings: item.earnings,
      }));
    }

    // For custom date filters, filter by the custom date range
    const customFilteredEarnings = overallEarnings.filter(
      (item: MonthlyEarnings) => {
        return (
          item.month >= filters.startDate!.slice(0, 7) &&
          item.month <= filters.endDate!.slice(0, 7)
        );
      },
    );

    return customFilteredEarnings.map((item: MonthlyEarnings) => ({
      month: formatMonthName(item.month),
      earnings: item.earnings,
    }));
  };

  // Helper function to get months in a date range
  const getMonthsInRange = (startDate: string, endDate: string): string[] => {
    try {
      console.log('getMonthsInRange called with:', { startDate, endDate });
      const months: string[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return [];
      }

      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);

      for (
        let current = startMonth;
        current <= end;
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
      ) {
        months.push(current.toISOString().slice(0, 7)); // YYYY-MM format
      }

      console.log('getMonthsInRange result:', months);
      return months;
    } catch {
      return [];
    }
  };

  // Helper function to format month names for display (YYYY-MM -> Sep 24)
  const formatMonthName = (monthKey: string): string => {
    try {
      if (!monthKey || typeof monthKey !== "string") {
        return monthKey || "Unknown";
      }

      const parts = monthKey.split("-");
      if (parts.length !== 2) {
        return monthKey;
      }

      const [yearStr, monthStr] = parts;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      // Validate year and month values
      if (isNaN(year) || isNaN(month)) {
        return monthKey;
      }

      if (year < 2020 || year > 2030) {
        return monthKey;
      }

      if (month < 1 || month > 12) {
        return monthKey;
      }

      // Create date object and validate it was created correctly
      const date = new Date(year, month - 1, 1);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1) {
        return monthKey;
      }

      const monthName = date.toLocaleDateString("en-US", { month: "short" });
      const yearShort = year.toString().slice(-2);

      // Double-check the year short is reasonable
      if (yearShort.length !== 2) {
        return monthKey;
      }

      return `${monthName} ${yearShort}`;
    } catch (error) {
      console.warn("Error formatting month name:", monthKey, error);
      return monthKey;
    }
  };



  // Helper function to get months for predefined date ranges
  const getMonthsForPredefinedRange = (dateRange: string): string[] => {
    try {
      console.log('getMonthsForPredefinedRange called with:', {
        dateRange,
        hasMonthlyEarnings: !!earningsData?.summary?.monthly_earnings,
        monthlyEarningsCount: earningsData?.summary?.monthly_earnings?.length || 0
      });
      
      // Get available months from earnings data and sort them chronologically
      if (!earningsData?.summary?.monthly_earnings) {
        console.log('No monthly earnings data available');
        return [];
      }

      const availableMonths = earningsData.summary.monthly_earnings
        .map((item: MonthlyEarnings) => item.month)
        .filter((month: string) => {
          // Validate month format and ensure it's reasonable
          if (!month || typeof month !== "string") return false;

          const parts = month.split("-");
          if (parts.length !== 2) return false;

          const [yearStr, monthStr] = parts;
          const year = parseInt(yearStr, 10);
          const monthNum = parseInt(monthStr, 10);

          // Check for valid year (reasonable range) and month
          if (isNaN(year) || isNaN(monthNum)) return false;
          if (year < 2020 || year > 2030) return false;
          if (monthNum < 1 || monthNum > 12) return false;

          // Don't include future months
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth() + 1;

          if (
            year > currentYear ||
            (year === currentYear && monthNum > currentMonth)
          ) {
            return false;
          }

          return true;
        })
        .sort(); // This will sort YYYY-MM format strings chronologically

      if (availableMonths.length === 0) {
        return [];
      }

      let monthsToReturn: number;

      switch (dateRange) {
        case "7d":
          // For 7 days, show last 2 months from available data
          monthsToReturn = Math.min(2, availableMonths.length);
          break;
        case "30d":
          // For 30 days, show last 2 months from available data
          monthsToReturn = Math.min(2, availableMonths.length);
          break;
        case "1y":
          // For 1 year, show last 12 months from available data
          monthsToReturn = Math.min(12, availableMonths.length);
          break;
        case "5y":
          // For 5 years, show last 60 months from available data
          monthsToReturn = Math.min(60, availableMonths.length);
          break;
        default:
          monthsToReturn = Math.min(12, availableMonths.length); // Default to 1 year
      }

      // Return the most recent months from available data
      const result = availableMonths.slice(-monthsToReturn);
      console.log('getMonthsForPredefinedRange result:', result);
      return result;
    } catch {
      return [];
    }
  };

  // Helper function to get selected drivers data
  const getSelectedDrivers = () => {
    if (!earningsData?.data?.drivers) return [];
    return earningsData.data.drivers.filter((d: DriverEarnings) =>
      driverFilter.includes(d.uuid),
    );
  };

  // Helper function to get first selected driver (for backward compatibility)
  const getSelectedDriver = () => {
    if (!earningsData?.data?.drivers) return null;
    return (
      earningsData.data.drivers.find(
        (d: DriverEarnings) => d.uuid === driverFilter[0],
      ) || null
    );
  };

  // Real-time metric calculations
  const calculateTotalAssetValue = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return 0;
    }

    // Use stats data if available, otherwise calculate from assets array
    if (stats?.assets?.total_value !== undefined) {
      return stats.assets.total_value;
    }
    return assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
  };

  const calculateCriticalComponents = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return 0;
    }

    // Use stats data if available, otherwise calculate from components array
    if (stats?.components?.critical !== undefined) {
      return stats.components.critical;
    }
    return components.filter((component) => component.status === "critical")
      .length;
  };

  // Simplified trend calculations (in a real app, these would compare with historical data)
  const calculateAssetGrowth = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return "0.0%";
    }
    return assets.length > 0 ? "+0.0%" : "0.0%";
  };

  const calculateAssetTrend = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return "neutral" as const;
    }
    return assets.length > 0 ? ("up" as const) : ("neutral" as const);
  };

  const calculateCriticalChange = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return "0.0%";
    }
    const criticalCount = calculateCriticalComponents();
    return criticalCount > 0 ? "-0.0%" : "0.0%";
  };

  const calculateCriticalTrend = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return "neutral" as const;
    }
    const criticalCount = calculateCriticalComponents();
    return criticalCount > 0 ? ("down" as const) : ("neutral" as const);
  };

  const calculateResponseTimeAverage = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return 0;
    }

    // Calculate average response time based on maintenance logs and notifications
    if (!maintenanceLogs.length && !recentNotifications.length) {
      return 0;
    }

    let totalResponseTime = 0;
    let resolvedCount = 0;

    // Look for maintenance logs that have been resolved
    maintenanceLogs.forEach((log) => {
      if (log.status === "resolved" && log.resolved_at && log.created_at) {
        const alertDate = new Date(log.created_at);
        const resolvedDate = new Date(log.resolved_at);
        const responseTime = Math.ceil(
          (resolvedDate.getTime() - alertDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        totalResponseTime += responseTime;
        resolvedCount++;
      }
    });

    // Also check notifications that might have been acknowledged
    recentNotifications.forEach((notification) => {
      if (
        notification.status === "acknowledged" &&
        notification.acknowledged_at &&
        notification.created_at
      ) {
        const alertDate = new Date(notification.created_at);
        const acknowledgedDate = new Date(notification.acknowledged_at);
        const responseTime = Math.ceil(
          (acknowledgedDate.getTime() - alertDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        totalResponseTime += responseTime;
        resolvedCount++;
      }
    });

    // If no resolved items, try to estimate from pending ones
    if (resolvedCount === 0) {
      const pendingItems = [
        ...maintenanceLogs.filter((log) => log.status === "pending"),
        ...recentNotifications.filter((n) => n.status === "pending"),
      ];

      if (pendingItems.length > 0) {
        // Estimate based on average age of pending items
        // Use 2024 as base year instead of current system year
        const baseYear = 2024;
        const now = new Date(
          baseYear,
          new Date().getMonth(),
          new Date().getDate(),
        );
        const totalAge = pendingItems.reduce((sum, item) => {
          if (item.created_at) {
            const age = Math.ceil(
              (now.getTime() - new Date(item.created_at).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return sum + age;
          }
          return sum;
        }, 0);
        return Math.round(totalAge / pendingItems.length);
      }
    }

    return resolvedCount > 0
      ? Math.round(totalResponseTime / resolvedCount)
      : 0;
  };

  const calculateResponseTimeChange = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return "0.0%";
    }
    const avgResponseTime = calculateResponseTimeAverage();
    // In a real app, this would compare with historical data
    return avgResponseTime > 0 ? "-0.0%" : "0.0%";
  };

  const calculateResponseTimeTrend = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return "neutral" as const;
    }
    const avgResponseTime = calculateResponseTimeAverage();
    // In a real app, this would compare with historical data
    return avgResponseTime > 0 ? ("down" as const) : ("neutral" as const);
  };

  const calculateComponentsDueSoon = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return 0;
    }

    // Count components due for maintenance in the next 5 days
    // Use 2024 as base year instead of current system year
    const baseYear = 2024;
    const now = new Date(baseYear, new Date().getMonth(), new Date().getDate());
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    return components.filter((component) => {
      if (!component.next_maintenance_date) return false;
      const dueDate = new Date(component.next_maintenance_date);
      return dueDate <= fiveDaysFromNow && dueDate >= now;
    }).length;
  };

  const calculateComponentsDueChange = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return "0.0%";
    }
    const dueSoon = calculateComponentsDueSoon();
    return dueSoon > 0 ? "+0.0%" : "0.0%";
  };

  const calculateComponentsDueTrend = () => {
    // Skip for logistics clients
    if (currentClient?.client_type === "logistics") {
      return "neutral" as const;
    }
    const dueSoon = calculateComponentsDueSoon();
    return dueSoon > 0 ? ("up" as const) : ("neutral" as const);
  };

  // Filter drivers based on search query AND selected driver filter
  const filteredDrivers = useMemo(() => {
    if (!earningsData?.data?.drivers) return [];

    let drivers = earningsData.data.drivers;

    // First, filter by selected drivers if any are selected
    if (driverFilter.length > 0) {
      drivers = drivers.filter((driver: DriverEarnings) =>
        driverFilter.includes(driver.uuid),
      );
    }

    // Then, apply search filter if there's a search query
    if (driverSearch.trim()) {
      drivers = drivers.filter(
        (driver: DriverEarnings) =>
          driver.full_name.toLowerCase().includes(driverSearch.toLowerCase()) ||
          driver.uuid.toLowerCase().includes(driverSearch.toLowerCase()),
      );
    }

    return drivers;
  }, [earningsData?.data?.drivers, driverFilter, driverSearch]);

  // Dynamically adjust drivers to show based on data size
  useEffect(() => {
    if (filteredDrivers && filteredDrivers.length > 0) {
      const optimalCount = getOptimalDriversToShow(filteredDrivers.length);
      setDriversToShow(optimalCount);
    }
  }, [filteredDrivers]);

  // Memoize functions to prevent infinite loops in useEffect dependencies
  const memoizedGetUniqueWeekRanges = useCallback(() => {
    // Since getUniqueWeekRanges is now inside getWeeklyEarningsData, we need to extract it
    if (!earningsData?.data?.drivers) return [];

    console.log('=== WEEKLY DATA DEBUG ===');
    console.log('earningsData.data.drivers:', earningsData.data.drivers);
    
    const allWeeklyPayments = earningsData.data.drivers.flatMap(
      (driver: DriverEarnings) => driver.weekly_payments || [],
    );
    
    console.log('allWeeklyPayments:', allWeeklyPayments);
    
    const uniqueWeeks = new Map();

    allWeeklyPayments.forEach(
      (weekly: { week_start: string; week_end: string }) => {
        if (weekly.week_start && weekly.week_end) {
          const weekKey = `${weekly.week_start}_${weekly.week_end}`;
          if (!uniqueWeeks.has(weekKey)) {
            uniqueWeeks.set(weekKey, {
              week_start: weekly.week_start,
              week_end: weekly.week_end,
              display: `${weekly.week_start} to ${weekly.week_end}`,
              value: weekKey,
            });
          }
        }
      },
    );

    const result = Array.from(uniqueWeeks.values()).sort((a, b) =>
      a.week_start.localeCompare(b.week_start),
    );
    
    console.log('uniqueWeeks result:', result);
    return result;
  }, [earningsData]);

  const memoizedGetWeeklyEarningsData = useCallback(() => {
    return getWeeklyEarningsData();
  }, [getWeeklyEarningsData]);

  const memoizedGetWeeklySummary = useCallback(() => {
    return getWeeklySummary();
  }, [getWeeklySummary]);

  // Monitor data changes for debugging
  useEffect(() => {
    if (earningsData?.data?.drivers) {
      // Data monitoring logic removed for production
    }
  }, [earningsData, memoizedGetUniqueWeekRanges]);

  // Monitor week filter changes
  useEffect(() => {
    if (earningsData?.data?.drivers) {
      // Week filter monitoring logic removed for production
    }
  }, [weekFilter, earningsData, memoizedGetWeeklyEarningsData]);

  // Memoize weekly data to ensure it updates when filter changes
  const memoizedWeeklyData = useMemo(() => {
    return memoizedGetWeeklyEarningsData();
  }, [memoizedGetWeeklyEarningsData]);

  const memoizedWeeklySummary = useMemo(() => {
    return memoizedGetWeeklySummary();
  }, [memoizedGetWeeklySummary]);

  // Removed unused hasMonthlyData and hasWeeklyData functions

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive insights into your assets, components, and system
            performance
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* No Data Message - Only show for non-logistics clients */}
      {currentClient?.client_type !== "logistics" &&
        stats &&
        stats.assets.total === 0 &&
        stats.components.total === 0 && (
          <Card className="p-6 bg-blue-50 border border-blue-200">
            <div className="text-center">
              <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                No Data Available
              </h3>
              <p className="text-blue-700 mb-4">
                Your analytics dashboard is currently empty. Add assets and
                components to see insights.
              </p>
            </div>
          </Card>
        )}

      {/* Filters - Show different filters based on client type */}
      {currentClient?.client_type === "logistics" ? (
        // Logistics Date Range Filter (moved here to replace other filters)
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium text-gray-900">FILTER</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Dashboard filtered for:</span>
                  {filters.startDate && filters.endDate ? (
                    <span className="ml-2 font-medium text-teal-600">
                      {filters.startDate} to {filters.endDate}
                    </span>
                  ) : (
                    <span className="ml-2 font-medium text-teal-600">
                      {filters.dateRange}
                    </span>
                  )}
                  {driverFilter.length > 0 && (
                    <span className="ml-2 font-medium text-blue-600">
                      | Driver{driverFilter.length > 1 ? "s" : ""}:{" "}
                      {driverFilter.length === 1
                        ? getSelectedDriver()?.full_name
                        : `${driverFilter.length} selected`}
                    </span>
                  )}
                  {earningsData?.summary?.selected_period_earnings !==
                    undefined && (
                    <span className="ml-2 text-gray-500">
                      (Total:{" "}
                      {formatCurrency(
                        earningsData.summary.selected_period_earnings,
                        earningsData.summary.currency || "ZAR",
                      )}
                      )
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: "1y",
                      startDate: undefined,
                      endDate: undefined,
                    }));
                    // Clear driver filter and search when resetting date range
                    setDriverFilter([]);
                    setDriverSearch("");
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Reset to 1 Year
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Quick Date Range Selector */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Quick Select:
                </label>
                <div className="flex gap-3">
                  <select
                    value={filters.dateRange}
                    onChange={(e) => {
                      const newDateRange = e.target.value;
                      let newStartDate: string | undefined;
                      let newEndDate: string | undefined;
                      
                      // Calculate actual dates for predefined ranges
                      if (newDateRange !== "custom") {
                        const today = new Date();
                        const endDate = new Date();
                        
                        switch (newDateRange) {
                          case "7d":
                            const sevenDaysAgo = new Date(today);
                            sevenDaysAgo.setDate(today.getDate() - 7);
                            newStartDate = sevenDaysAgo.toISOString().split('T')[0];
                            newEndDate = endDate.toISOString().split('T')[0];
                            break;
                          case "30d":
                            const thirtyDaysAgo = new Date(today);
                            thirtyDaysAgo.setDate(today.getDate() - 30);
                            newStartDate = thirtyDaysAgo.toISOString().split('T')[0];
                            newEndDate = endDate.toISOString().split('T')[0];
                            break;
                          case "1y":
                            const oneYearAgo = new Date(today);
                            oneYearAgo.setFullYear(today.getFullYear() - 1);
                            newStartDate = oneYearAgo.toISOString().split('T')[0];
                            newEndDate = endDate.toISOString().split('T')[0];
                            break;
                          case "5y":
                            const fiveYearsAgo = new Date(today);
                            fiveYearsAgo.setFullYear(today.getFullYear() - 5);
                            newStartDate = fiveYearsAgo.toISOString().split('T')[0];
                            newEndDate = endDate.toISOString().split('T')[0];
                            break;
                        }
                      }
                      
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: newDateRange,
                        startDate: newStartDate,
                        endDate: newEndDate,
                      }));
                      // Clear driver filter and search when changing to preset date range
                      setDriverFilter([]);
                      setDriverSearch("");
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="1y">Last Year</option>
                    <option value="5y">Last 5 Years</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  {/* Custom Date Range Inputs - Always visible */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      From:
                    </label>
                    <input
                      type="date"
                      value={filters.startDate || ""}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        setFilters((prev) => ({
                          ...prev,
                          startDate: newStartDate,
                          dateRange: "custom", // Mark as custom date range
                        }));
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      To:
                    </label>
                    <input
                      type="date"
                      value={filters.endDate || ""}
                      onChange={(e) => {
                        const newEndDate = e.target.value;
                        setFilters((prev) => ({
                          ...prev,
                          endDate: newEndDate,
                          dateRange: "custom", // Mark as custom date range
                        }));
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Driver Filter - Only show when date range is selected */}
              {filters.startDate && filters.endDate && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Driver:
                  </label>
                  <MultiSearchableSelect
                    options={
                      earningsData?.data?.drivers?.map(
                        (driver: DriverEarnings) => ({
                          value: driver.uuid,
                          label: driver.full_name,
                        }),
                      ) || []
                    }
                    value={driverFilter}
                    onChange={(newValue) => {
                      setDriverFilter(newValue);
                    }}
                    placeholder={
                      earningsData?.data?.drivers?.length
                        ? "Select drivers (max 3)..."
                        : "Loading drivers..."
                    }
                    searchPlaceholder="Search drivers..."
                    className="min-w-[300px]"
                    disabled={!earningsData?.data?.drivers?.length}
                    maxSelections={3}
                  />
                  {driverFilter.length > 0 && (
                    <Button
                      onClick={() => setDriverFilter([])}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        // Standard filters for non-logistics clients
        <AnalyticsFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={() =>
            setFilters({
              dateRange: "1y",
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
            })
          }
          assets={assets}
          clients={clients}
        />
      )}

     
      {currentClient?.client_type === "logistics" ? (
        
        <div className="space-y-6">
      
          <div className="flex items-center justify-between">
         
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Earnings CSV
            </Button>
          </div>

          {/* Data View Toggle */}
          <div className="flex items-center justify-center">
            <div className="bg-gray-100 rounded-lg p-1 flex items-center space-x-1">
              <button
                onClick={() => setDataViewType("monthly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  dataViewType === "monthly"
                    ? "bg-white text-teal-700 shadow-sm border border-teal-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Monthly View</span>
                </div>
              </button>
              <button
                onClick={() => setDataViewType("weekly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  dataViewType === "weekly"
                    ? "bg-white text-teal-700 shadow-sm border border-teal-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Weekly View</span>
                </div>
              </button>
            </div>
          </div>

          {/* Data View Description */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {dataViewType === "monthly"
                ? "📅 Viewing daily earnings records with detailed payment breakdowns"
                : "📊 Viewing weekly aggregated earnings for overall performance analysis"}
            </p>
          </div>

          {/* Data View Specific Content */}
          {dataViewType === "monthly" ? (
            // Monthly View - Show existing charts and daily data
            <div className="space-y-6">
              {/* Monthly view content will show existing charts below */}
            </div>
          ) : (
            // Weekly View - Show weekly aggregated data
            <div className="space-y-6">
              {/* Weekly Data Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Weekly Earnings Overview
                    </h3>
                    {/* Week Filter Dropdown */}
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="weekFilter"
                        className="text-sm font-medium text-gray-700"
                      >
                        Week Range:
                      </label>
                      <div className="relative">
                        <select
                          id="weekFilter"
                          value={weekFilter}
                          onChange={(e) => {
                            setWeekFilter(e.target.value);
                          }}
                          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-white"
                        >
                          <option value="all">All Weekly Data</option>
                          {memoizedGetUniqueWeekRanges().map((week) => (
                            <option key={week.value} value={week.value}>
                              {week.display}
                            </option>
                          ))}
                        </select>
                      </div>
                      {weekFilter !== "all" && (
                        <Button
                          onClick={() => {
                            setWeekFilter("all");
                          }}
                          variant="outline"
                          size="sm"
                          className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Filter Status */}
                  {weekFilter !== "all" && (
                    <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                      <p className="text-sm text-teal-800">
                        <strong>Filtered View:</strong> Showing data for week
                        range:{" "}
                        {
                          memoizedGetUniqueWeekRanges().find(
                            (w) => w.value === weekFilter,
                          )?.display
                        }
                      </p>
                    </div>
                  )}

                  {memoizedWeeklySummary?.total_weekly_reports === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Weekly Data Available Yet
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Weekly reports haven&apos;t been uploaded yet. Upload a
                        weekly CSV to see weekly analytics.
                      </p>
                      <Button
                        onClick={() => setShowUploadModal(true)}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        Upload Weekly Report
                      </Button>
                    </div>
                  ) : (
                    <div
                      key={`weekly-data-${weekFilter}`}
                      className="space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Total Weekly Reports:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {memoizedWeeklySummary?.total_weekly_reports || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Total Weekly Earnings:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(
                            memoizedWeeklySummary?.total_earnings || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Drivers:</span>
                        <span className="font-semibold text-gray-900">
                          {memoizedWeeklySummary?.total_drivers || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Average Weekly Earnings:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(
                            memoizedWeeklySummary?.average_weekly_earnings || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Data Type:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {weekFilter === "all"
                            ? "All Weekly Data"
                            : "Filtered Week"}
                        </span>
                      </div>

                      {/* Note about driver count */}
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        <strong>Note:</strong> Total Drivers shows only active
                        drivers (earnings {">"} 0) for the selected period.
                      </div>
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Upload Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Supported Format:</span>
                      <span className="text-sm text-gray-900">
                        Weekly CSV (no vs_reporting)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Filename Pattern:</span>
                      <span className="text-sm text-gray-900">
                        YYYYMMDD-YYYYMMDD-...
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Data Structure:</span>
                      <span className="text-sm text-gray-900">
                        Weekly breakdowns
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Logistics Metrics */}
          {/* Note: UUID 00000000-0000-0000-0000-000000000000 represents client withdrawals and is handled separately */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Drivers"
              value={getCurrentSummary()?.total_drivers?.toString() || "0"}
              change={
                dataViewType === "monthly"
                  ? "+0.0%"
                  : weekFilter === "all"
                    ? "Active drivers (all weeks)"
                    : "Active drivers (filtered week)"
              }
              trend="up"
              icon={<Users className="h-6 w-6" />}
              color="text-blue-600"
            />
            <MetricCard
              title={
                dataViewType === "monthly"
                  ? driverFilter.length > 0
                    ? `Driver Earnings (${getPeriodDisplayText()})`
                    : `Total Earnings (${getPeriodDisplayText()})`
                  : "Weekly Earnings"
              }
              value={
                dataViewType === "monthly"
                  ? driverFilter.length > 0
                    ? formatCurrency(
                        isMonthlySummary(getCurrentSummary())
                          ? (
                              getCurrentSummary() as ReturnType<
                                typeof getMonthlySummary
                              >
                            )?.selected_period_earnings || 0
                          : 0,
                      )
                    : formatCurrency(getCurrentSummary()?.total_earnings || 0)
                  : formatCurrency(Math.max(0, getCurrentSummary()?.total_earnings || 0))
              }
              change={
                dataViewType === "monthly"
                  ? isMonthlySummary(getCurrentSummary()) &&
                    (
                      getCurrentSummary() as ReturnType<
                        typeof getMonthlySummary
                      >
                    )?.earnings_change_percentage
                    ? ((
                        getCurrentSummary() as ReturnType<
                          typeof getMonthlySummary
                        >
                      )?.earnings_change_percentage || 0) > 0
                      ? `+${((getCurrentSummary() as ReturnType<typeof getMonthlySummary>)?.earnings_change_percentage || 0).toFixed(1)}%`
                      : `${((getCurrentSummary() as ReturnType<typeof getMonthlySummary>)?.earnings_change_percentage || 0).toFixed(1)}%`
                    : "+0.0%"
                  : weekFilter === "all"
                    ? "All weeks"
                    : "Filtered week"
              }
              trend={
                dataViewType === "monthly"
                  ? isMonthlySummary(getCurrentSummary()) &&
                    ((
                      getCurrentSummary() as ReturnType<
                        typeof getMonthlySummary
                      >
                    )?.earnings_change_percentage || 0) > 0
                    ? "up"
                    : "down"
                  : "neutral"
              }
              icon={<DollarSign className="h-6 w-6" />}
              color="text-green-600"
            />
            <MetricCard
              title={
                dataViewType === "monthly" ? "Daily Payments" : "Weekly Reports"
              }
              value={
                dataViewType === "monthly"
                  ? (isMonthlySummary(getCurrentSummary())
                      ? (
                          getCurrentSummary() as ReturnType<
                            typeof getMonthlySummary
                          >
                        )?.total_payments || 0
                      : 0
                    ).toString()
                  : (isWeeklySummary(getCurrentSummary())
                      ? (
                          getCurrentSummary() as ReturnType<
                            typeof getWeeklySummary
                          >
                        )?.total_weekly_reports || 0
                      : 0
                    ).toString()
              }
              change={
                dataViewType === "monthly"
                  ? "Daily payment records"
                  : "Weekly aggregated reports"
              }
              trend="neutral"
              icon={
                dataViewType === "monthly" ? (
                  <Activity className="h-6 w-6" />
                ) : (
                  <Package className="h-6 w-6" />
                )
              }
              color="text-purple-600"
            />
            <MetricCard
              title={
                dataViewType === "monthly" ? "Active Period" : "Data Coverage"
              }
              value={
                dataViewType === "monthly"
                  ? filters.dateRange === "custom" &&
                    filters.startDate &&
                    filters.endDate
                    ? `${filters.startDate} to ${filters.endDate}`
                    : filters.dateRange
                  : "Weekly aggregated"
              }
              change={
                dataViewType === "monthly" ? "Date range" : "Weekly breakdowns"
              }
              trend="neutral"
              icon={
                dataViewType === "monthly" ? (
                  <Calendar className="h-6 w-6" />
                ) : (
                  <Clock className="h-6 w-6" />
                )
              }
              color="text-orange-600"
            />
          </div>

          {/* Selected Drivers Summary Card */}
          {driverFilter.length > 0 && earningsData?.data?.drivers && (
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {driverFilter.length === 1
                        ? getSelectedDriver()?.full_name
                        : `${driverFilter.length} Drivers Selected`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {driverFilter.length === 1
                        ? `Driver ID: ${driverFilter[0]}`
                        : getSelectedDrivers()
                            .slice(0, 3)
                            .map((driver: DriverEarnings) => driver.full_name)
                            .join(", ") +
                          (driverFilter.length > 3 ? "..." : "")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-600">
                    {formatCurrency(
                      driverFilter.length === 1
                        ? getSelectedDriver()?.total_earnings || 0
                        : getSelectedDrivers().reduce(
                            (sum: number, driver: DriverEarnings) =>
                              sum + (driver.total_earnings || 0),
                            0,
                          ),
                      earningsData?.summary?.currency || "ZAR",
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {filters.startDate && filters.endDate
                      ? "Selected Period Earnings"
                      : "Total Earnings"}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Logistics Charts Section */}
          {dataViewType === "monthly" ? (
            <>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Earnings Chart */}
              {/* Always show charts, even with no data - they will display empty for the selected date range */}
              {(() => {
                // Helper function to create empty chart data for the selected date range
                const createEmptyChartData = () => {
                  try {
                    let months: string[] = [];
                    
                    if (filters.startDate && filters.endDate) {
                      // Use custom date range
                      months = getMonthsInRange(filters.startDate, filters.endDate);
                    } else {
                      // Use predefined date range
                      months = getMonthsForPredefinedRange(filters.dateRange);
                    }
                    
                    // Create empty data structure with 0 earnings for each month
                    return months.map(month => ({
                      month: formatMonthName(month),
                      earnings: 0
                    }));
                  } catch (error) {
                    console.warn('Error creating empty chart data:', error);
                    return [];
                  }
                };
                
                // Show grouped chart for multiple drivers, otherwise show simple chart
                // Show grouped chart for multiple drivers, otherwise show simple chart
                if (driverFilter.length > 1) {
                  const groupedData = getGroupedMonthlyEarningsData();
                  const selectedDrivers = getSelectedDrivers();
                  console.log('Rendering GroupedMonthlyEarningsChart with:', {
                    groupedData,
                    selectedDrivers,
                    driverFilter,
                    filters
                  });
                  
                  // If no grouped data, create empty chart data for the date range
                  if (!groupedData || groupedData.length === 0) {
                    const emptyData = createEmptyChartData();
                    return (
                      <GroupedMonthlyEarningsChart
                        data={emptyData}
                        driverNames={selectedDrivers.map(
                          (d: DriverEarnings) => d.full_name,
                        )}
                        title={`Monthly Earnings - ${driverFilter.length} Drivers`}
                        subtitle="No data available for selected date range"
                      />
                    );
                  }
                  
                  return (
                    <GroupedMonthlyEarningsChart
                      data={groupedData}
                      driverNames={selectedDrivers.map(
                        (d: DriverEarnings) => d.full_name,
                      )}
                      title={`Monthly Earnings - ${driverFilter.length} Drivers`}
                      subtitle="Individual driver earnings and total by month"
                    />
                  );
                } else {
                  const chartData = getSelectedDriversMonthlyEarnings();
                  console.log('Rendering SimpleBarChart with:', {
                    chartData,
                    driverFilter,
                    filters,
                    hasData: chartData.length > 0
                  });
                  
                  // If no data, create empty chart data for the date range
                  if (!chartData || chartData.length === 0) {
                    const emptyData = createEmptyChartData();
                    return (
                      <SimpleBarChart
                        data={emptyData}
                        xKey="month"
                        yKey="earnings"
                        title={
                          driverFilter.length > 0
                            ? `Monthly Earnings - ${driverFilter.length === 1 ? getSelectedDriver()?.full_name : `${driverFilter.length} Drivers`}`
                            : "Monthly Earnings"
                        }
                        subtitle="No data available for selected date range"
                      />
                    );
                  }
                  
                  return (
                    <SimpleBarChart
                      data={chartData}
                      xKey="month"
                      yKey="earnings"
                      title={
                        driverFilter.length > 0
                          ? `Monthly Earnings - ${driverFilter.length === 1 ? getSelectedDriver()?.full_name : `${driverFilter.length} Drivers`}`
                          : "Monthly Earnings"
                      }
                      subtitle={
                        driverFilter.length > 0
                          ? `Monthly earnings for ${driverFilter.length === 1 ? "selected driver" : "selected drivers"}`
                          : "Total earnings by month"
                      }
                    />
                  );
                }
              })()}

              {/* Driver Performance Trends */}
              {earningsData?.summary?.driver_performance_trends &&
              earningsData.summary.driver_performance_trends.length > 0 &&
              (hasMeaningfulData() || hasHistoricalData()) ? (
                <MultiLineChart
                  data={(() => {
                    // Get the filtered drivers based on current filter
                    const filteredDrivers =
                      driverFilter.length > 0 &&
                      earningsData?.summary?.driver_performance_trends
                        ? earningsData.summary.driver_performance_trends.filter(
                            (driver: DriverPerformanceTrend) => {
                              if (driverFilter.length === 1) {
                                return (
                                  driver.driver_name ===
                                  getSelectedDriver()?.full_name
                                );
                              } else {
                                return getSelectedDrivers().some(
                                  (selectedDriver: DriverEarnings) =>
                                    selectedDriver.full_name ===
                                    driver.driver_name,
                                );
                              }
                            },
                          )
                        : earningsData.summary.driver_performance_trends.slice(
                            0,
                            5,
                          );

                    // Get all unique months from the filtered data
                    const allMonths = new Set<string>();
                    filteredDrivers.forEach(
                      (driver: DriverPerformanceTrend) => {
                        driver.monthly_earnings.forEach(
                          (month: MonthlyEarnings) => {
                            allMonths.add(month.month);
                          },
                        );
                      },
                    );

                    // Sort months chronologically (YYYY-MM format)
                    const sortedMonths = Array.from(allMonths).sort((a, b) => {
                      // Parse YYYY-MM format for proper chronological sorting
                      const [yearA, monthA] = a.split("-").map(Number);
                      const [yearB, monthB] = b.split("-").map(Number);

                      if (yearA !== yearB) return yearA - yearB;
                      return monthA - monthB;
                    });

                    // Create chart data with zero values for missing months
                    return sortedMonths.map((month) => {
                      const monthData: Record<string, unknown> = { month };

                      filteredDrivers.forEach(
                        (driver: DriverPerformanceTrend) => {
                          const monthEarnings = driver.monthly_earnings.find(
                            (m: MonthlyEarnings) => m.month === month,
                          );
                          monthData[driver.driver_name] = monthEarnings
                            ? monthEarnings.earnings
                            : 0;
                        },
                      );

                      return monthData;
                    });
                  })()}
                  xKey="month"
                  lines={(() => {
                    const filteredDrivers =
                      driverFilter.length > 0 &&
                      earningsData?.summary?.driver_performance_trends
                        ? earningsData.summary.driver_performance_trends.filter(
                            (driver: DriverPerformanceTrend) => {
                              if (driverFilter.length === 1) {
                                return (
                                  driver.driver_name ===
                                  getSelectedDriver()?.full_name
                                );
                              } else {
                                return getSelectedDrivers().some(
                                  (selectedDriver: DriverEarnings) =>
                                    selectedDriver.full_name ===
                                    driver.driver_name,
                                );
                              }
                            },
                          )
                        : earningsData.summary.driver_performance_trends.slice(
                            0,
                            5,
                          );

                    return filteredDrivers.map(
                      (driver: DriverPerformanceTrend, index: number) => ({
                        key: driver.driver_name,
                        label: driver.driver_name,
                        color: [
                          "#0d9488",
                          "#3b82f6",
                          "#10b981",
                          "#f59e0b",
                          "#ef4444",
                        ][index % 5],
                      }),
                    );
                  })()}
                  title={
                    driverFilter.length > 0
                      ? `Driver Performance Trends - ${driverFilter.length === 1 ? getSelectedDriver()?.full_name : `${driverFilter.length} Drivers`}`
                      : "Driver Performance Trends"
                  }
                  subtitle={
                    driverFilter.length > 0
                      ? `Performance trends for ${driverFilter.length === 1 ? "selected driver" : "selected drivers"}`
                      : "Top 5 drivers performance trends"
                  }
                />
              ) : (
                <Card className="p-6">
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Performance Trends Data
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {hasHistoricalData()
                        ? "No performance trends data available for the selected period"
                        : "Upload earnings data to see performance trends"}
                    </p>
                    {!hasHistoricalData() && (
                      <Button
                        onClick={() => setShowUploadModal(true)}
                        className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Earnings CSV
                      </Button>
                    )}
                  </div>
                </Card>
              )}
            </div>
            </>
          ) : (
            // Weekly View - Show message about charts
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Weekly Data View
              </h3>
              <p className="text-gray-600 mb-4">
                Charts and detailed analytics are available in Monthly View.
                Switch to Monthly View to see earnings trends and performance
                charts.
              </p>
              <Button
                onClick={() => setDataViewType("monthly")}
                className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Switch to Monthly View
              </Button>
            </div>
          )}

          {/* Vehicle Performance Metrics */}
          {performanceData?.fleet && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Vehicle Performance Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {performanceData.fleet.total_vehicles}
                  </div>
                  <div className="text-sm text-gray-600">Total Vehicles</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {performanceData.fleet.active_vehicles}
                  </div>
                  <div className="text-sm text-gray-600">
                    Available Vehicles
                  </div>
                  {performanceData.fleet.active_vehicles &&
                    performanceData.fleet.assigned_vehicles && (
                      <div className="text-xs text-gray-500 mt-1">
                        {performanceData.fleet.active_vehicles -
                          performanceData.fleet.assigned_vehicles}{" "}
                        unassigned
                      </div>
                    )}
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {performanceData.fleet.assigned_vehicles}
                  </div>
                  <div className="text-sm text-gray-600">
                    Vehicles with Drivers
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Driver Performance Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {dataViewType === "monthly"
                    ? "Driver Performance"
                    : "Weekly Driver Summary"}
                </h3>
                {dataViewType === "monthly" &&
                  filters.startDate &&
                  filters.endDate && (
                    <span className="text-sm font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                      {filters.startDate} to {filters.endDate}
                    </span>
                  )}
                {dataViewType === "weekly" && (
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    Weekly Aggregated Data
                  </span>
                )}
                {dataViewType === "weekly" && weekFilter !== "all" && (
                  <span className="text-sm font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    Filtered:{" "}
                    {
                      memoizedGetUniqueWeekRanges().find(
                        (w) => w.value === weekFilter,
                      )?.display
                    }
                  </span>
                )}
                {filteredDrivers && filteredDrivers.length > 0 && (
                  <span className="text-sm text-gray-500">
                    ({filteredDrivers.length} driver
                    {filteredDrivers.length !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder={`Search drivers in ${dataViewType === "monthly" ? "table" : "weekly data"}...`}
                  className="w-64"
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  disabled={!getCurrentEarningsData()?.length}
                />
                {driverSearch && (
                  <Button
                    onClick={() => setDriverSearch("")}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {earningsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading driver data...</p>
              </div>
            ) : filteredDrivers && filteredDrivers.length > 0 ? (
              hasMeaningfulData() || hasHistoricalData() ? (
                <div className="space-y-4">
                  {/* Weekly Filter Status */}
                  {dataViewType === "weekly" && weekFilter !== "all" && (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                      <p className="text-sm text-teal-800">
                        <strong>Filtered View:</strong> Showing weekly data for{" "}
                        {
                          memoizedGetUniqueWeekRanges().find(
                            (w) => w.value === weekFilter,
                          )?.display
                        }
                        . Total earnings and weekly reports are calculated only
                        for this period.
                      </p>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            Driver
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            {dataViewType === "monthly"
                              ? filters.startDate && filters.endDate
                                ? "Selected Period"
                                : "Total Earnings"
                              : "Total Weekly Earnings"}
                            {dataViewType === "weekly" && (
                              <span className="ml-2 text-xs text-blue-600 font-normal">
                                (Sorted by highest)
                              </span>
                            )}
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            {dataViewType === "monthly"
                              ? filters.startDate && filters.endDate
                                ? "Period Earnings"
                                : "Last 7 Days"
                              : "Cash Collected"}
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            {dataViewType === "monthly"
                              ? filters.startDate && filters.endDate
                                ? "Period Payments"
                                : "Last 30 Days"
                              : "Earnings Tip"}
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Sort drivers by earnings from highest to lowest in weekly view
                          let sortedDrivers = filteredDrivers;

                          if (dataViewType === "weekly") {
                            // Create a map of driver UUIDs to their weekly earnings for sorting
                            const driverEarningsMap = new Map();
                            memoizedWeeklyData.forEach(
                              (driverData: {
                                uuid: string;
                                total_earnings: number;
                              }) => {
                                driverEarningsMap.set(
                                  driverData.uuid,
                                  driverData.total_earnings || 0,
                                );
                              },
                            );

                            // Sort filteredDrivers by weekly earnings (highest first)
                            sortedDrivers = [...filteredDrivers].sort(
                              (a, b) => {
                                const earningsA =
                                  driverEarningsMap.get(a.uuid) || 0;
                                const earningsB =
                                  driverEarningsMap.get(b.uuid) || 0;
                                return earningsB - earningsA; // Highest to lowest
                              },
                            );

                            // Sorting logic completed
                          }

                          return sortedDrivers
                            .slice(
                              0,
                              showAllDrivers ? undefined : driversToShow,
                            )
                            .map((driver: DriverEarnings) => {
                              // For weekly view, use the filtered weekly data that respects the week filter
                              const currentDriverData =
                                dataViewType === "weekly"
                                  ? memoizedWeeklyData.find(
                                      (d: {
                                        uuid: string;
                                        total_earnings: number;
                                        payment_count: number;
                                      }) => d.uuid === driver.uuid,
                                    )
                                  : getCurrentEarningsData().find(
                                      (d: {
                                        uuid: string;
                                        total_earnings: number;
                                        payment_count: number;
                                      }) => d.uuid === driver.uuid,
                                    );

                              return (
                                <tr
                                  key={driver.uuid}
                                  className="border-b border-gray-100 hover:bg-gray-50"
                                >
                                  <td className="py-3 px-4">
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {driver.full_name}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        ID: {driver.uuid}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-medium text-green-600">
                                    {dataViewType === "monthly"
                                      ? filters.startDate && filters.endDate
                                        ? formatCurrency(
                                            driver.selected_period_earnings ||
                                              driver.total_earnings,
                                            earningsData?.summary?.currency ||
                                              "ZAR",
                                          )
                                        : formatCurrency(
                                            driver.total_earnings,
                                            earningsData?.summary?.currency ||
                                              "ZAR",
                                          )
                                      : formatCurrency(
                                          currentDriverData?.total_earnings ||
                                            0,
                                          earningsData?.summary?.currency ||
                                            "ZAR",
                                        )}
                                  </td>
                                  <td className="py-3 px-4 text-gray-700">
                                    {dataViewType === "monthly"
                                      ? filters.startDate && filters.endDate
                                        ? formatCurrency(
                                            driver.selected_period_earnings ||
                                              0,
                                            earningsData?.summary?.currency ||
                                              "ZAR",
                                          )
                                        : formatCurrency(
                                            driver.period_earnings["7d"],
                                            earningsData?.summary?.currency ||
                                              "ZAR",
                                          )
                                      : (() => {
                                          // Extract cash collected from metadata
                                          const weeklyData = memoizedWeeklyData.find(
                                            (d: { uuid: string; total_earnings: number }) =>
                                              d.uuid === driver.uuid,
                                          );
                                          if (weeklyData?.weekly_payments?.[0]?.metadata?.raw_data) {
                                            const rawData = weeklyData.weekly_payments[0].metadata.raw_data;
                                            const cashCollected = rawData.paid_to_you_trip_balance_payouts_cash_collected || 
                                                                 rawData.cash_collected || 
                                                                 rawData.payouts_cash_collected || 0;
                                            return formatCurrency(parseFloat(cashCollected) || 0, "ZAR");
                                          }
                                          return formatCurrency(0, "ZAR");
                                        })()}
                                  </td>
                                                                    <td className="py-3 px-4 text-gray-700">
                                    {dataViewType === "monthly"
                                      ? filters.startDate && filters.endDate
                                        ? formatCurrency(
                                            driver.selected_period_earnings ||
                                              0,
                                            earningsData?.summary?.currency ||
                                              "ZAR",
                                          )
                                        : formatCurrency(
                                            driver.period_earnings["30d"],
                                            earningsData?.summary?.currency ||
                                              "ZAR",
                                          )
                                      : (() => {
                                          // Extract earnings tip from metadata
                                          const weeklyData = memoizedWeeklyData.find(
                                            (d: { uuid: string; total_earnings: number }) =>
                                              d.uuid === driver.uuid,
                                          );
                                          if (weeklyData?.weekly_payments?.[0]?.metadata?.raw_data) {
                                            const rawData = weeklyData.weekly_payments[0].metadata.raw_data;
                                            const earningsTip = rawData.paid_to_you_your_earnings_tip || 
                                                               rawData.your_earnings_tip || 
                                                               rawData.earnings_tip || 
                                                               rawData.tip || 0;
                                            return formatCurrency(parseFloat(earningsTip) || 0, "ZAR");
                                          }
                                          return formatCurrency(0, "ZAR");
                                        })()}
                                  </td>
                                  <td className="py-3 px-4 text-gray-700">
                                    {dataViewType === "monthly" ? (
                                      driver.payment_count
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                        onClick={() => {
                                          setSelectedDriverForDetail(driver);
                                          setShowDriverDetailModal(true);
                                        }}
                                        title={`View detailed ${dataViewType} performance for ${driver.full_name}`}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Show More/Less Controls */}
                  {filteredDrivers.length > driversToShow && (
                    <div className="flex items-center justify-center pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          Showing{" "}
                          {showAllDrivers
                            ? filteredDrivers.length
                            : driversToShow}{" "}
                          of {filteredDrivers.length} drivers
                        </span>
                        <Button
                          onClick={() => setShowAllDrivers(!showAllDrivers)}
                          variant="outline"
                          size="sm"
                          className="text-teal-600 border-teal-600 hover:bg-teal-50 hover:text-teal-700 transition-colors duration-200"
                        >
                          {showAllDrivers ? (
                            <>
                              <span>Show Less</span>
                              <span className="ml-1">↑</span>
                            </>
                          ) : (
                            <>
                              <span>Show More</span>
                              <span className="ml-1">↓</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {driverSearch
                      ? "Search Not Found"
                      : "No Earnings Data Available"}
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {driverSearch
                      ? `"${driverSearch}" cannot be found in the database. Are you sure you checked the spelling and try again?`
                      : "Your analytics dashboard is currently showing zero earnings for the selected period. This could mean:"}
                  </p>
                  {!driverSearch && (
                    <>
                      <div className="space-y-2 text-sm text-gray-500 mb-6 max-w-md mx-auto">
                        <p>• Upload a CSV file from Uber Fleet</p>
                        <p>
                          • Ensure your CSV contains driver and payment
                          information
                        </p>
                        <p>
                          • Check that the file format matches the expected
                          structure
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Button
                          onClick={() => setShowUploadModal(true)}
                          className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Earnings CSV
                        </Button>
                        <div className="text-xs text-gray-400">
                          Upload a CSV file from Fleet App to start tracking
                          driver earnings and performance
                        </div>
                      </div>
                    </>
                  )}
                  {driverSearch && (
                    <Button
                      onClick={() => setDriverSearch("")}
                      variant="outline"
                      className="mt-4"
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  No Drivers Found
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  No driver data is currently available in your system. To get
                  started with logistics analytics:
                </p>
                <div className="space-y-2 text-sm text-gray-500 mb-6 max-w-md mx-auto">
                  <p>• Upload a CSV file from Uber Fleet</p>
                  <p>
                    • Ensure your CSV contains driver and payment information
                  </p>
                  <p>
                    • Check that the file format matches the expected structure
                  </p>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload First CSV
                  </Button>
                  <div className="text-xs text-gray-400">
                    This will create your first driver records and enable
                    analytics
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        // Industrial Analytics Dashboard (existing content)
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Assets"
              value={(stats?.assets?.total || assets.length).toString()}
              change={calculateAssetGrowth()}
              trend={calculateAssetTrend()}
              icon={<Package className="h-6 w-6" />}
              color="text-blue-600"
            />
            <MetricCard
              title="Response Time Average"
              value={`${calculateResponseTimeAverage()} days`}
              change={calculateResponseTimeChange()}
              trend={calculateResponseTimeTrend()}
              icon={<Clock className="h-6 w-6" />}
              color="text-green-600"
            />
            <MetricCard
              title="Critical Components"
              value={calculateCriticalComponents()}
              change={calculateCriticalChange()}
              trend={calculateCriticalTrend()}
              icon={<AlertTriangle className="h-6 w-6" />}
              color="text-red-600"
            />
            <MetricCard
              title="Components Due Soon"
              value={calculateComponentsDueSoon()}
              change={calculateComponentsDueChange()}
              trend={calculateComponentsDueTrend()}
              icon={<Calendar className="h-6 w-6" />}
              color="text-purple-600"
            />
          </div>
        </div>
      )}

      {/* Main Content - Hide for logistics clients */}
      {currentClient?.client_type !== "logistics" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Asset Type Distribution */}
                <SimplePieChart
                  data={generateAssetTypeData()}
                  nameKey="name"
                  valueKey="value"
                  title="Asset Type Distribution"
                  subtitle="Breakdown by asset category"
                />
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                {/* Performance Metrics */}
                <MultiLineChart
                  data={generatePerformanceData()}
                  xKey="month"
                  lines={[
                    { key: "uptime", label: "Uptime %", color: "#10b981" },
                    {
                      key: "efficiency",
                      label: "Efficiency %",
                      color: "#3b82f6",
                    },
                    {
                      key: "maintenance",
                      label: "Maintenance Hours",
                      color: "#f59e0b",
                    },
                  ]}
                  title="Performance Metrics"
                  subtitle="Monthly performance indicators"
                />
              </TabsContent>

              <TabsContent value="trends" className="space-y-6">
                {/* Maintenance Trends */}
                <SimpleBarChart
                  data={generateMaintenanceTrendsData()}
                  xKey="month"
                  yKey="value"
                  title="Maintenance Trends"
                  subtitle="Maintenance missed vs on-time trends"
                />
              </TabsContent>

              <TabsContent value="distribution" className="space-y-6">
                {/* Asset Status by Type */}
                <SimpleBarChart
                  data={generateAssetStatusByTypeData()}
                  xKey="type"
                  yKey="active"
                  title="Asset Status by Type"
                  subtitle="Distribution of asset statuses across types"
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Insights */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Real-Time Insights
                </h3>
              </div>
              <div className="space-y-3">
                {generateMaintenanceInsights()}
                {generateEfficiencyInsights()}
                {generateCostInsights()}
                {generateNotificationInsights()}
              </div>
            </Card>

            {/* Recent Activities */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Activities
                </h3>
              </div>
              <div className="space-y-3">
                {stats?.recent_activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        activity.priority === "high"
                          ? "bg-red-500"
                          : activity.priority === "medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Actions - Hide for logistics clients */}
            {currentClient?.client_type === "industrial" && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    size="sm"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    size="sm"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    View Alerts
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    size="sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Alerts
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Uber Fleet Earnings CSV"
        size="lg"
      >
        <div className="space-y-4">
          <div className="text-center">
            <Upload className="h-12 w-12 text-teal-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Earnings Data
            </h3>
            <p className="text-gray-600 mb-4">
              Upload a CSV file exported from Uber Fleet to track driver
              earnings and performance.
            </p>
          </div>

          {/* Data Type Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              📋 Supported CSV Formats:
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600">📅</span>
                <div>
                  <strong>Monthly Reports:</strong> CSV with{" "}
                  <code className="bg-blue-100 px-1 rounded">vs_reporting</code>{" "}
                  column for daily records
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600">📊</span>
                <div>
                  <strong>Weekly Reports:</strong> CSV without{" "}
                  <code className="bg-blue-100 px-1 rounded">vs_reporting</code>{" "}
                  for weekly aggregated data
                </div>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-teal-600 hover:text-teal-500">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </div>
                <p className="text-xs text-gray-500">CSV files only</p>
              </div>
            </label>
          </div>

          {uploadFile && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {uploadFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(uploadFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadFile(null)}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (uploadFile) {
                  try {
                    const result =
                      await uploadEarningsMutation.mutateAsync(uploadFile);
                    setShowUploadModal(false);
                    setUploadFile(null);

                    // Show success message with data type info
                    if (result.data_type) {
                      toast.success(
                        `CSV uploaded successfully! Detected as ${result.data_type} data with ${result.new_payments} new payments.`,
                        { duration: 5000 },
                      );
                    } else {
                      toast.success("CSV uploaded successfully!");
                    }
                  } catch (error) {
                    console.error("Upload failed:", error);
                    toast.error(
                      "Upload failed. Please check the file format and try again.",
                    );
                  }
                }
              }}
              disabled={!uploadFile || uploadEarningsMutation.isPending}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white hover:text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {uploadEarningsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                "Upload CSV"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detailed Driver Performance Modal */}
      <Modal
        isOpen={showDriverDetailModal}
        onClose={() => setShowDriverDetailModal(false)}
        title={`${selectedDriverForDetail?.full_name} - ${dataViewType === "monthly" ? "Monthly" : "Weekly"} Performance Details`}
        size="2xl"
      >
        <div className="space-y-6">
          {selectedDriverForDetail && (
            <>
              {/* Driver Info Header */}
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-4 border border-teal-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedDriverForDetail.full_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      ID: {selectedDriverForDetail.uuid}
                    </p>
                    <p className="text-xs text-teal-600 font-medium">
                      {dataViewType === "monthly"
                        ? "Monthly Performance View"
                        : "Weekly Performance View"}
                      {dataViewType === "weekly" && weekFilter !== "all" && (
                        <span className="ml-2">
                          • Filtered:{" "}
                          {
                            memoizedGetUniqueWeekRanges().find(
                              (w) => w.value === weekFilter,
                            )?.display
                          }
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-teal-600">
                      {(() => {
                        if (dataViewType === "weekly") {
                          const weeklyData = memoizedWeeklyData.find(
                            (d: { uuid: string; total_earnings: number }) =>
                              d.uuid === selectedDriverForDetail.uuid,
                          );
                          return formatCurrency(
                            weeklyData?.total_earnings || 0,
                          );
                        } else {
                          return formatCurrency(
                            selectedDriverForDetail.total_earnings || 0,
                          );
                        }
                      })()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {dataViewType === "weekly"
                        ? "Total Weekly Earnings"
                        : "Total Earnings"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Earning Trajectory Chart */}
              <div className="mb-6">
                <Card className="p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Overall Driver Performance - All Weekly Data
                  </h4>
                  {(() => {
                    if (dataViewType === "weekly" && weekFilter === "all") {
                      // Get all weekly data across all drivers when filter is "all"
                      const allWeeklyData = memoizedWeeklyData.flatMap((driver: any) => 
                        (driver.weekly_payments || []).map((weekly: any) => ({
                          week_start: weekly.week_start,
                          week_end: weekly.week_end,
                          total_earnings: weekly.total_earnings || 0,
                          driver_name: driver.full_name || `${driver.first_name} ${driver.surname}`,
                          driver_id: driver.uuid,
                          paid_to_driver: weekly.metadata?.paid_to_driver || 0
                        }))
                      );
                      
                      // Debug the raw data
                      console.log('Raw Weekly Data Debug:', {
                        memoizedWeeklyData: memoizedWeeklyData.slice(0, 2), // First 2 drivers
                        allWeeklyData: allWeeklyData.slice(0, 5), // First 5 weekly entries
                        sampleDriver: memoizedWeeklyData[0],
                        sampleWeeklyPayments: memoizedWeeklyData[0]?.weekly_payments?.[0],
                        totalDrivers: memoizedWeeklyData.length,
                        totalWeeklyEntries: allWeeklyData.length
                      });
                      
                      if (allWeeklyData.length > 0) {
                        // Debug the raw data
                        console.log('Raw Weekly Data:', {
                          allWeeklyData: allWeeklyData.slice(0, 5), // First 5 entries
                          sampleEntry: allWeeklyData[0],
                          totalEntries: allWeeklyData.length,
                          earningsValues: allWeeklyData.map((w: any) => ({
                            week_start: w.week_start,
                            total_earnings: w.total_earnings,
                            type: typeof w.total_earnings,
                            parsed: Number(w.total_earnings)
                          }))
                        });
                        
                        // Sort by week_start date
                        const sortedWeeklyData = allWeeklyData.sort((a: any, b: any) => 
                          new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
                        );
                        
                        // Group by week and aggregate earnings across all drivers
                        const weeklyAggregated = sortedWeeklyData.reduce((acc: any, weekly: any) => {
                          const weekKey = `${weekly.week_start} - ${weekly.week_end}`;
                          const earnings = Number(weekly.total_earnings) || 0;
                          
                          // Skip client withdrawals (they have large negative values, specific metadata, or special driver UUIDs)
                          if (earnings < -10000 || 
                              (weekly.metadata?.raw_data?.paid_to_you_trip_balance_payouts_transferred_to_bank_account && 
                               weekly.metadata.raw_data.paid_to_you_trip_balance_payouts_transferred_to_bank_account < 0) ||
                              weekly.driver_uuid === '00000000-0000-0000-0000-000000000000' ||
                              (weekly.driver_first_name === 'Client' && weekly.driver_surname === 'Withdrawal')) {
                            return acc;
                          }
                          
                          if (!acc[weekKey]) {
                            acc[weekKey] = {
                              week: weekKey,
                              total_earnings: 0,
                              driver_count: 0,
                              avg_earnings: 0,
                              top_driver: '',
                              top_earnings: 0,
                              week_start: weekly.week_start
                            };
                          }
                          
                          acc[weekKey].total_earnings += earnings;
                          acc[weekKey].driver_count += 1;
                          
                          if (earnings > acc[weekKey].top_earnings) {
                            acc[weekKey].top_earnings = earnings;
                            acc[weekKey].top_driver = weekly.driver_name || `${weekly.driver_first_name || ''} ${weekly.driver_surname || ''}`.trim() || 'Unknown Driver';
                          }
                          
                          return acc;
                        }, {} as Record<string, any>);
                        
                        // Calculate average earnings for each week
                        Object.values(weeklyAggregated).forEach((week: any) => {
                          week.avg_earnings = week.total_earnings / Math.max(week.driver_count, 1);
                        });
                        
                        // Debug the aggregation process
                        console.log('Aggregation Debug:', {
                          sortedWeeklyData: sortedWeeklyData.slice(0, 3), // First 3 entries
                          weeklyAggregated,
                          sampleWeekData: sortedWeeklyData.filter((w: any) => w.week_start === '2024-12-09'),
                          totalEarningsSum: sortedWeeklyData
                            .filter((w: any) => w.week_start === '2024-12-09')
                            .reduce((sum: number, w: any) => sum + (Number(w.total_earnings) || 0), 0),
                          filteredData: sortedWeeklyData.filter((w: any) => {
                            const earnings = Number(w.total_earnings) || 0;
                            return earnings >= -10000 && 
                                   !(w.metadata?.raw_data?.paid_to_you_trip_balance_payouts_transferred_to_bank_account && 
                                     w.metadata.raw_data.paid_to_you_trip_balance_payouts_transferred_to_bank_account < 0) &&
                                   w.driver_uuid !== '00000000-0000-0000-0000-000000000000' &&
                                   !(w.driver_first_name === 'Client' && w.driver_surname === 'Withdrawal');
                          }),
                          excludedData: sortedWeeklyData.filter((w: any) => {
                            const earnings = Number(w.total_earnings) || 0;
                            return earnings < -10000 || 
                                   (w.metadata?.raw_data?.paid_to_you_trip_balance_payouts_transferred_to_bank_account && 
                                    w.metadata.raw_data.paid_to_you_trip_balance_payouts_transferred_to_bank_account < 0) ||
                                   w.driver_uuid === '00000000-0000-0000-0000-000000000000' ||
                                   (w.driver_first_name === 'Client' && w.driver_surname === 'Withdrawal');
                          })
                        });
                        
                        // Prepare chart data for individual driver (not aggregated company data)
                        const driverWeeklyData = memoizedWeeklyData.find(
                          (d: any) => d.uuid === selectedDriverForDetail?.uuid
                        );
                        
                        let chartData = [];
                        if (driverWeeklyData?.weekly_payments) {
                          // Sort weekly payments by week_start date
                          const sortedDriverPayments = [...driverWeeklyData.weekly_payments].sort((a, b) => 
                            new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
                          );
                          
                          chartData = sortedDriverPayments.map((weekly, index) => ({
                            week: `Week ${index + 1}`,
                            total_earnings: weekly.total_earnings || 0,
                            week_range: `${weekly.week_start} - ${weekly.week_end}`,
                            // For comparison, we'll use the top driver from aggregated data
                            top_driver_earnings: weeklyAggregated[weekly.week_start + ' - ' + weekly.week_end]?.top_earnings || 0
                          }));
                        } else {
                          // Fallback to aggregated data if no driver data found
                          chartData = Object.values(weeklyAggregated).map((week: any, index) => ({
                            week: `Week ${index + 1}`,
                            total_earnings: week.total_earnings,
                            week_range: week.week,
                            top_driver_earnings: week.top_earnings
                          }));
                        }
                        
                        // Debug logging
                        console.log('Chart Data for Overall Performance:', {
                          weeklyAggregated,
                          chartData,
                          sampleWeek: chartData[0],
                          totalEarnings: chartData.map(d => d.total_earnings),
                          maxEarnings: Math.max(...chartData.map(d => Number(d.total_earnings) || 0)),
                          minEarnings: Math.min(...chartData.map(d => Number(d.total_earnings) || 0)),
                          avgEarnings: chartData.reduce((sum, d) => sum + (Number(d.total_earnings) || 0), 0) / Math.max(chartData.length, 1)
                        });
                        
                        return (
                          <div className="space-y-4">
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
                                  <XAxis 
                                    dataKey="week" 
                                    stroke="#6b7280"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                  />
                                  <YAxis 
                                    stroke="#6b7280"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                                  />
                                  <Tooltip 
                                    content={({ active, payload, label }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                            <p className="font-medium text-gray-900 mb-2">{label}</p>
                                            <div className="space-y-1 text-sm">
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Period:</span>
                                                <span className="font-medium">{data.week_range}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Total Earnings:</span>
                                                <span className="font-medium text-teal-600">
                                                  {formatCurrency(data.total_earnings)}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Top Driver Earnings:</span>
                                                <span className="font-medium text-indigo-600">
                                                  {formatCurrency(data.top_driver_earnings)}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="total_earnings" 
                                    stroke="#0d9488" 
                                    strokeWidth={3}
                                    dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: '#0d9488', strokeWidth: 2 }}
                                    name="Total Earnings"
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="top_driver_earnings" 
                                    stroke="#6366f1" 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }}
                                    activeDot={{ r: 5, stroke: '#6366f1', strokeWidth: 2 }}
                                    name="Top Driver Earnings"
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            
                            {/* Performance Insights */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-teal-600">
                                  {chartData.length}
                                </div>
                                <div className="text-xs text-gray-600">Total Weeks</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-blue-600">
                                  {(() => {
                                    if (selectedDriverForDetail?.uuid) {
                                      // Show driver-specific best week
                                      const driverWeeklyData = memoizedWeeklyData.find(
                                        (d: any) => d.uuid === selectedDriverForDetail.uuid
                                      );
                                      if (driverWeeklyData?.weekly_payments) {
                                        const driverEarnings = driverWeeklyData.weekly_payments
                                          .filter((w: any) => Number(w.total_earnings) >= -10000)
                                          .map((w: any) => Number(w.total_earnings) || 0);
                                        return formatCurrency(Math.max(...driverEarnings));
                                      }
                                    }
                                    // Fallback to overall best week
                                    return formatCurrency(Math.max(...chartData.map(d => Number(d.total_earnings) || 0)));
                                  })()}
                                </div>
                                <div className="text-xs text-gray-600">Best Week</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-orange-600">
                                  {(() => {
                                    if (selectedDriverForDetail?.uuid) {
                                      // Show driver-specific lowest week
                                      const driverWeeklyData = memoizedWeeklyData.find(
                                        (d: any) => d.uuid === selectedDriverForDetail.uuid
                                      );
                                      if (driverWeeklyData?.weekly_payments) {
                                        const driverEarnings = driverWeeklyData.weekly_payments
                                          .filter((w: any) => Number(w.total_earnings) >= -10000)
                                          .map((w: any) => Number(w.total_earnings) || 0);
                                        return formatCurrency(Math.min(...driverEarnings));
                                      }
                                    }
                                    // Fallback to overall lowest week
                                    return formatCurrency(Math.min(...chartData.map(d => Number(d.total_earnings) || 0)));
                                  })()}
                                </div>
                                <div className="text-xs text-gray-600">Lowest Week</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-green-600">
                                  {(() => {
                                    if (selectedDriverForDetail?.uuid) {
                                      // Show driver-specific average per week
                                      const driverWeeklyData = memoizedWeeklyData.find(
                                        (d: any) => d.uuid === selectedDriverForDetail.uuid
                                      );
                                      if (driverWeeklyData?.weekly_payments) {
                                        const driverEarnings = driverWeeklyData.weekly_payments
                                          .filter((w: any) => Number(w.total_earnings) >= -10000)
                                          .map((w: any) => Number(w.total_earnings) || 0);
                                        const totalEarnings = driverEarnings.reduce((sum, earnings) => sum + earnings, 0);
                                        return formatCurrency(totalEarnings / Math.max(driverEarnings.length, 1));
                                      }
                                    }
                                    // Fallback to overall average per week
                                    return formatCurrency(
                                      chartData.reduce((sum, d) => sum + (Number(d.total_earnings) || 0), 0) / 
                                      Math.max(chartData.length, 1)
                                    );
                                  })()}
                                </div>
                                <div className="text-xs text-gray-600">Avg/Week</div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    } else if (dataViewType === "weekly" && selectedDriverForDetail?.uuid) {
                      // Individual driver weekly view
                      const weeklyData = memoizedWeeklyData.find(
                        (d: { uuid: string; weekly_payments: any[] }) =>
                          d.uuid === selectedDriverForDetail.uuid,
                      );
                      
                      if (weeklyData?.weekly_payments && weeklyData.weekly_payments.length > 0) {
                        // Sort weekly payments by week_start date
                        const sortedWeeklyPayments = [...weeklyData.weekly_payments].sort((a, b) => 
                          new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
                        );
                        
                        // Prepare chart data
                        const chartData = sortedWeeklyPayments.map((weekly, index) => ({
                          week: `Week ${index + 1}`,
                          earnings: weekly.total_earnings || 0,
                          weekRange: `${weekly.week_start} - ${weekly.week_end}`,
                          paidToDriver: weekly.metadata?.paid_to_driver || 0
                        }));
                        
                        // Debug logging
                        console.log('Chart Data for Individual Driver:', {
                          weeklyData,
                          sortedWeeklyPayments,
                          chartData,
                          sampleWeekly: sortedWeeklyPayments[0],
                          earnings: chartData.map(d => d.earnings),
                          maxEarnings: Math.max(...chartData.map(d => Number(d.earnings) || 0)),
                          minEarnings: Math.min(...chartData.map(d => Number(d.earnings) || 0)),
                          avgEarnings: chartData.reduce((sum, d) => sum + (Number(d.earnings) || 0), 0) / Math.max(chartData.length, 1)
                        });
                        
                        return (
                          <div className="space-y-4">
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
                                  <XAxis 
                                    dataKey="week" 
                                    stroke="#6b7280"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                  />
                                  <YAxis 
                                    stroke="#6b7280"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                                  />
                                  <Tooltip 
                                    content={({ active, payload, label }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                            <p className="font-medium text-gray-900 mb-2">{label}</p>
                                            <div className="space-y-1 text-sm">
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Period:</span>
                                                <span className="font-medium">{data.weekRange}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Total Earnings:</span>
                                                <span className="font-medium text-teal-600">
                                                  {formatCurrency(data.earnings)}
                                                </span>
                                              </div>
                                              {data.paidToDriver > 0 && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Paid to Driver:</span>
                                                  <span className="font-medium text-green-600">
                                                    {formatCurrency(data.paidToDriver)}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="earnings" 
                                    stroke="#0d9488" 
                                    strokeWidth={3}
                                    dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: '#0d9488', strokeWidth: 2 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            
                            {/* Performance Insights */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-teal-600">
                                  {weeklyData.weekly_payments.length}
                                </div>
                                <div className="text-xs text-gray-600">Total Weeks</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-blue-600">
                                  {formatCurrency(Math.max(...chartData.map(d => Number(d.earnings) || 0)))}
                                </div>
                                <div className="text-xs text-gray-600">Best Week</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-orange-600">
                                  {formatCurrency(Math.min(...chartData.map(d => Number(d.earnings) || 0)))}
                                </div>
                                <div className="text-xs text-gray-600">Lowest Week</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-green-600">
                                  {formatCurrency(
                                    chartData.reduce((sum, d) => sum + (Number(d.earnings) || 0), 0) / 
                                    Math.max(chartData.length, 1)
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">Avg/Week</div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    }
                    
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No weekly data available for earning trajectory</p>
                        <p className="text-sm mt-1">Upload weekly reports to see performance trends</p>
                      </div>
                    );
                  })()}
                </Card>
              </div>

              {/* Weekly Breakdown Table */}
              <div className="col-span-1 md:col-span-2">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">
                      Weekly Breakdown Details
                    </h4>
                    {(() => {
                      if (dataViewType === "weekly" && selectedDriverForDetail?.uuid) {
                        const weeklyData = memoizedWeeklyData.find(
                          (d: { uuid: string; weekly_payments: any[] }) =>
                            d.uuid === selectedDriverForDetail.uuid,
                        );
                        
                        if (weeklyData?.weekly_payments && weeklyData.weekly_payments.length > 0) {
                          // Get unique week ranges for the dropdown
                          const weekRanges = weeklyData.weekly_payments
                            .sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime())
                            .map((weekly, index) => ({
                              value: `${weekly.week_start}_${weekly.week_end}`,
                              label: `Week ${index + 1}: ${weekly.week_start} - ${weekly.week_end}`,
                              week_start: weekly.week_start,
                              week_end: weekly.week_end
                            }));
                          
                          // Add "Latest 3 Weeks" option (default)
                          weekRanges.unshift({
                            value: 'all',
                            label: `Latest 3 Weeks (${Math.min(3, weekRanges.length)})`,
                            week_start: null,
                            week_end: null
                          });
                          
                          return (
                            <div className="flex items-center gap-2">
                              <label htmlFor="weekFilter" className="text-sm font-medium text-gray-700">
                                Filter by Week:
                              </label>
                              <select
                                id="weekFilter"
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                onChange={(e) => {
                                  const selectedWeek = weekRanges.find(w => w.value === e.target.value);
                                  if (selectedWeek && selectedWeek.value !== 'all') {
                                    // Filter table to show only the selected week
                                    setWeekFilter(selectedWeek.value);
                                  } else {
                                    // Show latest 3 weeks in table
                                    setWeekFilter('all');
                                  }
                                }}
                                value={weekFilter === 'all' ? 'all' : weekFilter}
                              >
                                {weekRanges.map((week) => (
                                  <option key={week.value} value={week.value}>
                                    {week.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                  {(() => {
                    if (dataViewType === "weekly" && selectedDriverForDetail?.uuid) {
                      const weeklyData = memoizedWeeklyData.find(
                        (d: { uuid: string; weekly_payments: any[] }) =>
                          d.uuid === selectedDriverForDetail.uuid,
                      );
                      
                      if (weeklyData?.weekly_payments && weeklyData.weekly_payments.length > 0) {
                        // Sort weekly payments by week_start date
                        let sortedWeeklyPayments = [...weeklyData.weekly_payments].sort((a, b) => 
                          new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
                        );
                        
                        // Apply week filter to table display only (doesn't affect chart)
                        if (weekFilter !== 'all') {
                          const [selectedWeekStart, selectedWeekEnd] = weekFilter.split('_');
                          sortedWeeklyPayments = sortedWeeklyPayments.filter(weekly => 
                            weekly.week_start === selectedWeekStart && weekly.week_end === selectedWeekEnd
                          );
                        } else {
                          // Default: Show only the latest 3 weeks for the table
                          sortedWeeklyPayments = sortedWeeklyPayments.slice(-3);
                        }
                        
                        return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-2 px-3 font-medium text-gray-700">Week</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-700">Total Earnings</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-700">Your Earnings</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-700">Fare</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-700">Service Fee</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-700">Taxes</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-700">Tips</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-700">Cash Collected</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-700" title="Additional details available in tooltip">
                                    <div className="flex items-center gap-1">
                                      <span>Other</span>
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedWeeklyPayments.map((weekly, index) => {
                                  const rawData = weekly.metadata?.raw_data || {};
                                  return (
                                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                      <td className="py-3 px-3">
                                        <div className="font-medium text-gray-900">
                                          {weekly.week_start} - {weekly.week_end}
                                        </div>
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="font-semibold text-teal-600">
                                          {formatCurrency(weekly.total_earnings)}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="text-blue-600">
                                          {formatCurrency(Number(rawData.paid_to_you_your_earnings) || 0)}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="text-green-600">
                                          {formatCurrency(Number(rawData.paid_to_you_your_earnings_fare) || 0)}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="text-red-600">
                                          {formatCurrency(Number(rawData.paid_to_you_your_earnings_service_fee) || 0)}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="text-orange-600">
                                          {formatCurrency(
                                            (Number(rawData.paid_to_you_your_earnings_taxes_tax_on_booking_fee) || 0) +
                                            (Number(rawData.paid_to_you_your_earnings_taxes_tax_on_service_fee) || 0)
                                          )}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="text-purple-600">
                                          {formatCurrency(Number(rawData.paid_to_you_your_earnings_tip) || 0)}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="text-indigo-600">
                                          {formatCurrency(Number(rawData.paid_to_you_trip_balance_payouts_cash_collected) || 0)}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3">
                                        <div className="group relative">
                                          <span className="text-gray-600 cursor-help">
                                            {formatCurrency(
                                              (Number(rawData.paid_to_you_your_earnings_fare_surge) || 0) +
                                              (Number(rawData.paid_to_you_your_earnings_fare_wait_time_at_pickup) || 0) +
                                              (Number(rawData.paid_to_you_your_earnings_fare_adjustment) || 0) +
                                              (Number(rawData.paid_to_you_your_earnings_fare_service_fee_adjustment) || 0)
                                            )}
                                          </span>
                                          {/* Tooltip */}
                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                            <div className="space-y-1">
                                              <div className="font-medium">Additional Details:</div>
                                              <div>Surge: {formatCurrency(Number(rawData.paid_to_you_your_earnings_fare_surge) || 0)}</div>
                                              <div>Wait Time: {formatCurrency(Number(rawData.paid_to_you_your_earnings_fare_wait_time_at_pickup) || 0)}</div>
                                              <div>Fare Adjustments: {formatCurrency(Number(rawData.paid_to_you_your_earnings_fare_adjustment) || 0)}</div>
                                              <div>Service Fee Adjustments: {formatCurrency(Number(rawData.paid_to_you_your_earnings_fare_service_fee_adjustment) || 0)}</div>
                                            </div>
                                            {/* Arrow */}
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <p>No weekly data available for this driver</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p>Select a driver to view weekly breakdown details</p>
                      </div>
                    );
                  })()}
                </Card>
              </div>

              {/* Performance Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Period Earnings for Monthly View */}
                  {dataViewType === "monthly" &&
                    selectedDriverForDetail.period_earnings && (
                      <Card className="p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Period Earnings
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last 7 Days:</span>
                            <span className="font-medium">
                              {formatCurrency(
                                selectedDriverForDetail.period_earnings["7d"] ||
                                  0,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last 30 Days:</span>
                            <span className="font-medium">
                              {formatCurrency(
                                selectedDriverForDetail.period_earnings[
                                  "30d"
                                ] || 0,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Year:</span>
                            <span className="font-medium">
                              {formatCurrency(
                                selectedDriverForDetail.period_earnings["1y"] ||
                                  0,
                              )}
                            </span>
                          </div>
                        </div>
                      </Card>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Payment Details for Monthly View */}
                  {dataViewType === "monthly" &&
                    selectedDriverForDetail.payments && (
                      <Card className="p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Recent Payments
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedDriverForDetail.payments.slice(0, 5).map(
                            (
                              payment: {
                                date: string;
                                amount: number;
                                description?: string;
                              },
                              index: number,
                            ) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-2 bg-gray-50 rounded"
                              >
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {payment.date}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {payment.description || "Payment"}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-green-600">
                                    {formatCurrency(payment.amount || 0)}
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                          {selectedDriverForDetail.payments.length > 5 && (
                            <div className="text-center py-2 text-xs text-gray-500">
                              +{selectedDriverForDetail.payments.length - 5}{" "}
                              more payments
                            </div>
                          )}
                        </div>
                      </Card>
                    )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setShowDriverDetailModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    // TODO: Implement export functionality
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Floating Chat Button */}
      <FloatingChatButton
        messages={chatMessages}
        onSendMessage={handleChatMessage}
        isLoading={isChatLoading}
      />
    </div>
  );
}
