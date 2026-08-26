import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { pharmaciesRouter } from './routes/pharmacies.js';
import { inventoryRouter } from './routes/inventory.js';
import { reservationsRouter } from './routes/reservations.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

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

// Unknown API routes → JSON 404 (never the SPA)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Production: serve the built SPA from /dist with history-API fallback
if (isProd) {
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { maxAge: '1y', index: false }));
    // SPA fallback for client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    console.warn('⚠ dist/ not found — run "npm run build" to build the frontend first');
  }
}

// Central error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 MedFind Production Server listening on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
