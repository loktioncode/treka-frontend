"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface DriverAnalyticsChartsProps {
    vehicles: any[];
    driverAnalytics?: { name: string; value: number }[];
    topDrivers?: any[];
}

const chartConfig = {
    score: { label: "Score", color: "hsl(var(--chart-1))" },
    excellent: { label: "Excellent (>90)", color: "hsl(var(--success))" },
    good: { label: "Good (75-90)", color: "hsl(var(--info))" },
    needsImprovement: { label: "Needs Impr. (<75)", color: "hsl(var(--warning))" },
}

export function DriverAnalyticsCharts({ vehicles, driverAnalytics = [], topDrivers = [] }: DriverAnalyticsChartsProps) {
    // Top Drivers Leaderboard (from backend trip aggregation)
    let driverData = topDrivers;
    if (!driverData || driverData.length === 0) {
        // Fallback for visual mock if backend hasn't generated trips yet
        driverData = vehicles.map((v, i) => ({
            name: `Driver ${i + 1}`,
            score: v.score || 100,
            trips: v.trip_count || Math.floor(Math.random() * 50) + 10,
            vehicle: v.name || v.id.slice(0, 6),
        })).sort((a, b) => b.score - a.score)
    }

    // Distribution Data (Histogram from backend)
    const histogramData = driverAnalytics.map(d => ({
        range: d.name,
        count: d.value
    }))

    const pieData = driverAnalytics.map(d => {
        let color = "hsl(var(--success))";
        if (d.name.includes("80-") || d.name.includes("70-")) color = "hsl(var(--info))";
        if (d.name.includes("60") || d.name.includes("Below")) color = "hsl(var(--warning))";
        return { name: d.name, value: d.value, color };
    })

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                    <CardDescription>
                        Fleet-wide driver score histogram
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={histogramData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="range" tickLine={false} axisLine={false} />
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" name="Drivers" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Score Categories</CardTitle>
                    <CardDescription>
                        Proportion of driver skill levels
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Top Drivers Leaderboard</CardTitle>
                    <CardDescription>
                        Highest performing drivers by safety score
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    <div className="space-y-4">
                        {driverData.slice(0, 5).map((driver, i) => (
                            <div key={i} className="flex items-center">
                                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-sm mr-4 border border-border">
                                    {i + 1}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-sm leading-none">{driver.name}</p>
                                        <p className="font-bold text-sm">{driver.score}</p>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                                        <span>{driver.vehicle}</span>
                                        <span>{driver.trips} trips</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${driver.score}%`,
                                                backgroundColor: driver.score >= 90 ? 'var(--success)' : driver.score >= 75 ? 'var(--info)' : 'var(--warning)'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
