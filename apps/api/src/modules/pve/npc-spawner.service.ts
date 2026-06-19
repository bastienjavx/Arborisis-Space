import { Injectable, Logger } from '@nestjs/common';
import {
  NpcEncounterType,
  NPC_ENCOUNTER_CONFIGS,
  NPC_ENCOUNTER_TYPES,
  NPC_SPAWN_TARGET,
  NPC_SPAWN_WEIGHTS,
  POSITIONS_PER_SYSTEM,
  ResourceType,
  SYSTEMS_PER_GALAXY,
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
    const active = await this.prisma.npcEncounter.findMany({
      where: { universeId, expiresAt: { gt: now } },
      select: { galaxy: true, system: true, position: true },
    });

    const needed = target - active.length;
    if (needed <= 0) return 0;

    const taken = new Set(active.map((e) => `${e.galaxy}-${e.system}-${e.position}`));
    const tierTypes = this.buildTierMap();
    let spawned = 0;
    let attempts = 0;

    while (spawned < needed && attempts < needed * 5) {
      attempts++;
      const galaxy = 1;
      const system = Math.floor(Math.random() * SYSTEMS_PER_GALAXY) + 1;
      const position = Math.floor(Math.random() * POSITIONS_PER_SYSTEM) + 1;
      const key = `${galaxy}-${system}-${position}`;
      if (taken.has(key)) continue;
      taken.add(key);

      const type = this.pickType(tierTypes);
      const cfg = NPC_ENCOUNTER_CONFIGS[type];
      const difficulty =
        cfg.minDifficulty + Math.floor(Math.random() * (cfg.maxDifficulty - cfg.minDifficulty + 1));
      const health = difficulty * cfg.baseHealth;
      const rewards = {
        [ResourceType.BIOMASS]: Math.round(difficulty * 200 * cfg.rewardMultiplier),
        [ResourceType.SAP]: Math.round(difficulty * 125 * cfg.rewardMultiplier),
        [ResourceType.MINERALS]: Math.round(difficulty * 125 * cfg.rewardMultiplier),
        [ResourceType.SPORES]: Math.round(difficulty * 50 * cfg.rewardMultiplier),
      };
      const expiresAt = new Date(now.getTime() + cfg.expiryHours * 3_600_000);

      try {
        await this.prisma.npcEncounter.create({
          data: {
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
          },
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
  ): NpcEncounterType {
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
}
