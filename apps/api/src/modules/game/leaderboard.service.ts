import { Injectable } from '@nestjs/common';
import type { AllianceLeaderboardEntry, LeaderboardEntry } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ScoredUser {
  id: string;
  username: string;
  title: string | null;
  updatedAt: Date;
  score: number;
  colonies: number;
  ships: number;
  alliance: { id: string; tag: string; name: string; bannerColor: string } | null;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Score d'un joueur à partir de ses bâtiments, recherches, colonies, flotte et expéditions. */
  private scoreUser(user: {
    planets: { buildings: { level: number }[]; ships: { quantity: number }[] }[];
    researchLevels: { level: number }[];
    expeditionReports: { id: string }[];
  }): { score: number; colonies: number; ships: number } {
    const buildingScore = user.planets
      .flatMap((p) => p.buildings)
      .reduce((sum, b) => sum + b.level * 10, 0);
    const researchScore = user.researchLevels.reduce((sum, r) => sum + r.level * 100, 0);
    const colonies = user.planets.length;
    const ships = user.planets.flatMap((p) => p.ships).reduce((sum, s) => sum + s.quantity, 0);
    const score =
      buildingScore +
      researchScore +
      colonies * 500 +
      ships * 5 +
      user.expeditionReports.length * 20;
    return { score, colonies, ships };
  }

  /**
   * Joueurs scorés. Sans argument, repose sur le scoping d'univers par contexte
   * (requêtes HTTP) ; avec `universeId`, filtre explicitement (rollover de saison
   * hors contexte de requête).
   */
  async scoredUsers(universeId?: string): Promise<ScoredUser[]> {
    const users = await this.prisma.user.findMany({
      where: universeId ? { universeId } : undefined,
      select: {
        id: true,
        username: true,
        title: true,
        updatedAt: true,
        planets: {
          select: {
            buildings: { select: { level: true } },
            ships: { select: { quantity: true } },
          },
        },
        researchLevels: { select: { level: true } },
        expeditionReports: { select: { id: true } },
        allianceMembership: {
          select: {
            alliance: { select: { id: true, tag: true, name: true, bannerColor: true } },
          },
        },
      },
    });

    return users.map((user) => {
      const { score, colonies, ships } = this.scoreUser(user);
      return {
        id: user.id,
        username: user.username,
        title: user.title,
        updatedAt: user.updatedAt,
        score,
        colonies,
        ships,
        alliance: user.allianceMembership?.alliance ?? null,
      };
    });
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const scored = await this.scoredUsers();
    const entries = scored.map((u) => ({
      rank: 0,
      username: u.username,
      score: u.score,
      colonies: u.colonies,
      ships: u.ships,
      lastActive: u.updatedAt.toISOString(),
      title: u.title,
    }));
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => (e.rank = i + 1));
    return entries.slice(0, 50);
  }

  /** Classement des alliances : somme des scores des membres (du même univers). */
  async getAllianceLeaderboard(): Promise<AllianceLeaderboardEntry[]> {
    const scored = await this.scoredUsers();
    const byAlliance = new Map<
      string,
      { tag: string; name: string; bannerColor: string; score: number; memberCount: number }
    >();
    for (const user of scored) {
      if (!user.alliance) continue;
      const acc = byAlliance.get(user.alliance.id) ?? {
        tag: user.alliance.tag,
        name: user.alliance.name,
        bannerColor: user.alliance.bannerColor,
        score: 0,
        memberCount: 0,
      };
      acc.score += user.score;
      acc.memberCount += 1;
      byAlliance.set(user.alliance.id, acc);
    }
    const entries = [...byAlliance.values()].map((a) => ({
      rank: 0,
      tag: a.tag,
      name: a.name,
      bannerColor: a.bannerColor,
      memberCount: a.memberCount,
      score: a.score,
    }));
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => (e.rank = i + 1));
    return entries.slice(0, 50);
  }
}
