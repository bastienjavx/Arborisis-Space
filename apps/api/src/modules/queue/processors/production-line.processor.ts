import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ProductionLinesService } from '../../production-lines/production-lines.service';
import { PRODUCTION_LINE_QUEUE } from '../queue.constants';

interface ProductionLineJobData {
  lineId: string;
}

@Processor(PRODUCTION_LINE_QUEUE, { concurrency: 5 })
export class ProductionLineProcessor extends WorkerHost {
  private readonly logger = new Logger(ProductionLineProcessor.name);

  constructor(private readonly productionLines: ProductionLinesService) {
    super();
  }

  async process(job: Job<ProductionLineJobData>): Promise<void> {
    await this.productionLines.runLine(job.data.lineId);
    this.logger.debug(`Ligne de production exécutée : ${job.data.lineId}`);
  }
}
