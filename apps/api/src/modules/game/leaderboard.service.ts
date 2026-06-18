import { Injectable } from '@nestjs/common';
import type { LeaderboardEntry } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const users = await this.prisma.user.findMany({
      select: {
        username: true,
        updatedAt: true,
        planets: {
          select: {
            buildings: { select: { level: true } },
            ships: { select: { quantity: true } },
          },
        },
        researchLevels: { select: { level: true } },
        expeditionReports: { select: { id: true } },
      },
      take: 50,
    });

    const entries = users.map((user) => {
      const buildingScore = user.planets
        .flatMap((p) => p.buildings)
        .reduce((sum, b) => sum + b.level * 10, 0);
      const researchScore = user.researchLevels.reduce((sum, r) => sum + r.level * 100, 0);
      const colonies = user.planets.length;
      const ships = user.planets.flatMap((p) => p.ships).reduce((sum, s) => sum + s.quantity, 0);
      const score =
        buildingScore + researchScore + colonies * 500 + ships * 5 + user.expeditionReports.length * 20;
      return {
        rank: 0,
        username: user.username,
        score,
        colonies,
        ships,
        lastActive: user.updatedAt.toISOString(),
      };
    });

    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => (e.rank = i + 1));
    return entries.slice(0, 50);
  }
}
