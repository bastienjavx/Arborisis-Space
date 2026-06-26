import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DailyQuestType, Prisma, ResourceType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from './game-engine.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@arborisis/shared';

export interface DailyQuestReward {
  biomass: number;
  sap: number;
  minerals: number;
  spores: number;
  engagementTokens: number;
}

export interface DailyQuestView {
  id: string;
  type: DailyQuestType;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward: DailyQuestReward;
  expiresAt: string;
}

export interface DailyQuestsOverview {
  quests: DailyQuestView[];
  engagementTokens: number;
  weeklyBonusAvailable: boolean;
}

const DAILY_QUEST_TEMPLATES: {
  type: DailyQuestType;
  targetMin: number;
  targetMax: number;
  rewardBase: DailyQuestReward;
}[] = [
  {
    type: DailyQuestType.PRODUCE_SHIPS,
    targetMin: 5,
    targetMax: 50,
    rewardBase: { biomass: 100, sap: 50, minerals: 50, spores: 0, engagementTokens: 1 },
  },
  {
    type: DailyQuestType.LAUNCH_EXPEDITIONS,
    targetMin: 1,
    targetMax: 5,
    rewardBase: { biomass: 200, sap: 100, minerals: 100, spores: 50, engagementTokens: 1 },
  },
  {
    type: DailyQuestType.COLLECT_RESOURCES,
    targetMin: 500,
    targetMax: 5000,
    rewardBase: { biomass: 150, sap: 150, minerals: 150, spores: 150, engagementTokens: 1 },
  },
  {
    type: DailyQuestType.BUILD_BUILDINGS,
    targetMin: 1,
    targetMax: 3,
    rewardBase: { biomass: 300, sap: 200, minerals: 200, spores: 100, engagementTokens: 1 },
  },
  {
    type: DailyQuestType.COMPLETE_RESEARCH,
    targetMin: 1,
    targetMax: 2,
    rewardBase: { biomass: 250, sap: 250, minerals: 100, spores: 200, engagementTokens: 1 },
  },
  {
    type: DailyQuestType.WIN_PVE,
    targetMin: 1,
    targetMax: 5,
    rewardBase: { biomass: 100, sap: 50, minerals: 100, spores: 200, engagementTokens: 1 },
  },
];

function getQuestDescription(type: DailyQuestType, target: number): string {
  switch (type) {
    case DailyQuestType.PRODUCE_SHIPS:
      return `Produire ${target} vaisseaux`;
    case DailyQuestType.LAUNCH_EXPEDITIONS:
      return `Lancer ${target} expédition${target > 1 ? 's' : ''}`;
    case DailyQuestType.COLLECT_RESOURCES:
      return `Collecter ${target.toLocaleString()} unités de ressources`;
    case DailyQuestType.BUILD_BUILDINGS:
      return `Construire ou améliorer ${target} bâtiment${target > 1 ? 's' : ''}`;
    case DailyQuestType.COMPLETE_RESEARCH:
      return `Terminer ${target} recherche${target > 1 ? 's' : ''}`;
    case DailyQuestType.WIN_PVE:
      return `Gagner ${target} combat${target > 1 ? 's' : ''} PvE`;
    default:
      return `Atteindre l'objectif : ${target}`;
  }
}

function generateDailyQuests(userId: string, count = 3): Prisma.DailyQuestCreateManyInput[] {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  expiresAt.setUTCHours(0, 0, 0, 0);

  const shuffled = [...DAILY_QUEST_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map((template) => {
    const target = Math.floor(
      template.targetMin + Math.random() * (template.targetMax - template.targetMin + 1),
    );
    return {
      userId,
      type: template.type,
      target,
      progress: 0,
      completed: false,
      claimed: false,
      reward: template.rewardBase as unknown as Prisma.InputJsonValue,
      expiresAt,
    };
  });
}

@Injectable()
export class DailyQuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly notifications: NotificationsService,
  ) {}

  async getDailyQuests(userId: string): Promise<DailyQuestsOverview> {
    await this.ensureDailyQuests(userId);

    const [quests, token] = await Promise.all([
      this.prisma.dailyQuest.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.engagementToken.findUnique({ where: { userId } }),
    ]);

    const now = new Date();
    const validQuests = quests.filter((q) => q.expiresAt > now);

    return {
      quests: validQuests.map((q) => ({
        id: q.id,
        type: q.type,
        target: q.target,
        progress: q.progress,
        completed: q.completed,
        claimed: q.claimed,
        reward: q.reward as unknown as DailyQuestReward,
        expiresAt: q.expiresAt.toISOString(),
      })),
      engagementTokens: token?.count ?? 0,
      weeklyBonusAvailable: (token?.count ?? 0) >= 7,
    };
  }

  async claimDailyQuest(userId: string, questId: string): Promise<DailyQuestsOverview> {
    await this.ensureDailyQuests(userId);

    const quest = await this.prisma.dailyQuest.findFirst({
      where: { id: questId, userId },
    });
    if (!quest) throw new NotFoundException('Quête introuvable');
    if (!quest.completed) throw new BadRequestException('Quête non terminée');
    if (quest.claimed) throw new BadRequestException('Récompense déjà récupérée');

    const reward = quest.reward as unknown as DailyQuestReward;

    await this.prisma.serializable(async (tx) => {
      await tx.dailyQuest.update({
        where: { id: questId },
        data: { claimed: true },
      });

      await this.engine.creditResourcesToHomeworld(
        userId,
        {
          [ResourceType.BIOMASS]: reward.biomass,
          [ResourceType.SAP]: reward.sap,
          [ResourceType.MINERALS]: reward.minerals,
          [ResourceType.SPORES]: reward.spores,
        },
        new Date(),
        tx,
      );

      // Incrémenter les jetons d'engagement
      const token = await tx.engagementToken.findUnique({ where: { userId } });
      if (token) {
        const newCount = Math.min(token.count + reward.engagementTokens, 7);
        await tx.engagementToken.update({
          where: { userId },
          data: { count: newCount },
        });
      } else {
        await tx.engagementToken.create({
          data: { userId, count: reward.engagementTokens },
        });
      }
    });

    // Bonus hebdomadaire si 7 jetons atteints
    const token = await this.prisma.engagementToken.findUnique({ where: { userId } });
    if (token && token.count >= 7) {
      await this.claimWeeklyBonus(userId);
    }

    await this.notifications.enqueue(
      userId,
      NotificationType.ACHIEVEMENT_UNLOCKED,
      'Quête quotidienne terminée',
      `Vous avez terminé : ${getQuestDescription(quest.type, quest.target)}`,
      { questId, reward },
    );

    return this.getDailyQuests(userId);
  }

  async claimWeeklyBonus(userId: string): Promise<void> {
    const token = await this.prisma.engagementToken.findUnique({ where: { userId } });
    if (!token || token.count < 7) return;

    await this.prisma.serializable(async (tx) => {
      await tx.engagementToken.update({
        where: { userId },
        data: { count: 0, lastResetAt: new Date() },
      });

      await this.engine.creditResourcesToHomeworld(
        userId,
        {
          [ResourceType.BIOMASS]: 2000,
          [ResourceType.SAP]: 2000,
          [ResourceType.MINERALS]: 2000,
          [ResourceType.SPORES]: 2000,
        },
        new Date(),
        tx,
      );
    });

    await this.notifications.enqueue(
      userId,
      NotificationType.ACHIEVEMENT_UNLOCKED,
      'Bonus hebdomadaire',
      'Vous avez cumulé 7 jetons et débloqué un bonus de ressources !',
      { type: 'weekly_bonus' },
    );
  }

  async updateProgress(userId: string, type: DailyQuestType, amount: number): Promise<void> {
    await this.ensureDailyQuests(userId);

    const quests = await this.prisma.dailyQuest.findMany({
      where: { userId, type, completed: false },
    });

    for (const quest of quests) {
      const newProgress = Math.min(quest.progress + amount, quest.target);
      const completed = newProgress >= quest.target;
      await this.prisma.dailyQuest.update({
        where: { id: quest.id },
        data: { progress: newProgress, completed },
      });
    }
  }

  private async ensureDailyQuests(userId: string): Promise<void> {
    const now = new Date();
    const existing = await this.prisma.dailyQuest.findMany({
      where: { userId, expiresAt: { gt: now } },
    });

    if (existing.length === 0) {
      // Supprimer les anciennes quêtes expirées
      await this.prisma.dailyQuest.deleteMany({ where: { userId } });

      const quests = generateDailyQuests(userId, 3);
      await this.prisma.dailyQuest.createMany({ data: quests });
    }
  }
}
