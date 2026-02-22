/**
 * Route optimization for shortest distance - no AI, no extra API cost.
 * Uses nearest-neighbor TSP: keeps first waypoint as depot, orders the rest
 * by nearest unvisited stop. Reduces total km for fuel and mileage savings.
 */

export interface WaypointForOptimization {
  lat: number;
  lon: number;
  label?: string;
  order?: number;
}

/** Haversine distance in km between two points */
function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Reorder waypoints for shortest total distance using nearest-neighbor.
 * Keeps first waypoint as start (depot). Returns new array with updated order indices.
 */
export function optimizeWaypointOrderForShortestRoute<T extends WaypointForOptimization>(
  waypoints: T[]
): T[] {
  if (waypoints.length <= 2) return waypoints;

  const [start, ...rest] = waypoints;
  const ordered: T[] = [start];
  let remaining = [...rest];
  let current = start;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = haversineKm(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const next = remaining[nearestIdx];
    remaining = remaining.filter((_, i) => i !== nearestIdx);
    ordered.push(next);
    current = next;
  }

  return ordered.map((w, i) => ({ ...w, order: i }));
}
