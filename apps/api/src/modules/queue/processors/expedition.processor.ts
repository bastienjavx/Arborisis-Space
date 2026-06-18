import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ExpeditionsService } from '../../game/expeditions.service';
import { EXPEDITION_QUEUE, FINALIZE_JOB, type FinalizeJobData } from '../queue.constants';

@Processor(EXPEDITION_QUEUE)
export class ExpeditionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExpeditionProcessor.name);
  constructor(private readonly expeditions: ExpeditionsService) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    if (job.name !== FINALIZE_JOB) return;
    await this.expeditions.advanceMission(job.data.jobId);
    this.logger.debug(`Expédition avancée : ${job.data.jobId}`);
  }
}
