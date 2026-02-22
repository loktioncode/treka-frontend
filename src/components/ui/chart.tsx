"use client"

import * as React from "react"
import { Legend, Tooltip } from "recharts"
import { cn } from "@/lib/utils"

export type ChartConfig = Record<
    string,
    {
        label: string
        color?: string
        theme?: {
            light: string
            dark: string
        }
    }
>

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    config: ChartConfig
}

export function ChartContainer({
    config,
    children,
    className,
    ...props
}: ChartContainerProps) {
    return (
        <div
            className={cn(
                "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line-line]:stroke-border [&_.recharts-pie-label-text]:fill-foreground",
                className
            )}
            style={
                {
                    ...Object.entries(config).reduce((acc, [key, value]) => {
                        if (value.color) {
                            acc[`--color-${key}`] = value.color
                        }
                        return acc
                    }, {} as Record<string, string>),
                } as React.CSSProperties
            }
            {...props}
        >
            {children}
        </div>
    )
}

export const ChartTooltip = Tooltip

interface ChartTooltipContentProps {
    active?: boolean
    payload?: any[]
    label?: string
    hideLabel?: boolean
    indicator?: "line" | "dot" | "dashed"
}

export function ChartTooltipContent({
    active,
    payload,
    label,
    hideLabel = false,
    indicator = "dot",
}: ChartTooltipContentProps) {
    if (!active || !payload?.length) {
        return null
    }

    return (
        <div className="rounded-lg border bg-background/90 p-2 shadow-sm backdrop-blur-md">
            {!hideLabel && label && (
                <div className="mb-2 text-[0.70rem] uppercase text-muted-foreground">
                    {label}
                </div>
            )}
            <div className="flex flex-col gap-1.5">
                {payload.map((item: any, index: number) => {
                    return (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                {indicator === "dot" && (
                                    <div
                                        className="h-2 w-2 rounded-[2px]"
                                        style={{ background: item.color }}
                                    />
                                )}
                                {indicator === "line" && (
                                    <div
                                        className="h-2 w-1.5 rounded-[2px]"
                                        style={{ background: item.color }}
                                    />
                                )}
                                <span className="text-[0.70rem] font-medium text-muted-foreground">
                                    {item.name}
                                </span>
                            </div>
                            <span className="font-mono text-[0.70rem] font-medium">
                                {item.value}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export const ChartLegend = Legend

export function ChartLegendContent({ payload }: { payload?: any[] }) {
    if (!payload?.length) {
        return null
    }

    return (
        <div className="flex items-center justify-center gap-4 pt-4">
            {payload.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div
                        className="h-2 w-2 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[0.70rem] font-medium text-muted-foreground text-xs">
                        {item.value}
                    </span>
                </div>
            ))}
        </div>
    )
}
