import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface LoginStreakView {
  streakDays: number;
  multiplier: number;
  lastLoginAt: string;
}

export interface SessionBonusView {
  sessionMinutes: number;
  multiplier: number;
}

export interface EngagementOverview {
  loginStreak: LoginStreakView;
  sessionBonus: SessionBonusView;
  totalMultiplier: number;
}

@Injectable()
export class EngagementService {
  constructor(private readonly prisma: PrismaService) {}

  async onLogin(userId: string): Promise<EngagementOverview> {
    const now = new Date();
    let streak = await this.prisma.loginStreak.findUnique({ where: { userId } });

    if (!streak) {
      streak = await this.prisma.loginStreak.create({
        data: { userId, streakDays: 1, lastLoginAt: now, multiplier: 1.1 },
      });
    } else {
      const lastLogin = new Date(streak.lastLoginAt);
      const hoursSinceLastLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);

      let newStreakDays = streak.streakDays;
      let newMultiplier = streak.multiplier;

      if (hoursSinceLastLogin >= 24 && hoursSinceLastLogin < 48) {
        // Jour suivant : incrémenter le streak
        newStreakDays = Math.min(streak.streakDays + 1, 7);
        newMultiplier = Math.min(1.0 + newStreakDays * 0.1, 2.0);
      } else if (hoursSinceLastLogin >= 48) {
        // Streak perdu
        newStreakDays = 1;
        newMultiplier = 1.1;
      }

      streak = await this.prisma.loginStreak.update({
        where: { userId },
        data: { streakDays: newStreakDays, lastLoginAt: now, multiplier: newMultiplier },
      });
    }

    // Réinitialiser le bonus de session à la connexion
    const sessionBonus = await this.prisma.sessionBonus.upsert({
      where: { userId },
      create: { userId, sessionMinutes: 0, multiplier: 1.0 },
      update: { sessionMinutes: 0, multiplier: 1.0 },
    });

    return this.buildOverview(streak, sessionBonus);
  }

  async updateSessionBonus(userId: string): Promise<EngagementOverview> {
    const now = new Date();
    let sessionBonus = await this.prisma.sessionBonus.findUnique({ where: { userId } });

    if (!sessionBonus) {
      sessionBonus = await this.prisma.sessionBonus.create({
        data: { userId, sessionMinutes: 0, multiplier: 1.0 },
      });
    }

    const streak = await this.prisma.loginStreak.findUnique({ where: { userId } });
    if (!streak) {
      return this.buildOverview(
        await this.prisma.loginStreak.create({
          data: { userId, streakDays: 0, lastLoginAt: now, multiplier: 1.0 },
        }),
        sessionBonus,
      );
    }

    return this.buildOverview(streak, sessionBonus);
  }

  async incrementSessionTime(userId: string, minutes: number): Promise<EngagementOverview> {
    let sessionBonus = await this.prisma.sessionBonus.findUnique({ where: { userId } });
    if (!sessionBonus) {
      sessionBonus = await this.prisma.sessionBonus.create({
        data: { userId, sessionMinutes: 0, multiplier: 1.0 },
      });
    }

    const newSessionMinutes = Math.min(sessionBonus.sessionMinutes + minutes, 300); // Max 5h
    const newMultiplier = Math.min(1.0 + Math.floor(newSessionMinutes / 30) * 0.1, 2.0);

    sessionBonus = await this.prisma.sessionBonus.update({
      where: { userId },
      data: { sessionMinutes: newSessionMinutes, multiplier: newMultiplier },
    });

    const streak = await this.prisma.loginStreak.findUnique({ where: { userId } });
    if (!streak) {
      const now = new Date();
      return this.buildOverview(
        await this.prisma.loginStreak.create({
          data: { userId, streakDays: 0, lastLoginAt: now, multiplier: 1.0 },
        }),
        sessionBonus,
      );
    }

    return this.buildOverview(streak, sessionBonus);
  }

  async getEngagement(userId: string): Promise<EngagementOverview> {
    const [streak, sessionBonus] = await Promise.all([
      this.prisma.loginStreak.findUnique({ where: { userId } }),
      this.prisma.sessionBonus.findUnique({ where: { userId } }),
    ]);

    const now = new Date();
    if (!streak) {
      return this.buildOverview(
        await this.prisma.loginStreak.create({
          data: { userId, streakDays: 0, lastLoginAt: now, multiplier: 1.0 },
        }),
        sessionBonus ??
          (await this.prisma.sessionBonus.create({
            data: { userId, sessionMinutes: 0, multiplier: 1.0 },
          })),
      );
    }

    return this.buildOverview(
      streak,
      sessionBonus ??
        (await this.prisma.sessionBonus.create({
          data: { userId, sessionMinutes: 0, multiplier: 1.0 },
        })),
    );
  }

  private buildOverview(
    streak: { streakDays: number; multiplier: number; lastLoginAt: Date },
    sessionBonus: { sessionMinutes: number; multiplier: number },
  ): EngagementOverview {
    const totalMultiplier = Math.min(streak.multiplier + sessionBonus.multiplier - 1.0, 3.0);
    return {
      loginStreak: {
        streakDays: streak.streakDays,
        multiplier: Math.round(streak.multiplier * 100) / 100,
        lastLoginAt: streak.lastLoginAt.toISOString(),
      },
      sessionBonus: {
        sessionMinutes: sessionBonus.sessionMinutes,
        multiplier: Math.round(sessionBonus.multiplier * 100) / 100,
      },
      totalMultiplier: Math.round(totalMultiplier * 100) / 100,
    };
  }
}
