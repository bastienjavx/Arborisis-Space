import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { QueueModule } from '../queue/queue.module';
import { PveController } from './pve.controller';
import { PveService } from './pve.service';

@Module({
  imports: [GameModule, QueueModule],
  controllers: [PveController],
  providers: [PveService],
  exports: [PveService],
})
export class PveModule {}
