import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventsService } from '../../game/events.service';
import { NpcSpawnerService } from '../../pve/npc-spawner.service';
import { GameQueueService } from '../game-queue.service';
import { GAME_EVENT_QUEUE, SPAWN_NPC_JOB, TRIGGER_EVENT_JOB } from '../queue.constants';
import { runWithUniverse } from './run-with-universe';

@Processor(GAME_EVENT_QUEUE)
export class EventProcessor extends WorkerHost {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    private readonly events: EventsService,
    private readonly prisma: PrismaService,
    private readonly spawner: NpcSpawnerService,
    private readonly queue: GameQueueService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    await runWithUniverse(this.prisma, job.data.universeId, async () => {
      if (job.name === TRIGGER_EVENT_JOB) {
        await this.events.triggerNextEvent();
        this.logger.log('Événement galactique déclenché');
      } else if (job.name === SPAWN_NPC_JOB) {
        await this.spawner.spawnBatch();
        await this.queue.scheduleNextNpcSpawn();
        this.logger.log('Spawn NPC effectué');
      }
    });
  }
}
