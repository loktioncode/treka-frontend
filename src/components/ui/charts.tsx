'use client';

import { Card } from './card';
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
  Legend
} from 'recharts';

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

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function ChartCard({ title, subtitle, children, className = '', actions }: ChartCardProps) {
  return (
    <Card className={`p-4 sm:p-6 h-full ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
      <div className="h-full w-full overflow-hidden relative">
        <div className="absolute inset-0">
          {children}
        </div>
      </div>
    </Card>
  );
}

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  title?: string;
  subtitle?: string;
}

export function SimpleBarChart({ data, xKey, yKey, color = CHART_COLORS.primary, title, subtitle }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title={title || 'Data Chart'} subtitle={subtitle}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No data available</p>
        </div>
      </ChartCard>
    );
  }

  // Custom tooltip for better formatting
  const CustomTooltip = ({ active, payload, label }: BarChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">Value:</span>
                <span className="text-sm font-medium text-gray-900">
                  {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard title={title || 'Data Chart'} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6b7280' }}
            interval={0}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              // Check if the value looks like currency (large numbers)
              if (typeof value === 'number' && value > 1000) {
                return `R${(value / 1000).toFixed(0)}k`;
              }
              return value.toLocaleString();
            }}
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey={yKey} 
            fill={color}
            radius={[4, 4, 0, 0]}
            opacity={0.8}
            stroke={color}
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  title?: string;
  subtitle?: string;
  showArea?: boolean;
}

export function SimpleLineChart({ data, xKey, yKey, color = CHART_COLORS.primary, title, subtitle, showArea = false }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title={title || 'Trend Chart'} subtitle={subtitle}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No data available</p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title || 'Trend Chart'} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey={xKey} 
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
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          />
          {showArea ? (
            <div className="text-center text-gray-500 py-8">
              <p>Area chart not implemented yet</p>
            </div>
          ) : (
            <Line 
              type="monotone" 
              dataKey={yKey} 
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface PieChartProps {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  title?: string;
  subtitle?: string;
}

export function SimplePieChart({ data, nameKey, valueKey, title, subtitle }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title={title || 'Distribution Chart'} subtitle={subtitle}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No data available</p>
        </div>
      </ChartCard>
    );
  }

  const COLORS = [
    CHART_COLORS.primary,
    CHART_COLORS.secondary,
    CHART_COLORS.success,
    CHART_COLORS.warning,
    CHART_COLORS.danger,
    CHART_COLORS.info,
    CHART_COLORS.purple,
    CHART_COLORS.orange,
  ];

  return (
    <ChartCard title={title || 'Distribution Chart'} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props) => {
              const { name, percent } = props;
              return `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`;
            }}
            outerRadius={70}
            fill="#8884d8"
            dataKey={valueKey}
            name={nameKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface MultiLineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: Array<{
    key: string;
    label: string;
    color: string;
  }>;
  title?: string;
  subtitle?: string;
}

export function MultiLineChart({ data, xKey, lines, title, subtitle }: MultiLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title={title || 'Multi-Series Chart'} subtitle={subtitle}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No data available</p>
        </div>
      </ChartCard>
    );
  }

  // Function to create shortened names (initials)
  const createShortName = (fullName: string) => {
    if (!fullName) return 'Unknown';
    
    // Split the name and take first letter of each part
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 3).toUpperCase();
    } else if (nameParts.length === 2) {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    } else {
      // For names with 3+ parts, take first letter of first and last
      return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }
  };

  // Format month labels for better readability
  const formatMonthLabel = (monthStr: string) => {
    if (!monthStr) return monthStr;
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } catch {
      return monthStr;
    }
  };

  // Custom tooltip for better formatting
  const CustomTooltip = ({ active, payload, label }: LineChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{formatMonthLabel(label || '')}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => {
              // Find the full name from the lines array
              const fullName = lines.find(line => line.key === entry.dataKey)?.label || entry.dataKey;
              return (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-600">{fullName}:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard title={title || 'Multi-Series Chart'} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatMonthLabel}
            tick={{ fill: '#6b7280' }}
            interval={0}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.toLocaleString()}
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => <span className="text-gray-700">{createShortName(value)}</span>}
          />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={3}
              dot={{ 
                fill: line.color, 
                strokeWidth: 2, 
                r: 4,
                stroke: '#ffffff'
              }}
              activeDot={{ 
                r: 6, 
                stroke: line.color, 
                strokeWidth: 3,
                fill: '#ffffff'
              }}
              name={line.label}
              connectNulls={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: string;
  className?: string;
  subtitle?: string;
}

export function MetricCard({ title, value, change, trend, icon, color = CHART_COLORS.primary, className = '', subtitle }: MetricCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '→';
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {change && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {getTrendIcon()} {change}
              </span>
              <span className="text-sm text-gray-500">active drivers from last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-full bg-gray-50`}>
            <div className={`h-6 w-6 ${color}`}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

interface DriverPerformanceChartProps {
  data: Array<{
    driver_id: string;
    driver_name: string;
    monthly_earnings: Array<{
      month: string;
      earnings: number;
    }>;
  }>;
  title?: string;
  subtitle?: string;
  maxDrivers?: number;
}

export function DriverPerformanceChart({ data, title, subtitle, maxDrivers = 6 }: DriverPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title={title || 'Driver Performance Chart'} subtitle={subtitle}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No driver performance data available</p>
        </div>
      </ChartCard>
    );
  }

  // Function to create shortened names (initials)
  const createShortName = (fullName: string) => {
    if (!fullName) return 'Unknown';
    
    // Split the name and take first letter of each part
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 3).toUpperCase();
    } else if (nameParts.length === 2) {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    } else {
      // For names with 3+ parts, take first letter of first and last
      return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }
  };

  // Transform data for the chart
  const chartData = data.slice(0, maxDrivers).map((driver, index) => {
    const totalEarnings = driver.monthly_earnings.reduce((sum, month) => sum + month.earnings, 0);
    const avgMonthlyEarnings = totalEarnings / Math.max(driver.monthly_earnings.length, 1);
    const trend = driver.monthly_earnings.length >= 2 ? 
      (driver.monthly_earnings[driver.monthly_earnings.length - 1]?.earnings || 0) - 
      (driver.monthly_earnings[driver.monthly_earnings.length - 2]?.earnings || 0) : 0;
    
    return {
      driver: createShortName(driver.driver_name),
      fullName: driver.driver_name, // Keep full name for tooltip
      totalEarnings,
      avgMonthlyEarnings,
      trend,
      color: ['#0d9488', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16', '#a855f7'][index % 10]
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: DriverChartTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
          <p className="font-semibold text-gray-900 mb-3">{data.fullName}</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Earnings:</span>
              <span className="text-sm font-medium text-green-600">
                R{data.totalEarnings.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg/Month:</span>
              <span className="text-sm font-medium text-blue-600">
                R{data.avgMonthlyEarnings.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Trend:</span>
              <span className={`text-sm font-medium ${data.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.trend >= 0 ? '+' : ''}R{data.trend.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard title={title || 'Driver Performance Overview'} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
          <XAxis 
            dataKey="driver" 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="totalEarnings" 
            radius={[4, 4, 0, 0]}
            opacity={0.8}
            strokeWidth={1}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Tooltip types for different chart types
interface BaseTooltipProps {
  active?: boolean;
  label?: string;
}

interface BarChartTooltipProps extends BaseTooltipProps {
  payload?: Array<{ 
    color: string; 
    name: string; 
    value: number | string;
    dataKey: string;
  }>;
}

interface LineChartTooltipProps extends BaseTooltipProps {
  payload?: Array<{ 
    color: string; 
    name: string; 
    value: number | string;
    dataKey: string;
  }>;
}

interface DriverChartTooltipProps extends BaseTooltipProps {
  payload?: Array<{ 
    color: string; 
    name: string; 
    value: number | string;
    payload: {
      fullName: string;
      totalEarnings: number;
      avgMonthlyEarnings: number;
      trend: number;
    };
  }>;
}

interface GroupedMonthlyEarningsChartProps {
  data: Array<{
    month: string;
    [key: string]: string | number;
  }>;
  driverNames: string[];
  title?: string;
  subtitle?: string;
}

export function GroupedMonthlyEarningsChart({ data, driverNames, title, subtitle }: GroupedMonthlyEarningsChartProps) {
  if (!data || data.length === 0 || !driverNames || driverNames.length === 0) {
    return (
      <ChartCard title={title || 'Monthly Earnings Chart'} subtitle={subtitle}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No monthly earnings data available</p>
        </div>
      </ChartCard>
    );
  }

  // Helper function to get driver initials
  const getDriverInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3); // Limit to 3 characters max
  };

  // Custom tooltip for grouped bars
  const CustomTooltip = ({ active, payload, label }: BarChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">
                  {entry.dataKey === 'total' ? 'Total' : entry.dataKey}:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  R{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Use provided driver names
  const colors = ['#0d9488', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
  
  // Validate that data has the expected structure
  const validData = data.filter(item => 
    item.month && 
    driverNames.every(name => typeof item[name] === 'number') && 
    typeof item.total === 'number'
  );
  
  if (validData.length === 0) {
    return (
      <ChartCard title={title || 'Monthly Earnings Chart'} subtitle={subtitle}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>Invalid data structure for grouped chart</p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title || 'Monthly Earnings Chart'} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={validData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.5} />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={60}
            wrapperStyle={{ paddingTop: '15px' }}
            formatter={(value) => {
              // Show initials for driver names, full name for total
              if (value === 'total') {
                return <span className="text-gray-700 font-medium">{value}</span>;
              }
              // Find the full driver name and show only initials
              const fullName = driverNames.find(name => name === value);
              if (fullName) {
                return (
                  <span className="text-gray-700">
                    {getDriverInitials(fullName)}
                  </span>
                );
              }
              return <span className="text-gray-700">{value}</span>;
            }}
          />
          
          {/* Individual driver bars */}
          {driverNames.map((driverName: string, index: number) => (
            <Bar
              key={driverName}
              dataKey={driverName}
              fill={colors[index % colors.length]}
              radius={[4, 4, 0, 0]}
              opacity={0.7}
              strokeWidth={1}
              name={driverName}
            />
          ))}
          
          {/* Total bar (dark teal) */}
          <Bar
            dataKey="total"
            fill="#0d9488"
            radius={[4, 4, 0, 0]}
            opacity={0.9}
            strokeWidth={2}
            stroke="#0d9488"
            name="total"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
