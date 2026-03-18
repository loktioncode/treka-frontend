"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Map, {
    Source,
    Layer,
    NavigationControl,
    FullscreenControl,
    Popup,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapRef } from "react-map-gl/mapbox";
import { TelemetryRecord } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

/** Serializable slice of a telemetry record for popup display */
export interface HeatmapPointRecord {
    lat: number;
    lon: number;
    ts?: number;
    ptg?: number;
    plg?: number;
    plag?: number;
    thr?: number;
    rpm?: number;
    spd?: number;
    oa_g?: number;
    lod?: number;
    vlt?: number;
    tmp?: number;
    vib?: number;
    hbk?: number;
    hac?: number;
    hco?: number;
    pot?: number;
}

interface TelemetryHeatmapProps {
    data: TelemetryRecord[];
    metric?: "vib" | "pot" | "ptg" | "plg" | "spd";
    title?: string;
    description?: string;
    height?: string;
    /** Initial map center. Defaults to Johannesburg. */
    initialCenter?: { lat: number; lon: number };
    /** When set (e.g. from Harsh Event timeline click), focus map on this point and show popup */
    selectedEvent?: TelemetryRecord | null;
    /** Called when user closes the popup (clear timeline selection in parent) */
    onClosePopup?: () => void;
}

function getBbox(features: { geometry: { coordinates: [number, number] } }[]): [[number, number], [number, number]] | null {
    if (features.length === 0) return null;
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const f of features) {
        const [lon, lat] = f.geometry.coordinates;
        minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    }
    if (minLon === maxLon && minLat === maxLat) return null;
    const pad = 0.001;
    return [[minLon - pad, minLat - pad], [maxLon + pad, maxLat + pad]];
}

const JOHANNESBURG = { lat: -26.2041, lon: 28.0473 };

export const TelemetryHeatmap: React.FC<TelemetryHeatmapProps> = ({
    data,
    metric = "vib",
    title = "Telemetry Heatmap",
    description,
    height = "400px",
    initialCenter = JOHANNESBURG,
    selectedEvent = null,
    onClosePopup,
}) => {
    const mapRef = useRef<MapRef>(null);
    const [viewState, setViewState] = useState({
        latitude: initialCenter.lat,
        longitude: initialCenter.lon,
        zoom: 12,
    });
    const [popupFeature, setPopupFeature] = useState<HeatmapPointRecord | null>(null);

    const filteredData = useMemo(
        () => data.filter((d) => d.lat != null && d.lon != null && d[metric] != null && Number(d[metric]) > 0),
        [data, metric],
    );

    const geoJsonData = useMemo(() => {
        return {
            type: "FeatureCollection" as const,
            features: filteredData.map((d) => ({
                type: "Feature" as const,
                geometry: {
                    type: "Point" as const,
                    coordinates: [d.lon as number, d.lat as number] as [number, number],
                },
                properties: {
                    mag: Number(d[metric]) || 0,
                    lat: d.lat,
                    lon: d.lon,
                    ts: d.ts,
                    ptg: d.ptg,
                    plg: d.plg,
                    plag: d.plag,
                    thr: d.thr,
                    rpm: d.rpm,
                    spd: d.spd,
                    oa_g: d.oa_g,
                    lod: d.lod,
                    vlt: d.vlt,
                    tmp: d.tmp,
                    vib: d.vib,
                    hbk: d.hbk,
                    hac: d.hac,
                    hco: d.hco,
                    pot: d.pot,
                } as HeatmapPointRecord & { mag: number },
            })),
        };
    }, [filteredData, metric]);

    const fitBoundsToPoints = useCallback(() => {
        const map = mapRef.current?.getMap?.();
        if (!map || geoJsonData.features.length === 0) return;
        const bbox = getBbox(geoJsonData.features);
        if (bbox) map.fitBounds(bbox, { padding: 60, maxZoom: 14, duration: 800 });
    }, [geoJsonData.features]);

    useEffect(() => {
        if (geoJsonData.features.length === 0) return;
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        const bbox = getBbox(geoJsonData.features);
        if (bbox) map.fitBounds(bbox, { padding: 60, maxZoom: 14, duration: 600 });
    }, [geoJsonData.features.length]);

    useEffect(() => {
        if (!selectedEvent || selectedEvent.lat == null || selectedEvent.lon == null) {
            if (selectedEvent === null) setPopupFeature(null);
            return;
        }
        const rec: HeatmapPointRecord = {
            lat: selectedEvent.lat,
            lon: selectedEvent.lon,
            ts: selectedEvent.ts,
            ptg: selectedEvent.ptg,
            plg: selectedEvent.plg,
            plag: selectedEvent.plag,
            thr: selectedEvent.thr,
            rpm: selectedEvent.rpm,
            spd: selectedEvent.spd,
            oa_g: selectedEvent.oa_g,
            lod: selectedEvent.lod,
            vlt: selectedEvent.vlt,
            tmp: selectedEvent.tmp,
            vib: selectedEvent.vib,
            hbk: selectedEvent.hbk,
            hac: selectedEvent.hac,
            hco: selectedEvent.hco,
            pot: selectedEvent.pot,
        };
        setPopupFeature(rec);
        const map = mapRef.current?.getMap?.();
        if (map) {
            map.flyTo({
                center: [selectedEvent.lon, selectedEvent.lat],
                zoom: 16,
                duration: 800,
            });
        }
    }, [selectedEvent]);

    const handleMapLoad = useCallback(() => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        if (geoJsonData.features.length > 0) {
            const bbox = getBbox(geoJsonData.features);
            if (bbox) map.fitBounds(bbox, { padding: 60, maxZoom: 14 });
        }
        map.on("click", "telemetry-points", (e) => {
            const feat = e.features?.[0];
            if (feat?.properties) {
                const p = feat.properties as unknown as HeatmapPointRecord & { mag: number };
                setPopupFeature({
                    lat: p.lat,
                    lon: p.lon,
                    ts: p.ts,
                    ptg: p.ptg,
                    plg: p.plg,
                    plag: p.plag,
                    thr: p.thr,
                    rpm: p.rpm,
                    spd: p.spd,
                    oa_g: p.oa_g,
                    lod: p.lod,
                    vlt: p.vlt,
                    tmp: p.tmp,
                    vib: p.vib,
                    hbk: p.hbk,
                    hac: p.hac,
                    hco: p.hco,
                    pot: p.pot,
                });
            }
        });
        map.getCanvas().style.cursor = "default";
        map.on("mouseenter", "telemetry-points", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "telemetry-points", () => { map.getCanvas().style.cursor = "default"; });
    }, [geoJsonData.features]);

    const getHeatmapLayer = (): any => {
        let maxMag = 1;
        if (metric === "vib") maxMag = 0.1;
        else if (metric === "ptg") maxMag = 3.0;
        else if (metric === "spd") maxMag = 120;
        else if (metric === "pot") maxMag = 5;

        return {
            id: "telemetry-heatmap",
            type: "heatmap",
            paint: {
                "heatmap-weight": ["interpolate", ["linear"], ["get", "mag"], 0, 0, maxMag, 1],
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 11, 1, 15, 3],
                "heatmap-color": [
                    "interpolate", ["linear"], ["heatmap-density"],
                    0, "rgba(33,102,172,0)",
                    0.2, "rgb(103,169,207)",
                    0.4, "rgb(209,229,240)",
                    0.6, "rgb(253,219,199)",
                    0.8, "rgb(239,138,98)",
                    1, "rgb(178,24,43)",
                ],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 11, 15, 15, 30],
                "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.8, 15, 0],
            },
        };
    };

    const getPointLayer = (): any => ({
        id: "telemetry-points",
        type: "circle",
        paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 3, 16, 8],
            "circle-color": "rgba(239,68,68,0.9)",
            "circle-stroke-color": "white",
            "circle-stroke-width": 2,
            "circle-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, 1],
        },
    });

    const displayRecord = popupFeature ?? (selectedEvent?.lat != null ? {
        lat: selectedEvent.lat,
        lon: selectedEvent.lon,
        ts: selectedEvent.ts,
        ptg: selectedEvent.ptg,
        plg: selectedEvent.plg,
        plag: selectedEvent.plag,
        thr: selectedEvent.thr,
        rpm: selectedEvent.rpm,
        spd: selectedEvent.spd,
        oa_g: selectedEvent.oa_g,
        lod: selectedEvent.lod,
        vlt: selectedEvent.vlt,
        tmp: selectedEvent.tmp,
        vib: selectedEvent.vib,
        hbk: selectedEvent.hbk,
        hac: selectedEvent.hac,
        hco: selectedEvent.hco,
        pot: selectedEvent.pot,
    } as HeatmapPointRecord : null);

    if (!MAPBOX_TOKEN) {
        return (
            <Card className="w-full h-full">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center" style={{ height }}>
                    <MapPin className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">Mapbox Token Missing</h3>
                    <p className="text-sm text-gray-500 max-w-md mt-2">
                        Please set <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in your environment variables.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const metricLabels: Record<string, string> = {
        vib: "Vibration Intensity (Road Quality)",
        pot: "Pothole Count",
        ptg: "Total Impact G-Force",
        plg: "Longitudinal Impact G (Braking/Acceleration)",
        spd: "Vehicle Speed Heatmap",
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>
                        {description || metricLabels[metric] || "Heatmap Visualization"}
                    </CardDescription>
                </div>
                {geoJsonData.features.length > 0 && (
                    <button
                        type="button"
                        onClick={fitBoundsToPoints}
                        className="text-xs font-medium text-teal-600 hover:text-teal-700 border border-teal-200 rounded-md px-2 py-1"
                    >
                        Fit to points
                    </button>
                )}
            </CardHeader>
            <CardContent>
                <div className="relative w-full rounded-xl overflow-hidden shadow-sm border border-gray-200" style={{ height }}>
                    {geoJsonData.features.length === 0 && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
                            <span className="text-gray-500 font-medium bg-white px-4 py-2 rounded-lg shadow-sm">
                                No reliable geo-data found for {metric} in this timeframe.
                            </span>
                        </div>
                    )}

                    <Map
                        ref={mapRef}
                        {...viewState}
                        onMove={(evt) => setViewState(evt.viewState)}
                        onLoad={handleMapLoad}
                        mapStyle="mapbox://styles/mapbox/dark-v11"
                        mapboxAccessToken={MAPBOX_TOKEN}
                        style={{ width: "100%", height: "100%" }}
                        reuseMaps
                    >
                        <NavigationControl position="bottom-right" />
                        <FullscreenControl position="bottom-right" />

                        <Source id="telemetry-data" type="geojson" data={geoJsonData}>
                            <Layer {...getHeatmapLayer()} />
                            <Layer {...getPointLayer()} />
                        </Source>

                        {displayRecord && (
                            <Popup
                                latitude={displayRecord.lat}
                                longitude={displayRecord.lon}
                                anchor="bottom"
                                offset={16}
                                onClose={() => {
                                    setPopupFeature(null);
                                    onClosePopup?.();
                                }}
                                closeButton
                                closeOnClick={false}
                            >
                                <div className="min-w-[220px] max-w-[280px] p-2 text-left">
                                    <div className="text-xs text-gray-500 mb-2">
                                        {displayRecord.ts != null && (
                                            <span>{(() => {
                                                const t = displayRecord.ts ?? 0;
                                                const ts_ms = t < 1e12 ? t * 1000 : t;
                                                const d = new Date(ts_ms);
                                                if (d.getFullYear() > 2000) {
                                                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                                }
                                                return `t+${Math.floor(ts_ms / 1000)}s`;
                                            })()}</span>
                                        )}
                                        {displayRecord.lat != null && displayRecord.lon != null && (
                                            <span className="ml-2">
                                                {displayRecord.lat.toFixed(5)}, {displayRecord.lon.toFixed(5)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                        {displayRecord.ptg != null && (
                                            <><span className="text-gray-500">G-force (ptg)</span><span className="font-semibold">{displayRecord.ptg.toFixed(2)}g</span></>
                                        )}
                                        {displayRecord.plg != null && (
                                            <><span className="text-gray-500">Long. G (plg)</span><span>{displayRecord.plg.toFixed(2)}g</span></>
                                        )}
                                        {displayRecord.plag != null && (
                                            <><span className="text-gray-500">Lat. G (plag)</span><span>{displayRecord.plag.toFixed(2)}g</span></>
                                        )}
                                        {displayRecord.thr != null && (
                                            <><span className="text-gray-500">Throttle</span><span>{displayRecord.thr.toFixed(0)}%</span></>
                                        )}
                                        {displayRecord.rpm != null && (
                                            <><span className="text-gray-500">RPM</span><span>{displayRecord.rpm}</span></>
                                        )}
                                        {displayRecord.spd != null && (
                                            <><span className="text-gray-500">Speed</span><span>{displayRecord.spd.toFixed(0)} km/h</span></>
                                        )}
                                        {displayRecord.oa_g != null && (
                                            <><span className="text-gray-500">Accel (oa_g)</span><span>{displayRecord.oa_g.toFixed(2)}g</span></>
                                        )}
                                        {displayRecord.lod != null && (
                                            <><span className="text-gray-500">Engine load</span><span>{displayRecord.lod.toFixed(0)}%</span></>
                                        )}
                                        {displayRecord.vlt != null && (
                                            <><span className="text-gray-500">Voltage</span><span>{displayRecord.vlt.toFixed(1)}V</span></>
                                        )}
                                        {displayRecord.tmp != null && (
                                            <><span className="text-gray-500">Coolant</span><span>{displayRecord.tmp.toFixed(0)}°C</span></>
                                        )}
                                        {displayRecord.vib != null && (
                                            <><span className="text-gray-500">Vibration</span><span>{displayRecord.vib.toFixed(3)}g</span></>
                                        )}
                                        {(displayRecord.hbk ?? 0) > 0 && (
                                            <><span className="text-gray-500">Harsh brake</span><span className="text-red-600">{displayRecord.hbk}</span></>
                                        )}
                                        {(displayRecord.hac ?? 0) > 0 && (
                                            <><span className="text-gray-500">Harsh accel</span><span className="text-orange-600">{displayRecord.hac}</span></>
                                        )}
                                        {(displayRecord.hco ?? 0) > 0 && (
                                            <><span className="text-gray-500">Hard corner</span><span className="text-yellow-600">{displayRecord.hco}</span></>
                                        )}
                                        {(displayRecord.pot ?? 0) > 0 && (
                                            <><span className="text-gray-500">Pothole</span><span className="text-purple-600">{displayRecord.pot}</span></>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        )}
                    </Map>
                </div>
            </CardContent>
        </Card>
    );
};
