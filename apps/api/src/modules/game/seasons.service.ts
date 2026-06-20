import { Injectable } from '@nestjs/common';
import {
  SeasonRewardScope as PrismaSeasonRewardScope,
  SeasonStatus as PrismaSeasonStatus,
  type Prisma,
} from '@prisma/client';
import {
  ResourceType,
  SEASON_ALLIANCE_TIERS,
  SEASON_DURATION_DAYS,
  SEASON_PLAYER_TIERS,
  SeasonRewardScope as SharedSeasonRewardScope,
  type ResourceBundle,
  type SeasonOverview,
  type SeasonRewardTier,
  type SeasonRewardView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from './game-engine.service';
import { LeaderboardService, type ScoredUser } from './leaderboard.service';

const DAY_MS = 24 * 60 * 60 * 1_000;

@Injectable()
export class SeasonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboard: LeaderboardService,
    private readonly engine: GameEngineService,
  ) {}

  async getOverview(userId: string, now = new Date()): Promise<SeasonOverview> {
    const universeId = await this.resolveUniverseId(userId);
    await this.rolloverIfDue(universeId, now);
    const current = await this.ensureActiveSeason(universeId, now);

    const rewards = await this.prisma.seasonReward.findMany({
      where: { userId, claimedAt: null },
      include: { season: { select: { index: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      current: {
        index: current.index,
        startedAt: current.startedAt.toISOString(),
        endsAt: current.endsAt.toISOString(),
      },
      unclaimedRewards: rewards.map((r) => this.toView(r)),
    };
  }

  async claim(userId: string, now = new Date()): Promise<SeasonOverview> {
    await this.prisma.serializable(async (tx) => {
      const rewards = await tx.seasonReward.findMany({ where: { userId, claimedAt: null } });
      if (rewards.length === 0) return;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { title: true },
      });

      const bundle: ResourceBundle = {
        [ResourceType.BIOMASS]: 0,
        [ResourceType.SAP]: 0,
        [ResourceType.MINERALS]: 0,
        [ResourceType.SPORES]: 0,
      };
      for (const reward of rewards) {
        bundle[ResourceType.BIOMASS]! += reward.rewardBiomass;
        bundle[ResourceType.SAP]! += reward.rewardSap;
        bundle[ResourceType.MINERALS]! += reward.rewardMinerals;
        bundle[ResourceType.SPORES]! += reward.rewardSpores;
      }
      await this.engine.creditResourcesToHomeworld(
        userId,
        bundle,
        now,
        tx as Prisma.TransactionClient,
      );

      const title = this.pickBestTitle(rewards, user.title);
      if (title && title !== user.title) {
        await tx.user.update({ where: { id: userId }, data: { title } });
      }
      await tx.seasonReward.updateMany({
        where: { userId, claimedAt: null },
        data: { claimedAt: now },
      });
    });

    return this.getOverview(userId, now);
  }

  /** Récupération au démarrage et fallback périodique pour tous les univers. */
  async sweepAllDue(now = new Date()): Promise<void> {
    const universes = await this.prisma.universe.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    for (const { id } of universes) {
      await this.rolloverIfDue(id, now);
      await this.ensureActiveSeason(id, now);
    }
  }

  private async resolveUniverseId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { universeId: true },
    });
    return user.universeId;
  }

  private async ensureActiveSeason(universeId: string, now: Date) {
    const active = await this.prisma.leaderboardSeason.findFirst({
      where: { universeId, status: PrismaSeasonStatus.ACTIVE },
      orderBy: { index: 'desc' },
    });
    if (active) return active;
    return this.createSeason(universeId, this.prisma, now);
  }

  private async createSeason(
    universeId: string,
    db: PrismaService | Prisma.TransactionClient,
    now: Date,
  ) {
    const last = await db.leaderboardSeason.findFirst({
      where: { universeId },
      orderBy: { index: 'desc' },
    });
    const index = (last?.index ?? 0) + 1;
    return db.leaderboardSeason.create({
      data: {
        universeId,
        index,
        startedAt: now,
        endsAt: new Date(now.getTime() + SEASON_DURATION_DAYS * DAY_MS),
      },
    });
  }

  /** Finalisation paresseuse : si la saison active est échue, fige le classement. */
  private async rolloverIfDue(universeId: string, now: Date): Promise<void> {
    const due = await this.prisma.leaderboardSeason.findFirst({
      where: { universeId, status: PrismaSeasonStatus.ACTIVE, endsAt: { lte: now } },
    });
    if (!due) return;

    const scored = await this.leaderboard.scoredUsers(universeId);

    await this.prisma.serializable(async (tx) => {
      // Re-vérifie dans la transaction (idempotence si plusieurs requêtes concurrentes).
      const season = await tx.leaderboardSeason.findFirst({
        where: { id: due.id, status: PrismaSeasonStatus.ACTIVE },
      });
      if (!season) return;

      const rows = this.buildRewardRows(season.id, scored);
      if (rows.length > 0) await tx.seasonReward.createMany({ data: rows });
      await tx.leaderboardSeason.update({
        where: { id: season.id },
        data: { status: PrismaSeasonStatus.CLOSED },
      });
      await this.createSeason(universeId, tx, now);
    });
  }

  private buildRewardRows(
    seasonId: string,
    scored: ScoredUser[],
  ): Prisma.SeasonRewardCreateManyInput[] {
    const rows: Prisma.SeasonRewardCreateManyInput[] = [];

    // Classement individuel.
    const players = [...scored].sort((a, b) => b.score - a.score);
    players.forEach((player, i) => {
      const rank = i + 1;
      const tier = SEASON_PLAYER_TIERS.find((t) => rank <= t.maxRank);
      if (tier) {
        rows.push(
          this.row(
            seasonId,
            PrismaSeasonRewardScope.PLAYER,
            player.id,
            null,
            rank,
            player.score,
            tier,
          ),
        );
      }
    });

    // Classement d'alliances : récompense distribuée à chaque membre.
    const allianceMap = new Map<string, { score: number; memberIds: string[] }>();
    for (const user of scored) {
      if (!user.alliance) continue;
      const acc = allianceMap.get(user.alliance.id) ?? { score: 0, memberIds: [] };
      acc.score += user.score;
      acc.memberIds.push(user.id);
      allianceMap.set(user.alliance.id, acc);
    }
    const alliances = [...allianceMap.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.score - a.score);
    alliances.forEach((alliance, i) => {
      const rank = i + 1;
      const tier = SEASON_ALLIANCE_TIERS.find((t) => rank <= t.maxRank);
      if (tier) {
        for (const memberId of alliance.memberIds) {
          rows.push(
            this.row(
              seasonId,
              PrismaSeasonRewardScope.ALLIANCE,
              memberId,
              alliance.id,
              rank,
              alliance.score,
              tier,
            ),
          );
        }
      }
    });

    return rows;
  }

  private row(
    seasonId: string,
    scope: PrismaSeasonRewardScope,
    userId: string,
    allianceId: string | null,
    rank: number,
    score: number,
    tier: SeasonRewardTier,
  ): Prisma.SeasonRewardCreateManyInput {
    return {
      seasonId,
      scope,
      userId,
      allianceId,
      rank,
      score,
      title: tier.title ?? null,
      rewardBiomass: tier.reward[ResourceType.BIOMASS] ?? 0,
      rewardSap: tier.reward[ResourceType.SAP] ?? 0,
      rewardMinerals: tier.reward[ResourceType.MINERALS] ?? 0,
      rewardSpores: tier.reward[ResourceType.SPORES] ?? 0,
    };
  }

  /** Conserve le titre le plus prestigieux, y compris face au titre déjà équipé. */
  private pickBestTitle(
    rewards: { scope: PrismaSeasonRewardScope; rank: number; title: string | null }[],
    currentTitle: string | null,
  ): string | null {
    const prestige = [
      ...SEASON_PLAYER_TIERS.map((tier) => tier.title),
      ...SEASON_ALLIANCE_TIERS.map((tier) => tier.title),
    ].filter((title): title is string => Boolean(title));
    const candidates = [currentTitle, ...rewards.map((reward) => reward.title)].filter(
      (title): title is string => Boolean(title),
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((best, title) => {
      const bestRank = prestige.indexOf(best);
      const titleRank = prestige.indexOf(title);
      // Un titre inconnu (administratif ou futur) n'est jamais écrasé implicitement.
      if (bestRank < 0) return best;
      if (titleRank < 0) return title;
      return titleRank < bestRank ? title : best;
    });
  }

  private toView(reward: {
    id: string;
    scope: PrismaSeasonRewardScope;
    rank: number;
    score: number;
    title: string | null;
    rewardBiomass: number;
    rewardSap: number;
    rewardMinerals: number;
    rewardSpores: number;
    season: { index: number };
  }): SeasonRewardView {
    return {
      id: reward.id,
      scope:
        reward.scope === PrismaSeasonRewardScope.PLAYER
          ? SharedSeasonRewardScope.PLAYER
          : SharedSeasonRewardScope.ALLIANCE,
      seasonIndex: reward.season.index,
      rank: reward.rank,
      score: reward.score,
      title: reward.title,
      reward: {
        [ResourceType.BIOMASS]: reward.rewardBiomass,
        [ResourceType.SAP]: reward.rewardSap,
        [ResourceType.MINERALS]: reward.rewardMinerals,
        [ResourceType.SPORES]: reward.rewardSpores,
      },
    };
  }
}
