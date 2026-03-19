import type { TelemetryRecord } from "@/types/api";

/**
 * Single rule for all devices (Flespi + custom):
 * - Moving: speed/movement indicates motion (Flespi: movement.status; custom: speed + vibration).
 * - Stationary: not moving + engine ON (RPM > threshold).
 * - Engine off: not moving + engine OFF (RPM ≤ threshold or no RPM).
 */
/** Minimum RPM to consider engine running (below typical idle 600–900). */
const ENGINE_ON_RPM_THRESHOLD = 350;

/** Min speed (km/h) to consider moving — avoids noise at 0. */
const MOVING_SPEED_KMH = 2;

/** Vibration RMS (g) above which we consider the vehicle moving (custom devices with MPU). Stationary ≈ 0–0.01. */
const VIB_MOVING_THRESHOLD_G = 0.02;

/** |ia_tot - 1.0| above this (g) suggests motion/vibration. At rest ia_tot ≈ 1.0. */
const IA_TOT_MOTION_DEVIATION_G = 0.04;

export type DrivingStatus = "moving" | "idle" | "off";

/** Record shape needed for driving status (all fields used here are optional). */
type TelemetryLike = Partial<TelemetryRecord> | null | undefined;

/**
 * True when MPU/IMU data suggests the vehicle is moving (vibration or acceleration deviation from rest).
 * Used for custom HiveMQ devices so we don't show "moving" from speed noise alone.
 */
function mpuSuggestsMoving(record: TelemetryLike): boolean {
  if (!record) return false;
  const vib = record.vib;
  const iaTot = record.ia_tot;
  if (vib != null && vib > VIB_MOVING_THRESHOLD_G) return true;
  if (iaTot != null && Math.abs(iaTot - 1) > IA_TOT_MOTION_DEVIATION_G) return true;
  return false;
}

/** True when record has MPU/IMU fields from a custom device (HiveMQ). */
function hasMpuData(record: TelemetryLike): boolean {
  return record != null && (record.vib != null || record.ia_tot != null);
}

/**
 * Derive driving status from CAN + optional movement/MPU.
 * - Flespi: use engine.ignition.status when available so we show "Engine off" when ignition is off
 *   (Flespi keeps sending last-known values; ignition is the current engine state).
 * - Flespi: "moving" only when movement.status === true.
 * - Custom (HiveMQ) with MPU: "moving" only when speed > threshold AND MPU suggests motion (vib/ia_tot).
 * - No movement/MPU: moving when speed > 0; idle/off from RPM.
 */
export function getDrivingStatus(record: TelemetryLike): DrivingStatus {
  if (!record) return "off";

  const spd = record.spd ?? 0;
  const rpm = record.rpm ?? 0;

  // Explicit ignition off (Flespi engine.ignition.status): engine is off regardless of cached RPM/movement
  if (record.ignition === false) return "off";

  // Explicit movement.status (Flespi): only show moving when true
  if (record.mov === true) return "moving";
  if (record.mov === false) {
    if (rpm > ENGINE_ON_RPM_THRESHOLD) return "idle";
    return "off";
  }

  // Custom devices (HiveMQ) with MPU: only show moving when speed is above threshold AND MPU indicates motion
  if (hasMpuData(record)) {
    if (spd > MOVING_SPEED_KMH && mpuSuggestsMoving(record)) return "moving";
    if (rpm > ENGINE_ON_RPM_THRESHOLD) return "idle";
    return "off";
  }

  // No movement.status and no MPU: use speed and RPM only
  if (spd > MOVING_SPEED_KMH) return "moving";
  if (rpm > ENGINE_ON_RPM_THRESHOLD) return "idle";
  return "off";
}

/** Human-readable label for map/UI. */
export function getDrivingStatusLabel(record: TelemetryLike): string {
  switch (getDrivingStatus(record)) {
    case "moving":
      return "Moving";
    case "idle":
      return "Stationary (Idling)";
    case "off":
    default:
      return "Stationary (Engine off)";
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
