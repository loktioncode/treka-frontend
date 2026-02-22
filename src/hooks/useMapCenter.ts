"use client";

import { useAuth } from "@/contexts/AuthContext";

/** Johannesburg - default center when user has not set country/city */
const JOHANNESBURG_CENTER = { lat: -26.2041, lon: 28.0473 };

/**
 * Returns the user's preferred map center from profile settings.
 * Used to center all maps across the app. Defaults to Johannesburg if not set.
 */
export function useMapCenter(): { lat: number; lon: number } {
  const { user } = useAuth();
  const center = user?.map_center;
  if (center && typeof center.lat === "number" && typeof center.lon === "number") {
    return { lat: center.lat, lon: center.lon };
  }
  return JOHANNESBURG_CENTER;
}
