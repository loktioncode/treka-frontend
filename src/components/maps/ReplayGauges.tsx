import React from "react";
import { Gauge, Activity, Compass } from "lucide-react";

interface ReplayGaugesProps {
    speed?: number;
    rpm?: number;
    gForce?: number;
}

export default function ReplayGauges({
    speed = 0,
    rpm = 0,
    gForce = 0,
}: ReplayGaugesProps) {
    // Normalize values for visual rings
    const maxSpeed = 160;
    const maxRpm = 6000;
    const maxGForce = 4.0;

    const speedPercentage = Math.min((speed / maxSpeed) * 100, 100);
    const rpmPercentage = Math.min((rpm / maxRpm) * 100, 100);
    const gForcePercentage = Math.min((Math.abs(gForce) / maxGForce) * 100, 100);

    // SVG parameters
    const strokeDasharray = 251.2; // 2 * pi * 40
    const speedDashoffset = strokeDasharray - (strokeDasharray * speedPercentage) / 100;
    const rpmDashoffset = strokeDasharray - (strokeDasharray * rpmPercentage) / 100;
    const gForceDashoffset = strokeDasharray - (strokeDasharray * gForcePercentage) / 100;

    return (
        <div className="flex justify-center items-center gap-6 mt-2 pb-2">
            {/* RPM Gauge */}
            <div className="relative flex flex-col items-center">
                <svg width="80" height="80" className="rotate-[-90deg]">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                    <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="6"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={rpmDashoffset}
                        className="transition-all duration-300 ease-linear"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                    <Activity size={14} className="text-gray-400 mb-0.5" />
                    <span className="text-xs font-bold leading-none">{Math.round(rpm)}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-medium mt-1 uppercase">RPM</span>
            </div>

            {/* Speed Gauge (Center, Larger) */}
            <div className="relative flex flex-col items-center">
                <svg width="100" height="100" className="rotate-[-90deg]">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="8"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={speedDashoffset}
                        className="transition-all duration-300 ease-linear"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                    <Gauge size={16} className="text-gray-400 mb-0.5" />
                    <span className="text-lg font-bold leading-none text-blue-700">
                        {speed.toFixed(0)}
                    </span>
                </div>
                <span className="text-xs text-blue-600 font-bold mt-1 uppercase">km/h</span>
            </div>

            {/* G-Force Gauge */}
            <div className="relative flex flex-col items-center">
                <svg width="80" height="80" className="rotate-[-90deg]">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                    <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke={Math.abs(gForce) > 2.0 ? "#ef4444" : "#f59e0b"}
                        strokeWidth="6"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={gForceDashoffset}
                        className="transition-all duration-300 ease-linear"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                    <Compass size={14} className="text-gray-400 mb-0.5" />
                    <span
                        className={`text-xs font-bold leading-none ${Math.abs(gForce) > 2.0 ? "text-red-600" : ""}`}
                    >
                        {gForce.toFixed(2)}
                    </span>
                </div>
                <span className="text-[10px] text-gray-500 font-medium mt-1 uppercase">G-Force</span>
            </div>
        </div>
    );
}
