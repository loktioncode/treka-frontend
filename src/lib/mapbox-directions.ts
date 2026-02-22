/**
 * Fetch driving route from Mapbox Directions API.
 * Returns road-following polyline coordinates for display on map.
 * Uses shortest route (waypoints should be pre-optimized for minimum distance).
 */
import { decodeToGeoJSON } from "./polyline";

export interface DirectionsResult {
  coordinates: [number, number][]; // GeoJSON [lng, lat][]
  distanceKm: number;
  durationMin: number;
}

export async function fetchDrivingRoute(
  waypoints: { lat: number; lon: number }[],
  accessToken: string
): Promise<DirectionsResult | null> {
  if (waypoints.length < 2) return null;

  const coords = waypoints.map((w) => `${w.lon},${w.lat}`).join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`;
  const params = new URLSearchParams({
    geometries: "polyline",
    overview: "full",
    access_token: accessToken,
  });

  try {
    const res = await fetch(`${url}?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    const polyline = route.geometry;
    const coordinates = decodeToGeoJSON(polyline);

    return {
      coordinates,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch {
    return null;
  }
}
