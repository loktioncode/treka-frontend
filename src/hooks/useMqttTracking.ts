import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TelemetryRecord } from '@/types/api';
import toast from 'react-hot-toast';
import mqtt from 'mqtt';
import { useAssets } from '@/hooks/useAssets';
import { telemetryAPI, type Asset } from '@/services/api';

interface TrackingMessage {
    type?: 'telemetry' | 'incident' | 'geofence';
    device_id: string;
    records?: TelemetryRecord[]; // Sometimes sent as batch
    record?: TelemetryRecord; // Or single record from ESP32
    event?: string;
    geofence_name?: string;
    severity?: string;
    incident_type?: string;
    g_force?: number;
    // Added IMU fields for telemetry
    ia_tot?: number; // Total IMU Accel G
    vib?: number; // Vibration RMS
    rol?: number; // Roll
    pit?: number; // Pitch
}

/** Flespi telemetry entry: { ts, value } */
interface FlespiTelemetryEntry {
    ts: number;
    value: unknown;
}

/** Position value from flespi/state/gw/devices/{id}/telemetry/position (or inside telemetry.position) */
interface FlespiPositionValue {
    altitude?: number;
    direction?: number;
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    lon?: number;
    satellites?: number;
    speed?: number;
    ts?: number;
    timestamp?: number;
}

/** Payload from topic flespi/state/gw/devices/{id}/telemetry/position */
interface FlespiStatePayload {
    result?: Array<{
        id: number;
        telemetry?: Record<string, FlespiTelemetryEntry>;
    }>;
}

export interface LiveVehicle {
    device_id: string;
    last_record: TelemetryRecord;
    last_update: string;
    status: 'online' | 'offline';
}

const MAX_TRAIL_POINTS = 500;

/** Consider device offline if no data received in this many minutes */
export const LIVE_STALE_MINUTES = 5;
const LIVE_STALE_MS = LIVE_STALE_MINUTES * 60 * 1000;

/** Flespi MQTT config (Teltonika devices) */
const FLESPI_BROKER_URL = process.env.NEXT_PUBLIC_MQTT_FLESPI_URL || 'wss://mqtt.flespi.io';
const FLESPI_USERNAME = process.env.NEXT_PUBLIC_MQTT_FLESPI_USERNAME || 'FlespiToken ePTrtxhEDcdAZLHSAdp0yU0qs8MLEYNXo9gUU1q0EJmEN52l8axWMU2zoysxWef2';
const FLESPI_PASSWORD = process.env.NEXT_PUBLIC_MQTT_FLESPI_PASSWORD || '';
const FLESPI_CLIENT_ID_BASE = process.env.NEXT_PUBLIC_MQTT_FLESPI_CLIENT_ID || 'trekaman_flespi';

/** Unique clientId per tab/session so multiple tabs don't kick each other off the broker */
function uniqueClientId(base: string): string {
    if (typeof window === 'undefined') return base;
    return `${base}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const MQTT_KEEPALIVE_S = 60;
const MQTT_RECONNECT_MS = 5000;
const MQTT_CONNECT_TIMEOUT_MS = 30000;

const LAST_POS_STORAGE_KEY = 'trekaman:last_known_positions:v1';

function readLastPositions(): Record<string, { lat: number; lon: number; ts?: number }> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(LAST_POS_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed as Record<string, { lat: number; lon: number; ts?: number }>;
    } catch {
        return {};
    }
}

function writeLastPositions(next: Record<string, { lat: number; lon: number; ts?: number }>) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LAST_POS_STORAGE_KEY, JSON.stringify(next));
    } catch {
        // ignore storage errors
    }
}

function asFiniteNumber(v: unknown): number | undefined {
    if (v === null || v === undefined) return undefined;
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : undefined;
}

function extractLatLon(input: unknown): { lat?: number; lon?: number } {
    const obj = (input && typeof input === 'object') ? (input as Record<string, unknown>) : {};
    const position = (obj.position && typeof obj.position === 'object') ? (obj.position as Record<string, unknown>) : undefined;
    const gps = (obj.gps && typeof obj.gps === 'object') ? (obj.gps as Record<string, unknown>) : undefined;
    const lat =
        asFiniteNumber(obj.lat) ??
        asFiniteNumber(obj.latitude) ??
        asFiniteNumber(obj.gps_lat) ??
        asFiniteNumber(obj.gpsLat) ??
        (position ? (asFiniteNumber(position.lat) ?? asFiniteNumber(position.latitude)) : undefined) ??
        (gps ? (asFiniteNumber(gps.lat) ?? asFiniteNumber(gps.latitude)) : undefined);
    const lon =
        asFiniteNumber(obj.lon) ??
        asFiniteNumber(obj.lng) ??
        asFiniteNumber(obj.longitude) ??
        asFiniteNumber(obj.long) ??
        asFiniteNumber(obj.gps_lon) ??
        asFiniteNumber(obj.gpsLon) ??
        (position ? (asFiniteNumber(position.lon) ?? asFiniteNumber(position.lng) ?? asFiniteNumber(position.longitude) ?? asFiniteNumber(position.long)) : undefined) ??
        (gps ? (asFiniteNumber(gps.lon) ?? asFiniteNumber(gps.lng) ?? asFiniteNumber(gps.longitude) ?? asFiniteNumber(gps.long)) : undefined);
    return { lat, lon };
}

function normalizeTelemetryRecord(input: TelemetryRecord): TelemetryRecord {
    const raw = input as unknown as Record<string, unknown>;
    const { lat, lon } = extractLatLon(raw);
    return {
        ...input,
        lat: input.lat ?? lat,
        lon: input.lon ?? lon,
    };
}

/** Approximate distance in km between two lat/lon points (Haversine-style). */
function distanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/** Extract numeric value from a Flespi telemetry entry. */
function flespiNum(t: FlespiTelemetryEntry | undefined): number | undefined {
    if (t?.value === undefined || t?.value === null) return undefined;
    const v = Number(t.value);
    return Number.isFinite(v) ? v : undefined;
}

/** Map Flespi result[0].telemetry to our TelemetryRecord (only relevant fields). */
function flespiTelemetryToRecord(
    deviceId: string,
    telemetry: Record<string, FlespiTelemetryEntry> | undefined
): TelemetryRecord | null {
    if (!telemetry) return null;
    const rawPos = telemetry['position']?.value as unknown;
    // Flespi "position" value is usually an object, but some gateways may send it as a stringified JSON.
    const pos = (() => {
        if (!rawPos) return undefined;
        if (typeof rawPos === 'string') {
            const s = rawPos.trim();
            // Try JSON first
            try {
                const parsed = JSON.parse(s) as unknown;
                if (parsed && typeof parsed === 'object') return parsed as FlespiPositionValue;
            } catch {
                // Try "lat,lon" fallback
                const parts = s.split(',').map((p) => p.trim());
                if (parts.length >= 2) {
                    const lat = asFiniteNumber(parts[0]);
                    const lon = asFiniteNumber(parts[1]);
                    if (lat != null || lon != null) return { lat, lon } as FlespiPositionValue;
                }
            }
            return undefined;
        }
        if (rawPos && typeof rawPos === 'object') return rawPos as FlespiPositionValue;
        return undefined;
    })();
    const tsEntry = telemetry['timestamp'] ?? telemetry['position'];
    const posTs = pos?.ts ?? pos?.timestamp;
    const ts = typeof tsEntry?.value === 'number' ? tsEntry.value : (typeof posTs === 'number' ? posTs : Math.floor(Date.now() / 1000));
    const spd = flespiNum(telemetry['can.vehicle.speed']) ?? pos?.speed;
    const rpm = flespiNum(telemetry['can.engine.rpm']);
    const vlt = flespiNum(telemetry['external.powersource.voltage']) ?? flespiNum(telemetry['battery.voltage']);
    const tmp = flespiNum(telemetry['can.engine.coolant.temperature']);
    // IMPORTANT: vehicle.mileage from Flespi is distance since device connected/session (not true odometer).
    // Only treat can.vehicle.mileage as odometer.
    const odo = flespiNum(telemetry['can.vehicle.mileage']);
    const mil = flespiNum(telemetry['can.mil.mileage']);
    const fuelLevel = flespiNum(telemetry['can.fuel.level']);
    const fuelVol = fuelLevel == null ? flespiNum(telemetry['can.fuel.volume']) : undefined;
    const fl = fuelLevel ?? fuelVol;
    const fuel_unit: TelemetryRecord['fuel_unit'] =
        fuelLevel != null ? 'percent' : fuelVol != null ? 'l' : undefined;
    const lod = flespiNum(telemetry['can.engine.load.level']);
    // Flespi sends last position on telemetry/position with latitude/longitude (and sometimes lat/lng/lon).
    // Some integrations use alternate keys, so we fall back to generic extraction too.
    const extractedFromPos = extractLatLon(pos);
    const extractedFromTelemetry = extractLatLon(
        Object.fromEntries(
            Object.entries(telemetry).map(([k, v]) => [k, (v as FlespiTelemetryEntry | undefined)?.value])
        )
    );
    const lat =
        pos?.latitude ??
        pos?.lat ??
        extractedFromPos.lat ??
        flespiNum(telemetry['position.latitude']) ??
        flespiNum(telemetry['position.lat']) ??
        flespiNum(telemetry['positionLatitude']) ??
        extractedFromTelemetry.lat;
    const lon =
        pos?.longitude ??
        pos?.lng ??
        pos?.lon ??
        extractedFromPos.lon ??
        flespiNum(telemetry['position.longitude']) ??
        flespiNum(telemetry['position.lon']) ??
        flespiNum(telemetry['position.lng']) ??
        flespiNum(telemetry['positionLongitude']) ??
        extractedFromTelemetry.lon;
    const movValue = telemetry['movement.status']?.value;
    const mov = movValue !== undefined ? Boolean(movValue) : undefined;
    const ignitionValue = telemetry['engine.ignition.status']?.value ?? telemetry['can.engine.ignition']?.value ?? telemetry['can.engine.ignition.status']?.value;
    const ignition = ignitionValue !== undefined ? Boolean(ignitionValue) : undefined;

    const extras: TelemetryRecord['extras'] = Object.fromEntries(
        Object.entries(telemetry).map(([k, v]) => [k, (v as FlespiTelemetryEntry | undefined)?.value])
    );

    if (lat == null && lon == null && spd == null && rpm == null && mov == null && tmp == null && ignition == null && odo == null && mil == null && fl == null) return null;
    return {
        ts: Math.floor(ts),
        ts_server: new Date(ts * 1000).toISOString(),
        lat,
        lon,
        alt: pos?.altitude ?? flespiNum(telemetry['position.altitude']),
        hdg: pos?.direction ?? flespiNum(telemetry['position.direction']),
        cog: pos?.direction,
        nsat: pos?.satellites ?? flespiNum(telemetry['position.satellites']),
        spd,
        rpm,
        vlt,
        tmp,
        fl,
        fuel_unit,
        lod,
        odo,
        mil,
        extras,
        mov,
        ignition,
    };
}

export function useMqttTracking(deviceId?: string, mqttProvider?: 'custom' | 'teltonika', enabled: boolean = true) {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState<Record<string, LiveVehicle>>({});
    const [trailState, setTrailState] = useState<{
        trails: Record<string, TelemetryRecord[]>;
        completedTrails: Record<string, TelemetryRecord[]>;
    }>({ trails: {}, completedTrails: {} });
    const [isConnected, setIsConnected] = useState(false);

    const trails = trailState.trails;
    const completedTrails = trailState.completedTrails;
    const clientRef = useRef<mqtt.MqttClient | null>(null);
    const flespiClientRef = useRef<mqtt.MqttClient | null>(null);
    const activeRef = useRef(true);
    const connectedCountRef = useRef({ hive: 0, flespi: 0 });
    /** Ref holds latest trail per device so rapid MQTT messages always append (prev fixes path not drawing) */
    const trailByDeviceRef = useRef<Record<string, TelemetryRecord[]>>({});
    /**
     * Flespi telemetry/+ publishes one parameter per message.
     * We accumulate latest values per device so we can build a complete TelemetryRecord when needed.
     */
    const flespiTelemetryCacheRef = useRef<Record<string, Record<string, FlespiTelemetryEntry>>>({});

    // When showing all vehicles, get assets to know which device IDs are assigned to user's vehicles (custom + Teltonika)
    const { data: assets = [], isLoading: assetsLoading } = useAssets({ asset_type: 'vehicle' });
    const allowedDeviceIdsRef = useRef<Set<string>>(new Set());
    const persistedPositionsRef = useRef<Record<string, { lat: number; lon: number; ts?: number }>>({});

    useEffect(() => {
        persistedPositionsRef.current = readLastPositions();
    }, []);

    // All devices assigned to user's vehicles (both custom/HiveMQ and Teltonika/Flespi) — fleet map shows these only
    const allowedDeviceIds = useMemo((): Set<string> => {
        if (deviceId) return new Set<string>();
        return new Set(
            assets
                .filter((a: Asset) => a.vehicle_details?.device_id)
                .map((a: Asset) => String(a.vehicle_details!.device_id!))
        );
    }, [assets, deviceId]);

    useEffect(() => {
        if (deviceId) {
            allowedDeviceIdsRef.current = new Set<string>();
        } else {
            allowedDeviceIdsRef.current = new Set<string>(allowedDeviceIds);
        }
    }, [deviceId, allowedDeviceIds]);

    // Fetch initial last-known positions so idle vehicles appear immediately
    useEffect(() => {
        if (!user || assetsLoading || !enabled) return;
        let mounted = true;

        const devicesToFetch: string[] = deviceId
            ? [deviceId]
            : assets
                .filter((a: Asset) => a.vehicle_details?.device_id)
                .map((a: Asset) => a.vehicle_details!.device_id!);

        if (devicesToFetch.length === 0) return;

        Promise.allSettled(
            devicesToFetch.map(did => telemetryAPI.getLatestTelemetry(did).catch(() => null))
        ).then((results) => {
            if (!mounted) return;
            setVehicles((prev) => {
                const updated = { ...prev };
                let changed = false;
                results.forEach((res, i) => {
                    const did = devicesToFetch[i];
                    if (!updated[did]) { // Only add if MQTT hasn't already provided a live update
                        if (res.status === 'fulfilled' && res.value?.record) {
                            const record = normalizeTelemetryRecord(res.value.record);
                            updated[did] = {
                                device_id: did,
                                last_record: {
                                    ...record,
                                    lon: record.lon
                                },
                                last_update: record.ts_server || new Date((record.ts || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
                                status: 'offline'
                            };
                            changed = true;
                        } else {
                                const persisted = persistedPositionsRef.current[did];
                            // Dummy record so it shows up in the sidebar list even if it has no telemetry yet
                            updated[did] = {
                                device_id: did,
                                    last_record: {
                                        ts: Math.floor(Date.now() / 1000),
                                        spd: 0,
                                        lat: persisted?.lat,
                                        lon: persisted?.lon,
                                    },
                                last_update: new Date().toISOString(),
                                status: 'offline'
                            };
                            changed = true;
                        }
                    }
                });
                return changed ? updated : prev;
            });
        });

        return () => { mounted = false; };
    }, [assets, assetsLoading, deviceId, user, enabled]);

    const applyFlespiPosition = useCallback((flespiDeviceId: string, record: TelemetryRecord) => {
        record = normalizeTelemetryRecord(record);
        if (record.lat != null && record.lon != null) {
            const prev = persistedPositionsRef.current;
            const ts = record.ts ?? Math.floor(Date.now() / 1000);
            const next = { ...prev, [flespiDeviceId]: { lat: record.lat, lon: record.lon, ts } };
            persistedPositionsRef.current = next;
            writeLastPositions(next);
        }
        const dataTime = record.ts_server || (record.ts != null ? new Date(record.ts * 1000).toISOString() : new Date().toISOString());
        setVehicles((prev) => {
            const existing = prev[flespiDeviceId]?.last_record;
            const lastRecord: TelemetryRecord = {
                ...record,
                lat: record.lat ?? existing?.lat,
                lon: record.lon ?? existing?.lon,
                alt: record.alt ?? existing?.alt,
                hdg: record.hdg ?? existing?.hdg,
                cog: record.cog ?? existing?.cog,
            };
            return {
                ...prev,
                [flespiDeviceId]: {
                    device_id: flespiDeviceId,
                    last_record: lastRecord,
                    last_update: dataTime,
                    status: 'online',
                },
            };
        });
        if (record.lat != null && record.lon != null) {
            setTrailState((prev) => {
                const list = trailByDeviceRef.current[flespiDeviceId] ?? prev.trails[flespiDeviceId] ?? [];
                const toAdd = [record];
                const last = list[list.length - 1];
                const firstNew = toAdd[0];
                const lastLon = last?.lon;
                const firstLon = firstNew.lon;
                const isJump =
                    last &&
                    firstNew.lat != null &&
                    firstLon != null &&
                    last.lat != null &&
                    lastLon != null &&
                    distanceKm(last.lat, lastLon as number, firstNew.lat, firstLon as number) > 15;
                const nextTrail = isJump ? toAdd : [...list, ...toAdd];
                const capped = nextTrail.slice(-MAX_TRAIL_POINTS);
                trailByDeviceRef.current[flespiDeviceId] = capped;
                const newCompleted =
                    isJump && list.length >= 2
                        ? { ...prev.completedTrails, [flespiDeviceId]: list }
                        : (() => {
                            const c = { ...prev.completedTrails };
                            delete c[flespiDeviceId];
                            return c;
                        })();
                return {
                    trails: { ...prev.trails, [flespiDeviceId]: capped },
                    completedTrails: newCompleted,
                };
            });
        }
    }, []);

    // If MQTT messages arrive before assets load, we may drop updates due to allowedDeviceIds filtering.
    // Re-apply any cached Flespi telemetry once allowed IDs become known so markers still appear.
    useEffect(() => {
        if (deviceId || !enabled) return;
        if (allowedDeviceIds.size === 0) return;
        for (const did of allowedDeviceIds) {
            const cache = flespiTelemetryCacheRef.current[did];
            if (!cache) continue;
            const record = flespiTelemetryToRecord(did, cache);
            if (record) applyFlespiPosition(did, record);
        }
    }, [allowedDeviceIds, deviceId, applyFlespiPosition, enabled]);

    const connect = useCallback(() => {
        if (!user || !enabled) return;

        // Always connect to both brokers so we have real-time data from Hive (custom) and Flespi (Teltonika)
        const updateConnected = () => {
            if (activeRef.current) {
                const { hive, flespi } = connectedCountRef.current;
                setIsConnected(hive > 0 || flespi > 0);
            }
        };

        // —— HiveMQ (custom devices) ——
        {
            const envUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || '';
            const defaultWss = 'wss://broker.hivemq.com:8884/mqtt';
            let brokerUrl = envUrl || defaultWss;
            if (brokerUrl.startsWith('mqtt://')) {
                console.warn('MQTT: mqtt:// does not work in browser. Using WebSocket fallback.');
                brokerUrl = defaultWss;
            }
            const options: mqtt.IClientOptions = {
                clientId: uniqueClientId(process.env.NEXT_PUBLIC_MQTT_CLIENT_ID || 'trekaman_hive'),
                clean: true,
                reconnectPeriod: MQTT_RECONNECT_MS,
                keepalive: MQTT_KEEPALIVE_S,
                connectTimeout: MQTT_CONNECT_TIMEOUT_MS,
            };
            if (process.env.NEXT_PUBLIC_MQTT_USERNAME) {
                options.username = process.env.NEXT_PUBLIC_MQTT_USERNAME;
                options.password = process.env.NEXT_PUBLIC_MQTT_PASSWORD;
            }
            try {
                const client = mqtt.connect(brokerUrl, options);
                clientRef.current = client;
                const subscribeHive = () => {
                    if (!client.connected) return;
                    try {
                        if (deviceId) {
                            client.subscribe(`trekaman/telematrics/${deviceId}`, { qos: 0 });
                            client.subscribe(`trekaman/incident/${deviceId}`, { qos: 0 });
                            client.subscribe(`trekaman/geofence/${deviceId}`, { qos: 0 });
                        } else {
                            client.subscribe('trekaman/telematrics/+', { qos: 0 });
                            client.subscribe('trekaman/incident/+', { qos: 0 });
                            client.subscribe('trekaman/geofence/+', { qos: 0 });
                        }
                    } catch (err) {
                        if (activeRef.current) console.error('HiveMQ subscribe error:', err);
                    }
                };
                client.on('connect', () => {
                    if (!activeRef.current) return;
                    connectedCountRef.current.hive = 1;
                    updateConnected();
                    setTimeout(subscribeHive, 0);
                });
                client.on('reconnect', () => {
                    if (activeRef.current) updateConnected();
                });
                client.on('offline', () => {
                    if (activeRef.current) connectedCountRef.current.hive = 0;
                    updateConnected();
                });
                client.on('message', (topic: string, message: Buffer) => {
                    if (!activeRef.current) return;
                    try {
                        const payload = message.toString();
                        const data: TrackingMessage = JSON.parse(payload);
                        const topicParts = topic.split('/');
                        const topicDeviceId = topicParts[topicParts.length - 1];
                        const actualDeviceId = data.device_id || topicDeviceId;

                        if (topic.startsWith('trekaman/telematrics/')) {
                            // Only process devices assigned to user's vehicles (fleet map) or current device (single view)
                            if (!deviceId && !allowedDeviceIdsRef.current.has(actualDeviceId)) return;
                            let latestRecord: TelemetryRecord | undefined;
                            if (data.records && data.records.length > 0) {
                                latestRecord = data.records[data.records.length - 1];
                            } else if (data.record) {
                                latestRecord = data.record;
                            } else {
                                // Allow payloads that are already a TelemetryRecord-ish shape (including latitude/longitude keys).
                                const { lat, lon } = extractLatLon(data as unknown);
                                if (lat !== undefined || lon !== undefined) {
                                    latestRecord = data as unknown as TelemetryRecord;
                                }
                            }
                            if (latestRecord) {
                                const record: TelemetryRecord = {
                                    ...normalizeTelemetryRecord(latestRecord),
                                    ia_tot: data.ia_tot ?? latestRecord.ia_tot,
                                    vib: data.vib ?? latestRecord.vib,
                                    rol: data.rol ?? latestRecord.rol,
                                    pit: data.pit ?? latestRecord.pit,
                                };
                                const dataTime = record.ts_server || (record.ts != null ? new Date(record.ts * 1000).toISOString() : new Date().toISOString());
                                setVehicles((prev) => {
                                    const existing = prev[actualDeviceId]?.last_record;
                                    const lastRecord: TelemetryRecord = {
                                        ...record,
                                        lat: record.lat ?? existing?.lat,
                                        lon: record.lon ?? existing?.lon,
                                        alt: record.alt ?? existing?.alt,
                                        hdg: record.hdg ?? existing?.hdg,
                                        cog: record.cog ?? existing?.cog,
                                    };
                                    return {
                                        ...prev,
                                        [actualDeviceId]: {
                                            device_id: actualDeviceId,
                                            last_record: lastRecord,
                                            last_update: dataTime,
                                            status: 'online',
                                        },
                                    };
                                });
                                const norm = (r: TelemetryRecord) => normalizeTelemetryRecord(r);
                                const withLatLon = (record.lat != null && record.lon != null) ? [norm(record)] : [];
                                const fromBatch = (data.records ?? [])
                                    .map((r: TelemetryRecord) => norm(r))
                                    .filter((r: TelemetryRecord) => r.lat != null && r.lon != null) as TelemetryRecord[];
                                const toAdd = fromBatch.length > 0 ? fromBatch : withLatLon;
                                if (toAdd.length > 0) {
                                    setTrailState((prev) => {
                                        const list = trailByDeviceRef.current[actualDeviceId] ?? prev.trails[actualDeviceId] ?? [];
                                        const JUMP_KM = 15;
                                        const last = list[list.length - 1];
                                        const firstNew = toAdd[0];
                                        const lastLon = last?.lon;
                                        const firstLon = firstNew.lon;
                                        const isJump =
                                            last &&
                                            firstNew.lat != null &&
                                            firstLon != null &&
                                            last.lat != null &&
                                            lastLon != null &&
                                            distanceKm(last.lat, lastLon as number, firstNew.lat, firstLon as number) > JUMP_KM;
                                        const nextTrail = isJump ? toAdd : [...list, ...toAdd];
                                        const capped = nextTrail.slice(-MAX_TRAIL_POINTS);
                                        trailByDeviceRef.current[actualDeviceId] = capped;
                                        const newCompleted =
                                            isJump && list.length >= 2
                                                ? { ...prev.completedTrails, [actualDeviceId]: list }
                                                : (() => {
                                                    const c = { ...prev.completedTrails };
                                                    delete c[actualDeviceId];
                                                    return c;
                                                })();
                                        return {
                                            trails: { ...prev.trails, [actualDeviceId]: capped },
                                            completedTrails: newCompleted,
                                        };
                                    });
                                }
                            }
                        } else if (topic.startsWith('trekaman/incident/')) {
                            toast.error(`Incident: ${data.incident_type || 'Alert'} on device ${actualDeviceId}`, { duration: 5000, position: 'top-right' });
                        } else if (topic.startsWith('trekaman/geofence/')) {
                            toast(`Geofence ${data.event || 'Update'}: ${data.geofence_name || 'Boundary'}`, { icon: '🌐', duration: 4000 });
                        }
                    } catch (err) {
                        console.error('Error parsing MQTT message:', err);
                    }
                });
                client.on('error', (err: Error) => {
                    if (activeRef.current) console.error('Tracking MQTT Error:', err);
                });
                client.on('close', () => {
                    if (activeRef.current) {
                        connectedCountRef.current.hive = 0;
                        updateConnected();
                    }
                });
            } catch (err) {
                console.error('Failed to create HiveMQ connection:', err);
            }
        }

        // —— Flespi (Teltonika devices) ——
        {
            try {
                const options: mqtt.IClientOptions = {
                    clientId: uniqueClientId(FLESPI_CLIENT_ID_BASE),
                    clean: true,
                    reconnectPeriod: MQTT_RECONNECT_MS,
                    keepalive: MQTT_KEEPALIVE_S,
                    connectTimeout: MQTT_CONNECT_TIMEOUT_MS,
                    username: FLESPI_USERNAME,
                    password: FLESPI_PASSWORD,
                };
                const client = mqtt.connect(FLESPI_BROKER_URL, options);
                flespiClientRef.current = client;
                const subscribeFlespi = () => {
                    if (!client.connected) return;
                    try {
                        if (deviceId) {
                            client.subscribe(`flespi/state/gw/devices/${deviceId}/telemetry/+`, { qos: 1 });
                        } else {
                            client.subscribe('flespi/state/gw/devices/+/telemetry/+', { qos: 0 });
                        }
                    } catch (err) {
                        if (activeRef.current) console.error('Flespi subscribe error:', err);
                    }
                };
                client.on('connect', () => {
                    if (!activeRef.current) return;
                    connectedCountRef.current.flespi = 1;
                    updateConnected();
                    setTimeout(subscribeFlespi, 0);
                });
                client.on('reconnect', () => {
                    if (activeRef.current) updateConnected();
                });
                client.on('offline', () => {
                    if (activeRef.current) connectedCountRef.current.flespi = 0;
                    updateConnected();
                });
                client.on('message', (topic: string, message: Buffer) => {
                    if (!activeRef.current) return;
                    try {
                        const payload = message.toString();
                        const parsed = JSON.parse(payload) as unknown;
                        const parts = topic.split('/');
                        const fromTopicDeviceId = parts[4]; // flespi/state/gw/devices/{id}/telemetry/{param}
                        const paramKey = parts[parts.length - 1];
                        const deviceIdStr = String(fromTopicDeviceId || '');
                        if (!deviceIdStr) return;
                        if (deviceId && deviceIdStr !== deviceId) return;

                        const cache = (flespiTelemetryCacheRef.current[deviceIdStr] ??= {});

                        // Support both telemetry/+ (single param per message) and legacy payloads with result[0].telemetry.
                        if (
                            parsed &&
                            typeof parsed === 'object' &&
                            'result' in (parsed as Record<string, unknown>) &&
                            Array.isArray((parsed as FlespiStatePayload).result)
                        ) {
                            const data = parsed as FlespiStatePayload;
                            const first = data.result?.[0];
                            const tel = first?.telemetry;
                            if (tel) {
                                Object.entries(tel).forEach(([k, v]) => {
                                    const vv = v as unknown;
                                    if (vv && typeof vv === 'object' && 'value' in (vv as Record<string, unknown>) && 'ts' in (vv as Record<string, unknown>)) {
                                        cache[k] = vv as FlespiTelemetryEntry;
                                    }
                                });
                            }
                        } else {
                            let entry: FlespiTelemetryEntry;
                            if (parsed && typeof parsed === 'object' && 'value' in (parsed as Record<string, unknown>)) {
                                const obj = parsed as Record<string, unknown>;
                                const tsRaw = obj.ts;
                                const ts =
                                    typeof tsRaw === 'number'
                                        ? tsRaw
                                        : typeof tsRaw === 'string' && Number.isFinite(Number(tsRaw))
                                            ? Number(tsRaw)
                                            : Math.floor(Date.now() / 1000);
                                entry = { ts, value: obj.value };
                            } else {
                                // Direct payload e.g. flespi/.../telemetry/position: { latitude, longitude, altitude, direction, speed, satellites }
                                const obj = parsed as Record<string, unknown>;
                                const tsRaw = obj.ts ?? obj.timestamp;
                                const ts =
                                    typeof tsRaw === 'number'
                                        ? tsRaw
                                        : typeof tsRaw === 'string' && Number.isFinite(Number(tsRaw))
                                            ? Number(tsRaw)
                                            : Math.floor(Date.now() / 1000);
                                entry = { ts, value: parsed };
                            }
                            cache[paramKey] = entry;
                        }

                        const record = flespiTelemetryToRecord(deviceIdStr, cache);
                        // Fleet mode: ONLY apply to devices linked to assets. We still keep cache so when assets load
                        // we can re-apply the latest cached telemetry for allowed devices.
                        if (!deviceId && !allowedDeviceIdsRef.current.has(deviceIdStr)) return;
                        if (record) applyFlespiPosition(deviceIdStr, record);
                    } catch (err) {
                        console.error('Error parsing Flespi MQTT message:', err);
                    }
                });
                client.on('error', (err: Error) => {
                    if (activeRef.current) console.error('Flespi MQTT Error:', err);
                });
                client.on('close', () => {
                    if (activeRef.current) {
                        connectedCountRef.current.flespi = 0;
                        updateConnected();
                    }
                });
            } catch (err) {
                console.error('Failed to create Flespi MQTT connection:', err);
            }
        }
    }, [user, deviceId, mqttProvider, applyFlespiPosition]);

    useEffect(() => {
        activeRef.current = true;
        connectedCountRef.current = { hive: 0, flespi: 0 };
        connect();
        // Connect immediately so Flespi-only devices (no DB history) appear as soon as they send
        const staleInterval = setInterval(() => {
            if (!activeRef.current) return;
            setVehicles((prev) => {
                const now = Date.now();
                let changed = false;
                const next = { ...prev };
                for (const [id, v] of Object.entries(next)) {
                    const lastMs = new Date(v.last_update).getTime();
                    if (v.status === 'online' && now - lastMs > LIVE_STALE_MS) {
                        next[id] = { ...v, status: 'offline' };
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 30000);
        return () => {
            clearInterval(staleInterval);
            activeRef.current = false;
            if (clientRef.current) {
                clientRef.current.end();
                clientRef.current = null;
            }
            if (flespiClientRef.current) {
                flespiClientRef.current.end();
                flespiClientRef.current = null;
            }
            setIsConnected(false);
        };
    }, [connect]);

    const sendMessage = (topic: string, message: string) => {
        if (clientRef.current?.connected) {
            clientRef.current.publish(topic, message, { qos: 0 });
        }
    };

    // Fleet map: only show devices assigned to user's vehicles (custom + Teltonika)
    const vehicleList = useMemo(
        () =>
            Object.values(vehicles).filter((v) => {
                if (deviceId) return true;
                return allowedDeviceIds.has(v.device_id);
            }),
        [vehicles, deviceId, allowedDeviceIds]
    );

    return {
        vehicles,
        trails,
        completedTrails,
        isConnected,
        sendMessage,
        vehicleList,
    };
}
