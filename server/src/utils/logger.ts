// ---------------------------------------------------------------------------
// Structured logging service with log levels and optional file rotation
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { config } from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  correlationId?: string;
}

class Logger {
  private minLevel: number;
  private logDir: string;
  private logToFile: boolean;

  constructor() {
    this.minLevel = LOG_LEVEL_PRIORITY[config.logLevel] ?? 1;
    this.logDir = config.logDir;
    this.logToFile = config.logToFile;
    if (this.logToFile) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVEL_PRIORITY[level] < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? { context } : {}),
    };

    const line = JSON.stringify(entry);

    // Console output
    switch (level) {
      case 'error':
        console.error(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      default:
        console.log(line);
    }

    // File output with daily rotation
    if (this.logToFile) {
      this.writeToFile(line);
    }
  }

  private writeToFile(line: string): void {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filePath = path.join(this.logDir, `guildtide-${date}.log`);
    fs.appendFileSync(filePath, line + '\n');
  }

  /** Clean log files older than retentionDays. */
  cleanOldLogs(retentionDays: number = 30): number {
    if (!this.logToFile || !fs.existsSync(this.logDir)) return 0;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(this.logDir).filter((f) => f.startsWith('guildtide-'));
    let removed = 0;
    for (const file of files) {
      const filePath = path.join(this.logDir, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        removed++;
      }
    }
    return removed;
  }
}

export const logger = new Logger();
