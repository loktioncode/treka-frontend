import type { TelemetryRecord } from "@/types/api";

/** Minimum RPM to consider engine running (below typical idle 600–900). */
const ENGINE_ON_RPM_THRESHOLD = 350;

export type DrivingStatus = "moving" | "stationary" | "off";

/** Record shape needed for driving status (all fields used here are optional). */
type TelemetryLike = Partial<TelemetryRecord> | null | undefined;

/**
 * Derive driving status from CAN: speed + RPM.
 * When movement.status is provided (e.g. Flespi): vehicle is "moving" only when mov === true.
 * Otherwise: moving when speed > 0; stationary when engine on; off when engine off.
 */
export function getDrivingStatus(record: TelemetryLike): DrivingStatus {
  if (!record) return "off";

  const spd = record.spd ?? 0;
  const rpm = record.rpm ?? 0;

  // Explicit movement.status (e.g. flespi/state/gw/devices/.../telemetry/movement.status): only show moving when true
  if (record.mov === true) return "moving";
  if (record.mov === false) {
    if (rpm > ENGINE_ON_RPM_THRESHOLD) return "stationary";
    return "off";
  }

  // No movement.status: use speed and RPM
  if (spd > 0) return "moving";
  if (rpm > ENGINE_ON_RPM_THRESHOLD) return "stationary";
  return "off";
}

/** Human-readable label for map/UI. */
export function getDrivingStatusLabel(record: TelemetryLike): string {
  switch (getDrivingStatus(record)) {
    case "moving":
      return "Moving";
    case "stationary":
      return "Stationary";
    case "off":
    default:
      return "Engine off";
  }
}

/** True if engine is considered on (RPM above threshold or speed > 0). */
export function isEngineOn(record: TelemetryLike): boolean {
  if (!record) return false;
  if (record.mov === true) return true;
  const spd = record.spd ?? 0;
  const rpm = record.rpm ?? 0;
  return spd > 0 || rpm > ENGINE_ON_RPM_THRESHOLD;
}
