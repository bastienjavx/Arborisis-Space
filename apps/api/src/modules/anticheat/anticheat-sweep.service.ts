import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BUILDINGS, RESEARCHES, type BuildingType, type ResearchType } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AntiCheatService } from './anticheat.service';
import {
  AntiCheatEventType,
  SWEEP_BATCH_LIMIT,
  SWEEP_BOOT_DELAY_MS,
  SWEEP_INTERVAL_MS,
} from './anticheat.constants';

/**
 * Balayage périodique d'intégrité : vérifie les **invariants serveur** sur l'état
 * persisté. Comme l'autorité serveur (`canAfford` + débit conditionnel `gte`,
 * transactions sérialisables) garantit déjà ces invariants, toute violation
 * trouvée ici trahit soit un trou logique, soit une altération directe de la base
 * — d'où une sévérité CRITICAL. Le balayage n'altère jamais les données : il
 * observe et signale.
 */
@Injectable()
export class AntiCheatSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AntiCheatSweepService.name);
  private interval?: ReturnType<typeof setInterval>;
  private bootTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly antiCheat: AntiCheatService,
  ) {}

  onModuleInit(): void {
    this.bootTimer = setTimeout(() => void this.sweep(), SWEEP_BOOT_DELAY_MS);
    this.interval = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.bootTimer) clearTimeout(this.bootTimer);
    if (this.interval) clearInterval(this.interval);
  }

  /** Exécute toutes les vérifications d'intégrité. Best-effort, ne jette pas. */
  async sweep(): Promise<void> {
    try {
      await this.inspectNegativeBalances();
      await this.inspectImpossibleResearchLevels();
      await this.inspectImpossibleBuildingLevels();
    } catch (error) {
      this.logger.error(`Balayage anti-triche interrompu: ${(error as Error).message}`);
    }
  }

  /** Aucune planète ne devrait jamais avoir un solde négatif. */
  private async inspectNegativeBalances(): Promise<void> {
    const planets = await this.prisma.planet.findMany({
      where: {
        OR: [
          { biomass: { lt: 0 } },
          { sap: { lt: 0 } },
          { minerals: { lt: 0 } },
          { spores: { lt: 0 } },
        ],
      },
      select: {
        id: true,
        ownerId: true,
        universeId: true,
        biomass: true,
        sap: true,
        minerals: true,
        spores: true,
      },
      take: SWEEP_BATCH_LIMIT,
    });
    for (const planet of planets) {
      await this.antiCheat.record({
        type: AntiCheatEventType.NEGATIVE_BALANCE,
        severity: 'CRITICAL',
        userId: planet.ownerId,
        universeId: planet.universeId,
        detail: {
          planetId: planet.id,
          biomass: planet.biomass,
          sap: planet.sap,
          minerals: planet.minerals,
          spores: planet.spores,
        },
      });
    }
  }

  /** Aucun niveau de recherche ne doit dépasser le maximum configuré. */
  private async inspectImpossibleResearchLevels(): Promise<void> {
    for (const [type, cfg] of Object.entries(RESEARCHES)) {
      const violations = await this.prisma.researchLevel.findMany({
        where: { type: type as ResearchType, level: { gt: cfg.maxLevel } },
        select: { userId: true, level: true },
        take: SWEEP_BATCH_LIMIT,
      });
      for (const v of violations) {
        await this.antiCheat.record({
          type: AntiCheatEventType.IMPOSSIBLE_LEVEL,
          severity: 'CRITICAL',
          userId: v.userId,
          detail: { kind: 'research', type, level: v.level, maxLevel: cfg.maxLevel },
        });
      }
    }
  }

  /** Aucun niveau de bâtiment ne doit dépasser le maximum configuré. */
  private async inspectImpossibleBuildingLevels(): Promise<void> {
    for (const [type, cfg] of Object.entries(BUILDINGS)) {
      const violations = await this.prisma.planetBuilding.findMany({
        where: { type: type as BuildingType, level: { gt: cfg.maxLevel } },
        select: { planetId: true, level: true, planet: { select: { ownerId: true } } },
        take: SWEEP_BATCH_LIMIT,
      });
      for (const v of violations) {
        await this.antiCheat.record({
          type: AntiCheatEventType.IMPOSSIBLE_LEVEL,
          severity: 'CRITICAL',
          userId: v.planet.ownerId,
          detail: {
            kind: 'building',
            type,
            planetId: v.planetId,
            level: v.level,
            maxLevel: cfg.maxLevel,
          },
        });
      }
    }
  }
}
