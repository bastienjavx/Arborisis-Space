import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GALAXY_COUNT,
  POSITIONS_PER_SYSTEM,
  SYSTEMS_PER_GALAXY,
  type GalaxySystemView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GalaxyService {
  constructor(private readonly prisma: PrismaService) {}

  assertValidSystem(galaxy: number, system: number): void {
    if (galaxy < 1 || galaxy > GALAXY_COUNT || system < 1 || system > SYSTEMS_PER_GALAXY) {
      throw new BadRequestException('Coordonnées hors de la galaxie connue.');
    }
  }

  assertValidPosition(galaxy: number, system: number, position: number): void {
    this.assertValidSystem(galaxy, system);
    if (position < 1 || position > POSITIONS_PER_SYSTEM) {
      throw new BadRequestException('Position invalide dans le système.');
    }
  }

  async getSystem(userId: string, galaxy: number, system: number): Promise<GalaxySystemView> {
    this.assertValidSystem(galaxy, system);

    const planets = await this.prisma.planet.findMany({
      where: { galaxy, system },
      include: { owner: { select: { id: true, username: true } } },
    });
    const byPosition = new Map(planets.map((p) => [p.position, p]));

    const slots = Array.from({ length: POSITIONS_PER_SYSTEM }, (_, i) => {
      const position = i + 1;
      const planet = byPosition.get(position);
      return {
        coordinates: { galaxy, system, position },
        occupied: !!planet,
        planetName: planet?.name ?? null,
        ownerName: planet?.owner.username ?? null,
        isOwn: planet?.owner.id === userId,
      };
    });

    return { galaxy, system, slots };
  }
}
