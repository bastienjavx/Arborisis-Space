import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FinalizationService } from '../../game/finalization.service';
import { COLONIZATION_QUEUE, type FinalizeJobData } from '../queue.constants';
import { runWithUniverse } from './run-with-universe';

@Processor(COLONIZATION_QUEUE)
export class ColonizationProcessor extends WorkerHost {
  private readonly logger = new Logger(ColonizationProcessor.name);

  constructor(
    private readonly finalization: FinalizationService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    await runWithUniverse(this.prisma, job.data.universeId, async () => {
      await this.finalization.finalizeColonization(job.data.jobId);
      this.logger.debug(`Essaimage finalisé : ${job.data.jobId}`);
    });
  }
}
