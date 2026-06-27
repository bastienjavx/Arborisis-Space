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

interface ScoredUserRow {
  id: string;
  username: string;
  title: string | null;
  updatedAt: Date;
  buildingScore: number;
  researchScore: number;
  colonies: number;
  ships: number;
  expeditions: number;
  allianceId: string | null;
  allianceTag: string | null;
  allianceName: string | null;
  allianceBannerColor: string | null;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Joueurs scorés. Sans argument, repose sur le scoping d'univers par contexte
   * (requêtes HTTP) ; avec `universeId`, filtre explicitement (rollover de saison
   * hors contexte de requête).
   *
   * Le calcul est poussé en base de données pour éviter de matérialiser l'ensemble
   * des planètes/bâtiments/vaisseaux en mémoire.
   */
  async scoredUsers(universeId?: string): Promise<ScoredUser[]> {
    const effectiveUniverseId =
      universeId ??
      (await this.prisma.universe.findUnique({ where: { slug: 'default' }, select: { id: true } }))
        ?.id;
    if (!effectiveUniverseId) return [];

    const rows = await this.prisma.$queryRaw<ScoredUserRow[]>`
      WITH building_scores AS (
        SELECT p."ownerId" AS user_id,
               COUNT(DISTINCT p.id) AS colonies,
               COALESCE(SUM(b.level) * 10, 0) AS building_score
        FROM planets p
        LEFT JOIN planet_buildings b ON b."planetId" = p.id
        WHERE p."universeId" = ${effectiveUniverseId}
        GROUP BY p."ownerId"
      ),
      research_scores AS (
        SELECT rl."userId" AS user_id,
               COALESCE(SUM(rl.level) * 100, 0) AS research_score
        FROM research_levels rl
        WHERE rl."userId" IN (SELECT id FROM users WHERE "universeId" = ${effectiveUniverseId} AND role != 'NPC')
        GROUP BY rl."userId"
      ),
      ship_counts AS (
        SELECT p."ownerId" AS user_id,
               COALESCE(SUM(ps.quantity), 0) AS ships
        FROM planets p
        LEFT JOIN planet_ships ps ON ps."planetId" = p.id
        WHERE p."universeId" = ${effectiveUniverseId}
        GROUP BY p."ownerId"
      ),
      expedition_counts AS (
        SELECT er."userId" AS user_id,
               COUNT(*) AS expeditions
        FROM expedition_reports er
        WHERE er."userId" IN (SELECT id FROM users WHERE "universeId" = ${effectiveUniverseId} AND role != 'NPC')
        GROUP BY er."userId"
      )
      SELECT
        u.id,
        u.username,
        u.title,
        u."updatedAt" AS "updatedAt",
        COALESCE(bs.building_score, 0) AS "buildingScore",
        COALESCE(rs.research_score, 0) AS "researchScore",
        COALESCE(bs.colonies, 0) AS colonies,
        COALESCE(sc.ships, 0) AS ships,
        COALESCE(ec.expeditions, 0) AS expeditions,
        a.id AS "allianceId",
        a.tag AS "allianceTag",
        a.name AS "allianceName",
        a."bannerColor" AS "allianceBannerColor"
      FROM users u
      LEFT JOIN building_scores bs ON bs.user_id = u.id
      LEFT JOIN research_scores rs ON rs.user_id = u.id
      LEFT JOIN ship_counts sc ON sc.user_id = u.id
      LEFT JOIN expedition_counts ec ON ec.user_id = u.id
      LEFT JOIN alliance_members am ON am."userId" = u.id
      LEFT JOIN alliances a ON a.id = am."allianceId"
      WHERE u."universeId" = ${effectiveUniverseId}
        AND u.role != 'NPC'
      ORDER BY
        COALESCE(bs.building_score, 0) + COALESCE(rs.research_score, 0)
        + COALESCE(bs.colonies, 0) * 500 + COALESCE(sc.ships, 0) * 5
        + COALESCE(ec.expeditions, 0) * 20 DESC
    `;

    return rows.map((row) => {
      const score =
        Number(row.buildingScore) +
        Number(row.researchScore) +
        Number(row.colonies) * 500 +
        Number(row.ships) * 5 +
        Number(row.expeditions) * 20;
      return {
        id: row.id,
        username: row.username,
        title: row.title,
        updatedAt: row.updatedAt,
        score,
        colonies: Number(row.colonies),
        ships: Number(row.ships),
        alliance:
          row.allianceId && row.allianceTag && row.allianceName
            ? {
                id: row.allianceId,
                tag: row.allianceTag,
                name: row.allianceName,
                bannerColor: row.allianceBannerColor ?? '#22c55e',
              }
            : null,
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
