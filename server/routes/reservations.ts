import { Router, Request, Response } from 'express';
import { pool, mockData } from '../db.js';

export const reservationsRouter = Router();

// GET /api/reservations
reservationsRouter.get('/', async (req: Request, res: Response) => {
  res.json(mockData.requests);
});

// POST /api/reservations
reservationsRouter.post('/', async (req: Request, res: Response) => {
  const { id, medicine, qty, pharmacy, patientName } = req.body;
  const newReservation = {
    id: id || 'MF' + Math.floor(1000 + Math.random() * 9000),
    item: `${medicine || 'Paracetamol 500 mg'} × ${qty || 1}`,
    status: 'Pending',
    patientName: patientName || 'Patient'
  };

  mockData.requests.unshift(newReservation);

  try {
    if (process.env.DATABASE_URL) {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await pool.query(
        `INSERT INTO reservations (id, pharmacy_name, medicine_name, quantity, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newReservation.id, pharmacy || 'CityCare Pharmacy', medicine || 'Paracetamol 500 mg', qty || 1, 'Pending', expiresAt]
      );
    }
  } catch (err) {
    console.warn('PostgreSQL insert error, using local queue:', err);
  }

  res.status(201).json(newReservation);
});

// PATCH /api/reservations/:id/confirm
reservationsRouter.patch('/:id/confirm', async (req: Request, res: Response) => {
  const reqId = String(req.params.id);
  const reqItem = mockData.requests.find(r => r.id === reqId);

  if (reqItem) {
    reqItem.status = 'Confirmed';
    return res.json(reqItem);
  }

  res.status(404).json({ error: 'Reservation not found' });
});
