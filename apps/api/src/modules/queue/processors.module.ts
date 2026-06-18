import { Logger, Module, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { FinalizationService } from '../game/finalization.service';
import { QueueModule } from './queue.module';
import { ColonizationProcessor } from './processors/colonization.processor';
import { ConstructionProcessor } from './processors/construction.processor';
import { ResearchProcessor } from './processors/research.processor';
import { ShipProductionProcessor } from './processors/ship-production.processor';
import { ExpeditionProcessor } from './processors/expedition.processor';
import { EventProcessor } from './processors/event.processor';
import { GameQueueService } from './game-queue.service';
import { ExpeditionsService } from '../game/expeditions.service';

/**
 * Workers BullMQ. Importe GameModule (logique de finalisation) et QueueModule
 * (connexion + files). Effectue un balayage de récupération au démarrage pour
 * finaliser tout job échu pendant une éventuelle indisponibilité.
 */
@Module({
  imports: [QueueModule, GameModule],
  providers: [
    ConstructionProcessor,
    ResearchProcessor,
    ColonizationProcessor,
    ShipProductionProcessor,
    ExpeditionProcessor,
    EventProcessor,
  ],
})
export class ProcessorsModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ProcessorsModule.name);
  private timer?: NodeJS.Timeout;
  private reconciling = false;

  constructor(
    private readonly finalization: FinalizationService,
    private readonly queues: GameQueueService,
    private readonly expeditions: ExpeditionsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.finalization.sweepAllDue();
    await this.expeditions.sweepAllDue();
    await this.queues.reconcilePending();
    await this.queues.scheduleNextEvent().catch(() => void 0);
    this.timer = setInterval(() => {
      void this.reconcile().catch((error) =>
        this.logger.error(error, 'Échec du cycle de réconciliation.'),
      );
    }, 60_000);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async reconcile(): Promise<void> {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      await this.finalization.sweepAllDue();
      await this.expeditions.sweepAllDue();
      await this.queues.reconcilePending();
    } finally {
      this.reconciling = false;
    }
  }
}
