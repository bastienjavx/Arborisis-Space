import { Logger, Module, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { FinalizationService } from '../game/finalization.service';
import { PveModule } from '../pve/pve.module';
import { PveService } from '../pve/pve.service';
import { NpcSpawnerService } from '../pve/npc-spawner.service';
import { PvpModule } from '../pvp/pvp.module';
import { PvpService } from '../pvp/pvp.service';
import { QueueModule } from './queue.module';
import { ColonizationProcessor } from './processors/colonization.processor';
import { ConstructionProcessor } from './processors/construction.processor';
import { ResearchProcessor } from './processors/research.processor';
import { ShipProductionProcessor } from './processors/ship-production.processor';
import { ExpeditionProcessor } from './processors/expedition.processor';
import { PveProcessor } from './processors/pve.processor';
import { PvpProcessor } from './processors/pvp.processor';
import { EventProcessor } from './processors/event.processor';
import { TransferProcessor } from './processors/transfer.processor';
import { CraftingProcessor } from './processors/crafting.processor';
import { ProductionLineProcessor } from './processors/production-line.processor';
import { TradeRouteProcessor } from './processors/trade-route.processor';
import { MarketExpiryProcessor } from './processors/market-expiry.processor';
import { GameQueueService } from './game-queue.service';
import { ExpeditionsService } from '../game/expeditions.service';
import { SeasonsService } from '../game/seasons.service';
import { CraftingModule } from '../crafting/crafting.module';
import { CraftingService } from '../crafting/crafting.service';
import { ProductionLinesModule } from '../production-lines/production-lines.module';
import { ProductionLinesService } from '../production-lines/production-lines.service';
import { TradeRoutesModule } from '../trade-routes/trade-routes.module';
import { TradeRoutesService } from '../trade-routes/trade-routes.service';
import { MarketModule } from '../market/market.module';
import { MarketService } from '../market/market.service';

/**
 * Workers BullMQ. Importe GameModule (logique de finalisation) et QueueModule
 * (connexion + files). Effectue un balayage de récupération au démarrage pour
 * finaliser tout job échu pendant une éventuelle indisponibilité.
 */
@Module({
  imports: [
    QueueModule,
    GameModule,
    PveModule,
    PvpModule,
    CraftingModule,
    ProductionLinesModule,
    TradeRoutesModule,
    MarketModule,
  ],
  providers: [
    ConstructionProcessor,
    ResearchProcessor,
    ColonizationProcessor,
    ShipProductionProcessor,
    ExpeditionProcessor,
    PveProcessor,
    PvpProcessor,
    EventProcessor,
    TransferProcessor,
    CraftingProcessor,
    ProductionLineProcessor,
    TradeRouteProcessor,
    MarketExpiryProcessor,
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
    private readonly pve: PveService,
    private readonly pvp: PvpService,
    private readonly npcSpawner: NpcSpawnerService,
    private readonly seasons: SeasonsService,
    private readonly crafting: CraftingService,
    private readonly productionLines: ProductionLinesService,
    private readonly tradeRoutes: TradeRoutesService,
    private readonly market: MarketService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.finalization.sweepAllDue();
    await this.expeditions.sweepAllDue();
    await this.pve.sweepAllDue();
    await this.pvp.sweepAllDue();
    await this.seasons.sweepAllDue();
    await this.crafting.sweepAllDue();
    await this.productionLines.sweepDueLines();
    await this.tradeRoutes.sweepDueRoutes();
    await this.market.sweepExpiredOrders();
    await this.queues.reconcilePending();
    await this.queues.scheduleNextEvent().catch(() => void 0);
    await this.npcSpawner.spawnBatch().catch(() => void 0);
    await this.queues.scheduleNextNpcSpawn(0).catch(() => void 0);
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
      await this.pve.sweepAllDue();
      await this.pvp.sweepAllDue();
      await this.seasons.sweepAllDue();
      await this.crafting.sweepAllDue();
      await this.productionLines.sweepDueLines();
      await this.tradeRoutes.sweepDueRoutes();
      await this.market.sweepExpiredOrders();
      await this.queues.reconcilePending();
    } finally {
      this.reconciling = false;
    }
  }
}
