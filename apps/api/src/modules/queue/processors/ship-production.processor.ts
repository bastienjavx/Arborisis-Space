import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { FinalizationService } from '../../game/finalization.service';
import { FINALIZE_JOB, SHIP_PRODUCTION_QUEUE, type FinalizeJobData } from '../queue.constants';

@Processor(SHIP_PRODUCTION_QUEUE)
export class ShipProductionProcessor extends WorkerHost {
  private readonly logger = new Logger(ShipProductionProcessor.name);
  constructor(private readonly finalization: FinalizationService) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    if (job.name !== FINALIZE_JOB) return;
    await this.finalization.finalizeShipProduction(job.data.jobId);
    this.logger.debug(`Production de vaisseaux finalisée : ${job.data.jobId}`);
  }
}
