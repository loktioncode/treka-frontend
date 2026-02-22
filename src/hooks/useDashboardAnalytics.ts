import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, assetAPI, telemetryAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardAnalyticsData {
  performanceTrends: Array<{ label: string; score: number; health: number }>;
  driverLeaderboard: Array<{ name: string; score: number; health: number }>;
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  fleetTelemetry?: Array<{ id: string; name: string; vin: string; status: string }>;
  fleetKPIs?: {
    avgDriverScore: number;
    totalFuelL: number;
    fleetHealth: number;
    activeCount: number;
    totalVehicles: number;
  };
  topDriversByScore?: Array<{ name: string; score: number }>;
}

export type DateRangeFilter = '7d' | '30d' | '1y' | '5y';

export const useDashboardAnalytics = (dateRange: DateRangeFilter = '30d', showDemoData: boolean = false, isLogisticsClient: boolean = true) => {
  const { user } = useAuth();
  const currentClientId = user?.client_id;
  // For real data, we always fetch ALL data from the database
  // The date range filtering happens on the frontend to show the appropriate subset
  // This ensures we show data from the very first payout document in the database

  // Check if user is authenticated and is a logistics client before making API calls
  const isAuthenticated = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');
  const shouldFetchData = isAuthenticated && isLogisticsClient;

  // Analytics queries are now handled primarily via telemetry for logistics clients
  const isIndustrialClient = !isLogisticsClient;

  // Fetch all fleet assets for telemetry status
  const fleetAssetsQuery = useQuery({
    queryKey: ['dashboard-fleet-assets', currentClientId],
    queryFn: () => assetAPI.getAssets({ client_id: currentClientId, asset_type: 'vehicle' }),
    enabled: shouldFetchData && !!currentClientId,
  });

  // Fetch fleet telemetry summary (for logistics clients)
  const fleetTelemetrySummaryQuery = useQuery({
    queryKey: ['dashboard-fleet-telemetry-summary', currentClientId],
    queryFn: () => analyticsAPI.getFleetTelemetry(),
    enabled: shouldFetchData && isLogisticsClient,
    staleTime: 5 * 60 * 1000,
  });

  // Transform data for charts with frontend date filtering
  const transformData = (): DashboardAnalyticsData => {
    // For Logistics Clients, use fleet telemetry summary
    const generateSampleData = (range: DateRangeFilter): DashboardAnalyticsData => {
      const vehicles = [
        { name: 'Vehicle 001', score: 92, health: 95 },
        { name: 'Vehicle 002', score: 88, health: 82 },
        { name: 'Vehicle 003', score: 75, health: 64 },
        { name: 'Vehicle 004', score: 95, health: 98 },
        { name: 'Vehicle 005', score: 68, health: 45 }
      ];

      return {
        performanceTrends: vehicles.map(v => ({
          label: v.name,
          score: v.score,
          health: v.health
        })),
        driverLeaderboard: vehicles.sort((a, b) => b.score - a.score),
        statusDistribution: [
          { name: 'Healthy', value: 3, color: '#10b981' },
          { name: 'Warning', value: 1, color: '#f59e0b' },
          { name: 'Critical', value: 1, color: '#ef4444' }
        ],
        fleetTelemetry: vehicles.map((v, i) => ({
          id: `v-${i}`,
          name: v.name,
          vin: `VIN${i}ABC123XYZ`,
          status: v.health > 80 ? 'active' : v.health > 50 ? 'warning' : 'critical'
        })),
        fleetKPIs: {
          avgDriverScore: 84,
          totalFuelL: 1250,
          fleetHealth: 77,
          activeCount: 4,
          totalVehicles: 5
        },
        topDriversByScore: vehicles.sort((a, b) => b.score - a.score).slice(0, 5)
      };
    };

    // Only generate sample data if demo mode is enabled
    if (showDemoData) {
      return generateSampleData(dateRange);
    }

    // For Logistics Clients, use fleet telemetry summary
    if (isLogisticsClient && fleetTelemetrySummaryQuery.data) {
      const summary = fleetTelemetrySummaryQuery.data.summary;
      const vehicles = fleetTelemetrySummaryQuery.data.vehicles || [];

      return {
        performanceTrends: vehicles.map((v: any) => ({
          label: v.name,
          score: v.score,
          health: v.health
        })),
        driverLeaderboard: vehicles.slice(0, 5).map((v: any) => ({
          name: v.name,
          score: v.score,
          health: v.health
        })),
        statusDistribution: [
          { name: 'Healthy', value: vehicles.filter((v: any) => v.health >= 80).length, color: '#10b981' },
          { name: 'Warning', value: vehicles.filter((v: any) => v.health >= 50 && v.health < 80).length, color: '#f59e0b' },
          { name: 'Critical', value: vehicles.filter((v: any) => v.health < 50).length, color: '#ef4444' }
        ],
        fleetTelemetry: vehicles,
        fleetKPIs: summary,
        topDriversByScore: [...vehicles]
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 5)
          .map((v: any) => ({ name: v.name, score: v.score }))
      };
    }

    // Fallback: use sample data
    return generateSampleData(dateRange);
  };

  const isLoading =
    fleetTelemetrySummaryQuery.isLoading || fleetAssetsQuery.isLoading;
  const isError =
    fleetTelemetrySummaryQuery.isError || fleetAssetsQuery.isError;
  const error =
    fleetTelemetrySummaryQuery.error || fleetAssetsQuery.error;

  return {
    data: transformData(),
    isLoading,
    isError,
    error,
    refetch: () => {
      if (shouldFetchData && isLogisticsClient) {
        fleetTelemetrySummaryQuery.refetch();
      }
      if (currentClientId) {
        fleetAssetsQuery.refetch();
      }
    }
  };
};
