"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Legend, PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AlertCircle, ShieldAlert, Activity } from "lucide-react"

interface SafetyIncidentChartsProps {
    summary: any;
    incidents?: { date: string, braking: number, accel: number, cornering: number }[];
}

const chartConfig = {
    braking: { label: "Hard Braking", color: "hsl(var(--warning))" },
    accel: { label: "Rapid Accel", color: "hsl(var(--info))" },
    cornering: { label: "Harsh Cornering", color: "hsl(var(--chart-4))" },
}

export function SafetyIncidentCharts({ summary, incidents = [] }: SafetyIncidentChartsProps) {
    // Dynamic incident data mapped from the backend aggregation
    const incidentTrends = incidents.map(inc => ({
        day: inc.date.substring(5), // Keep MM-DD for label
        braking: inc.braking,
        accel: inc.accel,
        cornering: inc.cornering
    }))

    // Gauge Data
    const safetyScore = summary.avg_score || 85
    const gaugeData = [
        { name: "Score", value: safetyScore, color: "hsl(var(--success))" },
        { name: "Remaining", value: 100 - safetyScore, color: "hsl(var(--secondary))" }
    ]

    // Timeline Events (Coming soon functionality)
    const recentIncidents: any[] = [];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card md:col-span-2">
                <CardHeader>
                    <CardTitle>Harsh Events Breakdown</CardTitle>
                    <CardDescription>
                        Weekly trend of safety-related driving incidents
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={incidentTrends} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar dataKey="braking" name="Hard Braking" stackId="a" fill="hsl(var(--warning))" />
                                <Bar dataKey="accel" name="Rapid Accel" stackId="a" fill="hsl(var(--info))" />
                                <Bar dataKey="cornering" name="Harsh Cornering" stackId="a" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Fleet Safety Score</CardTitle>
                    <CardDescription>
                        Overall safety index
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center relative min-h-[250px]">
                    <div className="absolute inset-0 flex items-center justify-center flex-col mt-4">
                        <span className="text-5xl font-bold tracking-tighter">{safetyScore.toFixed(0)}</span>
                        <span className="text-sm text-muted-foreground mt-1">out of 100</span>
                    </div>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={gaugeData}
                                    cx="50%"
                                    cy="50%"
                                    startAngle={180}
                                    endAngle={0}
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={0}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {gaugeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                    <div className="mt-[-40px] text-center w-full">
                        {safetyScore >= 80 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-500">
                                <ShieldAlert className="h-4 w-4" /> Excellent Safety
                            </span>
                        ) : safetyScore >= 60 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-500">
                                <Activity className="h-4 w-4" /> Average Safety
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-sm font-medium text-rose-500">
                                <AlertCircle className="h-4 w-4" /> Critical Concern
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Incident Timeline</CardTitle>
                    <CardDescription>
                        Latest safety alerts
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {recentIncidents.length > 0 ? (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
                            {recentIncidents.map((incident, i) => (
                                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ml-[-8px] md:ml-0 ${incident.severity === 'Critical' ? 'bg-destructive' :
                                        incident.severity === 'High' ? 'bg-warning text-warning-foreground' : 'bg-info text-info-foreground'
                                        }`}>
                                    </div>
                                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-4 md:pl-0 flex flex-col group-odd:items-start group-even:items-start md:group-odd:items-end">
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2">
                                            <span className="font-medium text-sm text-foreground">{incident.type}</span>
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{incident.driver}</span>
                                        </div>
                                        <time className="text-xs text-muted-foreground">{incident.time}</time>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center p-6 text-muted-foreground text-sm">
                            No recent severe incidents detected.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
