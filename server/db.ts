import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
});

// Haversine Geolocation Distance Calculation (in kilometers)
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// In-Memory Fallback Dataset
export const mockData = {
  pharmacies: [
    { id: 'p1', name: 'CityCare Pharmacy', address: 'MG Road, Bengaluru', distance: '0.4 km', open: 'Open now', stock: 8, fresh: '5 min ago', price: '₹32', state: 'good', rating: 4.3, totalRatings: 284, lat: 12.9716, lng: 77.5946 },
    { id: 'p2', name: 'HealthPlus Medicals', address: 'Indiranagar, Bengaluru', distance: '1.1 km', open: 'Open now', stock: 3, fresh: '18 min ago', price: '₹30', state: 'good', rating: 4.1, totalRatings: 156, lat: 12.9789, lng: 77.5912 },
    { id: 'p3', name: 'GreenCross Pharmacy', address: 'Koramangala, Bengaluru', distance: '1.8 km', open: 'Open now', stock: 1, fresh: '1 hr ago', price: '₹31', state: 'warn', rating: 3.9, totalRatings: 88, lat: 12.9650, lng: 77.6010 },
    { id: 'p4', name: 'MediPoint Clinic', address: 'BTM Layout, Bengaluru', distance: '3.1 km', open: 'Closed', stock: 0, fresh: '2 hrs ago', price: '—', state: 'out', rating: 4.0, totalRatings: 67, lat: 12.9500, lng: 77.5800 }
  ],
  inventory: [
    { id: 'i1', name: 'Paracetamol 500 mg', stock: 8, unit: 'units', fresh: '5 min ago', state: 'good' },
    { id: 'i2', name: 'Azithromycin 500 mg', stock: 3, unit: 'strips', fresh: '18 min ago', state: 'good' },
    { id: 'i3', name: 'Cetirizine 10 mg', stock: 1, unit: 'strips', fresh: '1 hr ago', state: 'warn' },
    { id: 'i4', name: 'Pantoprazole 40 mg', stock: 12, unit: 'strips', fresh: '9 min ago', state: 'good' },
    { id: 'i5', name: 'ORS Sachets', stock: 5, unit: 'packs', fresh: '12 min ago', state: 'good' },
    { id: 'i6', name: 'Amoxicillin 500 mg', stock: 2, unit: 'strips', fresh: '45 min ago', state: 'warn' }
  ],
  requests: [
    { id: 'MF1024', item: 'Paracetamol 500 mg × 2', status: 'Pending', patientName: 'Rahul Sharma' },
    { id: 'MF1020', item: 'Azithromycin 500 mg × 1', status: 'Confirmed', patientName: 'Priya Patel' },
    { id: 'MF1017', item: 'ORS Sachets × 1', status: 'Ready', patientName: 'Anish Kumar' }
  ]
};
