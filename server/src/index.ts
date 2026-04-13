import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authRouter } from './routes/auth';
import { guildRouter } from './routes/guild';
import { playerRouter } from './routes/player';
import { buildingsRouter } from './routes/buildings';
import { heroesRouter } from './routes/heroes';
import { worldRouter } from './routes/world';
import { eventsRouter } from './routes/events';
import { expeditionsRouter } from './routes/expeditions';
import { marketRouter } from './routes/market';
import { researchRouter } from './routes/research';
import { itemsRouter } from './routes/items';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${_res.statusCode} ${duration}ms`);
  });
  next();
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/guild', guildRouter);
app.use('/api/player', playerRouter);
app.use('/api/buildings', buildingsRouter);
app.use('/api/heroes', heroesRouter);
app.use('/api/world', worldRouter);
app.use('/api/events', eventsRouter);
app.use('/api/expeditions', expeditionsRouter);
app.use('/api/market', marketRouter);
app.use('/api/research', researchRouter);
app.use('/api/items', itemsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`Guildtide server v1.0.0 running on port ${config.port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  // Force exit after 10s if connections hang
  setTimeout(() => {
    console.log('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
