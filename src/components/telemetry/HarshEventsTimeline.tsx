'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Octagon, CornerUpRight, MoveDown, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TelemetryRecord } from '@/types/api';

interface HarshEventsTimelineProps {
    data: TelemetryRecord[];
    /** When user clicks an event, focus heatmap on this point and show marker */
    onEventClick?: (record: TelemetryRecord | null) => void;
}

export const HarshEventsTimeline: React.FC<HarshEventsTimelineProps> = ({ data, onEventClick }) => {
    const events = data
        .filter((r) => (r.hbk ?? 0) > 0 || (r.hac ?? 0) > 0 || (r.hco ?? 0) > 0 || (r.pot ?? 0) > 0)
        .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));

    const getEventIcon = (record: TelemetryRecord) => {
        if ((record.hbk ?? 0) > 0) return <Octagon className="w-5 h-5 text-red-600" />;
        if ((record.hac ?? 0) > 0) return <MoveDown className="w-5 h-5 text-orange-600" />;
        if ((record.hco ?? 0) > 0) return <CornerUpRight className="w-5 h-5 text-yellow-600" />;
        if ((record.pot ?? 0) > 0) return <AlertCircle className="w-5 h-5 text-purple-600" />;
        return null;
    };

    const getEventLabel = (record: TelemetryRecord) => {
        const parts: string[] = [];
        if ((record.hbk ?? 0) > 0) parts.push(`${record.hbk} Harsh Brake(s)`);
        if ((record.hac ?? 0) > 0) parts.push(`${record.hac} Harsh Accel(s)`);
        if ((record.hco ?? 0) > 0) parts.push(`${record.hco} Hard Corner(s)`);
        if ((record.pot ?? 0) > 0) parts.push(`${record.pot} Pothole Impact(s)`);
        return parts.join(', ');
    };

    const formatTime = (record: TelemetryRecord) => {
        const ts_raw = record.ts ?? 0;
        const ts_ms = ts_raw < 1e12 ? ts_raw * 1000 : ts_raw;

        if (record.ts_server) {
            try {
                const d = new Date(record.ts_server);
                return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            } catch {
                return `t+${Math.floor(ts_ms / 1000)}s`;
            }
        }
        
        const d = new Date(ts_ms);
        // If it looks like a real date (post-2000), show the time
        if (d.getFullYear() > 2000) {
            return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        
        return `t+${Math.floor(ts_ms / 1000)}s`;
    };

    const hasLocation = (r: TelemetryRecord) => r.lat != null && r.lon != null;

    return (
        <Card className="w-full h-[400px] flex flex-col">
            <CardHeader className="shrink-0">
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    Harsh Event Timeline
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
                {events.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 italic">
                        No harsh events detected in this session.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.map((event, index) => (
                            <motion.div
                                key={`${event.ts}-${index}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                role="button"
                                tabIndex={0}
                                onClick={() => onEventClick?.(hasLocation(event) ? event : null)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') onEventClick?.(hasLocation(event) ? event : null);
                                }}
                                className={`flex items-center gap-4 p-3 rounded-lg border bg-gray-50 hover:bg-white transition-colors ${onEventClick && hasLocation(event) ? 'cursor-pointer hover:border-teal-300 hover:shadow-sm' : ''}`}
                            >
                                <div className="text-sm font-mono text-gray-600 shrink-0 w-20">
                                    {formatTime(event)}
                                </div>
                                <div className="p-2 bg-white rounded-full shadow-sm border shrink-0">
                                    {getEventIcon(event)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900">{getEventLabel(event)}</p>
                                    <p className="text-xs text-gray-500">
                                        Peak Force: {(event.ptg ?? 0).toFixed(2)}g
                                        {(event.spd ?? 0) > 0 && ` · ${(event.spd ?? 0).toFixed(0)} km/h`}
                                    </p>
                                    {hasLocation(event) && (
                                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {event.lat!.toFixed(5)}, {event.lon!.toFixed(5)}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
