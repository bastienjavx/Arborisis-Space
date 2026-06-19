import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FinalizationService } from '../../game/finalization.service';
import { CONSTRUCTION_QUEUE, type FinalizeJobData } from '../queue.constants';
import { runWithUniverse } from './run-with-universe';

@Processor(CONSTRUCTION_QUEUE)
export class ConstructionProcessor extends WorkerHost {
  private readonly logger = new Logger(ConstructionProcessor.name);

  constructor(
    private readonly finalization: FinalizationService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    await runWithUniverse(this.prisma, job.data.universeId, async () => {
      await this.finalization.finalizeConstruction(job.data.jobId);
      this.logger.debug(`Construction finalisée : ${job.data.jobId}`);
    });
  }
}
