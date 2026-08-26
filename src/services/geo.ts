import { apiService } from './api';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  city?: string;
  source?: string;
}

/**
 * Retrieves location using Google Maps Geolocation API (server-side),
 * with fallback to Browser HTML5 Geolocation API if needed.
 */
export async function getCurrentUserLocation(): Promise<LocationCoordinates> {
  // 1. Try Google Maps Geolocation API
  try {
    const googleLoc = await apiService.geolocateWithGoogleMaps();
    if (googleLoc && googleLoc.source !== 'fallback') {
      console.log('📍 Location resolved via Google Maps API:', googleLoc);
      return googleLoc;
    }
  } catch (err) {
    console.warn('Google Maps Geolocation attempt failed, trying browser:', err);
  }

  // 2. Fallback to Browser Geolocation API
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: 'Current Location',
            source: 'browser'
          });
        },
        (error) => {
          console.warn('Browser Geolocation unavailable, defaulting to Bengaluru:', error.message);
          resolve({
            latitude: 12.9716,
            longitude: 77.5946,
            city: 'Bengaluru',
            source: 'default'
          });
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      resolve({
        latitude: 12.9716,
        longitude: 77.5946,
        city: 'Bengaluru',
        source: 'default'
      });
    }
  });
}
