import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { guildRouter } from './routes/guild.js';
import { playerRouter } from './routes/player.js';
import { buildingsRouter } from './routes/buildings.js';
import { heroesRouter } from './routes/heroes.js';
import { worldRouter } from './routes/world.js';
import { eventsRouter } from './routes/events.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/guild', guildRouter);
app.use('/api/player', playerRouter);
app.use('/api/buildings', buildingsRouter);
app.use('/api/heroes', heroesRouter);
app.use('/api/world', worldRouter);
app.use('/api/events', eventsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(config.port, () => {
  console.log(`Guildtide server running on port ${config.port}`);
});
