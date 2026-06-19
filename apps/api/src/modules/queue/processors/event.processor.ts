import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventsService } from '../../game/events.service';
import { GAME_EVENT_QUEUE, TRIGGER_EVENT_JOB } from '../queue.constants';
import { runWithUniverse } from './run-with-universe';

@Processor(GAME_EVENT_QUEUE)
export class EventProcessor extends WorkerHost {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    private readonly events: EventsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== TRIGGER_EVENT_JOB) return;
    await runWithUniverse(this.prisma, job.data.universeId, async () => {
      await this.events.triggerNextEvent();
      this.logger.log('Événement galactique déclenché');
    });
  }
}
