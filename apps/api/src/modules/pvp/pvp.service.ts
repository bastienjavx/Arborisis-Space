import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PvpMissionPhase, PvpMissionType as PrismaPvpMissionType } from '@prisma/client';
import {
  BuildingType,
  computeDefensePower,
  DEBRIS_EXPIRY_HOURS,
  DEBRIS_FRACTION,
  NotificationType,
  pvpTravelTimeSeconds,
  PvpMissionPhase as SharedPvpMissionPhase,
  PvpMissionType,
  PvpOutcome,
  RaceType,
  ResearchType,
  resolvePvpAttack,
  resolveSpy,
  ResourceType,
  ShipRole,
  SHIPS,
  ShipType,
  SHIP_TYPES,
  storageCap,
  type AttackPlanetDto,
  type IncomingAttackView,
  type PvpMissionResultView,
  type PvpMissionView,
  type PvpReportView,
  type SpyPlanetDto,
  type SpyReportView,
} from '@arborisis/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GameEngineService } from '../game/game-engine.service';
import { PlanetsService } from '../game/planets.service';
import { GameQueueService } from '../queue/game-queue.service';

@Injectable()
export class PvpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planets: PlanetsService,
    private readonly engine: GameEngineService,
    private readonly queue: GameQueueService,
    private readonly notifications: NotificationsService,
  ) {}

  async spy(userId: string, dto: SpyPlanetDto): Promise<PvpMissionView> {
    const source = await this.planets.assertOwnership(userId, dto.sourcePlanetId);
    const target = await this.prisma.planet.findUnique({
      where: { id: dto.targetPlanetId },
      include: { owner: true },
    });
    if (!target) throw new NotFoundException('Planète cible introuvable.');
    if (target.universeId !== source.universeId)
      throw new ForbiddenException('Cible hors de votre univers.');
    if (target.ownerId === userId)
      throw new ForbiddenException('Vous ne pouvez pas espionner votre propre planète.');

    const ships = dto.ships;
    const hasSpyShip = SHIP_TYPES.some(
      (type) => (ships[type] ?? 0) > 0 && SHIPS[type].role === ShipRole.ESPIONAGE,
    );
    if (!hasSpyShip) throw new BadRequestException('Au moins un vaisseau d’espionnage est requis.');

    let mission;
    try {
      mission = await this.prisma.serializable(async (tx) => {
        const active = await tx.pvpMission.findFirst({
          where: {
            sourcePlanetId: dto.sourcePlanetId,
            phase: { in: [PvpMissionPhase.OUTBOUND, PvpMissionPhase.RETURNING] },
          },
        });
        if (active)
          throw new ConflictException('Une mission PvP est déjà active depuis cette planète.');

        const inventory = await tx.planetShip.findMany({ where: { planetId: dto.sourcePlanetId } });
        for (const type of SHIP_TYPES) {
          const requested = ships[type] ?? 0;
          const available = inventory.find((item) => item.type === type)?.quantity ?? 0;
          if (requested > available)
            throw new BadRequestException('Bio-vaisseaux disponibles insuffisants.');
        }

        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const race = user.race as RaceType;
        const travelSeconds = pvpTravelTimeSeconds(source, target, ships, race);
        if (travelSeconds <= 0) throw new BadRequestException('La flotte est vide.');

        const now = new Date();
        const arrivesAt = new Date(now.getTime() + travelSeconds * 1_000);
        const returnsAt = new Date(arrivesAt.getTime() + travelSeconds * 1_000);

        for (const type of SHIP_TYPES) {
          const qty = ships[type] ?? 0;
          if (qty > 0) {
            await tx.planetShip.update({
              where: { planetId_type: { planetId: dto.sourcePlanetId, type } },
              data: { quantity: { decrement: qty } },
            });
          }
        }

        return tx.pvpMission.create({
          data: {
            userId,
            type: PrismaPvpMissionType.SPY,
            sourcePlanetId: dto.sourcePlanetId,
            targetPlanetId: dto.targetPlanetId,
            phase: PvpMissionPhase.OUTBOUND,
            ships: ships as Record<string, number>,
            arrivesAt,
            returnsAt,
          },
          include: { sourcePlanet: true, targetPlanet: true },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Une mission PvP est déjà active depuis cette planète.');
      }
      throw error;
    }

    await this.queue.schedulePvp(mission.id, PvpMissionPhase.OUTBOUND, mission.arrivesAt);
    return this.missionView(mission);
  }

  async attack(userId: string, dto: AttackPlanetDto): Promise<PvpMissionView> {
    const source = await this.planets.assertOwnership(userId, dto.sourcePlanetId);
    const target = await this.prisma.planet.findUnique({
      where: { id: dto.targetPlanetId },
      include: { owner: true },
    });
    if (!target) throw new NotFoundException('Planète cible introuvable.');
    if (target.universeId !== source.universeId)
      throw new ForbiddenException('Cible hors de votre univers.');
    if (target.ownerId === userId)
      throw new ForbiddenException('Vous ne pouvez pas attaquer votre propre planète.');

    const ships = dto.ships;
    const hasCombatShip = SHIP_TYPES.some(
      (type) =>
        (ships[type] ?? 0) > 0 &&
        [ShipRole.COMBAT, ShipRole.DEFENSE, ShipRole.SUPPORT].includes(SHIPS[type].role),
    );
    if (!hasCombatShip) throw new BadRequestException('Au moins un vaisseau de combat est requis.');

    let mission;
    try {
      mission = await this.prisma.serializable(async (tx) => {
        const active = await tx.pvpMission.findFirst({
          where: {
            sourcePlanetId: dto.sourcePlanetId,
            phase: { in: [PvpMissionPhase.OUTBOUND, PvpMissionPhase.RETURNING] },
          },
        });
        if (active)
          throw new ConflictException('Une mission PvP est déjà active depuis cette planète.');

        const inventory = await tx.planetShip.findMany({ where: { planetId: dto.sourcePlanetId } });
        for (const type of SHIP_TYPES) {
          const requested = ships[type] ?? 0;
          const available = inventory.find((item) => item.type === type)?.quantity ?? 0;
          if (requested > available)
            throw new BadRequestException('Bio-vaisseaux disponibles insuffisants.');
        }

        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const race = user.race as RaceType;
        const travelSeconds = pvpTravelTimeSeconds(source, target, ships, race);
        if (travelSeconds <= 0) throw new BadRequestException('La flotte est vide.');

        const now = new Date();
        const arrivesAt = new Date(now.getTime() + travelSeconds * 1_000);
        const returnsAt = new Date(arrivesAt.getTime() + travelSeconds * 1_000);

        for (const type of SHIP_TYPES) {
          const qty = ships[type] ?? 0;
          if (qty > 0) {
            await tx.planetShip.update({
              where: { planetId_type: { planetId: dto.sourcePlanetId, type } },
              data: { quantity: { decrement: qty } },
            });
          }
        }

        return tx.pvpMission.create({
          data: {
            userId,
            type: PrismaPvpMissionType.ATTACK,
            sourcePlanetId: dto.sourcePlanetId,
            targetPlanetId: dto.targetPlanetId,
            phase: PvpMissionPhase.OUTBOUND,
            ships: ships as Record<string, number>,
            arrivesAt,
            returnsAt,
          },
          include: { sourcePlanet: true, targetPlanet: true },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Une mission PvP est déjà active depuis cette planète.');
      }
      throw error;
    }

    await this.queue.schedulePvp(mission.id, PvpMissionPhase.OUTBOUND, mission.arrivesAt);
    // Notifier la cible d'une attaque imminente
    await this.notifications
      .create(
        mission.targetPlanet.ownerId,
        NotificationType.ATTACK_INCOMING,
        'Attaque imminente !',
        `Une flotte hostile approche de ${mission.targetPlanet.name}. Arrivée dans ${Math.ceil((mission.arrivesAt.getTime() - Date.now()) / 60000)} min.`,
        { missionId: mission.id, arrivesAt: mission.arrivesAt.toISOString() },
      )
      .catch(() => void 0);
    return this.missionView(mission);
  }

  async listMissions(userId: string): Promise<PvpMissionView[]> {
    await this.finalizeDueForUser(userId);
    const missions = await this.prisma.pvpMission.findMany({
      where: {
        userId,
        phase: { in: [PvpMissionPhase.OUTBOUND, PvpMissionPhase.RETURNING] },
      },
      include: { sourcePlanet: true, targetPlanet: true },
      orderBy: { createdAt: 'desc' },
    });
    return missions.map((mission) => this.missionView(mission));
  }

  async listReports(userId: string, limit = 50): Promise<PvpReportView[]> {
    await this.finalizeDueForUser(userId);
    const missions = await this.prisma.pvpMission.findMany({
      where: { userId, phase: PvpMissionPhase.COMPLETED },
      include: { sourcePlanet: true, targetPlanet: true },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });
    return missions.map((m) => ({
      ...this.missionView(m),
      completedAt: (m.completedAt ?? m.createdAt).toISOString(),
      targetName: m.targetPlanet.name,
    }));
  }

  async listIncoming(userId: string): Promise<IncomingAttackView[]> {
    const now = new Date();
    const userPlanets = await this.prisma.planet.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const planetIds = userPlanets.map((p) => p.id);
    if (planetIds.length === 0) return [];

    const missions = await this.prisma.pvpMission.findMany({
      where: {
        targetPlanetId: { in: planetIds },
        phase: PvpMissionPhase.OUTBOUND,
        arrivesAt: { gt: now },
      },
      include: { user: true, sourcePlanet: true, targetPlanet: true },
      orderBy: { arrivesAt: 'asc' },
    });

    return missions.map((m) => ({
      id: m.id,
      type: m.type as PvpMissionType,
      attackerName: m.user.username,
      sourcePlanet: {
        galaxy: m.sourcePlanet.galaxy,
        system: m.sourcePlanet.system,
        position: m.sourcePlanet.position,
      },
      targetPlanet: {
        id: m.targetPlanetId,
        name: m.targetPlanet.name,
        coordinates: {
          galaxy: m.targetPlanet.galaxy,
          system: m.targetPlanet.system,
          position: m.targetPlanet.position,
        },
      },
      arrivesAt: m.arrivesAt.toISOString(),
    }));
  }

  async finalizeDueForUser(userId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.pvpMission.findMany({
      where: {
        userId,
        OR: [
          { phase: PvpMissionPhase.OUTBOUND, arrivesAt: { lte: now } },
          { phase: PvpMissionPhase.RETURNING, returnsAt: { lte: now } },
        ],
      },
    });
    for (const mission of due) await this.advanceMission(mission.id, now);
  }

  async sweepAllDue(now = new Date()): Promise<void> {
    const due = await this.prisma.pvpMission.findMany({
      where: {
        OR: [
          { phase: PvpMissionPhase.OUTBOUND, arrivesAt: { lte: now } },
          { phase: PvpMissionPhase.RETURNING, returnsAt: { lte: now } },
        ],
      },
    });
    for (const mission of due) await this.advanceMission(mission.id, now);
  }

  async advanceMission(id: string, now = new Date()): Promise<void> {
    let scheduleNext: { phase: string; at: Date } | undefined;
    const state = await this.prisma.serializable(async (tx) => {
      const mission = await tx.pvpMission.findUnique({
        where: { id },
        include: {
          sourcePlanet: true,
          targetPlanet: { include: { owner: true, ships: true } },
          user: true,
        },
      });
      if (!mission || mission.phase === PvpMissionPhase.COMPLETED) return 'done' as const;

      if (mission.phase === PvpMissionPhase.OUTBOUND) {
        if (mission.arrivesAt > now) return 'waiting' as const;

        const attackerResearch = await tx.researchLevel.findMany({
          where: { userId: mission.userId },
        });
        const attackerResearchMap = Object.fromEntries(
          attackerResearch.map((r) => [r.type, r.level]),
        ) as Partial<Record<ResearchType, number>>;

        if (mission.type === PrismaPvpMissionType.SPY) {
          const settled = await this.engine.settlePlanet(mission.targetPlanetId, now, tx);
          const defensePower = computeDefensePower({
            ships: this.shipCountsFrom(mission.targetPlanet.ships),
            race: mission.targetPlanet.owner.race as RaceType,
          });
          const spyResult = resolveSpy({
            ships: this.shipCountsFrom(mission.ships),
            defensePower,
            sporeSenseLevel: attackerResearchMap[ResearchType.SPORE_SENSE] ?? 0,
          });

          const result: PvpMissionResultView = {
            outcome: spyResult.success ? PvpOutcome.SUCCESS : PvpOutcome.FAILURE,
            lostShips: this.emptyShipCounts(),
          };

          if (spyResult.success) {
            result.report = {
              targetPlanetId: mission.targetPlanetId,
              resources: this.engine.buildResourceState(settled).amounts,
              buildings: Object.fromEntries(
                settled.planet.buildings.map((b) => [b.type, b.level]),
              ) as Partial<Record<BuildingType, number>>,
              fleet: this.shipCountsFrom(mission.targetPlanet.ships),
              defenses: this.defenseShipCountsFrom(mission.targetPlanet.ships),
              defensePower,
            };
          }

          await tx.pvpMission.update({
            where: { id },
            data: {
              phase: PvpMissionPhase.RETURNING,
              result: result as unknown as Prisma.InputJsonValue,
            },
          });
        } else {
          const settled = await this.engine.settlePlanet(mission.targetPlanetId, now, tx);
          const defenderResearch = await tx.researchLevel.findMany({
            where: { userId: mission.targetPlanet.ownerId },
          });
          const defenderResearchMap = Object.fromEntries(
            defenderResearch.map((r) => [r.type, r.level]),
          ) as Partial<Record<ResearchType, number>>;

          const resolve = resolvePvpAttack({
            attackerShips: this.shipCountsFrom(mission.ships),
            defenderShips: this.shipCountsFrom(mission.targetPlanet.ships),
            attackerRace: mission.user.race as RaceType,
            defenderRace: mission.targetPlanet.owner.race as RaceType,
            attackerResearch: attackerResearchMap as Partial<Record<ResearchType, number>>,
            defenderResearch: defenderResearchMap as Partial<Record<ResearchType, number>>,
            targetResources: this.engine.buildResourceState(settled).amounts,
          });

          const remainingShips: Record<string, number> = {};
          const ships = mission.ships as Record<string, number>;
          for (const type of SHIP_TYPES) {
            const sent = ships[type] ?? 0;
            const lost = resolve.lostShips[type] ?? 0;
            remainingShips[type] = Math.max(0, sent - lost);
          }

          for (const type of SHIP_TYPES) {
            const lost = resolve.defenderLosses[type] ?? 0;
            if (lost <= 0) continue;
            const existing = mission.targetPlanet.ships.find((s) => s.type === type);
            if (!existing) continue;
            const next = Math.max(0, existing.quantity - lost);
            if (next === 0) {
              await tx.planetShip.delete({
                where: { planetId_type: { planetId: mission.targetPlanetId, type } },
              });
            } else {
              await tx.planetShip.update({
                where: { planetId_type: { planetId: mission.targetPlanetId, type } },
                data: { quantity: next },
              });
            }
          }

          const result: PvpMissionResultView = {
            outcome: resolve.outcome,
            loot: Object.fromEntries(
              Object.values(ResourceType).map((r) => [r, resolve.loot[r] ?? 0]),
            ) as Record<ResourceType, number>,
            lostShips: resolve.lostShips as Record<ShipType, number>,
            defenderLosses: resolve.defenderLosses as Record<ShipType, number>,
          };

          await tx.pvpMission.update({
            where: { id },
            data: {
              phase: PvpMissionPhase.RETURNING,
              ships: remainingShips,
              result: result as unknown as Prisma.InputJsonValue,
            },
          });

          // Génération du champ de débris (30% des vaisseaux détruits).
          await this.createDebrisAfterCombat(
            mission.targetPlanet.universeId,
            mission.targetPlanet.galaxy,
            mission.targetPlanet.system,
            mission.targetPlanet.position,
            { ...resolve.lostShips, ...resolve.defenderLosses },
            tx,
          );
        }

        scheduleNext = { phase: PvpMissionPhase.RETURNING, at: mission.returnsAt };
        return 'resolved' as const;
      }

      if (mission.returnsAt > now) return 'waiting' as const;
      const result = (mission.result ?? undefined) as PvpMissionResultView | undefined;
      if (!result) return 'waiting' as const;

      const ships = mission.ships as Record<string, number>;
      for (const type of SHIP_TYPES) {
        const qty = ships[type] ?? 0;
        if (qty > 0) {
          await tx.planetShip.upsert({
            where: { planetId_type: { planetId: mission.sourcePlanetId, type } },
            update: { quantity: { increment: qty } },
            create: { planetId: mission.sourcePlanetId, type, quantity: qty },
          });
        }
      }

      const loot = result.loot;
      if (loot && Object.values(loot).some((v) => v > 0)) {
        const settled = await this.engine.settlePlanet(mission.sourcePlanetId, now, tx);
        const cap = storageCap(settled.buildings[BuildingType.STORAGE_VACUOLE] ?? 0);
        const current = this.engine.buildResourceState(settled).amounts;
        const accepted: Record<ResourceType, number> = {} as Record<ResourceType, number>;
        for (const resource of Object.values(ResourceType)) {
          accepted[resource] = Math.max(0, Math.min(loot[resource] ?? 0, cap - current[resource]));
        }
        await tx.planet.update({
          where: { id: mission.sourcePlanetId },
          data: {
            biomass: { increment: accepted[ResourceType.BIOMASS] },
            sap: { increment: accepted[ResourceType.SAP] },
            minerals: { increment: accepted[ResourceType.MINERALS] },
            spores: { increment: accepted[ResourceType.SPORES] },
          },
        });
      }

      await tx.pvpMission.update({
        where: { id },
        data: { phase: PvpMissionPhase.COMPLETED, completedAt: now },
      });
      return 'completed' as const;
    });

    if (scheduleNext) await this.queue.schedulePvp(id, scheduleNext.phase, scheduleNext.at);
    if (state === 'resolved' && scheduleNext && scheduleNext.at <= now) {
      await this.advanceMission(id, now);
    }
  }

  private shipCountsFrom(items: unknown): Record<ShipType, number> {
    const arr = Array.isArray(items)
      ? (items as { type: string; quantity: number }[])
      : Object.entries(items as Record<string, number>).map(([type, quantity]) => ({
          type,
          quantity,
        }));
    return Object.fromEntries(
      SHIP_TYPES.map((type) => [type, arr.find((s) => s.type === type)?.quantity ?? 0]),
    ) as Record<ShipType, number>;
  }

  private defenseShipCountsFrom(
    items: { type: string; quantity: number }[],
  ): Record<ShipType, number> {
    return Object.fromEntries(
      SHIP_TYPES.map((type) => [
        type,
        SHIPS[type].role === ShipRole.DEFENSE
          ? (items.find((s) => s.type === type)?.quantity ?? 0)
          : 0,
      ]),
    ) as Record<ShipType, number>;
  }

  private emptyShipCounts(): Record<ShipType, number> {
    return Object.fromEntries(SHIP_TYPES.map((type) => [type, 0])) as Record<ShipType, number>;
  }

  private missionView(mission: {
    id: string;
    type: string;
    sourcePlanet: { galaxy: number; system: number; position: number };
    targetPlanet: { galaxy: number; system: number; position: number };
    phase: string;
    ships: unknown;
    arrivesAt: Date;
    returnsAt: Date;
    result: unknown | null;
  }): PvpMissionView {
    const ships = mission.ships as Record<string, number>;
    const result = mission.result
      ? ({
          outcome: (mission.result as Record<string, unknown>).outcome as PvpOutcome,
          loot: (mission.result as Record<string, unknown>).loot as Record<ResourceType, number>,
          lostShips: (mission.result as Record<string, unknown>).lostShips as Record<
            ShipType,
            number
          >,
          defenderLosses: (mission.result as Record<string, unknown>).defenderLosses as Record<
            ShipType,
            number
          >,
          report: (mission.result as Record<string, unknown>).report as SpyReportView,
        } as PvpMissionResultView)
      : undefined;

    return {
      id: mission.id,
      type: mission.type as unknown as PvpMissionType,
      source: {
        galaxy: mission.sourcePlanet.galaxy,
        system: mission.sourcePlanet.system,
        position: mission.sourcePlanet.position,
      },
      target: {
        galaxy: mission.targetPlanet.galaxy,
        system: mission.targetPlanet.system,
        position: mission.targetPlanet.position,
      },
      phase: mission.phase as SharedPvpMissionPhase,
      ships: Object.fromEntries(SHIP_TYPES.map((type) => [type, ships[type] ?? 0])) as Record<
        ShipType,
        number
      >,
      arrivesAt: mission.arrivesAt.toISOString(),
      returnsAt: mission.returnsAt.toISOString(),
      result,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  /** Génère un champ de débris après combat (DEBRIS_FRACTION des vaisseaux détruits). */
  private async createDebrisAfterCombat(
    universeId: string,
    galaxy: number,
    system: number,
    position: number,
    destroyedShips: Partial<Record<string, number>>,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    let biomassDebris = 0;
    let mineralsDebris = 0;
    for (const [type, qty] of Object.entries(destroyedShips)) {
      if (!qty || qty <= 0) continue;
      const ship = SHIPS[type as ShipType];
      if (!ship) continue;
      biomassDebris += Math.floor((ship.cost.BIOMASS ?? 0) * qty * DEBRIS_FRACTION);
      mineralsDebris += Math.floor((ship.cost.MINERALS ?? 0) * qty * DEBRIS_FRACTION);
    }
    if (biomassDebris + mineralsDebris === 0) return;

    const expiresAt = new Date(Date.now() + DEBRIS_EXPIRY_HOURS * 3_600_000);
    const existing = await tx.debrisField.findFirst({
      where: { universeId, galaxy, system, position },
    });
    if (existing) {
      await tx.debrisField.update({
        where: { id: existing.id },
        data: {
          biomass: { increment: biomassDebris },
          minerals: { increment: mineralsDebris },
          expiresAt,
        },
      });
    } else {
      await tx.debrisField.create({
        data: {
          universeId,
          galaxy,
          system,
          position,
          biomass: biomassDebris,
          minerals: mineralsDebris,
          expiresAt,
        },
      });
    }
  }
}
