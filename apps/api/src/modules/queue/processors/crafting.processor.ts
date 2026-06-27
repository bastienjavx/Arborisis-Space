import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CraftingService } from '../../crafting/crafting.service';
import { CRAFTING_QUEUE, type FinalizeJobData } from '../queue.constants';

@Processor(CRAFTING_QUEUE, { concurrency: 5 })
export class CraftingProcessor extends WorkerHost {
  private readonly logger = new Logger(CraftingProcessor.name);

  constructor(private readonly crafting: CraftingService) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    await this.crafting.finalizeCraftingJob(job.data.jobId);
    this.logger.debug(`Artisanat finalisé : ${job.data.jobId}`);
  }
}
