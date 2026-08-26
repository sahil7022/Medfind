import { Router, Request, Response } from 'express';
import { pool, mockData } from '../db.js';

export const inventoryRouter = Router();

// GET /api/inventory
inventoryRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (process.env.DATABASE_URL) {
      const result = await pool.query('SELECT * FROM inventory ORDER BY medicine_name ASC');
      if (result.rows.length > 0) {
        return res.json(result.rows.map(item => ({
          id: item.id,
          name: item.medicine_name,
          stock: item.stock_count,
          unit: item.unit,
          fresh: 'just now',
          state: item.stock_state
        })));
      }
    }
  } catch (err) {
    console.warn('PostgreSQL query error, falling back to mock inventory:', err);
  }

  res.json(mockData.inventory);
});

// PATCH /api/inventory/:id
inventoryRouter.patch('/:id', async (req: Request, res: Response) => {
  const itemId = String(req.params.id);
  const index = mockData.inventory.findIndex(item => item.id === itemId || mockData.inventory.indexOf(item) === parseInt(itemId, 10));

  if (index !== -1) {
    const item = mockData.inventory[index];
    item.stock++;
    item.fresh = 'just now';
    item.state = item.stock <= 2 ? 'warn' : 'good';
    return res.json(item);
  }

  res.status(404).json({ error: 'Item not found' });
});
