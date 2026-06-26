import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PveMissionPhase } from '@prisma/client';
import {
  BuildingType,
  fleetCombatPower,
  NpcEncounterType,
  npcCombatPower,
  PVE_DROP_TABLES,
  PveOutcome,
  PveMissionPhase as SharedPveMissionPhase,
  pveCombatDurationSeconds,
  pveResolve,
  pveTravelTimeSeconds,
  RaceType,
  ResourceType,
  ShipRole,
  SHIPS,
  ShipType,
  SHIP_TYPES,
  storageCap,
  type AttackEncounterDto,
  type ItemDropView,
  type NpcEncounterView,
  type PveMissionView,
  type PveReportView,
  type PveResultView,
  type ShipCounts,
} from '@arborisis/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { withConcurrencyLimit } from '../../common/utils/concurrency';
import { GameEngineService } from '../game/game-engine.service';
import { PlanetsService } from '../game/planets.service';
import { GameQueueService } from '../queue/game-queue.service';
import { EngagementHookService } from '../game/engagement-hook.service';

@Injectable()
export class PveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planets: PlanetsService,
    private readonly engine: GameEngineService,
    private readonly queue: GameQueueService,
    private readonly engagementHook: EngagementHookService,
  ) {}

  async listEncounters(): Promise<NpcEncounterView[]> {
    const now = new Date();
    const encounters = await this.prisma.npcEncounter.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { difficulty: 'asc' },
    });
    return encounters.map((e) => this.encounterView(e));
  }

  async attack(
    userId: string,
    encounterId: string,
    dto: AttackEncounterDto,
  ): Promise<PveMissionView> {
    const encounter = await this.prisma.npcEncounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException('Anomalie introuvable.');
    if (encounter.expiresAt <= new Date()) throw new BadRequestException("L'anomalie a disparu.");

    const source = await this.planets.assertOwnership(userId, dto.planetId);
    const ships = dto.ships;

    let mission;
    try {
      mission = await this.prisma.serializable(async (tx) => {
        const active = await tx.pveMission.findFirst({
          where: {
            sourcePlanetId: dto.planetId,
            phase: {
              in: [PveMissionPhase.TRAVEL, PveMissionPhase.COMBAT, PveMissionPhase.RETURNING],
            },
          },
        });
        if (active)
          throw new ConflictException('Une mission PvE est déjà active depuis cette planète.');

        const inventory = await tx.planetShip.findMany({ where: { planetId: dto.planetId } });
        for (const type of SHIP_TYPES) {
          const requested = ships[type] ?? 0;
          const available = inventory.find((item) => item.type === type)?.quantity ?? 0;
          if (requested > available)
            throw new BadRequestException('Bio-vaisseaux disponibles insuffisants.');
        }

        const hasCombatShip = SHIP_TYPES.some(
          (type) =>
            (ships[type] ?? 0) > 0 &&
            [ShipRole.COMBAT, ShipRole.DEFENSE, ShipRole.SUPPORT].includes(SHIPS[type].role),
        );
        if (!hasCombatShip)
          throw new BadRequestException('Au moins un vaisseau de combat est requis.');

        const user = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { race: true },
        });
        const race = user.race as RaceType;
        const travelSeconds = pveTravelTimeSeconds(
          { galaxy: source.galaxy, system: source.system },
          { galaxy: encounter.galaxy, system: encounter.system, position: encounter.position },
          ships,
          race,
        );
        if (travelSeconds <= 0) throw new BadRequestException('La flotte est vide.');

        const now = new Date();
        const travelArrivesAt = new Date(now.getTime() + travelSeconds * 1_000);
        const fleetPower = fleetCombatPower(ships, race);
        const npcPower = npcCombatPower(encounter.difficulty);
        const combatSeconds = pveCombatDurationSeconds(fleetPower, npcPower);
        const combatEndsAt = new Date(travelArrivesAt.getTime() + combatSeconds * 1_000);
        const returnsAt = new Date(combatEndsAt.getTime() + travelSeconds * 1_000);

        await this.decrementShips(tx, dto.planetId, ships);

        return tx.pveMission.create({
          data: {
            userId,
            encounterId,
            sourcePlanetId: dto.planetId,
            phase: PveMissionPhase.TRAVEL,
            ships: ships as Record<string, number>,
            travelArrivesAt,
            combatEndsAt,
            returnsAt,
          },
          include: { encounter: true, sourcePlanet: true },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Une mission PvE est déjà active depuis cette planète.');
      }
      throw error;
    }

    await this.queue.schedulePve(mission.id, mission.phase, mission.travelArrivesAt);
    return this.missionView(mission);
  }

  async listMissions(userId: string): Promise<PveMissionView[]> {
    await this.finalizeDueForUser(userId);
    const missions = await this.prisma.pveMission.findMany({
      where: {
        userId,
        phase: { in: [PveMissionPhase.TRAVEL, PveMissionPhase.COMBAT, PveMissionPhase.RETURNING] },
      },
      include: { encounter: true, sourcePlanet: true },
      orderBy: { createdAt: 'desc' },
    });
    return missions.map((mission) => this.missionView(mission));
  }

  async listReports(userId: string, limit = 50): Promise<PveReportView[]> {
    await this.finalizeDueForUser(userId);
    const missions = await this.prisma.pveMission.findMany({
      where: { userId, phase: PveMissionPhase.COMPLETED },
      include: { encounter: true, sourcePlanet: true },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });
    return missions.map((m) => ({
      ...this.missionView(m),
      completedAt: (m.completedAt ?? m.createdAt).toISOString(),
    }));
  }

  async finalizeDueForUser(userId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.pveMission.findMany({
      where: {
        userId,
        OR: [
          { phase: PveMissionPhase.TRAVEL, travelArrivesAt: { lte: now } },
          { phase: PveMissionPhase.COMBAT, combatEndsAt: { lte: now } },
          { phase: PveMissionPhase.RETURNING, returnsAt: { lte: now } },
        ],
      },
    });
    for (const mission of due) await this.advanceMission(mission.id, now);
  }

  async sweepAllDue(now = new Date()): Promise<void> {
    const due = await this.prisma.pveMission.findMany({
      where: {
        OR: [
          { phase: PveMissionPhase.TRAVEL, travelArrivesAt: { lte: now } },
          { phase: PveMissionPhase.COMBAT, combatEndsAt: { lte: now } },
          { phase: PveMissionPhase.RETURNING, returnsAt: { lte: now } },
        ],
      },
    });
    await withConcurrencyLimit(due, 10, (mission) => this.advanceMission(mission.id, now));
  }

  async advanceMission(id: string, now = new Date()): Promise<void> {
    let scheduleNext: { phase: string; at: Date } | undefined;
    const state = await this.prisma.serializable(async (tx) => {
      const mission = await tx.pveMission.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          phase: true,
          ships: true,
          sourcePlanetId: true,
          encounterId: true,
          travelArrivesAt: true,
          combatEndsAt: true,
          returnsAt: true,
          result: true,
          encounter: true,
          sourcePlanet: { select: { galaxy: true, system: true, position: true } },
          user: { select: { race: true } },
        },
      });
      if (!mission || mission.phase === PveMissionPhase.COMPLETED) return 'done' as const;

      if (mission.phase === PveMissionPhase.TRAVEL) {
        if (mission.travelArrivesAt > now) return 'waiting' as const;
        await tx.pveMission.update({
          where: { id },
          data: { phase: PveMissionPhase.COMBAT },
        });
        scheduleNext = { phase: 'COMBAT', at: mission.combatEndsAt };
        return 'advanced' as const;
      }

      if (mission.phase === PveMissionPhase.COMBAT) {
        if (mission.combatEndsAt > now) return 'waiting' as const;
        const ships = mission.ships as Record<ShipType, number>;
        const race = mission.user.race as RaceType;
        const fleetPower = fleetCombatPower(ships, race);
        const npcPower = npcCombatPower(mission.encounter.difficulty);
        const resolve = pveResolve({
          fleetPower,
          npcPower,
          ships,
          race,
          difficulty: mission.encounter.difficulty,
        });

        const result: PveResultView = {
          outcome: resolve.outcome,
          lostShips: resolve.lostShips as Record<ShipType, number>,
          rewards: resolve.rewards,
        };

        const newHealth = Math.max(0, mission.encounter.health - resolve.damageDealt);
        await tx.npcEncounter.update({
          where: { id: mission.encounterId },
          data: { health: newHealth },
        });

        await tx.pveMission.update({
          where: { id },
          data: {
            phase: PveMissionPhase.RETURNING,
            result: result as unknown as Prisma.InputJsonValue,
          },
        });
        scheduleNext = { phase: 'RETURNING', at: mission.returnsAt };
        return 'resolved' as const;
      }

      if (mission.returnsAt > now) return 'waiting' as const;
      const result = (mission.result ?? undefined) as PveResultView | undefined;
      if (!result) return 'waiting' as const;

      const ships = mission.ships as Record<ShipType, number>;
      const settled = await this.engine.settlePlanet(mission.sourcePlanetId, now, tx);
      const cap = storageCap(settled.buildings[BuildingType.STORAGE_VACUOLE] ?? 0);
      const current = this.engine.buildResourceState(settled).amounts;
      const accepted: Record<ResourceType, number> = {} as Record<ResourceType, number>;
      for (const resource of Object.values(ResourceType)) {
        accepted[resource] = Math.max(
          0,
          Math.min(result.rewards[resource] ?? 0, cap - current[resource]),
        );
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

      const survivors: Record<string, number> = {};
      for (const type of SHIP_TYPES) {
        const sent = ships[type] ?? 0;
        const lost = result.lostShips[type] ?? 0;
        const count = Math.max(0, sent - lost);
        if (count > 0) survivors[type] = count;
      }
      await this.upsertShips(tx, mission.sourcePlanetId, survivors);

      // Drops d'objets selon la table de drop de l'anomalie
      if (result.outcome === PveOutcome.VICTORY) {
        await this.engagementHook.onPveWon(mission.userId).catch(() => void 0);
        const drops = this.rollDrops(mission.encounter.type as NpcEncounterType);
        for (const drop of drops) {
          await tx.playerInventorySlot.upsert({
            where: {
              userId_planetId_itemKey: {
                userId: mission.userId,
                planetId: mission.sourcePlanetId,
                itemKey: drop.itemKey,
              },
            },
            update: { quantity: { increment: drop.quantity } },
            create: {
              userId: mission.userId,
              planetId: mission.sourcePlanetId,
              itemKey: drop.itemKey,
              quantity: drop.quantity,
            },
          });
        }
      }

      await tx.pveMission.update({
        where: { id },
        data: { phase: PveMissionPhase.COMPLETED, completedAt: now },
      });
      return 'completed' as const;
    });

    if (scheduleNext) await this.queue.schedulePve(id, scheduleNext.phase, scheduleNext.at);
    if (state === 'advanced' && scheduleNext && scheduleNext.at <= now) {
      await this.advanceMission(id, now);
    }
    if (state === 'resolved' && scheduleNext && scheduleNext.at <= now) {
      await this.advanceMission(id, now);
    }
  }

  private rollDrops(encounterType: NpcEncounterType): ItemDropView[] {
    const table = PVE_DROP_TABLES[encounterType];
    if (!table) return [];
    const drops: ItemDropView[] = [];
    for (const entry of table) {
      if (Math.random() < entry.chance) {
        const qty = Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty;
        drops.push({ itemKey: entry.itemKey, quantity: qty });
      }
    }
    return drops;
  }

  private encounterView(encounter: {
    id: string;
    type: string;
    galaxy: number;
    system: number;
    position: number;
    difficulty: number;
    health: number;
    maxHealth: number;
    rewards: unknown;
    expiresAt: Date;
  }): NpcEncounterView {
    return {
      id: encounter.id,
      type: encounter.type as NpcEncounterType,
      coordinates: {
        galaxy: encounter.galaxy,
        system: encounter.system,
        position: encounter.position,
      },
      difficulty: encounter.difficulty,
      health: encounter.health,
      maxHealth: encounter.maxHealth,
      rewards: this.parseRewards(encounter.rewards),
      expiresAt: encounter.expiresAt.toISOString(),
    };
  }

  private missionView(mission: {
    id: string;
    phase: string;
    encounter: {
      id: string;
      type: string;
      galaxy: number;
      system: number;
      position: number;
      difficulty: number;
      health: number;
      maxHealth: number;
      rewards: unknown;
      expiresAt: Date;
    };
    sourcePlanetId: string;
    ships: unknown;
    travelArrivesAt: Date;
    combatEndsAt: Date;
    returnsAt: Date;
    result: unknown | null;
  }): PveMissionView {
    const ships = mission.ships as Record<string, number>;
    const result = mission.result
      ? ({
          outcome: (mission.result as Record<string, unknown>).outcome as PveOutcome,
          lostShips: (mission.result as Record<string, unknown>).lostShips as Record<
            ShipType,
            number
          >,
          rewards: (mission.result as Record<string, unknown>).rewards as Record<
            ResourceType,
            number
          >,
        } as PveResultView)
      : undefined;

    return {
      id: mission.id,
      phase: mission.phase as SharedPveMissionPhase,
      encounter: this.encounterView(mission.encounter),
      sourcePlanetId: mission.sourcePlanetId,
      ships: Object.fromEntries(SHIP_TYPES.map((type) => [type, ships[type] ?? 0])) as ShipCounts,
      travelArrivesAt: mission.travelArrivesAt.toISOString(),
      combatEndsAt: mission.combatEndsAt.toISOString(),
      returnsAt: mission.returnsAt.toISOString(),
      result,
    };
  }

  private parseRewards(value: unknown): Record<ResourceType, number> {
    const rewards: Record<ResourceType, number> = {} as Record<ResourceType, number>;
    if (typeof value !== 'object' || value === null) return rewards;
    for (const resource of Object.values(ResourceType)) {
      const v = (value as Record<string, unknown>)[resource];
      if (typeof v === 'number') rewards[resource] = v;
    }
    return rewards;
  }

  private async decrementShips(
    tx: Prisma.TransactionClient,
    planetId: string,
    ships: Record<string, number>,
  ): Promise<void> {
    const entries = Object.entries(ships).filter(([, qty]) => qty > 0);
    if (entries.length === 0) return;
    const typeArray = Prisma.sql`ARRAY[${Prisma.join(
      entries.map(([type]) => Prisma.sql`${type}::text`),
      ', ',
    )}]`;
    const qtyArray = Prisma.sql`ARRAY[${Prisma.join(
      entries.map(([, qty]) => Prisma.sql`${qty}::int`),
      ', ',
    )}]`;
    await tx.$executeRaw`
      UPDATE "planet_ships" ps
      SET quantity = ps.quantity - d.qty
      FROM unnest(${typeArray}::text[], ${qtyArray}::int[]) AS d(type, qty)
      WHERE ps."planetId" = ${planetId}
        AND ps."type"::text = d.type
        AND ps.quantity >= d.qty
    `;
  }

  private async upsertShips(
    tx: Prisma.TransactionClient,
    planetId: string,
    ships: Record<string, number>,
  ): Promise<void> {
    for (const [type, qty] of Object.entries(ships)) {
      if (qty <= 0) continue;
      await tx.planetShip.upsert({
        where: { planetId_type: { planetId, type: type as ShipType } },
        update: { quantity: { increment: qty } },
        create: { planetId, type: type as ShipType, quantity: qty },
      });
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
