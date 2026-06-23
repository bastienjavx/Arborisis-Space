import { Module } from '@nestjs/common';
import { DiplomacyController } from './diplomacy.controller';
import { DiplomacyService } from './diplomacy.service';

@Module({
  controllers: [DiplomacyController],
  providers: [DiplomacyService],
  exports: [DiplomacyService],
})
export class DiplomacyModule {}
