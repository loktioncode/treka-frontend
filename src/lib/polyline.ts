/**
 * Google-style polyline encode/decode using @mapbox/polyline.
 * Converts between encoded strings and GeoJSON [lng, lat] coordinates for map drawing.
 */
import polyline from "@mapbox/polyline";

/** GeoJSON LineString coordinates: [longitude, latitude][] */
export type GeoJSONCoords = [number, number][];

/**
 * Decode an encoded polyline string to GeoJSON LineString coordinates [lng, lat][].
 * Use this to draw polylines on Mapbox/GeoJSON maps.
 * @param encoded - Encoded polyline string (e.g. from Directions API with geometries=polyline)
 * @param precision - Optional; default 5. Use 6 for polyline6.
 */
export function decodeToGeoJSON(
  encoded: string,
  precision?: number
): GeoJSONCoords {
  const decoded = precision !== undefined
    ? polyline.decode(encoded, precision)
    : polyline.decode(encoded);
  // polyline returns [lat, lng]; GeoJSON uses [lng, lat]
  return decoded.map(([lat, lng]) => [lng, lat] as [number, number]);
}

/**
 * Decode encoded polyline to a GeoJSON LineString geometry (for Source/Layer).
 */
export function decodedToLineString(
  encoded: string,
  precision?: number
): GeoJSON.LineString {
  return {
    type: "LineString",
    coordinates: decodeToGeoJSON(encoded, precision),
  };
}

/**
 * Encode GeoJSON LineString coordinates [lng, lat][] to a polyline string.
 * Use when you have map coordinates and need to send/store as encoded polyline.
 */
export function encodeFromGeoJSON(
  coordinates: GeoJSONCoords,
  precision?: number
): string {
  // GeoJSON is [lng, lat]; polyline.encode expects [lat, lng]
  const latLngPairs = coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  return precision !== undefined
    ? polyline.encode(latLngPairs, precision)
    : polyline.encode(latLngPairs);
}

/**
 * Encode a GeoJSON Feature or LineString to polyline string (fromGeoJSON).
 */
export function fromGeoJSON(
  geojson: GeoJSON.Feature<GeoJSON.LineString> | { type: "LineString"; coordinates: GeoJSONCoords },
  precision?: number
): string {
  return precision !== undefined
    ? polyline.fromGeoJSON(geojson as Parameters<typeof polyline.fromGeoJSON>[0], precision)
    : polyline.fromGeoJSON(geojson as Parameters<typeof polyline.fromGeoJSON>[0]);
}

/**
 * Chaikin's corner-cutting algorithm: smooths a polyline by iteratively
 * cutting corners. Produces a smoother path from raw GPS coordinates.
 * @param coords - GeoJSON coordinates [lng, lat][]
 * @param iterations - Number of smoothing passes (default 2; 3–4 for very jagged paths)
 */
export function smoothPolyline(
  coords: [number, number][],
  iterations = 2
): [number, number][] {
  if (coords.length < 3) return coords;
  let result = coords;
  for (let iter = 0; iter < iterations; iter++) {
    const next: [number, number][] = [result[0]];
    for (let i = 0; i < result.length - 1; i++) {
      const [lngA, latA] = result[i];
      const [lngB, latB] = result[i + 1];
      next.push(
        [lngA * 0.75 + lngB * 0.25, latA * 0.75 + latB * 0.25],
        [lngA * 0.25 + lngB * 0.75, latA * 0.25 + latB * 0.75]
      );
    }
    next.push(result[result.length - 1]);
    result = next;
  }
  return result;
}

/**
 * Decode encoded polyline to GeoJSON LineString geometry (toGeoJSON).
 * Library already returns [lng, lat] per GeoJSON spec.
 */
export function toGeoJSON(
  encoded: string,
  precision?: number
): GeoJSON.LineString {
  return (precision !== undefined
    ? polyline.toGeoJSON(encoded, precision)
    : polyline.toGeoJSON(encoded)) as GeoJSON.LineString;
}
