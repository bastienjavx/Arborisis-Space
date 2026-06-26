import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PveService } from '../../pve/pve.service';
import { FINALIZE_JOB, PVE_QUEUE, type FinalizeJobData } from '../queue.constants';
import { runWithUniverse } from './run-with-universe';

@Processor(PVE_QUEUE, { concurrency: 5 })
export class PveProcessor extends WorkerHost {
  private readonly logger = new Logger(PveProcessor.name);

  constructor(
    private readonly pve: PveService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    if (job.name !== FINALIZE_JOB) return;
    await runWithUniverse(this.prisma, job.data.universeId, async () => {
      await this.pve.advanceMission(job.data.jobId);
      this.logger.debug(`Mission PvE avancée : ${job.data.jobId}`);
    });
  }
}
