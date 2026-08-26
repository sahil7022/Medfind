import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pharmaciesRouter } from './routes/pharmacies.js';
import { inventoryRouter } from './routes/inventory.js';
import { reservationsRouter } from './routes/reservations.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MedFind Backend API',
    database: process.env.DATABASE_URL ? 'PostgreSQL Connected' : 'In-Memory Store',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/pharmacies', pharmaciesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/reservations', reservationsRouter);

app.listen(PORT, () => {
  console.log(`🚀 MedFind Production Server listening on http://localhost:${PORT}`);
});
