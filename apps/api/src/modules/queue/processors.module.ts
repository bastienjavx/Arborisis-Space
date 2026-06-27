import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { PveModule } from '../pve/pve.module';
import { PvpModule } from '../pvp/pvp.module';
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
import { NotificationsProcessor } from './processors/notifications.processor';
import { CraftingModule } from '../crafting/crafting.module';
import { ProductionLinesModule } from '../production-lines/production-lines.module';
import { TradeRoutesModule } from '../trade-routes/trade-routes.module';
import { MarketModule } from '../market/market.module';

/**
 * Consumers BullMQ gameplay. Les balayages périodiques et la récupération des
 * jobs échus tournent dans MaintenanceModule afin que le scale des consumers ne
 * multiplie pas les sweeps globaux.
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
    NotificationsProcessor,
  ],
})
export class ProcessorsModule {}
