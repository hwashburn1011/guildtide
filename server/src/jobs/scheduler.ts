// ---------------------------------------------------------------------------
// Cron job scheduler — lightweight in-process scheduler for recurring tasks
// ---------------------------------------------------------------------------

import { logger } from '../utils/logger';

interface CronJob {
  name: string;
  intervalMs: number;
  handler: () => Promise<void>;
  timer?: ReturnType<typeof setInterval>;
  lastRun?: Date;
  lastDuration?: number;
  lastError?: string;
  runCount: number;
  isRunning: boolean;
}

class Scheduler {
  private jobs: Map<string, CronJob> = new Map();
  private started: boolean = false;

  /** Register a recurring job. */
  register(name: string, intervalMs: number, handler: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      logger.warn(`Job "${name}" already registered, skipping duplicate`);
      return;
    }
    this.jobs.set(name, { name, intervalMs, handler, runCount: 0, isRunning: false });
    logger.info(`Job registered: ${name}`, { intervalMs });
  }

  /** Start all registered jobs. */
  startAll(): void {
    if (this.started) return;
    this.started = true;
    for (const job of this.jobs.values()) {
      this.startJob(job);
    }
    logger.info(`Scheduler started with ${this.jobs.size} jobs`);
  }

  /** Stop all jobs gracefully. */
  async stopAll(): Promise<void> {
    this.started = false;
    for (const job of this.jobs.values()) {
      if (job.timer) {
        clearInterval(job.timer);
        job.timer = undefined;
      }
    }
    // Wait for running jobs to finish (up to 5 seconds)
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const running = [...this.jobs.values()].filter((j) => j.isRunning);
      if (running.length === 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    logger.info('Scheduler stopped');
  }

  /** Get status of all jobs for health dashboard. */
  getStatus(): Record<string, {
    intervalMs: number;
    lastRun?: string;
    lastDuration?: number;
    lastError?: string;
    runCount: number;
    isRunning: boolean;
  }> {
    const result: Record<string, any> = {};
    for (const [name, job] of this.jobs) {
      result[name] = {
        intervalMs: job.intervalMs,
        lastRun: job.lastRun?.toISOString(),
        lastDuration: job.lastDuration,
        lastError: job.lastError,
        runCount: job.runCount,
        isRunning: job.isRunning,
      };
    }
    return result;
  }

  /** Run a specific job immediately (for admin/testing). */
  async runNow(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) throw new Error(`Job "${name}" not found`);
    await this.executeJob(job);
  }

  private startJob(job: CronJob): void {
    // Run once immediately, then on interval
    this.executeJob(job);
    job.timer = setInterval(() => this.executeJob(job), job.intervalMs);
  }

  private async executeJob(job: CronJob): Promise<void> {
    if (job.isRunning) {
      logger.warn(`Job "${job.name}" still running, skipping`);
      return;
    }
    job.isRunning = true;
    const start = Date.now();
    try {
      await job.handler();
      job.lastError = undefined;
    } catch (err: any) {
      job.lastError = err?.message ?? String(err);
      logger.error(`Job "${job.name}" failed`, { error: job.lastError });
    } finally {
      job.lastRun = new Date();
      job.lastDuration = Date.now() - start;
      job.runCount++;
      job.isRunning = false;
    }
  }
}

export const scheduler = new Scheduler();

// ---------------------------------------------------------------------------
// Background worker system for async tasks
// ---------------------------------------------------------------------------

type WorkerHandler = (payload: unknown) => Promise<void>;

interface QueuedTask {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  attempts: number;
}

class WorkerQueue {
  private handlers: Map<string, WorkerHandler> = new Map();
  private queue: QueuedTask[] = [];
  private processing: boolean = false;
  private maxRetries: number = 3;
  private taskIdCounter: number = 0;

  /** Register a worker handler for a task type. */
  registerHandler(type: string, handler: WorkerHandler): void {
    this.handlers.set(type, handler);
  }

  /** Enqueue a task for background processing. */
  enqueue(type: string, payload: unknown): string {
    const id = `task_${++this.taskIdCounter}_${Date.now()}`;
    this.queue.push({
      id,
      type,
      payload,
      createdAt: new Date(),
      status: 'pending',
      attempts: 0,
    });
    // Kick off processing if not already running
    if (!this.processing) {
      this.processNext();
    }
    return id;
  }

  /** Get queue status for health monitoring. */
  getStatus() {
    return {
      pending: this.queue.filter((t) => t.status === 'pending').length,
      processing: this.queue.filter((t) => t.status === 'processing').length,
      completed: this.queue.filter((t) => t.status === 'completed').length,
      failed: this.queue.filter((t) => t.status === 'failed').length,
      registeredHandlers: [...this.handlers.keys()],
    };
  }

  private async processNext(): Promise<void> {
    const task = this.queue.find((t) => t.status === 'pending');
    if (!task) {
      this.processing = false;
      return;
    }
    this.processing = true;
    task.status = 'processing';
    task.attempts++;

    const handler = this.handlers.get(task.type);
    if (!handler) {
      task.status = 'failed';
      task.error = `No handler registered for type: ${task.type}`;
      logger.error(`Worker: ${task.error}`);
    } else {
      try {
        await handler(task.payload);
        task.status = 'completed';
      } catch (err: any) {
        const errorMsg = err?.message ?? String(err);
        if (task.attempts < this.maxRetries) {
          task.status = 'pending'; // re-queue for retry
          logger.warn(`Worker task ${task.id} failed (attempt ${task.attempts}), retrying`, {
            error: errorMsg,
          });
        } else {
          task.status = 'failed';
          task.error = errorMsg;
          logger.error(`Worker task ${task.id} failed permanently`, { error: errorMsg });
        }
      }
    }

    // Clean completed tasks older than 1 hour to avoid memory bloat
    const oneHourAgo = Date.now() - 3600_000;
    this.queue = this.queue.filter(
      (t) => t.status === 'pending' || t.status === 'processing' || t.createdAt.getTime() > oneHourAgo,
    );

    // Process next task
    setImmediate(() => this.processNext());
  }
}

export const workerQueue = new WorkerQueue();
