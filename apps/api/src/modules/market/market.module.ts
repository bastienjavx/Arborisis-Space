import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { QueueModule } from '../queue/queue.module';
import { BondService } from './bond.service';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { ResourceMarketService } from './resource-market.service';

@Module({
  imports: [GameModule, QueueModule],
  controllers: [MarketController],
  providers: [MarketService, ResourceMarketService, BondService],
  exports: [MarketService, ResourceMarketService, BondService],
})
export class MarketModule {}
