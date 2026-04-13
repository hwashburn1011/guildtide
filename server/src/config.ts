// ---------------------------------------------------------------------------
// Environment-based configuration management
// ---------------------------------------------------------------------------

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function intEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be an integer`);
  return parsed;
}

function boolEnv(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1';
}

export const config = {
  // Server
  port: intEnv('PORT', 4000),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  isProduction: optionalEnv('NODE_ENV', 'development') === 'production',

  // Auth / JWT
  jwtSecret: requireEnv('JWT_SECRET', 'guildtide-dev-secret'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '7d'),

  // Rate limiting
  rateLimitWindowMs: intEnv('RATE_LIMIT_WINDOW_MS', 60_000),
  rateLimitMaxRequests: intEnv('RATE_LIMIT_MAX', 100),
  rateLimitAuthMaxRequests: intEnv('RATE_LIMIT_AUTH_MAX', 20),

  // CORS
  corsOrigin: optionalEnv('CORS_ORIGIN', '*'),

  // Logging
  logLevel: optionalEnv('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
  logToFile: boolEnv('LOG_TO_FILE', false),
  logDir: optionalEnv('LOG_DIR', './logs'),

  // Database
  databaseUrl: optionalEnv('DATABASE_URL', 'file:./dev.db'),
  dbPoolMin: intEnv('DB_POOL_MIN', 2),
  dbPoolMax: intEnv('DB_POOL_MAX', 10),
  dbQueryTimeout: intEnv('DB_QUERY_TIMEOUT', 10_000),

  // Cache
  cacheTtlSeconds: intEnv('CACHE_TTL_SECONDS', 300),
  cacheMaxEntries: intEnv('CACHE_MAX_ENTRIES', 1000),

  // Request limits
  maxBodySize: optionalEnv('MAX_BODY_SIZE', '1mb'),
  maxFileSize: intEnv('MAX_FILE_SIZE', 5_242_880), // 5MB

  // Feature flags
  featureFlags: {
    enableCronJobs: boolEnv('FF_CRON_JOBS', true),
    enableBackgroundWorkers: boolEnv('FF_BACKGROUND_WORKERS', true),
    enableApiDocs: boolEnv('FF_API_DOCS', true),
    enableMetrics: boolEnv('FF_METRICS', true),
  },

  // External API keys (hashed storage reference)
  sentryDsn: optionalEnv('SENTRY_DSN', ''),
  webhookSecret: optionalEnv('WEBHOOK_SECRET', ''),
} as const;

/** Validate all critical config values at startup. */
export function validateConfig(): void {
  const errors: string[] = [];

  if (config.isProduction && config.jwtSecret === 'guildtide-dev-secret') {
    errors.push('JWT_SECRET must not use default value in production');
  }
  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  if (config.dbPoolMax < config.dbPoolMin) {
    errors.push('DB_POOL_MAX must be >= DB_POOL_MIN');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n  - ${errors.join('\n  - ')}`);
  }
}
