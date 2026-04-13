// ---------------------------------------------------------------------------
// Audit logging service — records sensitive operations for security review
// ---------------------------------------------------------------------------

import { logger } from '../utils/logger';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.register'
  | 'auth.password_change'
  | 'auth.password_reset'
  | 'auth.token_refresh'
  | 'auth.account_locked'
  | 'admin.impersonate'
  | 'admin.config_change'
  | 'admin.user_ban'
  | 'admin.user_unban'
  | 'data.export'
  | 'data.delete'
  | 'guild.create'
  | 'guild.delete'
  | 'market.trade'
  | 'security.csrf_failure'
  | 'security.rate_limit'
  | 'security.suspicious_login';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  playerId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
}

class AuditService {
  private entries: AuditEntry[] = [];
  private maxEntries: number = 10_000;
  private idCounter: number = 0;

  /**
   * Record an audit event.
   */
  log(
    action: AuditAction,
    opts: {
      playerId?: string;
      ip?: string;
      userAgent?: string;
      details?: Record<string, unknown>;
      severity?: 'info' | 'warning' | 'critical';
    } = {},
  ): void {
    const entry: AuditEntry = {
      id: `audit_${++this.idCounter}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      playerId: opts.playerId,
      ip: opts.ip,
      userAgent: opts.userAgent,
      details: opts.details,
      severity: opts.severity ?? 'info',
    };

    this.entries.push(entry);

    // Trim old entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Also emit to structured log for file persistence
    logger.info('AUDIT', {
      action: entry.action,
      playerId: entry.playerId,
      ip: entry.ip,
      severity: entry.severity,
      details: entry.details,
    });

    // Alert on critical events
    if (entry.severity === 'critical') {
      logger.error('CRITICAL AUDIT EVENT', {
        action: entry.action,
        playerId: entry.playerId,
        details: entry.details,
      });
    }
  }

  /**
   * Query audit log entries.
   */
  query(filters: {
    action?: AuditAction;
    playerId?: string;
    severity?: string;
    since?: Date;
    limit?: number;
  }): AuditEntry[] {
    let results = [...this.entries];

    if (filters.action) {
      results = results.filter((e) => e.action === filters.action);
    }
    if (filters.playerId) {
      results = results.filter((e) => e.playerId === filters.playerId);
    }
    if (filters.severity) {
      results = results.filter((e) => e.severity === filters.severity);
    }
    if (filters.since) {
      const sinceMs = filters.since.getTime();
      results = results.filter((e) => new Date(e.timestamp).getTime() >= sinceMs);
    }

    // Return most recent first
    results.reverse();

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get summary counts by action for the admin dashboard.
   */
  getSummary(hours: number = 24): Record<string, number> {
    const since = Date.now() - hours * 3600_000;
    const summary: Record<string, number> = {};
    for (const entry of this.entries) {
      if (new Date(entry.timestamp).getTime() >= since) {
        summary[entry.action] = (summary[entry.action] ?? 0) + 1;
      }
    }
    return summary;
  }

  /**
   * Detect suspicious patterns (e.g. many failed logins from same IP).
   */
  detectSuspiciousActivity(): Array<{ type: string; detail: string }> {
    const alerts: Array<{ type: string; detail: string }> = [];
    const oneHourAgo = Date.now() - 3600_000;
    const recentEntries = this.entries.filter(
      (e) => new Date(e.timestamp).getTime() >= oneHourAgo,
    );

    // Check for brute force (>10 failed logins from same IP in 1 hour)
    const failedByIp: Record<string, number> = {};
    for (const e of recentEntries) {
      if (e.action === 'auth.login_failed' && e.ip) {
        failedByIp[e.ip] = (failedByIp[e.ip] ?? 0) + 1;
      }
    }
    for (const [ip, count] of Object.entries(failedByIp)) {
      if (count > 10) {
        alerts.push({
          type: 'brute_force',
          detail: `${count} failed login attempts from IP ${ip} in the last hour`,
        });
      }
    }

    return alerts;
  }
}

export const auditService = new AuditService();
