/**
 * Forward geocoding via Mapbox - search for places/cities and get coordinates.
 */
export interface GeocodingResult {
  name: string;
  placeFormatted?: string;
  country?: string;
  lat: number;
  lon: number;
}

export async function searchPlaces(
  query: string,
  accessToken: string,
  limit = 5
): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
    types: "place,locality,address",
    access_token: accessToken,
  });

  try {
    const res = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?${params}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const features = data.features ?? [];
    return features.map((f: {
      properties?: { name?: string; place_formatted?: string; context?: { country?: { name?: string }; place?: { name?: string } } };
      geometry?: { coordinates?: number[] };
    }) => ({
      name: f.properties?.name ?? "",
      placeFormatted: f.properties?.place_formatted,
      country: f.properties?.context?.country?.name,
      lon: f.geometry?.coordinates?.[0] ?? 0,
      lat: f.geometry?.coordinates?.[1] ?? 0,
    }));
  } catch {
    return [];
  }
}
