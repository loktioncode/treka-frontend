"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsAPI } from "@/services/api";
import { DriverLeaderboardEntry } from "@/types/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";
import { DriverMetricsModal } from "@/components/dashboard/DriverMetricsModal";
import toast from "react-hot-toast";

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<DriverLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDriver, setSelectedDriver] = useState<DriverLeaderboardEntry | null>(null);

    const fetchLeaderboard = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const leaderboardResponse = await analyticsAPI.getDriverLeaderboard();
            setLeaderboard(leaderboardResponse.leaderboard || []);
        } catch (err) {
            console.error("Error fetching leaderboard:", err);
            setError("Failed to load leaderboard data");
            toast.error("Could not load the latest driver rankings.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchLeaderboard();
        }
    }, [user]);

    // Rank rendering logic
    const renderRankBadge = (index: number) => {
        if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
        if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
        if (index === 2) return <Medal className="w-6 h-6 text-orange-600" />;
        return <span className="font-bold text-gray-500 w-6 text-center">{index + 1}</span>;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error && leaderboard.length === 0) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Failed to load</h3>
                <p className="mt-1 text-gray-500">{error}</p>
                <button
                    onClick={() => fetchLeaderboard(true)}
                    className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Driver Leaderboard
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Top performing drivers ranked by safety scores over the last 30 days.
                    </p>
                </div>
                <button
                    onClick={() => fetchLeaderboard(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "Refreshing..." : "Refresh"}
                </button>
            </motion.div>

            {/* Driver Rankings */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="border-teal-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-teal-50 to-white border-b border-teal-50">
                        <CardTitle className="text-lg font-bold text-teal-900">
                            Fleet Rankings
                        </CardTitle>
                        <CardDescription>
                            Scores are calculated out of 100 based on harsh events, speeding, and RPM alerts.
                        </CardDescription>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-semibold text-center w-24">
                                        Rank
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-semibold">
                                        Driver
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-semibold text-center">
                                        Avg Score
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-semibold text-center text-gray-400">
                                        Trips
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-semibold text-center text-gray-400">
                                        Harsh Brake
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-semibold text-center text-gray-400">
                                        Harsh Accel
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-semibold text-center text-gray-400">
                                        Hard Corner
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leaderboard.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">
                                            No drivers or trips found in the last 30 days.
                                        </td>
                                    </tr>
                                ) : (
                                    leaderboard.map((driver, idx) => (
                                        <tr
                                            key={driver.driver_id}
                                            onClick={() => setSelectedDriver(driver)}
                                            className="bg-white hover:bg-teal-50/50 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-6 py-4 font-medium flex justify-center items-center">
                                                {renderRankBadge(idx)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">
                                                    {driver.first_name} {driver.last_name}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    {driver.email} <ChevronRight className="w-3 h-3 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm ${driver.avg_score >= 90
                                                        ? "bg-green-100 text-green-800"
                                                        : driver.avg_score >= 75
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-orange-100 text-orange-800"
                                                        }`}
                                                >
                                                    {driver.avg_score.toFixed(1)} / 100
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-600">
                                                {driver.total_trips}
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-600">
                                                {driver.harsh_brakes}
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-600">
                                                {driver.harsh_accels}
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-600">
                                                {driver.hard_corners}
                                            </td>
                                        </tr>
                                    ))
                                        )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </motion.div>

            {/* Detailed Driver Modal */}
            <DriverMetricsModal
                isOpen={!!selectedDriver}
                onClose={() => setSelectedDriver(null)}
                driver={selectedDriver}
            />
        </div>
    );
}
