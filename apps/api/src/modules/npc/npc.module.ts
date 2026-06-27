import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { PvpModule } from '../pvp/pvp.module';
import { QueueModule } from '../queue/queue.module';
import { MycosynthService } from './mycosynth.service';

@Module({
  imports: [GameModule, PvpModule, QueueModule],
  providers: [MycosynthService],
  exports: [MycosynthService],
})
export class NpcModule {}
