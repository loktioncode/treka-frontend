import type { TelemetryRecord } from "@/types/api";

function num(v: unknown): number | undefined {
  return typeof v === "number" && !Number.isNaN(v) ? v : undefined;
}

/** Liters in tank from CAN / extras / `fl` when `fuel_unit` is L (same rules as asset GPS log). */
export function getTelemetryFuelLiters(r: TelemetryRecord | null | undefined): number | undefined {
  if (!r) return undefined;
  const extras =
    r.extras && typeof r.extras === "object" ? (r.extras as Record<string, unknown>) : {};
  return (
    num(r.fuel_vol) ??
    num(extras["can.fuel.volume"]) ??
    num(extras["fuel.volume"]) ??
    (r.fuel_unit === "l" ? num(r.fl) : undefined)
  );
}

/** Fuel level % when we are not showing liters as primary. */
export function getTelemetryFuelPercent(r: TelemetryRecord | null | undefined): number | undefined {
  if (!r || getTelemetryFuelLiters(r) != null) return undefined;
  if (r.fuel_unit === "percent" || r.fuel_unit === undefined) return num(r.fl);
  return undefined;
}

/** One-line label for list cards: liters preferred, else percent. */
export function formatVehicleFuelLevel(r: TelemetryRecord | null | undefined): string {
  const L = getTelemetryFuelLiters(r);
  if (L != null) return `${L.toFixed(1)} L`;
  const pct = getTelemetryFuelPercent(r);
  if (pct != null) return `${pct.toFixed(0)}%`;
  return "—";
}
