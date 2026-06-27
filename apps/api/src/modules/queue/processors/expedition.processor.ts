import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ExpeditionsService } from '../../game/expeditions.service';
import { EXPEDITION_QUEUE, FINALIZE_JOB, type FinalizeJobData } from '../queue.constants';
import { runWithUniverse } from './run-with-universe';

@Processor(EXPEDITION_QUEUE, { concurrency: 5 })
export class ExpeditionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExpeditionProcessor.name);
  constructor(
    private readonly expeditions: ExpeditionsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    if (job.name !== FINALIZE_JOB) return;
    await runWithUniverse(this.prisma, job.data.universeId, async () => {
      await this.expeditions.advanceMission(job.data.jobId);
      this.logger.debug(`Expédition avancée : ${job.data.jobId}`);
    });
  }
}
