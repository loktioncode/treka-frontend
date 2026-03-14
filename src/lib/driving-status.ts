import type { TelemetryRecord } from "@/types/api";

/** Minimum RPM to consider engine running (below typical idle 600–900). */
const ENGINE_ON_RPM_THRESHOLD = 350;

export type DrivingStatus = "moving" | "stationary" | "off";

/**
 * Derive driving status from CAN: speed + RPM.
 * - moving: speed > 0
 * - stationary: speed = 0 and engine on (RPM > threshold)
 * - off: speed = 0 and engine off or no RPM data
 */
export function getDrivingStatus(record: TelemetryRecord | null | undefined): DrivingStatus {
  if (!record) return "off";
  const spd = record.spd ?? 0;
  const rpm = record.rpm ?? 0;
  if (spd > 0) return "moving";
  if (rpm > ENGINE_ON_RPM_THRESHOLD) return "stationary";
  return "off";
}

/** Human-readable label for map/UI. */
export function getDrivingStatusLabel(record: TelemetryRecord | null | undefined): string {
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
export function isEngineOn(record: TelemetryRecord | null | undefined): boolean {
  if (!record) return false;
  const spd = record.spd ?? 0;
  const rpm = record.rpm ?? 0;
  return spd > 0 || rpm > ENGINE_ON_RPM_THRESHOLD;
}
