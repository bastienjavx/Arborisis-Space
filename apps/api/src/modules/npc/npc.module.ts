import { Module } from '@nestjs/common';
import { CraftingModule } from '../crafting/crafting.module';
import { GameModule } from '../game/game.module';
import { MarketModule } from '../market/market.module';
import { ProductionLinesModule } from '../production-lines/production-lines.module';
import { PveModule } from '../pve/pve.module';
import { PvpModule } from '../pvp/pvp.module';
import { QueueModule } from '../queue/queue.module';
import { TradeRoutesModule } from '../trade-routes/trade-routes.module';
import { MycosynthService } from './mycosynth.service';

@Module({
  imports: [
    GameModule,
    PvpModule,
    PveModule,
    MarketModule,
    TradeRoutesModule,
    CraftingModule,
    ProductionLinesModule,
    QueueModule,
  ],
  providers: [MycosynthService],
  exports: [MycosynthService],
})
export class NpcModule {}
