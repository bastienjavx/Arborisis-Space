import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { QueueModule } from '../queue/queue.module';
import { ProductionLinesController } from './production-lines.controller';
import { ProductionLinesService } from './production-lines.service';

@Module({
  imports: [GameModule, QueueModule],
  controllers: [ProductionLinesController],
  providers: [ProductionLinesService],
  exports: [ProductionLinesService],
})
export class ProductionLinesModule {}
