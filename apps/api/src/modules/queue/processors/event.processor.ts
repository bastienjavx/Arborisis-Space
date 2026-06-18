import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EventsService } from '../../game/events.service';
import { GAME_EVENT_QUEUE, TRIGGER_EVENT_JOB } from '../queue.constants';

@Processor(GAME_EVENT_QUEUE)
export class EventProcessor extends WorkerHost {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(private readonly events: EventsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== TRIGGER_EVENT_JOB) return;
    await this.events.triggerNextEvent();
    this.logger.log('Événement galactique déclenché');
  }
}
