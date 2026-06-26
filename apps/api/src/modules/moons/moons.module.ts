import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { MoonsController } from './moons.controller';
import { MoonsService } from './moons.service';

@Module({
  imports: [GameModule],
  controllers: [MoonsController],
  providers: [MoonsService],
  exports: [MoonsService],
})
export class MoonsModule {}
