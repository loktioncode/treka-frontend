'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { Eye } from 'lucide-react';
import { useState } from 'react';
import { Modal } from './modal';
import { Pagination, usePagination } from './pagination';

// Recharts ValueType can be number | string | readonly (number|string)[]; normalize for tooltip display
type TooltipValueType = number | string | readonly (number | string)[] | undefined;

function formatTooltipValue(value: TooltipValueType, asCurrency: boolean): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    const first = value[0];
    if (first == null) return "";
    return asCurrency && typeof first === "number" ? `R${first.toLocaleString()}` : String(first);
  }
  return asCurrency && typeof value === "number" ? `R${value.toLocaleString()}` : String(value);
}

// Color palette for charts
const CHART_COLORS = {
  primary: '#0d9488', // teal-600
  secondary: '#3b82f6', // blue-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  info: '#06b6d4', // cyan-500
  purple: '#8b5cf6', // violet-500
  orange: '#f97316', // orange-500
};

// Interface for custom dot component props
interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: {
    earnings: number;
    [key: string]: string | number | boolean;
  };
}

// Custom dot component that only shows for non-zero values
const CustomDot = (props: CustomDotProps) => {
  const { cx, cy, payload } = props;
  if (payload && payload.earnings > 0) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={CHART_COLORS.primary}
        stroke="#ffffff"
        strokeWidth={2}
      />
    );
  }
  return null;
};

// Custom dot component for modal (larger)
const CustomDotModal = (props: CustomDotProps) => {
  const { cx, cy, payload } = props;
  if (payload && payload.earnings > 0) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={CHART_COLORS.primary}
        stroke="#ffffff"
        strokeWidth={2}
      />
    );
  }
  return null;
};

interface DashboardChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  onViewDetails?: () => void;
  showViewButton?: boolean;
}

export function DashboardChartCard({ 
  title, 
  subtitle, 
  children, 
  className = '', 
  onViewDetails,
  showViewButton = true 
}: DashboardChartCardProps) {
  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
            {subtitle && (
              <CardDescription className="text-sm text-gray-500">{subtitle}</CardDescription>
            )}
          </div>
          {showViewButton && onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-64 w-full overflow-hidden relative">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// 1. Overall Earnings Chart
interface OverallEarningsChartProps {
  data: Array<{ month: string; earnings: number }>;
  title?: string;
  subtitle?: string;
}

export function OverallEarningsChart({ data, title = 'Overall Earnings', subtitle = 'Monthly earnings trend' }: OverallEarningsChartProps) {
  const [showModal, setShowModal] = useState(false);

  // Always render chart, even with no data
  if (!data || data.length === 0) {
    // Return empty chart instead of "no data" message
    const chartData: Array<{ month: string; earnings: number }> = [];
    return (
      <DashboardChartCard title={title} subtitle="No earnings data available" onViewDetails={() => setShowModal(true)}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
            <XAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
          </AreaChart>
        </ResponsiveContainer>
      </DashboardChartCard>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    earnings: Number(item.earnings) || 0
  }));

  // Check if all values are zero to show appropriate subtitle
  const hasActualEarnings = chartData.some(item => item.earnings > 0);
  const displaySubtitle = hasActualEarnings ? subtitle : `${subtitle} (no earnings in selected period)`;
  
  // Calculate dynamic Y-axis scaling
  const maxEarnings = Math.max(...chartData.map(item => item.earnings));
  const minEarnings = Math.min(...chartData.map(item => item.earnings));
  const earningsRange = maxEarnings - minEarnings;
  
  // Determine appropriate Y-axis formatter based on data range
  const getYAxisFormatter = (value: number) => {
    if (maxEarnings >= 1000000) {
      return `R${(value / 1000000).toFixed(1)}M`;
    } else if (maxEarnings >= 1000) {
      return `R${(value / 1000).toFixed(0)}k`;
    } else {
      return `R${value.toFixed(0)}`;
    }
  };

  // Determine Y-axis domain for better scaling
  const getYAxisDomain = () => {
    // Handle case where all values are zero
    if (maxEarnings === 0) return [0, 100]; // Show a small scale for zero data
    if (earningsRange === 0) return [0, maxEarnings * 1.1];
    if (minEarnings === 0) return [0, maxEarnings * 1.1];
    return [minEarnings * 0.9, maxEarnings * 1.1];
  };

  return (
    <>
      <DashboardChartCard title={title} subtitle={displaySubtitle} onViewDetails={() => setShowModal(true)}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={getYAxisDomain()}
              tickFormatter={getYAxisFormatter}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: TooltipValueType) => [
                formatTooltipValue(value, true),
                "Earnings",
              ]}
            />
            <Area 
              type="monotone" 
              dataKey="earnings" 
              stroke={CHART_COLORS.primary}
              strokeWidth={3}
              fill="url(#earningsGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: CHART_COLORS.primary, 
                strokeWidth: 3,
                fill: '#ffffff'
              }}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </DashboardChartCard>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Overall Earnings Analysis" size="xl">
        <div className="space-y-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="earningsGradientModal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={getYAxisDomain()}
                  tickFormatter={getYAxisFormatter}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: TooltipValueType) => [
                formatTooltipValue(value, true),
                "Earnings",
              ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="earnings" 
                  stroke={CHART_COLORS.primary}
                  strokeWidth={3}
                  fill="url(#earningsGradientModal)"
                  dot={<CustomDotModal />}
                  activeDot={{ 
                    r: 8, 
                    stroke: CHART_COLORS.primary, 
                    strokeWidth: 3,
                    fill: '#ffffff'
                  }}
                  connectNulls={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                R{chartData.reduce((sum, item) => sum + item.earnings, 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Average Monthly</p>
              <p className="text-2xl font-bold text-gray-900">
                R{(chartData.reduce((sum, item) => sum + item.earnings, 0) / chartData.length).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Growth Trend</p>
              <p className="text-2xl font-bold text-green-600">
                {chartData.length >= 2 ? 
                  ((chartData[chartData.length - 1].earnings - chartData[0].earnings) / chartData[0].earnings * 100).toFixed(1) + '%' : 
                  'N/A'
                }
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

// 2. Driver Leaderboard Chart
interface DriverLeaderboardChartProps {
  data: Array<{ full_name: string; total_earnings: number; payment_count: number }>;
  title?: string;
  subtitle?: string;
}

export function DriverLeaderboardChart({ data, title = 'Driver Leaderboard', subtitle = 'Top performing drivers' }: DriverLeaderboardChartProps) {
  const [showModal, setShowModal] = useState(false);

  if (!data || data.length === 0) {
    return (
      <DashboardChartCard title={title} subtitle={subtitle} onViewDetails={() => setShowModal(true)}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No driver data available</p>
        </div>
      </DashboardChartCard>
    );
  }

  const chartData = data.slice(0, 5).map((driver, index) => ({
    ...driver,
    shortName: driver.full_name.split(' ').map(n => n[0]).join('').toUpperCase(),
    rank: index + 1,
    color: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger][index]
  }));

  // Calculate dynamic Y-axis scaling
  const maxEarnings = Math.max(...chartData.map(item => item.total_earnings));
  const minEarnings = Math.min(...chartData.map(item => item.total_earnings));
  const earningsRange = maxEarnings - minEarnings;
  
  // Determine appropriate Y-axis formatter based on data range
  const getYAxisFormatter = (value: number) => {
    if (maxEarnings >= 1000000) {
      return `R${(value / 1000000).toFixed(1)}M`;
    } else if (maxEarnings >= 1000) {
      return `R${(value / 1000).toFixed(0)}k`;
    } else {
      return `R${value.toFixed(0)}`;
    }
  };

  // Determine Y-axis domain for better scaling
  const getYAxisDomain = () => {
    if (earningsRange === 0) return [0, maxEarnings * 1.1];
    if (minEarnings === 0) return [0, maxEarnings * 1.1];
    return [minEarnings * 0.9, maxEarnings * 1.1];
  };

  return (
    <>
      <DashboardChartCard title={title} subtitle={subtitle} onViewDetails={() => setShowModal(true)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
            <XAxis 
              dataKey="shortName" 
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={getYAxisDomain()}
              tickFormatter={getYAxisFormatter}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: TooltipValueType) => [
                formatTooltipValue(value, true),
                "Earnings",
              ]}
            />
            <Bar 
              dataKey="total_earnings" 
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </DashboardChartCard>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Driver Leaderboard Details" size="xl">
        <div className="space-y-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
                <XAxis 
                  dataKey="full_name" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
                />
                                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                                     formatter={(value: TooltipValueType) => [
                formatTooltipValue(value, true),
                "Earnings",
              ]}
                />
                <Bar 
                  dataKey="total_earnings" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Top Performers</h4>
              {chartData.map((driver) => (
                <div key={driver.full_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700">
                      {driver.rank}
                    </div>
                    <span className="font-medium text-gray-900">{driver.full_name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">R{driver.total_earnings.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{driver.payment_count} payments</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Performance Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Drivers:</span>
                  <span className="font-medium">{data.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Earnings:</span>
                  <span className="font-medium">R{data.reduce((sum, d) => sum + d.total_earnings, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average per Driver:</span>
                  <span className="font-medium">R{(data.reduce((sum, d) => sum + d.total_earnings, 0) / data.length).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

// 3. Payment Distribution Chart
interface PaymentDistributionChartProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
  subtitle?: string;
}

export function PaymentDistributionChart({ data, title = 'Payment Distribution', subtitle = 'Earnings by category' }: PaymentDistributionChartProps) {
  const [showModal, setShowModal] = useState(false);
  const { visibleItems: visibleDrivers, handleShowMore, handleShowLess } = usePagination(data.length, 5);

  if (!data || data.length === 0) {
    return (
      <DashboardChartCard title={title} subtitle={subtitle} onViewDetails={() => setShowModal(true)}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No payment data available</p>
        </div>
      </DashboardChartCard>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    color: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.info][index % 6]
  }));

  // Get visible drivers for the chart (show all for pie chart, but limit for breakdown)
  const visibleChartData = chartData.slice(0, Math.max(5, visibleDrivers));
  const visibleBreakdownData = chartData.slice(0, visibleDrivers);

  return (
    <>
      <DashboardChartCard title={title} subtitle={subtitle} onViewDetails={() => setShowModal(true)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
              name="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: TooltipValueType) => [
                formatTooltipValue(value, true),
                "Amount",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </DashboardChartCard>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Payment Distribution Analysis" size="lg">
        <div className="space-y-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visibleChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  name="name"
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  labelLine={true}
                >
                  {visibleChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: TooltipValueType) => [
                formatTooltipValue(value, true),
                "Amount",
              ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Driver Breakdown</h4>
              <div className="text-sm text-gray-500">
                Showing {visibleDrivers} of {data.length} drivers
              </div>
            </div>
            
            {visibleBreakdownData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">R{item.value.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">
                    {((item.value / chartData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
            
            {/* Pagination Controls */}
            <Pagination
              totalItems={data.length}
              visibleItems={visibleDrivers}
              onShowMore={handleShowMore}
              onShowLess={handleShowLess}
              pageSize={5}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

// 4. Performance Trends Chart
interface PerformanceTrendsChartProps {
  data: Array<{ month: string; drivers: number; earnings: number }>;
  title?: string;
  subtitle?: string;
}

export function PerformanceTrendsChart({ data, title = 'Performance Trends', subtitle = 'Drivers vs Earnings correlation' }: PerformanceTrendsChartProps) {
  const [showModal, setShowModal] = useState(false);

  if (!data || data.length === 0) {
    return (
      <DashboardChartCard title={title} subtitle={subtitle} onViewDetails={() => setShowModal(true)}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No performance data available</p>
        </div>
      </DashboardChartCard>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    drivers: Number(item.drivers) || 0,
    earnings: Number(item.earnings) || 0
  }));

  return (
    <>
      <DashboardChartCard title={title} subtitle={subtitle} onViewDetails={() => setShowModal(true)}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              yAxisId="left"
              tickFormatter={(value) => value.toString()}
              domain={['dataMin', 'dataMax']}
              allowDataOverflow={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
              domain={['dataMin', 'dataMax']}
              allowDataOverflow={false}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: TooltipValueType, name) => [
                String(name) === "drivers" ? formatTooltipValue(value, false) : formatTooltipValue(value, true),
                String(name) === "drivers" ? "Active Drivers" : "Total Earnings",
              ]}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="drivers" 
              stroke={CHART_COLORS.secondary}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: CHART_COLORS.secondary, strokeWidth: 2 }}
              name="drivers"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="earnings" 
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.success, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: CHART_COLORS.success, strokeWidth: 2 }}
              name="earnings"
            />
          </LineChart>
        </ResponsiveContainer>
      </DashboardChartCard>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Performance Trends Analysis" size="xl">
        <div className="space-y-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  yAxisId="left"
                  tickFormatter={(value) => value.toString()}
                  label={{ value: 'Active Drivers', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
                  label={{ value: 'Total Earnings', angle: 90, position: 'insideRight' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: TooltipValueType, name) => [
                    String(name) === "drivers" ? formatTooltipValue(value, false) : formatTooltipValue(value, true),
                    String(name) === "drivers" ? "Active Drivers" : "Total Earnings",
                  ]}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="drivers" 
                  stroke={CHART_COLORS.secondary}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: CHART_COLORS.secondary, strokeWidth: 2 }}
                  name="Active Drivers"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="earnings" 
                  stroke={CHART_COLORS.success}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.success, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: CHART_COLORS.success, strokeWidth: 2 }}
                  name="Total Earnings"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Drivers</p>
              <p className="text-2xl font-bold text-gray-900">
                {chartData.reduce((sum, item) => sum + item.drivers, 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                R{chartData.reduce((sum, item) => sum + item.earnings, 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Efficiency Ratio</p>
              <p className="text-2xl font-bold text-green-600">
                R{(chartData.reduce((sum, item) => sum + item.earnings, 0) / Math.max(chartData.reduce((sum, item) => sum + item.drivers, 0), 1)).toLocaleString()}
                <span className="text-sm text-gray-500">/driver</span>
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
