import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  COLONIZATION_QUEUE,
  CONSTRUCTION_QUEUE,
  FINALIZE_JOB,
  RESEARCH_QUEUE,
  type FinalizeJobData,
} from './queue.constants';

/**
 * Planifie la finalisation différée des jobs métier (construction, recherche,
 * essaimage) à leur échéance via BullMQ. La finalisation reste idempotente :
 * une lecture peut finaliser un job avant que le worker ne se déclenche.
 */
@Injectable()
export class GameQueueService {
  constructor(
    @InjectQueue(CONSTRUCTION_QUEUE) private readonly construction: Queue<FinalizeJobData>,
    @InjectQueue(RESEARCH_QUEUE) private readonly research: Queue<FinalizeJobData>,
    @InjectQueue(COLONIZATION_QUEUE) private readonly colonization: Queue<FinalizeJobData>,
  ) {}

  private delayFor(finishesAt: Date): number {
    return Math.max(0, finishesAt.getTime() - Date.now());
  }

  private opts(jobId: string, finishesAt: Date) {
    return {
      // jobId stable → déduplication, pas de double planification.
      jobId,
      delay: this.delayFor(finishesAt),
      removeOnComplete: true,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 5_000 },
    };
  }

  async scheduleConstruction(jobId: string, finishesAt: Date): Promise<void> {
    await this.construction.add(FINALIZE_JOB, { jobId }, this.opts(jobId, finishesAt));
  }

  async scheduleResearch(jobId: string, finishesAt: Date): Promise<void> {
    await this.research.add(FINALIZE_JOB, { jobId }, this.opts(jobId, finishesAt));
  }

  async scheduleColonization(jobId: string, finishesAt: Date): Promise<void> {
    await this.colonization.add(FINALIZE_JOB, { jobId }, this.opts(jobId, finishesAt));
  }
}
