"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Gauge, Fuel, Route, Car, Clock } from "lucide-react"
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface FleetKPICardsProps {
    summary: {
        avg_score: number
        utilization: number
        health_score: number
        total_fuel: number
        total_distance: number
        total_trips: number
    }
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
    const chartData = data.map((val, i) => ({ value: val, index: i }))

    return (
        <div className="h-10 w-24">
            <ChartContainer config={{ value: { label: "Value", color } }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <YAxis domain={["dataMin - 10", "dataMax + 10"]} hide />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
    )
}

export function FleetKPICards({ summary }: FleetKPICardsProps) {
    const kpis = [
        {
            title: "Avg Driver Score",
            value: `${summary.avg_score.toFixed(1)}/100`,
            icon: <Gauge className="h-4 w-4 text-emerald-500" />,
            trend: "+2.4%",
            trendUp: true,
            data: [82, 84, 83, 85, 87, 86, 88.5],
            color: "hsl(var(--success))",
        },
        {
            title: "Fleet Utilization",
            value: `${summary.utilization}%`,
            icon: <Car className="h-4 w-4 text-blue-500" />,
            trend: "+5.1%",
            trendUp: true,
            data: [65, 68, 70, 72, 75, 78, 85],
            color: "hsl(var(--info))",
        },
        {
            title: "Fleet Health",
            value: `${summary.health_score}%`,
            icon: <TrendingUp className="h-4 w-4 text-violet-500" />,
            trend: "-1.2%",
            trendUp: false,
            data: [98, 97, 98, 96, 95, 96, 94],
            color: "hsl(var(--warning))",
        },
        {
            title: "Total Fuel (L)",
            value: summary.total_fuel.toLocaleString(),
            icon: <Fuel className="h-4 w-4 text-orange-500" />,
            trend: "+12.5%",
            trendUp: false,
            data: [120, 135, 125, 140, 155, 145, 160],
            color: "hsl(var(--chart-4))",
        },
        {
            title: "Total Distance (km)",
            value: summary.total_distance.toLocaleString(),
            icon: <Route className="h-4 w-4 text-indigo-500" />,
            trend: "+8.2%",
            trendUp: true,
            data: [420, 450, 480, 460, 510, 520, 550],
            color: "hsl(var(--chart-2))",
        },
        {
            title: "Total Trips",
            value: summary.total_trips.toLocaleString(),
            icon: <Clock className="h-4 w-4 text-cyan-500" />,
            trend: "+15.3%",
            trendUp: true,
            data: [35, 38, 42, 40, 45, 48, 52],
            color: "hsl(var(--chart-5))",
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((kpi, i) => (
                <Card key={i} className="bg-white border border-gray-200">
                    <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    {kpi.icon}
                                    {kpi.title}
                                </p>
                                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div
                                className={`flex items-center space-x-1 text-sm font-medium ${kpi.trendUp ? "text-emerald-500" : "text-rose-500"
                                    }`}
                            >
                                {kpi.trendUp ? (
                                    <TrendingUp className="h-3 w-3" />
                                ) : (
                                    <TrendingDown className="h-3 w-3" />
                                )}
                                <span>{kpi.trend}</span>
                            </div>
                            <MiniSparkline data={kpi.data} color={kpi.color} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
