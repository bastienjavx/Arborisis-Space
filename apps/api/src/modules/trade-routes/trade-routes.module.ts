import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { QueueModule } from '../queue/queue.module';
import { TradeRoutesController } from './trade-routes.controller';
import { TradeRoutesService } from './trade-routes.service';

@Module({
  imports: [GameModule, QueueModule],
  controllers: [TradeRoutesController],
  providers: [TradeRoutesService],
  exports: [TradeRoutesService],
})
export class TradeRoutesModule {}
