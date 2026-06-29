import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { CraftingModule } from '../crafting/crafting.module';
import { DiplomacyModule } from '../diplomacy/diplomacy.module';
import { GameModule } from '../game/game.module';
import { MarketModule } from '../market/market.module';
import { ProductionLinesModule } from '../production-lines/production-lines.module';
import { PveModule } from '../pve/pve.module';
import { PvpModule } from '../pvp/pvp.module';
import { QueueModule } from '../queue/queue.module';
import { TradeRoutesModule } from '../trade-routes/trade-routes.module';
import { MycosynthSocialService } from './mycosynth-social.service';
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
    ChatModule,
    DiplomacyModule,
  ],
  providers: [MycosynthService, MycosynthSocialService],
  exports: [MycosynthService],
})
export class NpcModule {}
