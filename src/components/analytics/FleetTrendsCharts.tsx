"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { format } from "date-fns"

interface FleetTrendsChartsProps {
    timeSeriesData: any[]
}

const chartConfig = {
    avg_score: { label: "Avg Score", color: "hsl(var(--chart-1))" },
    total_fuel: { label: "Total Fuel (L)", color: "hsl(var(--chart-2))" },
    total_distance: { label: "Total Distance (km)", color: "hsl(var(--chart-3))" },
    trip_count: { label: "Trips", color: "hsl(var(--chart-4))" },
}

export function FleetTrendsCharts({ timeSeriesData }: FleetTrendsChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-white border border-gray-200 md:col-span-2 lg:col-span-3">
                <CardHeader>
                    <CardTitle>Fleet Performance Trends</CardTitle>
                    <CardDescription>
                        30-day historical comparison of fuel consumption vs distance
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={timeSeriesData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="fillFuel" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="fillDistance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => {
                                        const date = new Date(val)
                                        return isNaN(date.getTime()) ? val : format(date, "MMM dd")
                                    }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    yAxisId="left"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${val} L`}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${val} km`}
                                />
                                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="total_fuel"
                                    name="Fuel Consumption"
                                    stroke="hsl(var(--chart-2))"
                                    fillOpacity={1}
                                    fill="url(#fillFuel)"
                                    isAnimationActive={true}
                                />
                                <Area
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="total_distance"
                                    name="Distance Travelled"
                                    stroke="hsl(var(--chart-3))"
                                    fillOpacity={1}
                                    fill="url(#fillDistance)"
                                    isAnimationActive={true}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 md:col-span-1 lg:col-span-2">
                <CardHeader>
                    <CardTitle>Driver Score & Trips</CardTitle>
                    <CardDescription>
                        Correlation between daily trip volume and fleet safety score
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="fillScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => {
                                        const date = new Date(val)
                                        return isNaN(date.getTime()) ? val : format(date, "MMM dd")
                                    }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis yAxisId="left" domain={[60, 100]} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" hide />
                                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="avg_score"
                                    name="Avg Driver Score"
                                    stroke="hsl(var(--chart-1))"
                                    fill="url(#fillScore)"
                                    isAnimationActive={true}
                                />
                                <Area
                                    yAxisId="right"
                                    type="step"
                                    dataKey="trip_count"
                                    name="Total Trips"
                                    stroke="hsl(var(--chart-4))"
                                    fill="transparent"
                                    strokeDasharray="4 4"
                                    strokeWidth={2}
                                    isAnimationActive={true}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 border-l-4 border-l-[var(--chart-4)] flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-medium">Insights Engine</h3>
                    <p className="text-sm text-muted-foreground">
                        Fuel efficiency dropped by 3.2% over the last 7 days despite fewer total trips.
                        Consider reviewing driving behaviors on top routes.
                    </p>
                </div>
            </Card>
        </div>
    )
}
