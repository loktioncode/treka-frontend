"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TelemetryChartsProps {
  data: any[];
  type: "engine" | "thermal" | "electrical" | "dynamics" | "road" | "fuel" | "load" | "orientation" | "acceleration";
  title?: string;
}

const TICK_COUNT = 6;

/** Format timestamp as local clock time (e.g. "14:30:05") */
function formatClockTime(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

/** Pick a nice step (in ms) for the given span so axis ticks are round numbers */
function niceStep(spanMs: number, tickCount: number): number {
  const raw = spanMs / Math.max(1, tickCount - 1);
  const order = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / order;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return Math.max(1000, Math.round(nice * order));
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  data,
  type,
  title,
}) => {
  const chartData = useMemo(() => {
    return [...data]
      .map((r) => {
        const t = r.ts ?? 0;
        // Normalize to milliseconds if in seconds (Teltonika)
        const ts_ms = t < 1e12 ? t * 1000 : t;
        return { ...r, ts: ts_ms };
      })
      .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  }, [data]);

  const minTs = chartData[0]?.ts ?? 0;
  const maxTs = chartData[chartData.length - 1]?.ts ?? minTs;
  const spanMs = Math.max(0, maxTs - minTs);

  const formatTime = useMemo(() => {
    return (ts: number) => formatClockTime(ts);
  }, []);

  const xAxisLabel = "Time of Day (Local)";

  /** Evenly spaced, “nice” tick values for the time axis (avoid duplicate labels) */
  const timeAxisTicks = useMemo(() => {
    if (chartData.length === 0 || spanMs <= 0) return [];
    const step = niceStep(spanMs, TICK_COUNT);
    const ticks: number[] = [];
    for (let t = 0; t <= spanMs; t += step) {
      ticks.push(minTs + t);
      if (ticks.length >= TICK_COUNT) break;
    }
    if (ticks[ticks.length - 1] !== maxTs) ticks.push(maxTs);
    return ticks;
  }, [minTs, maxTs, spanMs, chartData.length]);

  switch (type) {
    case "engine":
      return (
        <Card className="w-full h-[400px]">
          <CardHeader>
            <CardTitle>{title || "Engine Performance (RPM & Speed)"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="ts"
                  ticks={timeAxisTicks.length > 0 ? timeAxisTicks : undefined}
                  tickFormatter={formatTime}
                  label={{
                    value: xAxisLabel,
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#3b82f6"
                  label={{ value: "RPM", angle: -90, position: "insideLeft" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  label={{
                    value: "Speed (km/h)",
                    angle: 90,
                    position: "insideRight",
                  }}
                />
                <Tooltip
                  labelFormatter={(label) => formatTime(Number(label))}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="rpm"
                  stroke="#3b82f6"
                  name="RPM"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="spd"
                  stroke="#10b981"
                  name="Speed"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "thermal":
      return (
        <Card className="w-full h-[400px]">
          <CardHeader>
            <CardTitle>{title || "Thermal Status (°C)"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="ts"
                  ticks={timeAxisTicks.length > 0 ? timeAxisTicks : undefined}
                  tickFormatter={formatTime}
                  label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }}
                />
                <YAxis domain={[0, 150]} />
                <Tooltip labelFormatter={(label) => formatTime(Number(label))} />
                <Legend verticalAlign="top" height={36} />
                <Area
                  type="monotone"
                  dataKey="tmp"
                  stroke="#ef4444"
                  fill="#fee2e2"
                  name="Coolant Temp"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="oil"
                  stroke="#f97316"
                  fill="#ffedd5"
                  name="Oil Temp"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="iat"
                  stroke="#3b82f6"
                  fill="#dbeafe"
                  name="Intake Air"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "electrical":
      return (
        <Card className="w-full h-[400px]">
          <CardHeader>
            <CardTitle>{title || "Electrical Health (Voltage)"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="ts"
                  ticks={timeAxisTicks.length > 0 ? timeAxisTicks : undefined}
                  tickFormatter={formatTime}
                  label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }}
                />
                <YAxis domain={[10, 16]} ticks={[10, 11, 12, 13, 14, 15, 16]} />
                <Tooltip labelFormatter={(label) => formatTime(Number(label))} />
                <Line
                  type="stepAfter"
                  dataKey="vlt"
                  stroke="#8b5cf6"
                  name="Battery/Alt Voltage"
                  dot={true}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "dynamics":
      return (
        <Card className="w-full h-[400px]">
          <CardHeader>
            <CardTitle>{title || "G-Force Dynamics"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid />
                <XAxis
                  type="number"
                  dataKey="ia_lat"
                  name="Lateral G"
                  unit="g"
                  domain={[-1, 1]}
                />
                <YAxis
                  type="number"
                  dataKey="ia_lg"
                  name="Longitudinal G"
                  unit="g"
                  domain={[-1, 1]}
                />
                <ZAxis
                  type="number"
                  dataKey="ia_tot"
                  range={[50, 400]}
                  name="Total Impact"
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Legend verticalAlign="top" height={36} />
                <Scatter
                  name="Acceleration Events"
                  data={chartData}
                  fill="#f43f5e"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "road":
      return (
        <Card className="w-full h-[400px]">
          <CardHeader>
            <CardTitle>
              {title || "Road Quality (Vibrations & Potholes)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="ts"
                  ticks={timeAxisTicks.length > 0 ? timeAxisTicks : undefined}
                  tickFormatter={formatTime}
                  label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#f59e0b"
                  label={{
                    value: "Vib (RMS)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#6366f1"
                  label={{
                    value: "Potholes",
                    angle: 90,
                    position: "insideRight",
                  }}
                />
                <Tooltip labelFormatter={(label) => formatTime(Number(label))} />
                <Legend verticalAlign="top" height={36} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="vib"
                  stroke="#f59e0b"
                  name="Vibration Intensity"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="step"
                  dataKey="pot"
                  stroke="#6366f1"
                  name="Pothole Count"
                  dot={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "fuel":
      return (
        <Card className="w-full h-[400px]">
          <CardHeader>
            <CardTitle>{title || "Fuel System Health"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="ts"
                  ticks={timeAxisTicks.length > 0 ? timeAxisTicks : undefined}
                  tickFormatter={formatTime}
                  label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#22c55e"
                  label={{ value: "Fuel Level (%)", angle: -90, position: "insideLeft" }}
                  domain={[0, 100]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#f97316"
                  label={{ value: "MAF (g/s)", angle: 90, position: "insideRight" }}
                />
                <Tooltip labelFormatter={(label) => formatTime(Number(label))} />
                <Legend verticalAlign="top" height={36} />
                <Line yAxisId="left" type="monotone" dataKey="fl" stroke="#22c55e" name="Fuel Level %" dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="maf" stroke="#f97316" name="Mass Air Flow" dot={false} strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="fp" stroke="#06b6d4" name="Fuel Pressure" dot={false} strokeWidth={1.5} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "load":
      return (
        <Card className="w-full h-[400px]">
          <CardHeader>
            <CardTitle>{title || "Engine Load (%)"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="ts"
                  ticks={timeAxisTicks.length > 0 ? timeAxisTicks : undefined}
                  tickFormatter={formatTime}
                  label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }}
                />
                <YAxis domain={[0, 100]} label={{ value: "%", angle: -90, position: "insideLeft" }} />
                <Tooltip labelFormatter={(label) => formatTime(Number(label))} />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="lod" stroke="#ec4899" fill="#fce7f3" name="Engine Load %" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "orientation":
      return (
        <Card className="w-full h-[400px]">
          <CardHeader>
            <CardTitle>{title || "Vehicle Orientation (Roll & Pitch)"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="ts"
                  ticks={timeAxisTicks.length > 0 ? timeAxisTicks : undefined}
                  tickFormatter={formatTime}
                  label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }}
                />
                <YAxis label={{ value: "Degrees (°)", angle: -90, position: "insideLeft" }} />
                <Tooltip labelFormatter={(label) => formatTime(Number(label))} />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="rol" stroke="#f59e0b" name="Roll" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="pit" stroke="#6366f1" name="Pitch" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "acceleration":
      return (
        <Card className="w-full h-[400px]">
          <CardHeader>
            <CardTitle>{title || "Speed vs G-Force Correlation"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="ts"
                  ticks={timeAxisTicks.length > 0 ? timeAxisTicks : undefined}
                  tickFormatter={formatTime}
                  label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#10b981"
                  label={{ value: "Speed (km/h)", angle: -90, position: "insideLeft" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#ef4444"
                  label={{ value: "G-Force", angle: 90, position: "insideRight" }}
                />
                <Tooltip labelFormatter={(label) => formatTime(Number(label))} />
                <Legend verticalAlign="top" height={36} />
                <Line yAxisId="left" type="monotone" dataKey="spd" stroke="#10b981" name="Speed" dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="ia_tot" stroke="#ef4444" name="Total G-Force" dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="oa_g" stroke="#f97316" name="OBD Accel (G)" dot={false} strokeWidth={1.5} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
};
