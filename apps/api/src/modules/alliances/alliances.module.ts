import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { AlliancesController } from './alliances.controller';
import { AlliancesService } from './alliances.service';

@Module({
  imports: [GameModule],
  controllers: [AlliancesController],
  providers: [AlliancesService],
})
export class AlliancesModule {}
