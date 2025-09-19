/**
 * Production Scheduler - Manages production scheduling and execution
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from '../core/EventBus';
import { TimeStamp, ProductId, Recipe } from '../core/types';

export interface ProductionJob {
  id: string;
  productId: ProductId;
  quantity: number;
  recipe: Recipe;
  startTime?: TimeStamp;
  endTime?: TimeStamp;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  priority: number;
}

export class ProductionScheduler extends EventEmitter {
  private jobs: Map<string, ProductionJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private eventBus: EventBus;
  private initialized = false;

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
    this.emit('scheduler-initialized');
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.jobs.clear();
    this.activeJobs.clear();
  }

  async update(currentTime: TimeStamp): Promise<void> {
    // Process active jobs
    for (const jobId of this.activeJobs) {
      const job = this.jobs.get(jobId);
      if (job && job.endTime && currentTime.realTime >= job.endTime.realTime) {
        this.completeJob(jobId);
      }
    }

    // Start new jobs if capacity allows
    this.startQueuedJobs(currentTime);
  }

  scheduleProduction(productId: ProductId, quantity: number, recipe: Recipe, priority: number = 5): string {
    const job: ProductionJob = {
      id: this.generateJobId(),
      productId,
      quantity,
      recipe,
      status: 'queued',
      priority
    };

    this.jobs.set(job.id, job);
    this.emit('job-scheduled', job);
    return job.id;
  }

  private startQueuedJobs(currentTime: TimeStamp): void {
    if (this.activeJobs.size >= 5) return; // Max 5 concurrent jobs

    const queuedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'queued')
      .sort((a, b) => b.priority - a.priority);

    for (const job of queuedJobs) {
      if (this.activeJobs.size >= 5) break;

      job.status = 'in_progress';
      job.startTime = currentTime;
      job.endTime = {
        gameTime: currentTime.gameTime + job.recipe.duration,
        realTime: currentTime.realTime + job.recipe.duration
      };

      this.activeJobs.add(job.id);
      this.emit('job-started', job);
    }
  }

  private completeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    this.activeJobs.delete(jobId);
    this.emit('job-completed', job);
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  dispose(): void {
    this.jobs.clear();
    this.activeJobs.clear();
    this.removeAllListeners();
  }
}