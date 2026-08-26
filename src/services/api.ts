const API_BASE = '/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Pharmacy {
  id: string;
  name: string;
  address?: string;
  distance: string;
  open: string;
  stock: number;
  fresh: string;
  price: string;
  state: 'good' | 'warn' | 'out';
  rating?: number | null;
  totalRatings?: number;
  types?: string[];
  medicine?: string;
  lat?: number;
  lng?: number;
}

export interface PlaceDetail {
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  fresh: string;
  state: 'good' | 'warn' | 'out';
}

export interface ReservationRequest {
  id: string;
  item: string;
  status: string;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const apiService = {
  /** Access user location via Google Maps Geolocation API */
  async geolocateWithGoogleMaps(): Promise<{ latitude: number; longitude: number; city: string; source: string }> {
    try {
      const res = await fetch(`${API_BASE}/pharmacies/geolocate`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error in Google Maps Geolocation:', e);
    }
    return { latitude: 12.9716, longitude: 77.5946, city: 'Bengaluru', source: 'fallback' };
  },

  /** Geocode address to lat/lng via Google Maps Geocoding API */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number; formattedAddress: string } | null> {
    try {
      const res = await fetch(`${API_BASE}/pharmacies/geocode?address=${encodeURIComponent(address)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error in Geocoding address:', e);
    }
    return null;
  },

  /** Search pharmacies / clinics near a location via Google Places */
  async getPharmacies(medicine: string, lat?: number, lng?: number): Promise<Pharmacy[]> {
    try {
      const params = new URLSearchParams({ query: medicine });
      if (lat !== undefined && lng !== undefined) {
        params.set('lat', String(lat));
        params.set('lng', String(lng));
      }
      const res = await fetch(`${API_BASE}/pharmacies?${params}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error fetching pharmacies:', e);
    }
    return [];
  },

  /** Get full Google Places details for a single place */
  async getPlaceDetails(placeId: string): Promise<PlaceDetail | null> {
    try {
      const res = await fetch(`${API_BASE}/pharmacies/${encodeURIComponent(placeId)}/details`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error fetching place details:', e);
    }
    return null;
  },

  /** Autocomplete clinic/pharmacy names via Google Places */
  async autocomplete(input: string, lat?: number, lng?: number): Promise<{ placeId: string; description: string; mainText: string }[]> {
    try {
      const params = new URLSearchParams({ input });
      if (lat !== undefined && lng !== undefined) {
        params.set('lat', String(lat));
        params.set('lng', String(lng));
      }
      const res = await fetch(`${API_BASE}/pharmacies/autocomplete?${params}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error in autocomplete:', e);
    }
    return [];
  },

  async getInventory(): Promise<InventoryItem[]> {
    try {
      const res = await fetch(`${API_BASE}/inventory`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error fetching inventory:', e);
    }
    return [];
  },

  async updateStock(id: string): Promise<InventoryItem | null> {
    try {
      const res = await fetch(`${API_BASE}/inventory/${id}`, { method: 'PATCH' });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error updating stock:', e);
    }
    return null;
  },

  async getRequests(): Promise<ReservationRequest[]> {
    try {
      const res = await fetch(`${API_BASE}/reservations`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error fetching requests:', e);
    }
    return [];
  },

  async confirmRequest(id: string): Promise<ReservationRequest | null> {
    try {
      const res = await fetch(`${API_BASE}/reservations/${id}/confirm`, { method: 'PATCH' });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error confirming request:', e);
    }
    return null;
  },

  async createReservation(payload: {
    id: string;
    medicine: string;
    qty: number;
    pharmacy: string;
  }) {
    try {
      const res = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error creating reservation:', e);
    }
    return null;
  },
};
