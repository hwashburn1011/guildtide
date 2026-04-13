// ---------------------------------------------------------------------------
// Pagination helper — offset + limit with consistent response format
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationParams;
    }
  }
}

/**
 * Pagination middleware — extracts page/limit from query params and attaches
 * `req.pagination` with computed offset.
 *
 * @param defaultLimit - Default items per page (default 20)
 * @param maxLimit - Maximum allowed items per page (default 100)
 */
export function paginate(defaultLimit: number = 20, maxLimit: number = 100) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string, 10) || defaultLimit));
    const offset = (page - 1) * limit;

    req.pagination = { page, limit, offset };
    next();
  };
}

/**
 * Build a paginated response envelope.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams,
) {
  const totalPages = Math.ceil(total / pagination.limit);
  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
  };
}
