import { Router, Request, Response } from 'express';
import { mockData } from '../db.js';

export const pharmaciesRouter = Router();

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || '';

function hasGeoapifyKey(): boolean {
  if (!GEOAPIFY_API_KEY) {
    console.warn('GEOAPIFY_API_KEY is not set — set it in .env to enable live location data');
    return false;
  }
  return true;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stockState(qty: number): 'good' | 'warn' | 'out' {
  if (qty === 0) return 'out';
  if (qty <= 3) return 'warn';
  return 'good';
}

function randomStock(): number {
  const r = Math.random();
  if (r < 0.15) return 0;
  if (r < 0.3) return Math.floor(Math.random() * 3) + 1;
  return Math.floor(Math.random() * 30) + 4;
}

function formatGeoapifyResult(
  place: Record<string, any>,
  userLat: number,
  userLng: number,
  query: string
) {
  const props = place.properties || {};
  const lat = props.lat ?? userLat;
  const lng = props.lon ?? userLng;
  const dist = haversineKm(userLat, userLng, lat, lng);
  const stock = randomStock();
  const isOpen = true; // Geoapify doesn't reliably give opening_hours in the free tier

  return {
    id: props.place_id,
    name: props.name || props.address_line1 || 'Pharmacy',
    address: props.address_line2 || props.formatted || '',
    distance: dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`,
    distanceKm: dist,
    open: isOpen ? 'Open now' : 'Closed',
    stock,
    fresh: `${Math.floor(Math.random() * 10) + 1} min ago`,
    price: `₹${(Math.random() * 80 + 20).toFixed(0)}`,
    state: isOpen ? stockState(stock) : ('out' as const),
    rating: Number((Math.random() * 2 + 3).toFixed(1)), // Geoapify lacks ratings mostly, mock it
    totalRatings: Math.floor(Math.random() * 500) + 10,
    types: props.categories ?? [],
    medicine: query,
    lat,
    lng,
  };
}

// ─── POST /api/pharmacies/geolocate (Geoapify IP Info API — coarse fallback) ──

pharmaciesRouter.post('/geolocate', async (req: Request, res: Response) => {
  if (!hasGeoapifyKey()) return res.status(503).json({ error: 'Geolocation service not configured' });

  try {
    const geoRes = await fetch(`https://api.geoapify.com/v1/ipinfo?apiKey=${GEOAPIFY_API_KEY}`);
    const geoData: Record<string, any> = await geoRes.json();

    if (geoData.error) {
       return res.status(400).json({ error: geoData.error.message || 'Geoapify IP Info Error' });
    }

    let lat = geoData.location?.latitude ?? 12.9716;
    let lng = geoData.location?.longitude ?? 77.5946;

    // Build the most specific area name available from the IP info payload
    const city =
      geoData.city?.name ||
      geoData.suburb?.name ||
      geoData.state?.name ||
      geoData.country?.name ||
      null;

    return res.json({
      latitude: lat,
      longitude: lng,
      city: city || 'Detected Area',
      accuracy: 'ip-coarse',
      source: 'geoapify-ip'
    });
  } catch (err: any) {
    console.error('Geoapify Geolocation error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pharmacies/reverse-geocode (coords → real place name) ───────────

pharmaciesRouter.get('/reverse-geocode', async (req: Request, res: Response) => {
  const lat = parseFloat(String(req.query.lat || ''));
  const lng = parseFloat(String(req.query.lng || ''));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng query params required' });
  }

  if (!hasGeoapifyKey()) return res.status(503).json({ error: 'Geocoding service not configured' });

  try {
    const url =
      `https://api.geoapify.com/v1/geocode/reverse` +
      `?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_API_KEY}`;
    const r = await fetch(url);
    const json: Record<string, any> = await r.json();

    if (!json.features || json.features.length === 0) {
      return res.status(404).json({ error: 'No address found for these coordinates' });
    }

    const props = json.features[0].properties || {};
    const area =
      props.suburb ||
      props.district ||
      props.city ||
      props.town ||
      props.village ||
      props.county ||
      props.state ||
      props.formatted?.split(',')[0] ||
      'Current Location';

    return res.json({
      latitude: lat,
      longitude: lng,
      city: area,
      formattedAddress: props.formatted || area,
      accuracy: props.rank?.confidence_note || undefined,
      source: 'gps-reverse-geocode'
    });
  } catch (err: any) {
    console.error('Reverse geocode error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pharmacies/geocode (Geoapify Geocoding API) ────────────────────

pharmaciesRouter.get('/geocode', async (req: Request, res: Response) => {
  const address = String(req.query.address || '');

  if (!address) {
    return res.status(400).json({ error: 'Address required' });
  }

  if (!hasGeoapifyKey()) return res.status(503).json({ error: 'Geocoding service not configured' });

  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${GEOAPIFY_API_KEY}`;
    const r = await fetch(url);
    const json: Record<string, any> = await r.json();

    if (json.statusCode === 401) {
      return res.status(401).json({ error: 'Geoapify API Error: Unauthorized' });
    }
    
    if (!json.features || json.features.length === 0) {
      return res.status(404).json({ error: 'Location not found via Geoapify' });
    }

    const feature = json.features[0];
    const loc = feature.geometry.coordinates; // [lon, lat]
    return res.json({
      latitude: loc[1],
      longitude: loc[0],
      formattedAddress: feature.properties.formatted || address
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pharmacies ─────────────────────────────────────────────────────

pharmaciesRouter.get('/', async (req: Request, res: Response) => {
  const query  = String(req.query.query  || 'Paracetamol 500 mg');
  const lat    = parseFloat(String(req.query.lat  || '12.9716'));
  const lng    = parseFloat(String(req.query.lng  || '77.5946'));
  const radius = parseInt(String(req.query.radius || '5000'), 10);

  if (!hasGeoapifyKey()) return res.json(mockData.pharmacies);

  try {
    // Geoapify categories for pharmacies, hospitals and clinics
    const categories = 'healthcare.pharmacy,healthcare.hospital,healthcare.clinic_or_praxis';

    const fetchPlaces = async (r: number) =>
      fetch(
        `https://api.geoapify.com/v2/places` +
        `?categories=${categories}` +
        `&filter=circle:${lng},${lat},${r}` +
        `&limit=20` +
        `&apiKey=${GEOAPIFY_API_KEY}`
      ).then((resp) => resp.json());

    let json: Record<string, any> = await fetchPlaces(radius);

    // Retry with a much wider radius before giving up (rural / sparse areas)
    if ((!json.features || json.features.length === 0) && radius < 20000) {
      json = await fetchPlaces(20000);
    }

    if (!json.features || json.features.length === 0) {
      console.warn('No Geoapify Places results — falling back to mock data');
      return res.json(mockData.pharmacies);
    }

    const allResults = json.features;
    const seen = new Set<string>();
    const unique = allResults.filter((p: any) => {
      const placeId = p.properties?.place_id;
      if (!placeId || seen.has(placeId)) return false;
      seen.add(placeId);
      return true;
    });

    const formatted = unique
      .map((p: any) => formatGeoapifyResult(p, lat, lng, query))
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
      .slice(0, 12);

    console.log(`✅ Geoapify returned ${formatted.length} nearby medical places for query "${query}"`);
    return res.json(formatted);
  } catch (err: any) {
    console.error('Geoapify Places API error:', err.message);
    return res.json(mockData.pharmacies);
  }
});

// ─── GET /api/pharmacies/:placeId/details ────────────────────────────────────

pharmaciesRouter.get('/:placeId/details', async (req: Request, res: Response) => {
  const placeId = String(req.params.placeId);

  if (!hasGeoapifyKey()) return res.status(503).json({ error: 'Place details service not configured' });

  try {
    const url = `https://api.geoapify.com/v2/place-details?id=${placeId}&apiKey=${GEOAPIFY_API_KEY}`;
    const r    = await fetch(url);
    const json: Record<string, any> = await r.json();

    if (!json.features || json.features.length === 0) {
      return res.status(404).json({ error: 'Place details not found' });
    }
    
    const props = json.features[0].properties;

    // Map geoapify properties to look somewhat like the old Google Places result
    // so the frontend component (PharmacyCard) still works without breaking.
    const result = {
      name: props.name || props.address_line1 || 'Pharmacy',
      formatted_address: props.formatted || '',
      formatted_phone_number: props.contact?.phone || 'Not available',
      website: props.website || '',
      geometry: {
        location: {
          lat: props.lat,
          lng: props.lon
        }
      },
      rating: Number((Math.random() * 2 + 3).toFixed(1)), // Mock rating
      user_ratings_total: Math.floor(Math.random() * 500) + 10
    };

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pharmacies/autocomplete ────────────────────────────────────────

pharmaciesRouter.get('/autocomplete', async (req: Request, res: Response) => {
  const input  = String(req.query.input || '');
  const lat    = parseFloat(String(req.query.lat  || '12.9716'));
  const lng    = parseFloat(String(req.query.lng  || '77.5946'));

  if (!input) return res.json([]);
  if (!hasGeoapifyKey()) return res.json([]);

  try {
    const url =
      `https://api.geoapify.com/v1/geocode/autocomplete` +
      `?text=${encodeURIComponent(input)}` +
      `&filter=circle:${lng},${lat},10000` + // 10km radius bias
      `&apiKey=${GEOAPIFY_API_KEY}`;

    const r    = await fetch(url);
    const json: Record<string, any> = await r.json();

    if (!json.features) return res.json([]);

    const suggestions = json.features.map((f: any) => ({
      placeId: f.properties.place_id,
      description: f.properties.formatted,
      mainText: f.properties.address_line1 || f.properties.name,
    }));

    return res.json(suggestions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
