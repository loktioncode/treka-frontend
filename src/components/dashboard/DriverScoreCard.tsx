"use client";

import { useEffect, useState } from "react";
import { analyticsAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, Zap, ChevronRight } from "lucide-react";
import { SmartLink } from "@/components/SmartLink";

interface DriverScoreCardProps {
    // If provided (for admins), it will use this fleet average score.
    // If not provided, it will fetch the individual driver's score.
    fleetAverageScore?: number;
}

export function DriverScoreCard({ fleetAverageScore }: DriverScoreCardProps) {
    const { user } = useAuth();
    const [score, setScore] = useState<number>(100);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchScore() {
            // If the parent passed a fleet average, we use that directly.
            if (fleetAverageScore !== undefined) {
                setScore(fleetAverageScore);
                setLoading(false);
                return;
            }

            // Otherwise, if the user is a driver, fetch their personal score.
            if (user?.role === "driver") {
                try {
                    const metrics = await analyticsAPI.getDriverMetrics(user.id);
                    setScore(metrics.summary.avg_score);
                } catch (err) {
                    console.error("Failed to fetch driver score:", err);
                    setError("Failed to load driver score");
                } finally {
                    setLoading(false);
                }
            } else {
                // Fallback for missing fleet score but not a driver
                setLoading(false);
            }
        }

        fetchScore();
    }, [fleetAverageScore, user]);

    if (loading) {
        return <Skeleton className="h-48 w-full rounded-xl" />;
    }

    if (error && fleetAverageScore === undefined) {
        return (
            <Card className="border-red-100 bg-red-50/50">
                <CardContent className="p-6 text-center text-sm text-red-600">
                    {error}
                </CardContent>
            </Card>
        );
    }

    // Determine colors based on score
    const isExcellent = score >= 90;
    const isGood = score >= 75 && score < 90;
    const isWarning = score < 75;

    const getScoreColor = () => {
        if (isExcellent) return "text-emerald-500";
        if (isGood) return "text-blue-500";
        return "text-amber-500";
    };

    const getStrokeColor = () => {
        if (isExcellent) return "stroke-emerald-500";
        if (isGood) return "stroke-blue-500";
        return "stroke-amber-500";
    };

    const getBgColor = () => {
        if (isExcellent) return "bg-emerald-50";
        if (isGood) return "bg-blue-50";
        return "bg-amber-50";
    };

    // SVG dimensions for the circular progress
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    // Progress offset (cap at 100 for ring; scores can go up to 110 for excellent drivers)
    const displayProgress = Math.min(score, 100);
    const offset = circumference - (displayProgress / 100) * circumference;

    return (
        <Card className={`overflow-hidden border-0 shadow-md ${getBgColor()} flex flex-col h-full`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center justify-between">
                    <span>{fleetAverageScore !== undefined ? "Fleet Avg Score" : "Your Driver Score"}</span>
                    {isExcellent ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    ) : isGood ? (
                        <Zap className="w-5 h-5 text-blue-500" />
                    ) : (
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                    )}
                </CardTitle>
                <CardDescription className="text-gray-600 text-xs font-semibold">
                    {fleetAverageScore !== undefined
                        ? "Overall safety rating of all drivers"
                        : "Based on your behavior over the last 30 days"}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6 flex-grow">
                <div className="relative flex items-center justify-center">
                    {/* Background Circle */}
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            className="stroke-gray-200/50"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />
                        {/* Progress Circle animated */}
                        <motion.circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            className={getStrokeColor()}
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                        <span className={`text-4xl font-extrabold ${getScoreColor()}`}>
                            {score.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">
                            / {score > 100 ? "100+" : "100"}
                        </span>
                    </div>
                </div>
                <p className="mt-4 mb-4 text-sm font-medium text-gray-700 text-center">
                    {isExcellent
                        ? "Excellent driving behavior!"
                        : isGood
                            ? "Good driving, room for improvement."
                            : "Warning: High number of harsh events."}
                </p>

                <SmartLink
                    href="/dashboard/drivers/leaderboard"
                    className="mt-auto flex items-center justify-center w-full py-2.5 px-4 rounded-lg bg-white/60 hover:bg-white border border-gray-200/50 text-sm font-bold text-gray-700 hover:text-teal-700 transition-all shadow-sm group"
                >
                    View Full Details
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </SmartLink>
            </CardContent>
        </Card>
    );
}
