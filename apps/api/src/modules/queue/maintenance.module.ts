import { Logger, Module, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { NpcModule } from '../npc/npc.module';
import { MycosynthService } from '../npc/mycosynth.service';
import { CraftingModule } from '../crafting/crafting.module';
import { CraftingService } from '../crafting/crafting.service';
import { FinalizationService } from '../game/finalization.service';
import { GameModule } from '../game/game.module';
import { ExpeditionsService } from '../game/expeditions.service';
import { SeasonsService } from '../game/seasons.service';
import { MarketModule } from '../market/market.module';
import { MarketService } from '../market/market.service';
import { ResourceMarketService } from '../market/resource-market.service';
import { NpcSpawnerService } from '../pve/npc-spawner.service';
import { PveModule } from '../pve/pve.module';
import { PveService } from '../pve/pve.service';
import { PvpModule } from '../pvp/pvp.module';
import { PvpService } from '../pvp/pvp.service';
import { ProductionLinesModule } from '../production-lines/production-lines.module';
import { ProductionLinesService } from '../production-lines/production-lines.service';
import { TradeRoutesModule } from '../trade-routes/trade-routes.module';
import { TradeRoutesService } from '../trade-routes/trade-routes.service';
import { GameQueueService } from './game-queue.service';
import { QueueModule } from './queue.module';

@Module({
  imports: [
    QueueModule,
    GameModule,
    PveModule,
    PvpModule,
    NpcModule,
    CraftingModule,
    ProductionLinesModule,
    TradeRoutesModule,
    MarketModule,
  ],
})
export class MaintenanceModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(MaintenanceModule.name);
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
    private readonly resourceMarket: ResourceMarketService,
    private readonly mycosynth: MycosynthService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.queues.runWithDistributedLock('processors:bootstrap:lock', 120_000, () =>
      this.runSweeps(),
    );
    await this.queues.scheduleNextEvent().catch(() => void 0);
    await this.queues
      .runWithDistributedLock('npc:bootstrap:spawn:lock', 60_000, () =>
        this.npcSpawner.spawnBatch(),
      )
      .catch(() => void 0);
    await this.queues.scheduleNextNpcSpawn(0, true).catch(() => void 0);
    await this.queues
      .runWithDistributedLock('mycosynth:bootstrap:lock', 120_000, () =>
        this.mycosynth.ensureAllExist(),
      )
      .catch(() => void 0);
    await this.queues.ensureMycosynthTickScheduled(0).catch(() => void 0);
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
      await this.queues.runWithDistributedLock('processors:reconcile:lock', 55_000, () =>
        this.runSweeps(),
      );
      // Filet de sécurité : relance la boucle de tick MYCOSYNTH si elle s'est
      // interrompue (la garde anti-duplication interne évite tout doublon).
      await this.queues.ensureMycosynthTickScheduled(0).catch(() => void 0);
    } finally {
      this.reconciling = false;
    }
  }

  private async runSweeps(): Promise<void> {
    const sweeps: { name: string; fn: () => Promise<unknown> }[] = [
      { name: 'finalization', fn: () => this.finalization.sweepAllDue() },
      { name: 'expeditions', fn: () => this.expeditions.sweepAllDue() },
      { name: 'pve', fn: () => this.pve.sweepAllDue() },
      { name: 'pvp', fn: () => this.pvp.sweepAllDue() },
      { name: 'seasons', fn: () => this.seasons.sweepAllDue() },
      { name: 'crafting', fn: () => this.crafting.sweepAllDue() },
      { name: 'productionLines', fn: () => this.productionLines.sweepDueLines() },
      { name: 'tradeRoutes', fn: () => this.tradeRoutes.sweepDueRoutes() },
      { name: 'market', fn: () => this.market.sweepExpiredOrders() },
      { name: 'resourceMarket', fn: () => this.resourceMarket.sweepExpiredOrders() },
      { name: 'reconcilePending', fn: () => this.queues.reconcilePending() },
    ];

    await Promise.all(
      sweeps.map(async ({ name, fn }) => {
        try {
          await fn();
        } catch (error) {
          this.logger.error(error, `Échec du balayage ${name}.`);
        }
      }),
    );
  }
}
