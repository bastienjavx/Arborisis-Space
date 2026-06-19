import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PvpService } from '../../pvp/pvp.service';
import { FINALIZE_JOB, PVP_QUEUE, type FinalizeJobData } from '../queue.constants';

@Processor(PVP_QUEUE)
export class PvpProcessor extends WorkerHost {
  private readonly logger = new Logger(PvpProcessor.name);

  constructor(private readonly pvp: PvpService) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    if (job.name !== FINALIZE_JOB) return;
    await this.pvp.advanceMission(job.data.jobId);
    this.logger.debug(`Mission PvP avancée : ${job.data.jobId}`);
  }
}
