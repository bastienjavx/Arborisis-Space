import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BuildingType,
  QUESTS,
  ResearchType,
  type QuestConfig,
  type QuestObjective,
  type QuestView,
  type QuestsOverview,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FinalizationService } from './finalization.service';
import { GameEngineService } from './game-engine.service';

/** Métriques de l'empire du joueur, dérivées de l'état réel pour évaluer les quêtes. */
interface PlayerMetrics {
  buildingLevelTotal: number;
  maxBuilding: Partial<Record<BuildingType, number>>;
  maxResearchAny: number;
  research: Partial<Record<ResearchType, number>>;
  totalShips: number;
  expeditionsLaunched: number;
  colonies: number;
  specializedPlanets: number;
}

@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finalization: FinalizationService,
    private readonly engine: GameEngineService,
  ) {}

  async getQuests(userId: string): Promise<QuestsOverview> {
    await this.settlePlayerState(userId);
    const metrics = await this.gatherMetrics(userId);

    const rows = await this.prisma.playerQuest.findMany({ where: { userId } });
    const rowByQuest = new Map(rows.map((r) => [r.questId, r]));

    // Marque comme complétées les quêtes dont l'objectif est atteint.
    const toComplete: string[] = [];
    for (const quest of QUESTS) {
      const progress = this.progressFor(quest, metrics);
      const row = rowByQuest.get(quest.id);
      if (progress >= quest.target && !row?.completedAt) {
        toComplete.push(quest.id);
      }
    }
    if (toComplete.length > 0) {
      const now = new Date();
      await Promise.all(
        toComplete.map((questId) =>
          this.prisma.playerQuest.upsert({
            where: { userId_questId: { userId, questId } },
            update: { completedAt: now },
            create: { userId, questId, completedAt: now },
          }),
        ),
      );
    }

    const refreshed = await this.prisma.playerQuest.findMany({ where: { userId } });
    const refreshedByQuest = new Map(refreshed.map((r) => [r.questId, r]));

    const quests: QuestView[] = [...QUESTS]
      .sort((a, b) => a.order - b.order)
      .map((quest) => {
        const row = refreshedByQuest.get(quest.id);
        const progress = Math.min(this.progressFor(quest, metrics), quest.target);
        return {
          id: quest.id,
          name: quest.name,
          description: quest.description,
          order: quest.order,
          chapter: quest.chapter,
          ctaHref: quest.ctaHref,
          ctaLabel: quest.ctaLabel,
          reward: quest.reward,
          progress,
          target: quest.target,
          completed: Boolean(row?.completedAt),
          claimedAt: row?.claimedAt?.toISOString() ?? null,
        };
      });

    const active = quests.find((q) => !q.claimedAt) ?? null;
    const claimableCount = quests.filter((q) => q.completed && !q.claimedAt).length;

    return { active, quests, claimableCount };
  }

  async claim(userId: string, questId: string): Promise<QuestsOverview> {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) throw new NotFoundException('Quête inconnue');

    await this.settlePlayerState(userId);
    const metrics = await this.gatherMetrics(userId);
    const progress = this.progressFor(quest, metrics);

    await this.prisma.optimistic(async (tx) => {
      const existing = await tx.playerQuest.findUnique({
        where: { userId_questId: { userId, questId } },
      });
      if (existing?.claimedAt) {
        return;
      }
      const completedAt = existing?.completedAt ?? (progress >= quest.target ? new Date() : null);
      if (!completedAt) {
        throw new BadRequestException('Objectif non atteint');
      }
      await tx.playerQuest.upsert({
        where: { userId_questId: { userId, questId } },
        update: { completedAt, claimedAt: new Date() },
        create: { userId, questId, completedAt, claimedAt: new Date() },
      });
      await this.engine.creditResourcesToHomeworld(userId, quest.reward, new Date(), tx);
    });

    return this.getQuests(userId);
  }

  private progressFor(quest: QuestConfig, m: PlayerMetrics): number {
    const objective: QuestObjective = quest.objective;
    switch (objective) {
      case 'BUILDING_LEVEL_TOTAL':
        return m.buildingLevelTotal;
      case 'BIOMASS_SYNTHESIZER_LEVEL':
        return m.maxBuilding[BuildingType.BIOMASS_SYNTHESIZER] ?? 0;
      case 'SAP_WELL_LEVEL':
        return m.maxBuilding[BuildingType.SAP_WELL] ?? 0;
      case 'MINERAL_VEIN_LEVEL':
        return m.maxBuilding[BuildingType.MINERAL_VEIN] ?? 0;
      case 'PHOTOSYNTHETIC_CANOPY_LEVEL':
        return m.maxBuilding[BuildingType.PHOTOSYNTHETIC_CANOPY] ?? 0;
      case 'RESEARCH_NEXUS_LEVEL':
        return m.maxBuilding[BuildingType.RESEARCH_NEXUS] ?? 0;
      case 'STORAGE_VACUOLE_LEVEL':
        return m.maxBuilding[BuildingType.STORAGE_VACUOLE] ?? 0;
      case 'SYMBIOTIC_CORE_LEVEL':
        return m.maxBuilding[BuildingType.SYMBIOTIC_CORE] ?? 0;
      case 'SPORANGE_LEVEL':
        return m.maxBuilding[BuildingType.SPORANGE] ?? 0;
      case 'ORBITAL_NURSERY_LEVEL':
        return m.maxBuilding[BuildingType.ORBITAL_NURSERY] ?? 0;
      case 'RESEARCH_LEVEL_ANY':
        return m.maxResearchAny;
      case 'BIOENGINEERING_LEVEL':
        return m.research[ResearchType.BIOENGINEERING] ?? 0;
      case 'SPORAL_PROPULSION_LEVEL':
        return m.research[ResearchType.SPORAL_PROPULSION] ?? 0;
      case 'TERRAFORMATION_LEVEL':
        return m.research[ResearchType.TERRAFORMATION] ?? 0;
      case 'PLANET_SPECIALIZATION_SET':
        return m.specializedPlanets;
      case 'TOTAL_SHIPS':
        return m.totalShips;
      case 'EXPEDITIONS_LAUNCHED':
        return m.expeditionsLaunched;
      case 'COLONIES_OWNED':
        return m.colonies;
      default: {
        const _exhaustive: never = objective;
        return _exhaustive;
      }
    }
  }

  private async gatherMetrics(userId: string): Promise<PlayerMetrics> {
    const [planets, research, expeditionsLaunched] = await Promise.all([
      this.prisma.planet.findMany({
        where: { ownerId: userId },
        include: { buildings: true, ships: true },
      }),
      this.prisma.researchLevel.findMany({ where: { userId } }),
      this.prisma.expeditionMission.count({ where: { userId } }),
    ]);

    const maxBuilding: Partial<Record<BuildingType, number>> = {};
    let buildingLevelTotal = 0;
    for (const planet of planets) {
      for (const building of planet.buildings) {
        buildingLevelTotal += building.level;
        const type = building.type as BuildingType;
        maxBuilding[type] = Math.max(maxBuilding[type] ?? 0, building.level);
      }
    }
    const totalShips = planets.flatMap((p) => p.ships).reduce((sum, s) => sum + s.quantity, 0);
    const researchMap: Partial<Record<ResearchType, number>> = {};
    let maxResearchAny = 0;
    for (const r of research) {
      researchMap[r.type as ResearchType] = r.level;
      maxResearchAny = Math.max(maxResearchAny, r.level);
    }

    return {
      buildingLevelTotal,
      maxBuilding,
      maxResearchAny,
      research: researchMap,
      totalShips,
      expeditionsLaunched,
      colonies: planets.length,
      specializedPlanets: planets.filter((planet) => Boolean(planet.specialization)).length,
    };
  }

  private async settlePlayerState(userId: string): Promise<void> {
    await Promise.all([
      this.finalization.finalizeDueResearchForUser(userId),
      this.finalization.finalizeDueColonizationForUser(userId),
    ]);
    const planets = await this.prisma.planet.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    await Promise.all(
      planets.flatMap(({ id }) => [
        this.finalization.finalizeDueForPlanet(id),
        this.finalization.finalizeDueShipProduction(id),
      ]),
    );
    await Promise.all(planets.map(({ id }) => this.engine.settlePlanet(id)));
  }
}
