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
import { ShipsController } from './ships.controller';
import { ShipsService } from './ships.service';
import { ExpeditionsController } from './expeditions.controller';
import { ExpeditionsService } from './expeditions.service';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

@Module({
  imports: [QueueModule],
  controllers: [
    PlanetsController,
    BuildingsController,
    ResearchController,
    GalaxyController,
    ColonizationController,
    ShipsController,
    ExpeditionsController,
    LeaderboardController,
    EventsController,
    AchievementsController,
    TransferController,
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
    ShipsService,
    ExpeditionsService,
    LeaderboardService,
    EventsService,
    AchievementsService,
    TransferService,
  ],
  exports: [
    WorldFactoryService,
    FinalizationService,
    ExpeditionsService,
    EventsService,
    GameEngineService,
    PlanetsService,
    TransferService,
  ],
})
export class GameModule {}
