import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpeditionPhase } from '@prisma/client';
import {
  EXPEDITION_DROP_TABLES,
  EXPEDITION_RULESET_VERSION,
  ExpeditionOutcome,
  expeditionDistance,
  expeditionIncidentLossPercent,
  expeditionOutcomeFromRoll,
  expeditionTravelTimeSeconds,
  fleetCargo,
  GALAXY_COUNT,
  RaceType,
  ResearchType,
  ResourceType,
  EXPEDITION_SHIP_TYPES,
  ShipType,
  storageCap,
  SYSTEMS_PER_GALAXY,
  type ExpeditionReportView,
  type ExpeditionShipType,
  type ExpeditionView,
  type StartExpeditionDto,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameQueueService } from '../queue/game-queue.service';
import { GameEngineService } from './game-engine.service';
import { PlanetsService } from './planets.service';

@Injectable()
export class ExpeditionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    private readonly queue: GameQueueService,
  ) {}

  async start(userId: string, dto: StartExpeditionDto): Promise<ExpeditionView> {
    const source = await this.planets.assertOwnership(userId, dto.planetId);
    this.assertTarget(dto.target.galaxy, dto.target.system);
    const ships = dto.ships;
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const race = user.race as RaceType;
    let mission;
    try {
      mission = await this.prisma.serializable(async (tx) => {
        const active = await tx.expeditionMission.findFirst({
          where: {
            planetId: dto.planetId,
            phase: { in: [ExpeditionPhase.OUTBOUND, ExpeditionPhase.RETURNING] },
          },
        });
        if (active)
          throw new ConflictException('Une expédition est déjà active sur cette planète.');

        const propulsion = await tx.researchLevel.findUnique({
          where: { userId_type: { userId, type: ResearchType.SPORAL_PROPULSION } },
        });
        if ((propulsion?.level ?? 0) < 1) {
          throw new BadRequestException('La Propulsion sporale niveau 1 est requise.');
        }
        const inventory = await tx.planetShip.findMany({ where: { planetId: dto.planetId } });
        for (const type of EXPEDITION_SHIP_TYPES) {
          const requested = ships[type];
          const available = inventory.find((item) => item.type === type)?.quantity ?? 0;
          if (requested > available)
            throw new BadRequestException('Bio-vaisseaux disponibles insuffisants.');
        }
        const travelSeconds = expeditionTravelTimeSeconds(source, dto.target, ships, race);
        if (travelSeconds <= 0) throw new BadRequestException('La flotte est vide.');
        const now = new Date();
        const arrivesAt = new Date(now.getTime() + travelSeconds * 1_000);
        const returnsAt = new Date(arrivesAt.getTime() + travelSeconds * 1_000);
        for (const type of EXPEDITION_SHIP_TYPES) {
          if (ships[type] > 0) {
            await tx.planetShip.update({
              where: { planetId_type: { planetId: dto.planetId, type } },
              data: { quantity: { decrement: ships[type] } },
            });
          }
        }
        return tx.expeditionMission.create({
          data: {
            userId,
            planetId: dto.planetId,
            targetGalaxy: dto.target.galaxy,
            targetSystem: dto.target.system,
            scoutCount: ships[ShipType.SPORAL_SCOUT],
            harvesterCount: ships[ShipType.SYMBIOTIC_HARVESTER],
            tenderilCount: ships[ShipType.MYCELIAL_TENDRIL] ?? 0,
            freighterCount: ships[ShipType.CHITIN_FREIGHTER] ?? 0,
            cruiserCount: ships[ShipType.BIOLUMINESCENT_CRUISER] ?? 0,
            titanCount: ships[ShipType.SPOROGENESIS_TITAN] ?? 0,
            startedAt: now,
            arrivesAt,
            returnsAt,
          },
          include: { planet: true },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Une expédition est déjà active sur cette planète.');
      }
      throw error;
    }
    await this.queue.scheduleExpedition(mission.id, mission.phase, mission.arrivesAt);
    return this.missionView(mission);
  }

  async listActive(userId: string): Promise<ExpeditionView[]> {
    await this.finalizeDueForUser(userId);
    const missions = await this.prisma.expeditionMission.findMany({
      where: { userId, phase: { in: [ExpeditionPhase.OUTBOUND, ExpeditionPhase.RETURNING] } },
      include: { planet: true },
      orderBy: { startedAt: 'desc' },
    });
    return missions.map((mission) => this.missionView(mission));
  }

  async listReports(userId: string): Promise<ExpeditionReportView[]> {
    await this.finalizeDueForUser(userId);
    const reports = await this.prisma.expeditionReport.findMany({
      where: { userId },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
    return reports.map((report) => this.reportView(report));
  }

  async markReportRead(userId: string, id: string): Promise<ExpeditionReportView> {
    const changed = await this.prisma.expeditionReport.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (changed.count === 0) throw new NotFoundException('Rapport introuvable.');
    const report = await this.prisma.expeditionReport.findUniqueOrThrow({ where: { id } });
    return this.reportView(report);
  }

  async finalizeDueForUser(userId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.expeditionMission.findMany({
      where: {
        userId,
        OR: [
          { phase: ExpeditionPhase.OUTBOUND, arrivesAt: { lte: now } },
          { phase: ExpeditionPhase.RETURNING, returnsAt: { lte: now } },
        ],
      },
    });
    for (const mission of due) await this.advanceMission(mission.id, now);
  }

  async sweepAllDue(now = new Date()): Promise<void> {
    const due = await this.prisma.expeditionMission.findMany({
      where: {
        OR: [
          { phase: ExpeditionPhase.OUTBOUND, arrivesAt: { lte: now } },
          { phase: ExpeditionPhase.RETURNING, returnsAt: { lte: now } },
        ],
      },
    });
    for (const mission of due) await this.advanceMission(mission.id, now);
  }

  async advanceMission(id: string, now = new Date()): Promise<void> {
    let scheduleReturn: Date | undefined;
    const state = await this.prisma.serializable(async (tx) => {
      const mission = await tx.expeditionMission.findUnique({
        where: { id },
        include: { planet: true, report: true },
      });
      if (!mission || mission.phase === ExpeditionPhase.COMPLETED) return 'done' as const;

      if (mission.phase === ExpeditionPhase.OUTBOUND) {
        if (mission.arrivesAt > now) return 'waiting' as const;
        const roll = randomInt(0, 10_000);
        // Check for active VOID_RIFT event
        const activeEvent = await this.engine.getActiveEvent(tx);
        const voidRiftActive = activeEvent?.type === 'VOID_RIFT';
        const outcome = expeditionOutcomeFromRoll(roll, voidRiftActive);
        const distance = expeditionDistance(mission.planet, {
          galaxy: mission.targetGalaxy,
          system: mission.targetSystem,
        });
        const allShips = {
          [ShipType.SPORAL_SCOUT]: mission.scoutCount,
          [ShipType.SYMBIOTIC_HARVESTER]: mission.harvesterCount,
          [ShipType.MYCELIAL_TENDRIL]: mission.tenderilCount,
          [ShipType.CHITIN_FREIGHTER]: mission.freighterCount,
          [ShipType.BIOLUMINESCENT_CRUISER]: mission.cruiserCount,
          [ShipType.SPOROGENESIS_TITAN]: mission.titanCount,
        };
        const cargo = fleetCargo(allShips);
        let scouts = mission.scoutCount;
        let harvesters = mission.harvesterCount;
        let tendrils = mission.tenderilCount;
        let freighters = mission.freighterCount;
        let cruisers = mission.cruiserCount;
        let titans = mission.titanCount;
        let lostScouts = 0;
        let lostHarvesters = 0;
        let lostTendrils = 0;
        let lostFreighters = 0;
        let lostCruisers = 0;
        let lostTitans = 0;
        let biomass = 0;
        let sap = 0;
        let minerals = 0;
        let spores = 0;

        if (outcome === ExpeditionOutcome.RESOURCE_CACHE) {
          const total = Math.min(cargo, 250 + distance * 100);
          biomass = Math.floor(total * 0.5);
          sap = Math.floor(total * 0.3);
          minerals = Math.floor(total * 0.2);
        } else if (outcome === ExpeditionOutcome.RARE_SPORES) {
          spores = Math.min(cargo, 75 + distance * 10);
        } else if (outcome === ExpeditionOutcome.DERELICT_SHIP) {
          scouts += 1;
        } else if (outcome === ExpeditionOutcome.INCIDENT) {
          const loss = expeditionIncidentLossPercent(roll) / 100;
          lostScouts = Math.min(scouts, Math.max(scouts > 0 ? 1 : 0, Math.floor(scouts * loss)));
          lostHarvesters =
            harvesters > 0 ? Math.min(harvesters, Math.max(1, Math.floor(harvesters * loss))) : 0;
          lostTendrils =
            tendrils > 0 ? Math.min(tendrils, Math.max(1, Math.floor(tendrils * loss))) : 0;
          lostFreighters =
            freighters > 0 ? Math.min(freighters, Math.max(1, Math.floor(freighters * loss))) : 0;
          lostCruisers =
            cruisers > 0 ? Math.min(cruisers, Math.max(1, Math.floor(cruisers * loss))) : 0;
          lostTitans = titans > 0 ? Math.min(titans, Math.max(1, Math.floor(titans * loss))) : 0;
          scouts -= lostScouts;
          harvesters -= lostHarvesters;
          tendrils -= lostTendrils;
          freighters -= lostFreighters;
          cruisers -= lostCruisers;
          titans -= lostTitans;
        } else if (outcome === ExpeditionOutcome.ANOMALY) {
          // Artefact arborisien : +5% vitesse de recherche permanente (max 3)
          const user = await tx.user.findUnique({
            where: { id: mission.userId },
            select: { artifactCount: true },
          });
          if ((user?.artifactCount ?? 0) < 3) {
            await tx.user.update({
              where: { id: mission.userId },
              data: { artifactCount: { increment: 1 } },
            });
          }
        } else if (outcome === ExpeditionOutcome.ANCIENT_ARCHIVE) {
          // +200 spores + réduit recherche active de 10%
          spores = 200;
          const activeResearch = await tx.researchJob.findFirst({
            where: { userId: mission.userId, status: 'PENDING' },
          });
          if (activeResearch) {
            const remaining = activeResearch.finishesAt.getTime() - now.getTime();
            const newFinishMs = now.getTime() + Math.max(5000, remaining * 0.9);
            await tx.researchJob.update({
              where: { id: activeResearch.id },
              data: { finishesAt: new Date(newFinishMs) },
            });
          }
        } else if (outcome === ExpeditionOutcome.CONVERGENCE_BLOOM) {
          // Un scout évolue en croiseur
          if (scouts > 0) {
            scouts -= 1;
            cruisers += 1;
          }
        }
        // VOID_ECHO: pas de récompense, juste stocker le résultat pour affichage

        await tx.expeditionReport.create({
          data: {
            missionId: mission.id,
            userId: mission.userId,
            outcome,
            rulesetVersion: EXPEDITION_RULESET_VERSION,
            roll,
            rewardBiomass: biomass,
            rewardSap: sap,
            rewardMinerals: minerals,
            rewardSpores: spores,
            lostScouts,
            lostHarvesters,
            lostTendrils,
            lostFreighters,
            lostCruisers,
            lostTitans,
            occurredAt: now,
          },
        });
        await tx.expeditionMission.update({
          where: { id },
          data: {
            phase: ExpeditionPhase.RETURNING,
            scoutCount: scouts,
            harvesterCount: harvesters,
            tenderilCount: tendrils,
            freighterCount: freighters,
            cruiserCount: cruisers,
            titanCount: titans,
          },
        });
        scheduleReturn = mission.returnsAt;
        return 'resolved' as const;
      }

      if (mission.returnsAt > now || !mission.report) return 'waiting' as const;
      const settled = await this.engine.settlePlanet(mission.planetId, now, tx);
      const cap = storageCap(settled.buildings['STORAGE_VACUOLE'] ?? 0);
      const rewards = {
        [ResourceType.BIOMASS]: mission.report.rewardBiomass,
        [ResourceType.SAP]: mission.report.rewardSap,
        [ResourceType.MINERALS]: mission.report.rewardMinerals,
        [ResourceType.SPORES]: mission.report.rewardSpores,
      };
      const current = this.engine.buildResourceState(settled).amounts;
      const accepted = {} as Record<ResourceType, number>;
      const overflow = {} as Record<ResourceType, number>;
      for (const resource of Object.values(ResourceType)) {
        accepted[resource] = Math.max(0, Math.min(rewards[resource], cap - current[resource]));
        overflow[resource] = rewards[resource] - accepted[resource];
      }
      await tx.planet.update({
        where: { id: mission.planetId },
        data: {
          biomass: { increment: accepted[ResourceType.BIOMASS] },
          sap: { increment: accepted[ResourceType.SAP] },
          minerals: { increment: accepted[ResourceType.MINERALS] },
          spores: { increment: accepted[ResourceType.SPORES] },
        },
      });
      for (const [type, quantity] of [
        [ShipType.SPORAL_SCOUT, mission.scoutCount],
        [ShipType.SYMBIOTIC_HARVESTER, mission.harvesterCount],
        [ShipType.MYCELIAL_TENDRIL, mission.tenderilCount],
        [ShipType.CHITIN_FREIGHTER, mission.freighterCount],
        [ShipType.BIOLUMINESCENT_CRUISER, mission.cruiserCount],
        [ShipType.SPOROGENESIS_TITAN, mission.titanCount],
      ] as [ShipType, number][]) {
        if (quantity > 0) {
          await tx.planetShip.upsert({
            where: { planetId_type: { planetId: mission.planetId, type } },
            update: { quantity: { increment: quantity } },
            create: { planetId: mission.planetId, type, quantity },
          });
        }
      }
      await tx.expeditionReport.update({
        where: { id: mission.report.id },
        data: {
          overflowBiomass: overflow[ResourceType.BIOMASS],
          overflowSap: overflow[ResourceType.SAP],
          overflowMinerals: overflow[ResourceType.MINERALS],
          overflowSpores: overflow[ResourceType.SPORES],
          returnedAt: now,
        },
      });

      // Drops d'objets selon l'issue de l'expédition
      const dropTable = EXPEDITION_DROP_TABLES[mission.report.outcome as ExpeditionOutcome];
      if (dropTable) {
        for (const entry of dropTable) {
          if (Math.random() < entry.chance) {
            const qty = Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty;
            await tx.playerInventorySlot.upsert({
              where: {
                userId_planetId_itemKey: {
                  userId: mission.userId,
                  planetId: mission.planetId,
                  itemKey: entry.itemKey,
                },
              },
              update: { quantity: { increment: qty } },
              create: {
                userId: mission.userId,
                planetId: mission.planetId,
                itemKey: entry.itemKey,
                quantity: qty,
              },
            });
          }
        }
      }

      await tx.expeditionMission.update({
        where: { id },
        data: { phase: ExpeditionPhase.COMPLETED, completedAt: now },
      });
      return 'completed' as const;
    });

    if (scheduleReturn)
      await this.queue.scheduleExpedition(id, ExpeditionPhase.RETURNING, scheduleReturn);
    if (state === 'resolved' && scheduleReturn && scheduleReturn <= now)
      await this.advanceMission(id, now);
  }

  private assertTarget(galaxy: number, system: number): void {
    if (galaxy < 1 || galaxy > GALAXY_COUNT || system < 1 || system > SYSTEMS_PER_GALAXY) {
      throw new BadRequestException('Coordonnées d’expédition invalides.');
    }
  }

  private missionView(mission: {
    id: string;
    planetId: string;
    targetGalaxy: number;
    targetSystem: number;
    phase: string;
    scoutCount: number;
    harvesterCount: number;
    tenderilCount: number;
    freighterCount: number;
    cruiserCount: number;
    titanCount: number;
    arrivesAt: Date;
    returnsAt: Date;
    planet: { galaxy: number; system: number; position: number };
  }): ExpeditionView {
    return {
      id: mission.id,
      planetId: mission.planetId,
      source: {
        galaxy: mission.planet.galaxy,
        system: mission.planet.system,
        position: mission.planet.position,
      },
      target: { galaxy: mission.targetGalaxy, system: mission.targetSystem },
      phase: mission.phase as ExpeditionView['phase'],
      ships: {
        [ShipType.SPORAL_SCOUT]: mission.scoutCount,
        [ShipType.SYMBIOTIC_HARVESTER]: mission.harvesterCount,
        [ShipType.MYCELIAL_TENDRIL]: mission.tenderilCount,
        [ShipType.CHITIN_FREIGHTER]: mission.freighterCount,
        [ShipType.BIOLUMINESCENT_CRUISER]: mission.cruiserCount,
        [ShipType.SPOROGENESIS_TITAN]: mission.titanCount,
      } as Record<ExpeditionShipType, number>,
      arrivesAt: mission.arrivesAt.toISOString(),
      returnsAt: mission.returnsAt.toISOString(),
    };
  }

  private reportView(report: {
    id: string;
    missionId: string;
    outcome: string;
    rulesetVersion: number;
    roll: number;
    rewardBiomass: number;
    rewardSap: number;
    rewardMinerals: number;
    rewardSpores: number;
    lostScouts: number;
    lostHarvesters: number;
    lostTendrils: number;
    lostFreighters: number;
    lostCruisers: number;
    lostTitans: number;
    overflowBiomass: number;
    overflowSap: number;
    overflowMinerals: number;
    overflowSpores: number;
    isRead: boolean;
    occurredAt: Date;
    returnedAt: Date | null;
  }): ExpeditionReportView {
    return {
      id: report.id,
      missionId: report.missionId,
      outcome: report.outcome as ExpeditionOutcome,
      rulesetVersion: report.rulesetVersion,
      roll: report.roll,
      rewards: {
        [ResourceType.BIOMASS]: report.rewardBiomass,
        [ResourceType.SAP]: report.rewardSap,
        [ResourceType.MINERALS]: report.rewardMinerals,
        [ResourceType.SPORES]: report.rewardSpores,
      },
      losses: {
        [ShipType.SPORAL_SCOUT]: report.lostScouts,
        [ShipType.SYMBIOTIC_HARVESTER]: report.lostHarvesters,
        [ShipType.MYCELIAL_TENDRIL]: report.lostTendrils,
        [ShipType.CHITIN_FREIGHTER]: report.lostFreighters,
        [ShipType.BIOLUMINESCENT_CRUISER]: report.lostCruisers,
        [ShipType.SPOROGENESIS_TITAN]: report.lostTitans,
      } as Record<ExpeditionShipType, number>,
      overflow: {
        [ResourceType.BIOMASS]: report.overflowBiomass,
        [ResourceType.SAP]: report.overflowSap,
        [ResourceType.MINERALS]: report.overflowMinerals,
        [ResourceType.SPORES]: report.overflowSpores,
      },
      isRead: report.isRead,
      occurredAt: report.occurredAt.toISOString(),
      returnedAt: report.returnedAt?.toISOString() ?? null,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
