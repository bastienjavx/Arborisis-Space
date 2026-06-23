import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { ColonizationController } from './colonization.controller';
import { ColonizationService } from './colonization.service';
import { ConstructionQueueController } from './construction-queue.controller';
import { ConstructionQueueService } from './construction-queue.service';
import { EmpireController } from './empire.controller';
import { EmpireService } from './empire.service';
import { FinalizationService } from './finalization.service';
import { FleetPresetsController } from './fleet-presets.controller';
import { FleetPresetsService } from './fleet-presets.service';
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
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';
import { DailyRewardController } from './daily-reward.controller';
import { DailyRewardService } from './daily-reward.service';
import { AbsenceSummaryController } from './absence-summary.controller';
import { AbsenceSummaryService } from './absence-summary.service';
import { SeasonsController } from './seasons.controller';
import { SeasonsService } from './seasons.service';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

@Module({
  imports: [QueueModule],
  controllers: [
    PlanetsController,
    BuildingsController,
    ConstructionQueueController,
    ResearchController,
    GalaxyController,
    ColonizationController,
    ShipsController,
    FleetPresetsController,
    ExpeditionsController,
    LeaderboardController,
    EventsController,
    AchievementsController,
    QuestsController,
    DailyRewardController,
    AbsenceSummaryController,
    SeasonsController,
    TransferController,
    EmpireController,
  ],
  providers: [
    GameEngineService,
    FinalizationService,
    WorldFactoryService,
    PlanetsService,
    BuildingsService,
    ConstructionQueueService,
    ResearchService,
    GalaxyService,
    ColonizationService,
    ShipsService,
    FleetPresetsService,
    ExpeditionsService,
    LeaderboardService,
    EventsService,
    AchievementsService,
    QuestsService,
    DailyRewardService,
    AbsenceSummaryService,
    SeasonsService,
    TransferService,
    EmpireService,
  ],
  exports: [
    WorldFactoryService,
    FinalizationService,
    ExpeditionsService,
    EventsService,
    GameEngineService,
    SeasonsService,
    PlanetsService,
    TransferService,
    ConstructionQueueService,
  ],
})
export class GameModule {}
