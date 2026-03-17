"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface VehiclePerformanceChartsProps {
    vehicles: any[]
}

const chartConfig = {
    fuel_l: { label: "Fuel (L)", color: "hsl(var(--chart-1))" },
    health: { label: "Health Score", color: "hsl(var(--chart-2))" },
    score: { label: "Performance Score", color: "hsl(var(--chart-3))" },
}

export function VehiclePerformanceCharts({ vehicles }: VehiclePerformanceChartsProps) {
    // Take top 5 vehicles for radar comparison
    const radarData = vehicles.slice(0, 5).map(v => ({
        vehicle: v.name || v.id.slice(0, 6),
        fuelEfficiency: v.score - 5, // Simulated derived metric
        safety: v.score,
        reliability: v.health,
        utilization: Math.min(100, (v.trip_count || 5) * 10), // Simulated
        costEffectiveness: Math.min(100, 100 - (v.fuel_l / 10)), // Simulated
    }))

    const radarMetrics = [
        { key: "safety", name: "Safety", fullMark: 100 },
        { key: "reliability", name: "Reliability", fullMark: 100 },
        { key: "utilization", name: "Utilization", fullMark: 100 },
        { key: "costEffectiveness", name: "Cost Eff.", fullMark: 100 },
        { key: "fuelEfficiency", name: "Fuel Eff.", fullMark: 100 },
    ]

    // Transform radarData so it aligns with Recharts Radar format (subject -> values)
    const transformedRadarData = radarMetrics.map(metric => {
        const dataPoint: any = { metric: metric.name }
        radarData.forEach(v => {
            dataPoint[v.vehicle] = v[metric.key as keyof typeof v]
        })
        return dataPoint
    })

    // Chart colors array
    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-white border border-gray-200 md:col-span-2">
                <CardHeader>
                    <CardTitle>Cross-Vehicle Comparison</CardTitle>
                    <CardDescription>
                        Fuel consumption vs Health Score across the fleet
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={vehicles.slice(0, 10)}
                                layout="vertical"
                                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    axisLine={false}
                                    width={100}
                                    tick={{ fontSize: 12 }}
                                />
                                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                                <Legend />
                                <Bar
                                    dataKey="fuel_l"
                                    name="Fuel Consumed (L)"
                                    fill="hsl(var(--chart-1))"
                                    radius={[0, 4, 4, 0]}
                                    barSize={12}
                                />
                                <Bar
                                    dataKey="health"
                                    name="Health %"
                                    fill="hsl(var(--chart-2))"
                                    radius={[0, 4, 4, 0]}
                                    barSize={12}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
                <CardHeader>
                    <CardTitle>Multidimensional Analysis</CardTitle>
                    <CardDescription>
                        Top 5 vehicles holistic performance
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[350px] w-full mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={transformedRadarData}>
                                <PolarGrid stroke="var(--border)" />
                                <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <ChartTooltip />
                                {radarData.map((v, i) => (
                                    <Radar
                                        key={v.vehicle}
                                        name={v.vehicle}
                                        dataKey={v.vehicle}
                                        stroke={colors[i % colors.length]}
                                        fill={colors[i % colors.length]}
                                        fillOpacity={0.2}
                                    />
                                ))}
                                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    )
}
