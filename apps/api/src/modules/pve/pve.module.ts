import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { QueueModule } from '../queue/queue.module';
import { PveController } from './pve.controller';
import { PveService } from './pve.service';
import { NpcSpawnerService } from './npc-spawner.service';

@Module({
  imports: [GameModule, QueueModule],
  controllers: [PveController],
  providers: [PveService, NpcSpawnerService],
  exports: [PveService, NpcSpawnerService],
})
export class PveModule {}
