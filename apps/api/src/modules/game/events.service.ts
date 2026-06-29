import { Injectable } from '@nestjs/common';
import type { GalacticEvent } from '@prisma/client';
import { GALACTIC_EVENTS, GalacticEventType, type ActiveEventView } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getDefaultUniverseId } from '../../common/prisma/default-universe.helper';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveEvent(): Promise<ActiveEventView | null> {
    const universeId = await getDefaultUniverseId(this.prisma);
    const event = await this.prisma.galacticEvent.findFirst({
      where: { universeId, endsAt: { gt: new Date() } },
      orderBy: { startAt: 'desc' },
    });
    if (!event) return null;
    return this.toView(event);
  }

  async triggerNextEvent(): Promise<void> {
    const universeId = await getDefaultUniverseId(this.prisma);
    const existing = await this.prisma.galacticEvent.findFirst({
      where: { universeId, endsAt: { gt: new Date() } },
    });
    if (existing) return;

    const types = Object.values(GalacticEventType);
    const pickedIndex = Math.floor(Math.random() * types.length);
    const type = types[pickedIndex] as GalacticEventType;
    const config = GALACTIC_EVENTS[type];
    const now = new Date();
    const endsAt = new Date(now.getTime() + config.durationHours * 3_600_000);

    await this.prisma.galacticEvent.create({
      data: {
        type: type as import('@prisma/client').GalacticEventType,
        universeId,
        startAt: now,
        endsAt,
      },
    });

    if (type === GalacticEventType.ANCIENT_SIGNAL) {
      await this.prisma.planet.updateMany({
        where: { universeId, isHomeworld: true },
        data: { spores: { increment: 500 } },
      });
    }
    // MYCOTOXIN_OUTBREAK : la pénalité de stabilité est transitoire et appliquée
    // dynamiquement par le moteur de jeu (settlePlanet) tant que l'événement est
    // actif, puis restaurée automatiquement à son expiration. On ne mute donc
    // jamais la stabilité persistée ici (sinon la perte serait définitive).
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
