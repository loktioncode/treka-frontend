"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { analyticsAPI } from "@/services/api";
import { DriverMetricsResponse, DriverLeaderboardEntry } from "@/types/api";
import { format } from "date-fns";
import { AlertTriangle, Clock, MapPin, Zap, Activity, PlayCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartLink } from "@/components/SmartLink";
import toast from "react-hot-toast";

interface DriverMetricsModalProps {
    isOpen: boolean;
    onClose: () => void;
    driver: DriverLeaderboardEntry | null;
}

export function DriverMetricsModal({ isOpen, onClose, driver }: DriverMetricsModalProps) {
    const [metrics, setMetrics] = useState<DriverMetricsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDriverMetrics() {
            if (!driver || !isOpen) return;

            setMetrics(null);
            setError(null);
            try {
                setLoading(true);
                const data = await analyticsAPI.getDriverMetrics(driver.driver_id);
                setMetrics(data);
            } catch (err) {
                console.error("Failed to load driver metrics:", err);
                const axiosError = err as { response?: { data?: { detail?: string } } };
                const message = axiosError.response?.data?.detail
                    || (err instanceof Error ? err.message : "Failed to load detailed metrics for this driver.");
                setError(message);
                toast.error(message);
            } finally {
                setLoading(false);
            }
        }

        fetchDriverMetrics();
    }, [driver, isOpen]);

    if (!driver) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
        >
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {driver.first_name} {driver.last_name}
                        </h3>
                        <p className="mt-1 flex items-center gap-2 text-sm">
                            <span className="text-gray-500">{driver.email}</span>
                            <span className="text-gray-300">•</span>
                            <span className="font-semibold text-gray-700">Detailed Analytics (30 Days)</span>
                        </p>
                    </div>
                    {/* Score Badge */}
                    <div className="flex flex-col items-center mr-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avg Score</span>
                        <span
                            className={`flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold shadow-sm ${driver.avg_score >= 90
                                ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200"
                                : driver.avg_score >= 75
                                    ? "bg-blue-100 text-blue-700 border-2 border-blue-200"
                                    : "bg-amber-100 text-amber-700 border-2 border-amber-200"
                                }`}
                        >
                            {driver.avg_score.toFixed(0)}
                        </span>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto py-6 pr-2">
                    {loading ? (
                        <div className="space-y-6 animate-pulse">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                            </div>
                            <Skeleton className="h-64 w-full rounded-xl" />
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                            <p className="font-medium">{error}</p>
                            <p className="text-sm mt-2 text-amber-600">Please close and try again, or contact support if the issue persists.</p>
                        </div>
                    ) : metrics ? (
                        <div className="space-y-8">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                                    <Activity className="w-5 h-5 text-gray-400 mb-2" />
                                    <span className="text-2xl font-bold text-gray-900">{metrics.summary.total_trips}</span>
                                    <span className="text-xs text-gray-500 font-medium uppercase mt-1">Total Trips</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 mb-2" />
                                    <span className="text-2xl font-bold text-gray-900">{metrics.summary.events?.hbk || 0}</span>
                                    <span className="text-xs text-gray-500 font-medium uppercase mt-1">Harsh Brakes</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                                    <Zap className="w-5 h-5 text-blue-500 mb-2" />
                                    <span className="text-2xl font-bold text-gray-900">{metrics.summary.events?.hac || 0}</span>
                                    <span className="text-xs text-gray-500 font-medium uppercase mt-1">Harsh Accels</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                                    <Zap className="w-5 h-5 text-orange-500 mb-2" />
                                    <span className="text-2xl font-bold text-gray-900">{metrics.summary.events?.hco || 0}</span>
                                    <span className="text-xs text-gray-500 font-medium uppercase mt-1">Hard Corners</span>
                                </div>
                            </div>

                            {/* Recent Trips List */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-teal-600" /> Recent Trips (Last 30 Days)
                                </h3>

                                {metrics.recent_trips.length === 0 ? (
                                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-gray-500">No trips recorded for this driver in the selected timeframe.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 border rounded-xl overflow-hidden bg-white">
                                        {metrics.recent_trips.map((trip) => (
                                            <SmartLink
                                                key={trip.id}
                                                href={`/dashboard/assets/${trip.vehicle_id}?tab=trips&tripId=${trip.id}`}
                                                className="p-4 hover:bg-teal-50/50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group cursor-pointer block"
                                            >

                                                <div className="flex flex-col flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <MapPin className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
                                                        <span className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                                                            {format(new Date(trip.start_ts), "MMM d, yyyy 'at' h:mm a")}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 ml-6">
                                                        {trip.end_ts && (
                                                            <>
                                                                <span>Ended: {format(new Date(trip.end_ts), "h:mm a")}</span>
                                                                <span className="text-gray-300">•</span>
                                                            </>
                                                        )}
                                                        <span>Distance: {trip.distance_km?.toFixed(2) || "0.00"} km</span>
                                                    </div>
                                                </div>

                                                {/* Trip Score & Events */}
                                                <div className="flex items-center gap-6">
                                                    <div className="flex gap-3 text-xs">
                                                        {trip.events?.hbk > 0 && <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md font-medium"><AlertTriangle className="w-3 h-3" /> {trip.events.hbk} Brakes</span>}
                                                        {trip.events?.hac > 0 && <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium"><Zap className="w-3 h-3" /> {trip.events.hac} Accel</span>}
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-col items-center min-w-[60px]">
                                                            <span className={`text-lg font-bold ${trip.driver_score >= 90 ? "text-emerald-500" :
                                                                trip.driver_score >= 75 ? "text-blue-500" : "text-amber-500"
                                                                }`}>
                                                                {trip.driver_score.toFixed(0)}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Score</span>
                                                        </div>
                                                        <PlayCircle className="w-8 h-8 text-teal-200 group-hover:text-teal-600 transition-colors" />
                                                    </div>
                                                </div>

                                            </SmartLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl">
                            Failed to load data. Please close and try again.
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
