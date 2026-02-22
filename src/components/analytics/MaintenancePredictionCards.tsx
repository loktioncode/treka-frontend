"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AlertTriangle, Wrench, CheckCircle } from "lucide-react"

interface MaintenanceAlert {
    id: string;
    vehicle: string;
    issue: string;
    severity: "high" | "medium" | "low";
    prob: number;
    timeframe: string;
    health: number;
}

interface MaintenancePredictionCardsProps {
    vehicles: any[];
    alerts?: MaintenanceAlert[];
}

const chartConfig = {
    healthy: { label: "Healthy", color: "hsl(var(--success))" },
    scheduled: { label: "Scheduled", color: "hsl(var(--info))" },
    critical: { label: "Critical", color: "hsl(var(--destructive))" },
}

export function MaintenancePredictionCards({ vehicles, alerts = [] }: MaintenancePredictionCardsProps) {
    // Current maintenance state from vehicle health
    const maintenanceStats = {
        healthy: vehicles.filter(v => v.health >= 85).length,
        scheduled: vehicles.filter(v => v.health >= 60 && v.health < 85).length,
        critical: vehicles.filter(v => v.health < 60).length,
    }

    const donutData = [
        { name: "Healthy", value: maintenanceStats.healthy, color: "hsl(var(--success))" },
        { name: "Scheduled", value: maintenanceStats.scheduled, color: "hsl(var(--info))" },
        { name: "Critical", value: maintenanceStats.critical, color: "hsl(var(--destructive))" },
    ].filter(d => d.value > 0)

    // Sort alerts by highest probability and severity
    const predictiveAlerts = [...alerts].sort((a, b) => b.prob - a.prob).slice(0, 5);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Fleet Prognostics Summary</CardTitle>
                    <CardDescription>
                        Current maintenance state distribution
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {donutData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="glass-card md:col-span-2">
                <CardHeader>
                    <CardTitle>Predictive Maintenance Alerts</CardTitle>
                    <CardDescription>
                        AI-driven forecasts for component failures
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {predictiveAlerts.map((alert, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/50">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${alert.severity === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                                        }`}>
                                        {alert.severity === 'high' ? <AlertTriangle className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-sm">{alert.vehicle} - {alert.issue}</h4>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <span>Health: {alert.health}%</span>
                                            <span>•</span>
                                            <span>Expected in {alert.timeframe}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold">{alert.prob}% Prob.</div>
                                    <div className="w-20 h-1.5 bg-secondary rounded-full mt-1.5 overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${alert.severity === 'high' ? 'bg-destructive' : 'bg-warning'}`}
                                            style={{ width: `${alert.prob}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {vehicles.slice(0, 3).map((v, i) => (
                <Card key={i} className="glass-panel text-center flex flex-col items-center justify-center p-6 border-t-2" style={{ borderTopColor: v.health >= 80 ? 'hsl(var(--success))' : v.health >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))' }}>
                    <div className="text-3xl font-bold tracking-tighter tabular-nums mb-1">{v.health}%</div>
                    <div className="text-sm font-medium">{v.name || v.id.slice(0, 6)}</div>
                    <div className="text-xs text-muted-foreground mt-1 text-balance">
                        {v.health >= 80 ? "Optimal Operating Condition" : v.health >= 60 ? "Monitor Sensor Data" : "Immediate Service Required"}
                    </div>
                </Card>
            ))}
        </div>
    )
}
