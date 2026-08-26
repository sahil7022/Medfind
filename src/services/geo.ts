export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  city?: string;
}

export function getCurrentUserLocation(): Promise<LocationCoordinates> {
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: 'Your Location'
          });
        },
        (error) => {
          console.warn('Geolocation permission denied/unavailable, defaulting to Bengaluru:', error.message);
          // Default to Bengaluru Prototype Center
          resolve({
            latitude: 12.9716,
            longitude: 77.5946,
            city: 'Bengaluru'
          });
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      resolve({
        latitude: 12.9716,
        longitude: 77.5946,
        city: 'Bengaluru'
      });
    }
  });
}
