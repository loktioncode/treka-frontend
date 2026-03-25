import { useState, useEffect, useMemo, useCallback } from "react";
import { TelemetryRecord } from "@/types/api";

/** Monotonic time for ordering / playback (ts_server wins, then device ts in ms). */
export function getTelemetryRecordTimeMs(r: TelemetryRecord): number {
  if (r.ts_server) return new Date(r.ts_server).getTime();
  const t = r.ts ?? 0;
  return t < 1e12 ? t * 1000 : t;
}

export function useRouteReplayTelemetry(
  records: TelemetryRecord[] | undefined,
) {
  const sortedRecords = useMemo(() => {
    if (!records?.length) return [];
    return [...records].sort(
      (a, b) => getTelemetryRecordTimeMs(a) - getTelemetryRecordTimeMs(b),
    );
  }, [records]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (
      isPlaying &&
      sortedRecords.length > 0 &&
      currentIndex < sortedRecords.length - 1
    ) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1000 / playbackSpeed);
    } else {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, sortedRecords, playbackSpeed]);

  // Reset when the incoming batch changes (new fetch / date filter). Depend on `records`
  // (prop identity + content) so we never keep stale indices or counts when the parent replaces data.
  const recordsFingerprint = useMemo(() => {
    if (!records?.length) return `0:${records?.length ?? "undef"}`;
    const first = getTelemetryRecordTimeMs(records[0]);
    const last = getTelemetryRecordTimeMs(records[records.length - 1]);
    return `${records.length}:${first}:${last}`;
  }, [records]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [recordsFingerprint]);

  const resetToStart = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  return {
    sortedRecords,
    currentIndex,
    setCurrentIndex,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    resetToStart,
  };
}

export type RouteReplayTelemetry = ReturnType<typeof useRouteReplayTelemetry>;
