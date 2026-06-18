import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { COLONIZATION_QUEUE, CONSTRUCTION_QUEUE, RESEARCH_QUEUE } from './queue.constants';
import { GameQueueService } from './game-queue.service';

/**
 * Enregistre les files BullMQ et le service d'enfilage. Module « feuille » :
 * ne dépend que de BullMQ → évite les cycles avec le module de jeu.
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: CONSTRUCTION_QUEUE },
      { name: RESEARCH_QUEUE },
      { name: COLONIZATION_QUEUE },
    ),
  ],
  providers: [GameQueueService],
  exports: [GameQueueService, BullModule],
})
export class QueueModule {}
