import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { QueueModule } from '../queue/queue.module';
import { PvpController } from './pvp.controller';
import { PvpService } from './pvp.service';

@Module({
  imports: [GameModule, QueueModule],
  controllers: [PvpController],
  providers: [PvpService],
  exports: [PvpService],
})
export class PvpModule {}
