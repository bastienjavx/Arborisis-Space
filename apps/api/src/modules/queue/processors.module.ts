import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { FinalizationService } from '../game/finalization.service';
import { QueueModule } from './queue.module';
import { ColonizationProcessor } from './processors/colonization.processor';
import { ConstructionProcessor } from './processors/construction.processor';
import { ResearchProcessor } from './processors/research.processor';

/**
 * Workers BullMQ. Importe GameModule (logique de finalisation) et QueueModule
 * (connexion + files). Effectue un balayage de récupération au démarrage pour
 * finaliser tout job échu pendant une éventuelle indisponibilité.
 */
@Module({
  imports: [QueueModule, GameModule],
  providers: [ConstructionProcessor, ResearchProcessor, ColonizationProcessor],
})
export class ProcessorsModule implements OnApplicationBootstrap {
  constructor(private readonly finalization: FinalizationService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.finalization.sweepAllDue();
  }
}
