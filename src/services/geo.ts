import { apiService } from './api';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  city?: string;
  source?: string;
}

/**
 * Resolves the user's location using device GPS (browser Geolocation API)
 * and reverse-geocodes the coordinates into a real area name.
 *
 * Priority:
 *   1. Browser GPS (accurate, real position) → server reverse geocode for name
 *   2. IP-based geolocation (coarse, no permission needed)
 *   3. Default (Bengaluru)
 */
export async function getCurrentUserLocation(): Promise<LocationCoordinates> {
  // 1. Device GPS via the browser Geolocation API
  const gps = await tryBrowserGeolocation();
  if (gps) {
    try {
      const resolved = await apiService.reverseGeocode(gps.latitude, gps.longitude);
      console.log('📍 Location resolved via GPS + reverse geocoding:', resolved.city);
      return { ...resolved, source: 'gps' };
    } catch {
      // Coordinates are still valid even if naming fails
      return { ...gps, city: 'Current Location', source: 'gps' };
    }
  }

  // 2. Coarse IP-based fallback
  try {
    const ipLoc = await apiService.geolocateWithGoogleMaps();
    if (ipLoc && ipLoc.source !== 'fallback') {
      console.log('📍 Location resolved via IP lookup:', ipLoc.city);
      return ipLoc;
    }
  } catch (err) {
    console.warn('IP geolocation failed:', err);
  }

  // 3. Default
  return { latitude: 12.9716, longitude: 77.5946, city: 'Bengaluru', source: 'default' };
}

function tryBrowserGeolocation(timeoutMs = 10000): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);

    let settled = false;
    const finish = (value: { latitude: number; longitude: number; accuracy: number } | null) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (position) =>
        finish({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => {
        console.warn('Browser geolocation unavailable:', error.message);
        finish(null);
      },
      { timeout: timeoutMs, enableHighAccuracy: true, maximumAge: 60000 }
    );
  });
}
