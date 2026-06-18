import { Controller, Get } from '@nestjs/common';
import type { ActiveEventView } from '@arborisis/shared';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get('active')
  getActive(): Promise<ActiveEventView | null> {
    return this.events.getActiveEvent();
  }
}
