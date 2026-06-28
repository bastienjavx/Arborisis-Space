import { Injectable, Logger } from '@nestjs/common';
import {
  NpcEncounterType,
  NPC_ENCOUNTER_CONFIGS,
  NPC_ENCOUNTER_TYPES,
  NPC_SPAWN_ANCHOR_DRIFT_SYSTEMS,
  NPC_SPAWN_TARGET,
  NPC_SPAWN_WEIGHTS,
  POSITIONS_PER_SYSTEM,
  RaceType,
  ResourceType,
  fleetCombatPower,
  npcCombatPower,
  SYSTEMS_PER_GALAXY,
  type ShipCounts,
} from '@arborisis/shared';
import { getDefaultUniverseId } from '../../common/prisma/default-universe.helper';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getCurrentUniverseId } from '../universe/universe-context';

@Injectable()
export class NpcSpawnerService {
  private readonly logger = new Logger(NpcSpawnerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async spawnBatch(target = NPC_SPAWN_TARGET): Promise<number> {
    const now = new Date();
    const universeId = getCurrentUniverseId() ?? (await getDefaultUniverseId(this.prisma));
    const [active, anchors, occupiedPlanets] = await Promise.all([
      this.prisma.npcEncounter.findMany({
        where: { universeId, expiresAt: { gt: now } },
        select: { galaxy: true, system: true, position: true },
      }),
      this.loadSpawnAnchors(universeId),
      this.prisma.planet.findMany({
        where: { universeId },
        select: { galaxy: true, system: true, position: true },
      }),
    ]);

    const needed = target - active.length;
    if (needed <= 0) return 0;

    const taken = new Set([
      ...active.map((e) => `${e.galaxy}-${e.system}-${e.position}`),
      ...occupiedPlanets.map((e) => `${e.galaxy}-${e.system}-${e.position}`),
    ]);
    const tierTypes = this.buildTierMap();
    let spawned = 0;
    let attempts = 0;

    while (spawned < needed && attempts < needed * 5) {
      attempts++;
      const anchor = this.pickAnchor(anchors);
      const { galaxy, system, position } = this.pickSpawnLocation(anchor);
      const key = `${galaxy}-${system}-${position}`;
      if (taken.has(key)) continue;
      taken.add(key);

      const targetDifficulty = anchor ? this.estimateAnchorDifficulty(anchor) : undefined;
      const type = this.pickType(tierTypes, targetDifficulty);
      const cfg = NPC_ENCOUNTER_CONFIGS[type];
      const difficulty = this.pickDifficulty(type, targetDifficulty);
      const health = difficulty * cfg.baseHealth;
      const rewards = {
        [ResourceType.BIOMASS]: Math.round(difficulty * 200 * cfg.rewardMultiplier),
        [ResourceType.SAP]: Math.round(difficulty * 125 * cfg.rewardMultiplier),
        [ResourceType.MINERALS]: Math.round(difficulty * 125 * cfg.rewardMultiplier),
        [ResourceType.SPORES]: Math.round(difficulty * 50 * cfg.rewardMultiplier),
      };
      const expiresAt = new Date(now.getTime() + cfg.expiryHours * 3_600_000);
      const data = {
        universeId,
        type: type as import('@prisma/client').NpcEncounterType,
        galaxy,
        system,
        position,
        difficulty,
        health,
        maxHealth: health,
        rewards,
        expiresAt,
      };

      const reused = await this.prisma.npcEncounter.updateMany({
        where: { universeId, galaxy, system, position, expiresAt: { lte: now } },
        data,
      });
      if (reused.count > 0) {
        spawned++;
        continue;
      }

      try {
        await this.prisma.npcEncounter.create({
          data,
        });
        spawned++;
      } catch (e) {
        const err = e as { code?: string };
        if (err.code === 'P2002') continue;
        throw e;
      }
    }

    this.logger.log(
      `Spawné ${spawned} encounters NPC (${active.length} actifs → ${active.length + spawned})`,
    );
    return spawned;
  }

  private buildTierMap(): Map<'easy' | 'medium' | 'hard' | 'elite', NpcEncounterType[]> {
    const map = new Map<'easy' | 'medium' | 'hard' | 'elite', NpcEncounterType[]>();
    for (const type of NPC_ENCOUNTER_TYPES) {
      const tier = NPC_ENCOUNTER_CONFIGS[type].tier;
      if (!map.has(tier)) map.set(tier, []);
      map.get(tier)!.push(type);
    }
    return map;
  }

  private pickType(
    tierTypes: Map<'easy' | 'medium' | 'hard' | 'elite', NpcEncounterType[]>,
    targetDifficulty?: number,
  ): NpcEncounterType {
    if (targetDifficulty !== undefined) {
      const candidates = NPC_ENCOUNTER_TYPES.filter((type) => {
        const cfg = NPC_ENCOUNTER_CONFIGS[type];
        return (
          cfg.minDifficulty <= targetDifficulty + 1 && cfg.maxDifficulty >= targetDifficulty - 1
        );
      });
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      if (picked !== undefined) return picked;
    }

    const roll = Math.random() * 100;
    let cumul = 0;
    const tiers: Array<'easy' | 'medium' | 'hard' | 'elite'> = ['easy', 'medium', 'hard', 'elite'];
    for (const tier of tiers) {
      cumul += NPC_SPAWN_WEIGHTS[tier];
      if (roll < cumul) {
        const types = tierTypes.get(tier) ?? [];
        const picked = types[Math.floor(Math.random() * types.length)];
        if (picked !== undefined) return picked;
      }
    }
    return NpcEncounterType.MYCOXIN_NEST;
  }

  private async loadSpawnAnchors(universeId: string): Promise<SpawnAnchor[]> {
    const planets = await this.prisma.planet.findMany({
      where: { universeId },
      select: {
        galaxy: true,
        system: true,
        position: true,
        owner: { select: { race: true } },
        ships: { select: { type: true, quantity: true } },
      },
      take: 100,
    });

    return planets.map((planet) => ({
      galaxy: planet.galaxy,
      system: planet.system,
      position: planet.position,
      race: planet.owner.race as RaceType,
      ships: Object.fromEntries(
        planet.ships.map((ship) => [ship.type, ship.quantity]),
      ) as Partial<ShipCounts>,
    }));
  }

  private pickAnchor(anchors: SpawnAnchor[]): SpawnAnchor | undefined {
    if (anchors.length === 0) return undefined;
    const weighted = anchors.map((anchor) => ({
      anchor,
      weight: Math.max(1, this.estimateAnchorDifficulty(anchor)),
    }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.anchor;
    }
    return weighted[weighted.length - 1]?.anchor;
  }

  private pickSpawnLocation(anchor?: SpawnAnchor): {
    galaxy: number;
    system: number;
    position: number;
  } {
    if (!anchor) {
      return {
        galaxy: 1,
        system: Math.floor(Math.random() * SYSTEMS_PER_GALAXY) + 1,
        position: Math.floor(Math.random() * POSITIONS_PER_SYSTEM) + 1,
      };
    }

    const drift =
      Math.floor(Math.random() * (NPC_SPAWN_ANCHOR_DRIFT_SYSTEMS * 2 + 1)) -
      NPC_SPAWN_ANCHOR_DRIFT_SYSTEMS;
    return {
      galaxy: anchor.galaxy,
      system: Math.min(SYSTEMS_PER_GALAXY, Math.max(1, anchor.system + drift)),
      position: Math.floor(Math.random() * POSITIONS_PER_SYSTEM) + 1,
    };
  }

  private estimateAnchorDifficulty(anchor: SpawnAnchor): number {
    const power = fleetCombatPower(anchor.ships, anchor.race);
    return Math.max(1, Math.round(power / npcCombatPower(1)));
  }

  private pickDifficulty(type: NpcEncounterType, targetDifficulty?: number): number {
    const cfg = NPC_ENCOUNTER_CONFIGS[type];
    if (targetDifficulty === undefined) {
      return (
        cfg.minDifficulty + Math.floor(Math.random() * (cfg.maxDifficulty - cfg.minDifficulty + 1))
      );
    }
    const jitter = Math.floor(Math.random() * 3) - 1;
    return Math.min(cfg.maxDifficulty, Math.max(cfg.minDifficulty, targetDifficulty + jitter));
  }
}

interface SpawnAnchor {
  galaxy: number;
  system: number;
  position: number;
  race: RaceType;
  ships: Partial<ShipCounts>;
}
