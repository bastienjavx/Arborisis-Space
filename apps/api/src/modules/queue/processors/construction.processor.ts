import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { FinalizationService } from '../../game/finalization.service';
import { CONSTRUCTION_QUEUE, type FinalizeJobData } from '../queue.constants';

@Processor(CONSTRUCTION_QUEUE)
export class ConstructionProcessor extends WorkerHost {
  private readonly logger = new Logger(ConstructionProcessor.name);

  constructor(private readonly finalization: FinalizationService) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    await this.finalization.finalizeConstruction(job.data.jobId);
    this.logger.debug(`Construction finalisée : ${job.data.jobId}`);
  }
}
