import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DAILY_REWARDS,
  DAILY_STREAK_RESET_HOURS,
  type DailyRewardView,
  type ResourceBundle,
} from '@arborisis/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from './game-engine.service';

const DAY_MS = 24 * 60 * 60 * 1_000;
const RESET_MS = DAILY_STREAK_RESET_HOURS * 60 * 60 * 1_000;

@Injectable()
export class DailyRewardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
  ) {}

  async getStatus(userId: string, now = new Date()): Promise<DailyRewardView> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { lastDailyClaimAt: true, dailyStreak: true },
    });
    return this.buildView(user.lastDailyClaimAt, user.dailyStreak, now);
  }

  async claim(userId: string, now = new Date()): Promise<DailyRewardView> {
    return this.prisma.optimistic(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { lastDailyClaimAt: true, dailyStreak: true },
      });
      if (!this.canClaim(user.lastDailyClaimAt, now)) {
        throw new BadRequestException('Récompense quotidienne déjà réclamée. Revenez plus tard.');
      }
      const nextStreak = this.nextStreak(user.lastDailyClaimAt, user.dailyStreak, now);
      const reward = DAILY_REWARDS[(nextStreak - 1) % DAILY_REWARDS.length] ?? {};
      await tx.user.update({
        where: { id: userId },
        data: { lastDailyClaimAt: now, dailyStreak: nextStreak },
      });
      await this.engine.creditResourcesToHomeworld(
        userId,
        reward,
        now,
        tx as Prisma.TransactionClient,
      );
      return this.buildView(now, nextStreak, now);
    });
  }

  private canClaim(lastClaimAt: Date | null, now: Date): boolean {
    if (!lastClaimAt) return true;
    return now.getTime() - lastClaimAt.getTime() >= DAY_MS;
  }

  /** Série après une réclamation à `now` : reset si fenêtre dépassée, sinon +1. */
  private nextStreak(lastClaimAt: Date | null, currentStreak: number, now: Date): number {
    if (!lastClaimAt) return 1;
    const elapsed = now.getTime() - lastClaimAt.getTime();
    if (elapsed > RESET_MS) return 1;
    return currentStreak + 1;
  }

  private buildView(lastClaimAt: Date | null, streak: number, now: Date): DailyRewardView {
    const canClaim = this.canClaim(lastClaimAt, now);
    const cycle: ResourceBundle[] = DAILY_REWARDS;
    if (canClaim) {
      const nextStreak = this.nextStreak(lastClaimAt, streak, now);
      const dayIndex = (nextStreak - 1) % DAILY_REWARDS.length;
      return {
        canClaim: true,
        streak: nextStreak,
        dayIndex,
        todayReward: DAILY_REWARDS[dayIndex] ?? {},
        cycle,
        nextClaimAt: null,
      };
    }
    // Déjà réclamé : on montre le palier obtenu et l'heure de la prochaine réclamation.
    const dayIndex = streak > 0 ? (streak - 1) % DAILY_REWARDS.length : 0;
    const nextClaimAt = lastClaimAt ? new Date(lastClaimAt.getTime() + DAY_MS).toISOString() : null;
    return {
      canClaim: false,
      streak,
      dayIndex,
      todayReward: DAILY_REWARDS[dayIndex] ?? {},
      cycle,
      nextClaimAt,
    };
  }
}
