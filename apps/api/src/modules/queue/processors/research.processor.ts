import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { runWithJobUniverse } from '../../../common/prisma/universe-scope.storage';
import { FinalizationService } from '../../game/finalization.service';
import { RESEARCH_QUEUE, type FinalizeJobData } from '../queue.constants';

@Processor(RESEARCH_QUEUE)
export class ResearchProcessor extends WorkerHost {
  private readonly logger = new Logger(ResearchProcessor.name);

  constructor(private readonly finalization: FinalizationService) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    await runWithJobUniverse(job.data, () => this.finalization.finalizeResearch(job.data.jobId));
    this.logger.debug(`Recherche finalisée : ${job.data.jobId}`);
  }
}
