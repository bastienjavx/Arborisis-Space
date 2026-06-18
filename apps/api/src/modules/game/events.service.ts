import { Injectable } from '@nestjs/common';
import type { GalacticEvent } from '@prisma/client';
import { GALACTIC_EVENTS, GalacticEventType, type ActiveEventView } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveEvent(): Promise<ActiveEventView | null> {
    const event = await this.prisma.galacticEvent.findFirst({
      where: { endsAt: { gt: new Date() } },
      orderBy: { startAt: 'desc' },
    });
    if (!event) return null;
    return this.toView(event);
  }

  async triggerNextEvent(): Promise<void> {
    const existing = await this.prisma.galacticEvent.findFirst({
      where: { endsAt: { gt: new Date() } },
    });
    if (existing) return;

    const types = Object.values(GalacticEventType);
    const pickedIndex = Math.floor(Math.random() * types.length);
    const type = types[pickedIndex] as GalacticEventType;
    const config = GALACTIC_EVENTS[type];
    const now = new Date();
    const endsAt = new Date(now.getTime() + config.durationHours * 3_600_000);

    await this.prisma.galacticEvent.create({ data: { type: type as import('@prisma/client').GalacticEventType, startAt: now, endsAt } });

    if (type === GalacticEventType.ANCIENT_SIGNAL) {
      await this.prisma.planet.updateMany({
        where: { isHomeworld: true },
        data: { spores: { increment: 500 } },
      });
    }
    if (type === GalacticEventType.MYCOTOXIN_OUTBREAK) {
      await this.prisma.planet.updateMany({
        data: { stability: { decrement: 20 } },
      });
    }
  }

  private toView(event: GalacticEvent): ActiveEventView {
    const type = event.type as unknown as GalacticEventType;
    const config = GALACTIC_EVENTS[type];
    return {
      type,
      name: config.name,
      effectDescription: config.effectDescription,
      endsAt: event.endsAt.toISOString(),
    };
  }
}
