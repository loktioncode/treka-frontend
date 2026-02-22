import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TelemetryRecord } from '@/types/api';
import toast from 'react-hot-toast';
import mqtt from 'mqtt';

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

export interface LiveVehicle {
    device_id: string;
    last_record: TelemetryRecord;
    last_update: string;
    status: 'online' | 'offline';
}

const MAX_TRAIL_POINTS = 500;

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

export function useMqttTracking(deviceId?: string) {
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
    const activeRef = useRef(true);
    /** Ref holds latest trail per device so rapid MQTT messages always append (prev fixes path not drawing) */
    const trailByDeviceRef = useRef<Record<string, TelemetryRecord[]>>({});

    const connect = useCallback(() => {
        if (!user) return;

        // Browsers require WebSockets (ws/wss). TCP mqtt:// does not work in browser.
        const envUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || '';
        const defaultWss = 'wss://broker.hivemq.com:8884/mqtt';
        let brokerUrl = envUrl || defaultWss;
        if (brokerUrl.startsWith('mqtt://')) {
            console.warn(
                'MQTT: mqtt:// (TCP) does not work in browser. Using WebSocket fallback.',
                'Set NEXT_PUBLIC_MQTT_BROKER_URL to wss://broker.hivemq.com:8884/mqtt or ws://broker.hivemq.com:8000/mqtt'
            );
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
            console.log('Connecting to MQTT broker:', brokerUrl);
            const client = mqtt.connect(brokerUrl, options);
            clientRef.current = client;

            client.on('connect', () => {
                if (!activeRef.current) return;
                console.log('Tracking MQTT connected');
                setIsConnected(true);

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
                        let latestRecord: TelemetryRecord | undefined;
                        if (data.records && data.records.length > 0) {
                            latestRecord = data.records[data.records.length - 1];
                        } else if (data.record) {
                            latestRecord = data.record;
                        } else if (data as unknown as TelemetryRecord && (data as any).lat) {
                            latestRecord = data as unknown as TelemetryRecord;
                        }

                        if (latestRecord) {
                            const raw = latestRecord as Record<string, unknown>;
                            const record: TelemetryRecord = {
                                ...latestRecord!,
                                lon: (latestRecord!.lon ?? raw.lng) as number | undefined,
                                ia_tot: data.ia_tot ?? latestRecord!.ia_tot,
                                vib: data.vib ?? latestRecord!.vib,
                                rol: data.rol ?? latestRecord!.rol,
                                pit: data.pit ?? latestRecord!.pit
                            };
                            setVehicles(prev => ({
                                ...prev,
                                [actualDeviceId]: {
                                    device_id: actualDeviceId,
                                    last_record: record,
                                    last_update: new Date().toISOString(),
                                    status: 'online'
                                }
                            }));
                            const norm = (r: TelemetryRecord) => ({ ...r, lon: r.lon ?? (r as Record<string, unknown>).lng as number });
                            const withLatLon = (record.lat != null && (record.lon != null || raw.lng != null)) ? [norm(record)] : [];
                            const fromBatch = (data.records ?? [])
                                .map((r: TelemetryRecord) => norm(r))
                                .filter((r: TelemetryRecord) => r.lat != null && r.lon != null) as TelemetryRecord[];
                            const toAdd = fromBatch.length > 0 ? fromBatch : withLatLon;
                            if (toAdd.length > 0) {
                                setTrailState(prev => {
                                    // Use ref so rapid messages always append; prev can be stale when React batches
                                    const list = trailByDeviceRef.current[actualDeviceId] ?? prev.trails[actualDeviceId] ?? [];
                                    const JUMP_KM = 15; // Only real teleports (e.g. route loop ~60km) start new path
                                    const last = list[list.length - 1];
                                    const firstNew = toAdd[0];
                                    const lastLon = last?.lon ?? (last as Record<string, unknown>)?.lng;
                                    const firstLon = firstNew.lon ?? (firstNew as Record<string, unknown>).lng;
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
                        toast.error(`Incident: ${data.incident_type || 'Alert'} detected on device ${actualDeviceId}`, {
                            duration: 5000,
                            position: 'top-right'
                        });
                    } else if (topic.startsWith('trekaman/geofence/')) {
                        toast(`Geofence ${data.event || 'Update'}: ${data.geofence_name || 'Boundary'}`, {
                            icon: '🌐',
                            duration: 4000
                        });
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
                    console.log('Tracking MQTT Disconnected');
                    setIsConnected(false);
                }
            });

        } catch (err) {
            console.error('Failed to create MQTT connection:', err);
        }
    }, [user, deviceId]);

    useEffect(() => {
        activeRef.current = true;
        connect();

        return () => {
            activeRef.current = false;
            const client = clientRef.current;
            clientRef.current = null;
            if (client) client.end();
        };
    }, [connect]);

    const sendMessage = (topic: string, message: string) => {
        if (clientRef.current && clientRef.current.connected) {
            clientRef.current.publish(topic, message, { qos: 0 });
        }
    };

    return {
        vehicles,
        trails,
        completedTrails,
        isConnected,
        sendMessage,
        vehicleList: Object.values(vehicles)
    };
}
