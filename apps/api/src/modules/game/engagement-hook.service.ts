import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { DailyQuestType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EngagementHookService {
  constructor(private readonly prisma: PrismaService) {}

  async onShipsProduced(userId: string, quantity: number): Promise<void> {
    await this.updateProgress(userId, DailyQuestType.PRODUCE_SHIPS, quantity);
  }

  async onExpeditionLaunched(userId: string): Promise<void> {
    await this.updateProgress(userId, DailyQuestType.LAUNCH_EXPEDITIONS, 1);
  }

  async onBuildingCompleted(userId: string): Promise<void> {
    await this.updateProgress(userId, DailyQuestType.BUILD_BUILDINGS, 1);
  }

  async onResearchCompleted(userId: string): Promise<void> {
    await this.updateProgress(userId, DailyQuestType.COMPLETE_RESEARCH, 1);
  }

  async onPveWon(userId: string): Promise<void> {
    await this.updateProgress(userId, DailyQuestType.WIN_PVE, 1);
  }

  async onResourcesCollected(userId: string, amount: number): Promise<void> {
    await this.updateProgress(userId, DailyQuestType.COLLECT_RESOURCES, amount);
  }

  private async updateProgress(
    userId: string,
    type: DailyQuestType,
    amount: number,
  ): Promise<void> {
    try {
      const now = new Date();
      const quests = await this.prisma.dailyQuest.findMany({
        where: { userId, type, completed: false, expiresAt: { gt: now } },
      });

      for (const quest of quests) {
        const newProgress = Math.min(quest.progress + amount, quest.target);
        const completed = newProgress >= quest.target;
        await this.prisma.dailyQuest.update({
          where: { id: quest.id },
          data: { progress: newProgress, completed },
        });
      }
    } catch (err) {
      // Ignorer silencieusement si la table n'existe pas (DB non migrée)
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2021') {
        return;
      }
      throw err;
    }
  }
}
