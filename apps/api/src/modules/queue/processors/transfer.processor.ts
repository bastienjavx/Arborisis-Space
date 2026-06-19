import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { TransferService } from '../../game/transfer.service';
import { FINALIZE_JOB, TRANSFER_QUEUE, type FinalizeJobData } from '../queue.constants';

@Processor(TRANSFER_QUEUE)
export class TransferProcessor extends WorkerHost {
  private readonly logger = new Logger(TransferProcessor.name);

  constructor(private readonly transfer: TransferService) {
    super();
  }

  async process(job: Job<FinalizeJobData>): Promise<void> {
    if (job.name !== FINALIZE_JOB) return;
    await this.transfer.finalizeTransfer(job.data.jobId);
    this.logger.log(`Transfert ${job.data.jobId} finalisé`);
  }
}
