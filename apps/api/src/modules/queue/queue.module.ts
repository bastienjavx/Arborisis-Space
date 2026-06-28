import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import {
  COLONIZATION_QUEUE,
  CONSTRUCTION_QUEUE,
  CRAFTING_QUEUE,
  EXPEDITION_QUEUE,
  GAME_EVENT_QUEUE,
  MARKET_EXPIRY_QUEUE,
  NOTIFICATIONS_QUEUE,
  NPC_QUEUE,
  PRODUCTION_LINE_QUEUE,
  PROVISIONING_QUEUE,
  PVE_QUEUE,
  PVP_QUEUE,
  RESEARCH_QUEUE,
  SHIP_PRODUCTION_QUEUE,
  TRADE_ROUTE_QUEUE,
  TRANSFER_QUEUE,
} from './queue.constants';
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
      { name: SHIP_PRODUCTION_QUEUE },
      { name: EXPEDITION_QUEUE },
      { name: PVE_QUEUE },
      { name: PVP_QUEUE },
      { name: GAME_EVENT_QUEUE },
      { name: TRANSFER_QUEUE },
      { name: CRAFTING_QUEUE },
      { name: PRODUCTION_LINE_QUEUE },
      { name: TRADE_ROUTE_QUEUE },
      { name: MARKET_EXPIRY_QUEUE },
      { name: NOTIFICATIONS_QUEUE },
      { name: NPC_QUEUE },
      {
        name: PROVISIONING_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10_000 },
        },
      },
    ),
  ],
  providers: [GameQueueService],
  exports: [GameQueueService, BullModule],
})
export class QueueModule {}
