// ---------------------------------------------------------------------------
// Global error handler — catches unhandled exceptions with consistent format
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

/** Application error with status code. */
export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(statusCode: number, code: string, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** Consistent error response shape. */
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  correlationId?: string;
  stack?: string;
}

/**
 * Global error handler middleware. Must be registered LAST in the middleware chain.
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appErr = err instanceof AppError ? err : null;
  const statusCode = appErr?.statusCode ?? 500;
  const code = appErr?.code ?? 'internal_error';
  const message = appErr?.isOperational ? err.message : 'An unexpected error occurred';

  // Log the error
  logger.error('Unhandled error', {
    error: err.message,
    code,
    statusCode,
    stack: err.stack,
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
  });

  // Track error for monitoring
  errorTracker.record(err, req);

  const body: ErrorResponse = {
    error: code,
    message,
    statusCode,
    correlationId: req.correlationId,
  };

  // Include stack trace only in development
  if (!config.isProduction) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

// ---------------------------------------------------------------------------
// Error tracking service (in-process — plug in Sentry via config.sentryDsn)
// ---------------------------------------------------------------------------

interface TrackedError {
  message: string;
  code: string;
  path: string;
  method: string;
  timestamp: string;
  correlationId?: string;
}

class ErrorTracker {
  private errors: TrackedError[] = [];
  private maxErrors: number = 500;

  record(err: Error, req: Request): void {
    this.errors.push({
      message: err.message,
      code: err instanceof AppError ? err.code : 'unknown',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
    });

    // Trim old entries
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  /** Recent errors for the admin dashboard. */
  getRecent(count: number = 50): TrackedError[] {
    return this.errors.slice(-count);
  }

  /** Error summary by code. */
  getSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const e of this.errors) {
      summary[e.code] = (summary[e.code] ?? 0) + 1;
    }
    return summary;
  }
}

export const errorTracker = new ErrorTracker();
