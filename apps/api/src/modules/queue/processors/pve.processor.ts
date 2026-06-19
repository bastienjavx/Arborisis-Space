import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PveService } from '../../pve/pve.service';
import { FINALIZE_JOB, PVE_QUEUE, type FinalizeJobData } from '../queue.constants';

@Processor(PVE_QUEUE)
export class PveProcessor extends WorkerHost {
  private readonly logger = new Logger(PveProcessor.name);

  constructor(private readonly pve: PveService) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    if (job.name !== FINALIZE_JOB) return;
    await this.pve.advanceMission(job.data.jobId);
    this.logger.debug(`Mission PvE avancée : ${job.data.jobId}`);
  }
}
