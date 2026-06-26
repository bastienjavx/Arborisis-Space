import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { DefensesController } from './defenses.controller';
import { DefensesService } from './defenses.service';

@Module({
  imports: [GameModule],
  controllers: [DefensesController],
  providers: [DefensesService],
  exports: [DefensesService],
})
export class DefensesModule {}
