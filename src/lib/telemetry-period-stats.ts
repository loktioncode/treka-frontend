import type { TelemetryRecord } from "@/types/api";

/** Monotonic timestamp in seconds (aligns with asset page / replay sorting). */
export function telemetryTsSec(r: TelemetryRecord): number {
  if (r.ts_server) {
    return new Date(r.ts_server).getTime() / 1000;
  }
  const t = r.ts ?? 0;
  return t < 1e12 ? t : t / 1000;
}

function extractOdoKm(r: TelemetryRecord): number | undefined {
  if (r.odo != null && Number.isFinite(Number(r.odo)) && Number(r.odo) > 0) {
    return Number(r.odo);
  }
  const ex = r.extras || {};
  const cm = ex["can.vehicle.mileage"];
  if (typeof cm === "number" && Number.isFinite(cm) && cm > 0) return cm;
  const td = ex["total.distance"];
  if (typeof td === "number" && Number.isFinite(td) && td > 0) return td / 1000;
  return undefined;
}

type FuelReadingUnit = "liters" | "percent";

function extractFuelReading(
  r: TelemetryRecord,
): { value: number; unit: FuelReadingUnit } | null {
  const extras = r.extras || {};
  const num = (v: unknown): number | undefined => {
    if (v == null || v === "") return undefined;
    const x = Number(v);
    return Number.isFinite(x) ? x : undefined;
  };
  const liters =
    num(r.fuel_vol) ??
    num(extras["can.fuel.volume"]) ??
    num(extras["fuel.volume"]) ??
    num(extras["io.244"]);
  if (liters != null) return { value: liters, unit: "liters" };
  if (r.fl != null && Number.isFinite(r.fl)) {
    if (r.fuel_unit === "l") return { value: r.fl, unit: "liters" };
    return { value: r.fl, unit: "percent" };
  }
  return null;
}

function recordSpeedKmh(r: TelemetryRecord): number | undefined {
  const s = r.spd ?? r.gspd;
  if (s == null || !Number.isFinite(s)) return undefined;
  return s;
}

const AIR_FUEL_RATIO = 14.7;
const FUEL_DENSITY_G_L = 720.0;
const ASSUMED_TANK_L = 60.0;

export interface PeriodTelemetryStats {
  /** Estimated fuel consumed in the period (L), when derivable from MAF / tank / level deltas. */
  fuelUsedL: number;
  /** True when no MAF or fuel series was available to estimate consumption. */
  fuelUnknown: boolean;
  /** Distance over the period (km): odometer delta, MAF integration, or speed × time. */
  distanceKm: number;
  /** Average speed while moving (km/h), or time-weighted mean where possible. */
  avgSpeedKmh: number | null;
}

/**
 * Mirrors backend `estimate_fuel_consumption` priority (analytics.py) for a loaded batch.
 */
export function computePeriodTelemetryStats(
  records: TelemetryRecord[],
): PeriodTelemetryStats {
  if (!records.length) {
    return {
      fuelUsedL: 0,
      fuelUnknown: true,
      distanceKm: 0,
      avgSpeedKmh: null,
    };
  }

  const sorted = [...records].sort(
    (a, b) => telemetryTsSec(a) - telemetryTsSec(b),
  );

  let totalDistanceKm = 0;
  const odoVals = sorted
    .map(extractOdoKm)
    .filter((x): x is number => x != null && x > 0);
  if (odoVals.length >= 2) {
    const odoDist =
      Math.max(...odoVals) - Math.min(...odoVals);
    if (odoDist > 0) totalDistanceKm = odoDist;
  }

  let totalFuelL = 0;
  let mafFuelTotal = 0;
  let mafDistanceTotal = 0;

  for (let i = 1; i < sorted.length; i++) {
    const r1 = sorted[i - 1];
    const r2 = sorted[i];
    const dtSec = telemetryTsSec(r2) - telemetryTsSec(r1);
    if (dtSec <= 0 || dtSec > 600) continue;

    if (r1.maf != null && Number(r1.maf) > 0 && r1.spd != null && Number(r1.spd) > 0) {
      const fuelRateLH = (Number(r1.maf) * 3600) / (AIR_FUEL_RATIO * FUEL_DENSITY_G_L);
      mafFuelTotal += (fuelRateLH / 3600) * dtSec;
      mafDistanceTotal += (Number(r1.spd) / 3600) * dtSec;
    }
  }

  let fuelUnknown = true;
  if (mafFuelTotal > 0) {
    totalFuelL = mafFuelTotal;
    fuelUnknown = false;
    if (totalDistanceKm === 0 && mafDistanceTotal > 0) {
      totalDistanceKm = mafDistanceTotal;
    }
  } else {
    let lastVal: number | null = null;
    let lastUnit: FuelReadingUnit | null = null;
    let totalDropL = 0;
    let sawFuelReading = false;

    for (const r of sorted) {
      const reading = extractFuelReading(r);
      if (!reading) continue;
      sawFuelReading = true;

      if (lastVal != null && lastUnit === reading.unit) {
        const drop = lastVal - reading.value;
        if (drop > 0) {
          const deltaL =
            reading.unit === "liters"
              ? drop
              : (drop / 100) * ASSUMED_TANK_L;
          totalDropL += deltaL;
        }
      }
      lastVal = reading.value;
      lastUnit = reading.unit;
    }

    if (totalDropL > 0) {
      totalFuelL = totalDropL;
      fuelUnknown = false;
    } else if (sawFuelReading) {
      fuelUnknown = false;
    }
  }

  if (totalDistanceKm === 0) {
    for (let i = 1; i < sorted.length; i++) {
      const r1 = sorted[i - 1];
      const r2 = sorted[i];
      const rawDt = telemetryTsSec(r2) - telemetryTsSec(r1);
      if (rawDt <= 0 || rawDt > 600) continue;
      const s1 = recordSpeedKmh(r1) ?? 0;
      const s2 = recordSpeedKmh(r2) ?? 0;
      const spdKmh = (s1 + s2) / 2;
      totalDistanceKm += (spdKmh / 3600) * rawDt;
    }
  }

  // Time-weighted average speed while moving (segments with mean speed > 0.5 km/h)
  let sumSpdDt = 0;
  let sumDtMoving = 0;
  for (let i = 1; i < sorted.length; i++) {
    const r1 = sorted[i - 1];
    const r2 = sorted[i];
    const dtSec = telemetryTsSec(r2) - telemetryTsSec(r1);
    if (dtSec <= 0 || dtSec > 600) continue;
    const s1 = recordSpeedKmh(r1);
    const s2 = recordSpeedKmh(r2);
    if (s1 == null && s2 == null) continue;
    const avgSeg = ((s1 ?? 0) + (s2 ?? 0)) / 2;
    if (avgSeg > 0.5) {
      sumSpdDt += avgSeg * dtSec;
      sumDtMoving += dtSec;
    }
  }

  let avgSpeedKmh: number | null = null;
  if (sumDtMoving > 0) {
    avgSpeedKmh = sumSpdDt / sumDtMoving;
  } else if (totalDistanceKm > 0 && sorted.length >= 2) {
    const t0 = telemetryTsSec(sorted[0]);
    const t1 = telemetryTsSec(sorted[sorted.length - 1]);
    const elapsed = t1 - t0;
    if (elapsed > 30) {
      avgSpeedKmh = totalDistanceKm / (elapsed / 3600);
    }
  } else {
    const sp = sorted
      .map(recordSpeedKmh)
      .filter((x): x is number => x != null);
    if (sp.length > 0) {
      avgSpeedKmh = sp.reduce((a, b) => a + b, 0) / sp.length;
    }
  }

  return {
    fuelUsedL: totalFuelL,
    fuelUnknown,
    distanceKm: totalDistanceKm,
    avgSpeedKmh,
  };
}
