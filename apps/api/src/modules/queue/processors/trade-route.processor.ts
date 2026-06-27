import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { TradeRoutesService } from '../../trade-routes/trade-routes.service';
import { TRADE_ROUTE_QUEUE } from '../queue.constants';

interface TradeRouteJobData {
  routeId: string;
}

@Processor(TRADE_ROUTE_QUEUE, { concurrency: 5 })
export class TradeRouteProcessor extends WorkerHost {
  private readonly logger = new Logger(TradeRouteProcessor.name);

  constructor(private readonly tradeRoutes: TradeRoutesService) {
    super();
  }

  async process(job: Job<TradeRouteJobData>): Promise<void> {
    await this.tradeRoutes.runRoute(job.data.routeId);
    this.logger.debug(`Route commerciale exécutée : ${job.data.routeId}`);
  }
}
