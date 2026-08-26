import { Router, Request, Response } from 'express';
import { mockData } from '../db.js';

export const pharmaciesRouter = Router();

const PLACES_API = 'https://maps.googleapis.com/maps/api/place';

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
  // simulate real stock variance per result
  const r = Math.random();
  if (r < 0.15) return 0;
  if (r < 0.3) return Math.floor(Math.random() * 3) + 1;
  return Math.floor(Math.random() * 30) + 4;
}

// ─── format a Google Places result into our Pharmacy shape ──────────────────

function formatPlacesResult(
  place: Record<string, any>,
  userLat: number,
  userLng: number,
  query: string
) {
  const lat = place.geometry?.location?.lat ?? userLat;
  const lng = place.geometry?.location?.lng ?? userLng;
  const dist = haversineKm(userLat, userLng, lat, lng);
  const stock = randomStock();
  const isOpen: boolean =
    place.opening_hours?.open_now !== undefined
      ? place.opening_hours.open_now
      : true;

  return {
    id: place.place_id,
    name: place.name,
    address: place.vicinity ?? '',
    distance: dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`,
    open: isOpen ? 'Open now' : 'Closed',
    stock,
    fresh: `${Math.floor(Math.random() * 10) + 1} min ago`,
    price: `₹${(Math.random() * 80 + 20).toFixed(0)}`,
    state: isOpen ? stockState(stock) : ('out' as const),
    rating: place.rating ?? null,
    totalRatings: place.user_ratings_total ?? 0,
    types: place.types ?? [],
    medicine: query,
    lat,
    lng,
  };
}

// ─── GET /api/pharmacies ─────────────────────────────────────────────────────

pharmaciesRouter.get('/', async (req: Request, res: Response) => {
  const query  = String(req.query.query  || 'Paracetamol 500 mg');
  const lat    = parseFloat(String(req.query.lat  || '12.9716'));
  const lng    = parseFloat(String(req.query.lng  || '77.5946'));
  const radius = parseInt(String(req.query.radius || '3000'), 10);

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn('GOOGLE_PLACES_API_KEY not set — returning mock data');
    return res.json(mockData.pharmacies);
  }

  try {
    // Search for pharmacies AND hospitals/clinics near the user
    const types = ['pharmacy', 'hospital', 'doctor', 'drugstore'];
    const allResults: Record<string, any>[] = [];

    await Promise.all(
      types.map(async (type) => {
        const url =
          `${PLACES_API}/nearbysearch/json` +
          `?location=${lat},${lng}` +
          `&radius=${radius}` +
          `&type=${type}` +
          `&keyword=${encodeURIComponent('medical pharmacy clinic')}` +
          `&key=${apiKey}`;

        const r = await fetch(url);
        const json: Record<string, any> = await r.json();

        if (json.status === 'OK' && Array.isArray(json.results)) {
          allResults.push(...json.results);
        } else if (json.status === 'REQUEST_DENIED') {
          console.error('Google Places API denied:', json.error_message);
        } else {
          console.warn(`Places type "${type}" status:`, json.status);
        }
      })
    );

    if (allResults.length === 0) {
      console.warn('No Google Places results — falling back to mock data');
      return res.json(mockData.pharmacies);
    }

    // De-duplicate by place_id, sort by distance
    const seen = new Set<string>();
    const unique = allResults.filter((p) => {
      if (seen.has(p.place_id)) return false;
      seen.add(p.place_id);
      return true;
    });

    const formatted = unique
      .map((p) => formatPlacesResult(p, lat, lng, query))
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
      .slice(0, 12); // cap at 12 results

    console.log(`✅ Google Places returned ${formatted.length} nearby medical places for query "${query}"`);
    return res.json(formatted);
  } catch (err: any) {
    console.error('Google Places API error:', err.message);
    return res.json(mockData.pharmacies);
  }
});

// ─── GET /api/pharmacies/:placeId/details ────────────────────────────────────

pharmaciesRouter.get('/:placeId/details', async (req: Request, res: Response) => {
  const placeId = String(req.params.placeId);
  const apiKey  = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) return res.status(503).json({ error: 'Google API not configured' });

  try {
    const url =
      `${PLACES_API}/details/json` +
      `?place_id=${placeId}` +
      `&fields=name,formatted_address,formatted_phone_number,opening_hours,website,geometry,rating,user_ratings_total` +
      `&key=${apiKey}`;

    const r    = await fetch(url);
    const json: Record<string, any> = await r.json();

    if (json.status !== 'OK') {
      return res.status(400).json({ error: json.status, message: json.error_message });
    }

    return res.json(json.result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pharmacies/autocomplete ────────────────────────────────────────

pharmaciesRouter.get('/autocomplete', async (req: Request, res: Response) => {
  const input  = String(req.query.input || '');
  const lat    = parseFloat(String(req.query.lat  || '12.9716'));
  const lng    = parseFloat(String(req.query.lng  || '77.5946'));
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey || !input) return res.json([]);

  try {
    const url =
      `${PLACES_API}/autocomplete/json` +
      `?input=${encodeURIComponent(input)}` +
      `&location=${lat},${lng}` +
      `&radius=5000` +
      `&types=establishment` +
      `&key=${apiKey}`;

    const r    = await fetch(url);
    const json: Record<string, any> = await r.json();

    if (json.status !== 'OK') return res.json([]);

    const suggestions = (json.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text,
    }));

    return res.json(suggestions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
