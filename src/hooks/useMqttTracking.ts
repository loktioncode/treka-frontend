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

/** Position value inside telemetry.position */
interface FlespiPositionValue {
    altitude?: number;
    direction?: number;
    latitude?: number;
    longitude?: number;
    satellites?: number;
    speed?: number;
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
const FLESPI_CLIENT_ID = process.env.NEXT_PUBLIC_MQTT_FLESPI_CLIENT_ID || 'mqttx_trekaman';

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
    const pos = telemetry['position']?.value as FlespiPositionValue | undefined;
    const tsEntry = telemetry['timestamp'] ?? telemetry['position'];
    const ts = typeof tsEntry?.value === 'number' ? tsEntry.value : Math.floor(Date.now() / 1000);
    const spd = flespiNum(telemetry['can.vehicle.speed']) ?? pos?.speed;
    const rpm = flespiNum(telemetry['can.engine.rpm']);
    const vlt = flespiNum(telemetry['external.powersource.voltage']) ?? flespiNum(telemetry['battery.voltage']);
    const tmp = flespiNum(telemetry['can.engine.coolant.temperature']);
    const fl = flespiNum(telemetry['can.fuel.level']) ?? flespiNum(telemetry['can.fuel.volume']);
    const lod = flespiNum(telemetry['can.engine.load.level']);
    const lat = pos?.latitude ?? flespiNum(telemetry['position.latitude']);
    const lon = pos?.longitude ?? flespiNum(telemetry['position.longitude']);
    const movValue = telemetry['movement.status']?.value;
    const mov = movValue !== undefined ? Boolean(movValue) : undefined;

    if (lat == null && lon == null && spd == null && rpm == null && mov == null && tmp == null) return null;
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
        lod,
        mov,
    };
}

export function useMqttTracking(deviceId?: string, mqttProvider?: 'custom' | 'teltonika') {
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
        if (!user || assetsLoading) return;
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
                            const record = res.value.record;
                            updated[did] = {
                                device_id: did,
                                last_record: {
                                    ...record,
                                    lon: record.lon ?? (record as Record<string, unknown>).lng as number | undefined
                                },
                                last_update: record.ts_server || new Date((record.ts || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
                                status: 'offline'
                            };
                            changed = true;
                        } else {
                            // Dummy record so it shows up in the sidebar list even if it has no telemetry yet
                            updated[did] = {
                                device_id: did,
                                last_record: { ts: Math.floor(Date.now() / 1000), spd: 0 },
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
    }, [assets, assetsLoading, deviceId, user]);

    const applyFlespiPosition = useCallback((flespiDeviceId: string, record: TelemetryRecord) => {
        setVehicles((prev) => ({
            ...prev,
            [flespiDeviceId]: {
                device_id: flespiDeviceId,
                last_record: record,
                last_update: new Date().toISOString(),
                status: 'online',
            },
        }));
        if (record.lat != null && record.lon != null) {
            setTrailState((prev) => {
                const list = trailByDeviceRef.current[flespiDeviceId] ?? prev.trails[flespiDeviceId] ?? [];
                const toAdd = [record];
                const last = list[list.length - 1];
                const firstNew = toAdd[0];
                const lastLon = last?.lon ?? (last as unknown as Record<string, unknown>)?.lng;
                const firstLon = firstNew.lon ?? (firstNew as unknown as Record<string, unknown>).lng;
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

    const connect = useCallback(() => {
        if (!user) return;

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
                clientId: process.env.NEXT_PUBLIC_MQTT_CLIENT_ID || 'trekamanmqttx_2025',
                clean: true,
                reconnectPeriod: 5000,
            };
            if (process.env.NEXT_PUBLIC_MQTT_USERNAME) {
                options.username = process.env.NEXT_PUBLIC_MQTT_USERNAME;
                options.password = process.env.NEXT_PUBLIC_MQTT_PASSWORD;
            }
            try {
                const client = mqtt.connect(brokerUrl, options);
                clientRef.current = client;
                client.on('connect', () => {
                    if (!activeRef.current) return;
                    connectedCountRef.current.hive = 1;
                    updateConnected();
                    if (!client.connected) return;
                    if (deviceId) {
                        client.subscribe(`trekaman/telematrics/${deviceId}`, { qos: 0 });
                        client.subscribe(`trekaman/incident/${deviceId}`, { qos: 0 });
                        client.subscribe(`trekaman/geofence/${deviceId}`, { qos: 0 });
                    } else {
                        client.subscribe('trekaman/telematrics/+', { qos: 0 });
                        client.subscribe('trekaman/incident/+', { qos: 0 });
                        client.subscribe('trekaman/geofence/+', { qos: 0 });
                    }
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
                            } else if ((data as unknown as TelemetryRecord) && (data as unknown as { lat?: number }).lat) {
                                latestRecord = data as unknown as TelemetryRecord;
                            }
                            if (latestRecord) {
                                const raw = latestRecord as unknown as Record<string, unknown>;
                                const record: TelemetryRecord = {
                                    ...latestRecord,
                                    lon: (latestRecord.lon ?? raw.lng) as number | undefined,
                                    ia_tot: data.ia_tot ?? latestRecord.ia_tot,
                                    vib: data.vib ?? latestRecord.vib,
                                    rol: data.rol ?? latestRecord.rol,
                                    pit: data.pit ?? latestRecord.pit,
                                };
                                setVehicles((prev) => ({
                                    ...prev,
                                    [actualDeviceId]: {
                                        device_id: actualDeviceId,
                                        last_record: record,
                                        last_update: new Date().toISOString(),
                                        status: 'online',
                                    },
                                }));
                                const norm = (r: TelemetryRecord) => ({ ...r, lon: r.lon ?? (r as unknown as Record<string, unknown>).lng as number });
                                const withLatLon = (record.lat != null && (record.lon != null || raw.lng != null)) ? [norm(record)] : [];
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
                                        const lastLon = last?.lon ?? (last as unknown as Record<string, unknown>)?.lng;
                                        const firstLon = firstNew.lon ?? (firstNew as unknown as Record<string, unknown>).lng;
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
                    clientId: FLESPI_CLIENT_ID,
                    clean: true,
                    reconnectPeriod: 5000,
                    username: FLESPI_USERNAME,
                    password: FLESPI_PASSWORD,
                };
                const client = mqtt.connect(FLESPI_BROKER_URL, options);
                flespiClientRef.current = client;
                client.on('connect', () => {
                    if (!activeRef.current) return;
                    connectedCountRef.current.flespi = 1;
                    updateConnected();
                    if (deviceId) {
                        client.subscribe(`flespi/state/gw/devices/${deviceId}/telemetry/+`, { qos: 1 });
                    } else {
                        client.subscribe('flespi/state/gw/devices/+/telemetry/+', { qos: 0 });
                    }
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
                        // On fleet map (!deviceId) show all Flespi devices that send data so markers appear.
                        // When viewing a single asset (deviceId set), we already subscribed to that device only.
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
                                entry = { ts: Math.floor(Date.now() / 1000), value: parsed };
                            }
                            cache[paramKey] = entry;
                        }

                        const record = flespiTelemetryToRecord(deviceIdStr, cache);
                        // Only update state for devices assigned to user's vehicles (single-device view or fleet map).
                        if (record && (deviceId || allowedDeviceIdsRef.current.has(deviceIdStr))) {
                            applyFlespiPosition(deviceIdStr, record);
                        }
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
            Object.values(vehicles).filter((v) =>
                deviceId ? true : allowedDeviceIds.has(v.device_id)
            ),
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
