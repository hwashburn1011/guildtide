import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import { requestLogger, performanceMonitor } from './middleware/requestLogger';
import { globalErrorHandler } from './middleware/errorHandler';
import { rateLimiter, authRateLimiter } from './middleware/rateLimiter';
import { securityHeaders, csrfProtection, xssSanitizer } from './middleware/security';
import { validateBody } from './middleware/validator';
import { cacheMiddleware } from './middleware/cache';
import { paginate, type PaginationParams } from './middleware/pagination';
import { HealthService } from './services/HealthService';
import { scheduler } from './jobs/scheduler';
import { registerCronJobs } from './jobs/cronJobs';
import { getPerformanceMetrics } from './middleware/requestLogger';
import { errorTracker } from './middleware/errorHandler';

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
import { accountRouter } from './routes/account';
import { resourcesRouter } from './routes/resources';
import { financeRouter } from './routes/finance';
import { regionsRouter } from './routes/regions';
import { socialRouter } from './routes/social';
import { alliancesRouter } from './routes/alliances';
import { leaderboardsRouter } from './routes/leaderboards';
import { combatRouter } from './routes/combat';
import { narrativeRouter } from './routes/narrative';
import { analyticsRouter } from './routes/analytics';

// ---------------------------------------------------------------------------
// Validate configuration on startup
// ---------------------------------------------------------------------------
try {
  validateConfig();
} catch (err: any) {
  console.error('FATAL: Configuration validation failed:', err.message);
  process.exit(1);
}

const app = express();

// ---------------------------------------------------------------------------
// Global middleware chain
// ---------------------------------------------------------------------------

// Security headers (Helmet-like)
app.use(securityHeaders);

// CORS
app.use(cors({ origin: config.corsOrigin, credentials: true }));

// Body parsing with size limits
app.use(express.json({ limit: config.maxBodySize }));
app.use(express.urlencoded({ extended: true, limit: config.maxBodySize }));

// Request logging & performance monitoring
app.use(requestLogger);
app.use(performanceMonitor);

// XSS sanitization for all request bodies
app.use(xssSanitizer);

// Global API rate limiting
app.use('/api', rateLimiter('api'));

// Stricter rate limiting for auth endpoints
app.use('/api/auth', authRateLimiter());

// CSRF protection for state-changing requests
app.use(csrfProtection);

// ---------------------------------------------------------------------------
// Health & readiness endpoints (no auth required)
// ---------------------------------------------------------------------------

app.get('/api/health', async (_req, res) => {
  const health = await HealthService.getHealth();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/api/health/ready', async (_req, res) => {
  const readiness = await HealthService.isReady();
  res.status(readiness.ready ? 200 : 503).json(readiness);
});

app.get('/api/health/live', (_req, res) => {
  res.json(HealthService.isAlive());
});

// Admin metrics endpoint
app.get('/api/admin/metrics', (_req, res) => {
  res.json({
    performance: getPerformanceMetrics(),
    errors: {
      recent: errorTracker.getRecent(20),
      summary: errorTracker.getSummary(),
    },
    scheduler: scheduler.getStatus(),
    memory: process.memoryUsage(),
  });
});

// API version info
app.get('/api/version', (_req, res) => {
  res.json({
    version: '1.0.0',
    apiVersion: 'v1',
    deprecation: null,
  });
  res.setHeader('X-API-Version', 'v1');
});

// API documentation endpoint (OpenAPI stub)
app.get('/api/docs', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Guildtide API',
      version: '1.0.0',
      description: 'ARPG guild management game API',
    },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/auth/login': { post: { summary: 'Login with email and password' } },
      '/auth/register': { post: { summary: 'Register a new account' } },
      '/guild': { get: { summary: 'Get current guild' } },
      '/heroes': { get: { summary: 'List guild heroes' } },
      '/market': { get: { summary: 'List market listings' } },
      '/expeditions': { get: { summary: 'List expeditions' } },
      '/buildings': { get: { summary: 'List guild buildings' } },
      '/research': { get: { summary: 'List research projects' } },
      '/items': { get: { summary: 'List inventory items' } },
      '/world': { get: { summary: 'Get world state' } },
      '/events': { get: { summary: 'List active events' } },
      '/health': { get: { summary: 'Health check' } },
    },
  });
});

// ---------------------------------------------------------------------------
// API v1 routes
// ---------------------------------------------------------------------------
const v1 = express.Router();

v1.use('/auth', authRouter);
v1.use('/guild', guildRouter);
v1.use('/player', playerRouter);
v1.use('/buildings', buildingsRouter);
v1.use('/heroes', heroesRouter);
v1.use('/world', worldRouter);
v1.use('/events', eventsRouter);
v1.use('/expeditions', expeditionsRouter);
v1.use('/market', marketRouter);
v1.use('/research', researchRouter);
v1.use('/items', itemsRouter);
v1.use('/account', accountRouter);
v1.use('/resources', resourcesRouter);
v1.use('/finance', financeRouter);
v1.use('/regions', regionsRouter);
v1.use('/social', socialRouter);
v1.use('/alliances', alliancesRouter);
v1.use('/leaderboards', leaderboardsRouter);
v1.use('/combat', combatRouter);
v1.use('/narrative', narrativeRouter);
v1.use('/analytics', analyticsRouter);

// Mount v1 at both /api/v1 and /api (backward compat)
app.use('/api/v1', v1);
app.use('/api', v1);

// API version deprecation header on legacy prefix
app.use('/api', (_req, res, next) => {
  if (!_req.path.startsWith('/v1')) {
    res.setHeader('X-API-Deprecation', 'Please migrate to /api/v1/ prefix');
  }
  next();
});

// ---------------------------------------------------------------------------
// Global error handler (must be last)
// ---------------------------------------------------------------------------
app.use(globalErrorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const server = app.listen(config.port, () => {
  logger.info(`Guildtide server v1.0.0 running on port ${config.port}`, {
    environment: config.nodeEnv,
    features: config.featureFlags,
  });

  // Register and start cron jobs
  if (config.featureFlags.enableCronJobs) {
    registerCronJobs();
    scheduler.startAll();
  }
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    // Stop cron jobs
    await scheduler.stopAll();

    // Close database connection
    try {
      const { prisma } = await import('./db');
      await prisma.$disconnect();
      logger.info('Database connection closed');
    } catch {
      // Ignore disconnect errors
    }

    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force exit after 15s if connections hang
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 15_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection', { error: reason?.message ?? String(reason) });
});
