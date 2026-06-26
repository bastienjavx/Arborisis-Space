import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { CommandersController } from './commanders.controller';
import { CommandersService } from './commanders.service';

@Module({
  imports: [GameModule],
  controllers: [CommandersController],
  providers: [CommandersService],
  exports: [CommandersService],
})
export class CommandersModule {}
