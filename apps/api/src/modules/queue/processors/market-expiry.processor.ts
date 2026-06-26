import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MarketService } from '../../market/market.service';
import { MARKET_EXPIRY_QUEUE } from '../queue.constants';

interface ExpireJobData {
  orderId: string;
}

@Processor(MARKET_EXPIRY_QUEUE, { concurrency: 5 })
export class MarketExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketExpiryProcessor.name);

  constructor(private readonly market: MarketService) {
    super();
  }

  async process(job: Job<ExpireJobData>): Promise<void> {
    await this.market.expireOrder(job.data.orderId);
    this.logger.debug(`Ordre expiré : ${job.data.orderId}`);
  }
}
