import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { runWithJobUniverse } from '../../../common/prisma/universe-scope.storage';
import { FinalizationService } from '../../game/finalization.service';
import { COLONIZATION_QUEUE, type FinalizeJobData } from '../queue.constants';

@Processor(COLONIZATION_QUEUE)
export class ColonizationProcessor extends WorkerHost {
  private readonly logger = new Logger(ColonizationProcessor.name);

  constructor(private readonly finalization: FinalizationService) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    await runWithJobUniverse(job.data, () =>
      this.finalization.finalizeColonization(job.data.jobId),
    );
    this.logger.debug(`Essaimage finalisé : ${job.data.jobId}`);
  }
}
