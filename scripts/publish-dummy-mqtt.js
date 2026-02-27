#!/usr/bin/env node


const mqtt = require("mqtt");

const DEVICE_ID = process.env.DEVICE_ID || "004444";
const TOPIC = `trekaman/telematrics/${DEVICE_ID}`;
const BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com:1883";
const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const INTERVAL_MS = 2000;

// Johannesburg CBD → Midrand (N1/Ben Schoeman)
const ROUTE_JHB_MIDRAND = [
  { "lat": -26.2041, "lng": 28.0473, "label": "Start: Johannesburg CBD" },
  { "lat": -26.1915, "lng": 28.0495 },
  { "lat": -26.1750, "lng": 28.0450, "label": "M1 North - Houghton" },
  { "lat": -26.1520, "lng": 28.0720 },
  { "lat": -26.1280, "lng": 28.1020, "label": "M1/N3 Buccleuch Interchange" },
  { "lat": -26.1050, "lng": 28.1150 },
  { "lat": -26.0820, "lng": 28.1250 },
  { "lat": -26.0550, "lng": 28.1380 },
  { "lat": -26.0250, "lng": 28.1550 },
  { "lat": -25.9980, "lng": 28.1680 },
  { "lat": -25.9890, "lng": 28.1720, "label": "Midrand - Halfway House" },
  { "lat": -25.9750, "lng": 28.1810 },
  { "lat": -25.9620, "lng": 28.1750, "label": "New Road Interchange" },
  { "lat": -25.9450, "lng": 28.1650 },
  { "lat": -25.9320, "lng": 28.1580 },
  { "lat": -25.9125, "lng": 28.1460, "label": "Samrand Ave" },
  { "lat": -25.8820, "lng": 28.1630, "label": "Brakfontein Interchange" },
  { "lat": -25.8750, "lng": 28.1780 },
  { "lat": -25.8670, "lng": 28.1880 },
  { "lat": -25.8610, "lng": 28.1920, "label": "Exit N1 for Centurion" },
  { "lat": -25.8560, "lng": 28.1880 },
  { "lat": -25.8515, "lng": 28.1895, "label": "Centurion Gautrain Station" },
  { "lat": -25.8480, "lng": 28.1950 },
  { "lat": -25.8450, "lng": 28.2070, "label": "Re-entering N1 via Jean Ave" },
  { "lat": -25.8350, "lng": 28.2060 },
  { "lat": -25.8280, "lng": 28.2050 },
  { "lat": -25.8150, "lng": 28.2250 },
  { "lat": -25.8050, "lng": 28.2450 },
  { "lat": -25.7900, "lng": 28.2350, "label": "N1/N14 Interchange" },
  { "lat": -25.7790, "lng": 28.1960, "label": "Entering Pretoria (Eeufees Rd)" },
  { "lat": -25.7720, "lng": 28.1920 },
  { "lat": -25.7650, "lng": 28.1880 },
  { "lat": -25.7580, "lng": 28.1885, "label": "Pretoria Station Approach" },
  { "lat": -25.7588, "lng": 28.1895, "label": "End: Pretoria Gautrain Station" }
]


const ROUTE = [...ROUTE_JHB_MIDRAND];

// Scenario phases (index into route): harsh brake, corner, harsh accel, pothole spread along full route
const SCENARIOS = [
  { name: "normal", start: 0, end: 25, hbk: 0, hac: 0, hco: 0, pot: 0 },
  { name: "harsh_brake", start: 26, end: 30, hbk: 1, hac: 0, hco: 0, pot: 0 },
  { name: "normal", start: 31, end: 55, hbk: 0, hac: 0, hco: 0, pot: 0 },
  { name: "hard_corner", start: 56, end: 62, hbk: 0, hac: 0, hco: 1, pot: 0 },
  { name: "normal", start: 63, end: 78, hbk: 0, hac: 0, hco: 0, pot: 0 },
  { name: "harsh_accel", start: 79, end: 85, hbk: 0, hac: 1, hco: 0, pot: 0 },
  { name: "normal", start: 86, end: 100, hbk: 0, hac: 0, hco: 0, pot: 0 },
  { name: "pothole", start: 101, end: 106, hbk: 0, hac: 0, hco: 0, pot: 1 },
  { name: "normal", start: 107, end: 118, hbk: 0, hac: 0, hco: 0, pot: 0 },
];

function getScenario(routeIndex) {
  const i = routeIndex % ROUTE.length;
  for (const s of SCENARIOS) {
    if (i >= s.start && i <= s.end) return s;
  }
  return { name: "normal", hbk: 0, hac: 0, hco: 0, pot: 0 };
}

/**
 * Build one full telemetry record (telemetry_data_guide.md); route + scenario-aware.
 */
function buildPayload(index) {
  const routeIndex = index % ROUTE.length;
  const point = ROUTE[routeIndex];
  const scenario = getScenario(routeIndex);
  const jitter = () => (Math.random() - 0.5) * 0.00015;
  const ts = Date.now();
  // Speed: lower during harsh brake, higher during harsh accel
  let spd = 35 + Math.round(Math.random() * 45);
  if (scenario.name === "harsh_brake") spd = Math.max(15, 45 - Math.round(Math.random() * 25));
  if (scenario.name === "harsh_accel") spd = 55 + Math.round(Math.random() * 25);
  if (scenario.name === "hard_corner") spd = 40 + Math.round(Math.random() * 20);
  const rpm = 1200 + Math.round(Math.random() * 2200);
  const vlt = 13.5 + Math.random() * 1.2;
  const tmp = 88 + (Math.random() - 0.5) * 8;
  const oil = 90 + (Math.random() - 0.5) * 12;
  const fl = 60 + Math.round(Math.random() * 30);
  const fp = 300 + Math.round(Math.random() * 60);
  const maf = 3 + Math.random() * 5;
  const bar = 100 + (Math.random() - 0.5) * 3;
  const vib = scenario.name === "pothole" ? 0.04 + Math.random() * 0.03 : 0.008 + Math.random() * 0.012;
  const plg = scenario.hbk ? -0.45 - Math.random() * 0.15 : scenario.hac ? 0.35 + Math.random() * 0.15 : 0.15 + Math.random() * 0.25;
  const plag = scenario.hco ? (Math.random() > 0.5 ? 0.45 : -0.45) + (Math.random() - 0.5) * 0.1 : -0.2 + Math.random() * 0.3;
  const pvg = scenario.pot ? 1.6 + Math.random() * 0.4 : 0.04 + Math.random() * 0.08;
  const ptg = scenario.pot ? 1.7 + Math.random() * 0.3 : 0.2 + Math.random() * 0.25;

  const payload = {
    device_id: DEVICE_ID,
    ts,
    lat: point.lat + jitter(),
    lon: (point.lon ?? point.lng) + jitter(),
    rpm,
    spd,
    lod: 25 + Math.random() * 45,
    thr: scenario.hac ? 35 + Math.random() * 30 : 10 + Math.random() * 25,
    tmp: Math.round((tmp) * 10) / 10,
    iat: 28 + (Math.random() - 0.5) * 12,
    amb: 26 + (Math.random() - 0.5) * 8,
    oil: Math.round((oil) * 10) / 10,
    fl: Math.round((fl) * 10) / 10,
    fp: Math.round(fp),
    maf: Math.round((maf) * 100) / 100,
    bar: Math.round((bar) * 10) / 10,
    vlt: Math.round((vlt) * 100) / 100,
    run: Math.round(ts / 1000) % 86400,
    mil: 0,
    oa_ms2: scenario.hbk ? -4.5 - Math.random() * 1.5 : scenario.hac ? 2.5 + Math.random() * 1.5 : 0.8 + Math.random() * 0.8,
    oa_kmh: scenario.hbk ? -12 - Math.random() * 4 : scenario.hac ? 8 + Math.random() * 4 : 2.5 + Math.random() * 2.5,
    oa_g: scenario.hbk ? -0.48 - Math.random() * 0.12 : scenario.hac ? 0.28 + Math.random() * 0.12 : 0.08 + Math.random() * 0.08,
    oa_ok: 1,
    ia_lg: scenario.hbk ? -0.42 - Math.random() * 0.08 : scenario.hac ? 0.32 + Math.random() * 0.08 : 0.08 + (Math.random() - 0.5) * 0.1,
    ia_lat: scenario.hco ? (Math.random() > 0.5 ? 0.42 : -0.42) + (Math.random() - 0.5) * 0.08 : -0.02 + (Math.random() - 0.5) * 0.06,
    ia_vt: scenario.pot ? 0.5 + Math.random() * 0.3 : 0.005 + (Math.random() - 0.5) * 0.02,
    ia_tot: 0.1 + Math.random() * 0.06,
    rol: scenario.hco ? (Math.random() - 0.5) * 4 : 0.5 + (Math.random() - 0.5) * 2,
    pit: -0.3 + (Math.random() - 0.5) * 0.8,
    hdg: 0,
    ax: scenario.hbk ? -4.5 + (Math.random() - 0.5) * 0.5 : scenario.hac ? 2.8 + (Math.random() - 0.5) * 0.3 : 1.1 + (Math.random() - 0.5) * 0.3,
    ay: scenario.hco ? (Math.random() > 0.5 ? 4.2 : -4.2) / 9.81 + (Math.random() - 0.5) * 0.2 : -0.25 + (Math.random() - 0.5) * 0.2,
    az: 9.8 + (Math.random() - 0.5) * 0.2,
    gx: 0.2 + (Math.random() - 0.5) * 0.4,
    gy: -0.1 + (Math.random() - 0.5) * 0.2,
    gz: 0,
    mx: 0, my: 0, mz: 0,
    itmp: 36 + Math.random() * 6,
    plg: Math.round(plg * 1000) / 1000,
    plag: Math.round(plag * 1000) / 1000,
    pvg: Math.round(pvg * 1000) / 1000,
    ptg: Math.round(ptg * 1000) / 1000,
    vib: Math.round(vib * 10000) / 10000,
    hbk: scenario.hbk,
    hac: scenario.hac,
    hco: scenario.hco,
    pot: scenario.pot,
  };
  return payload;
}

async function postToApi(payload, onNotLinked) {
  const url = `https://trekamanapi.apps.loktioncode.org/api/v1/telemetry/ingest`;
  try {
    const body = { device_id: DEVICE_ID, record: payload };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`[API] ${res.status} ${res.statusText}`, data);
      return false;
    }
    if (data.accepted === false) {
      if (onNotLinked) onNotLinked();
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[API] Request failed:", err.message);
    return false;
  }
}

function main() {
  console.log("Route simulation: Johannesburg → Midrand → Pretoria");
  console.log("Device ID:", DEVICE_ID);
  console.log("MQTT:", BROKER, "Topic:", TOPIC);
  console.log("API:", API_BASE);
  console.log("Telemetry DB: data is stored only when this device_id is linked to a vehicle (Assets → vehicle → IoT Device ID).");
  console.log("Interval:", INTERVAL_MS, "ms. Press Ctrl+C to stop.\n");

  let linkedWarningShown = false;

  const client = mqtt.connect(BROKER, {
    clientId: `treka_dummy_${DEVICE_ID}_${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
  });

  client.on("connect", () => {
    const sample = buildPayload(0);
    const keyCount = Object.keys(sample).length;
    console.log("MQTT connected. Each message = full OBD+IMU payload (" + keyCount + " fields).");
    console.log("Topic:", TOPIC, "| Publishing telemetry + posting to API.\n");

    let index = 0;
    const timer = setInterval(async () => {
      const payload = buildPayload(index);
      const scenario = getScenario(index % ROUTE.length);
      const payloadStr = JSON.stringify(payload);
      if (index === 0) console.log("First message length:", payloadStr.length, "bytes,", Object.keys(payload).length, "fields");

      client.publish(TOPIC, payloadStr, { qos: 0 }, (err) => {
        if (err) console.error("MQTT publish error:", err);
        else console.log(`[${new Date().toISOString()}] MQTT ok | spd=${payload.spd} rpm=${payload.rpm} scenario=${scenario.name} hbk=${payload.hbk} hac=${payload.hac} hco=${payload.hco} pot=${payload.pot}`);
      });

      const apiOk = await postToApi(payload, () => {
        if (!linkedWarningShown) {
          linkedWarningShown = true;
          console.warn("\n[API] Data NOT stored in telemetry DB: device_id is not linked to any vehicle.");
          console.warn("      To store data: Dashboard → Assets → edit a vehicle → set 'IoT Device ID' to:", DEVICE_ID);
          console.warn("");
        }
      });
      if (apiOk) console.log("  -> API accepted (saved to DB)");
      index++;
    }, INTERVAL_MS);

    client.on("close", () => clearInterval(timer));
  });

  client.on("error", (err) => console.error("MQTT error:", err));

  process.on("SIGINT", () => {
    console.log("\nStopping...");
    client.end();
    process.exit(0);
  });
}

main();
