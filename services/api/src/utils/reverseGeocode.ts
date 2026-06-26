/**
 * Reverse-geocode a lat/lng to a human-readable city name using
 * OpenStreetMap Nominatim (free, no API key required).
 * Returns "Tamil Nadu" as fallback if the call fails or the address is unknown.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SmartLorryMarketplace/1.0 (contact@smartlorry.in)" },
      signal: AbortSignal.timeout(5000), // 5-second timeout
    });
    const json = await res.json() as {
      address?: { city?: string; town?: string; county?: string; state?: string };
    };
    return (
      json.address?.city ??
      json.address?.town ??
      json.address?.county ??
      "Tamil Nadu"
    );
  } catch {
    return "Tamil Nadu";
  }
}
