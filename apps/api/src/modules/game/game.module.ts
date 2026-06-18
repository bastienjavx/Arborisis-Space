import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { ColonizationController } from './colonization.controller';
import { ColonizationService } from './colonization.service';
import { FinalizationService } from './finalization.service';
import { GalaxyController } from './galaxy.controller';
import { GalaxyService } from './galaxy.service';
import { GameEngineService } from './game-engine.service';
import { PlanetsController } from './planets.controller';
import { PlanetsService } from './planets.service';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { WorldFactoryService } from './world-factory.service';

@Module({
  imports: [QueueModule],
  controllers: [
    PlanetsController,
    BuildingsController,
    ResearchController,
    GalaxyController,
    ColonizationController,
  ],
  providers: [
    GameEngineService,
    FinalizationService,
    WorldFactoryService,
    PlanetsService,
    BuildingsService,
    ResearchService,
    GalaxyService,
    ColonizationService,
  ],
  exports: [WorldFactoryService, FinalizationService],
})
export class GameModule {}
