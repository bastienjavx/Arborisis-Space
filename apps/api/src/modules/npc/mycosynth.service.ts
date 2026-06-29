import { Injectable, Logger } from '@nestjs/common';
import {
  ExpeditionPhase,
  JobStatus,
  Prisma,
  PveMissionPhase,
  PvpMissionPhase,
  PvpMissionType as PrismaPvpMissionType,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  BUILDINGS,
  buildingCost,
  BuildingType,
  canAfford,
  computeDefensePower,
  COLONIZATION_BASE_COST,
  CRAFTING_RECIPES,
  EXPEDITION_SHIP_TYPES,
  fleetCombatPower,
  GALAXY_COUNT,
  ItemKey,
  MarketOrderSide,
  MarketOrderStatus,
  maxColonies,
  MAX_PRODUCTION_LINES_PER_PLANET,
  MYCOSYNTH_AI_CONFIG,
  MYCOSYNTH_BRAIN_CONFIG,
  NpcActionCategory,
  NpcActionLogStatus,
  NpcActionType,
  NpcArchetype,
  NpcGoal,
  NpcMood,
  npcCombatPower,
  NPC_ENCOUNTER_CONFIGS,
  NpcEncounterType,
  POSITIONS_PER_SYSTEM,
  ProductionLineStatus,
  PRODUCTION_LINE_RECIPES,
  RaceType,
  RESEARCHES,
  researchCost,
  ResearchType,
  ResourceType,
  SHIPS,
  shipCost,
  SHIP_TYPES,
  ShipRole,
  ShipType,
  SYSTEMS_PER_GALAXY,
  TradeRouteStatus,
  TRANSPORT_SHIP_TYPES,
  unmetBuildingRequirements,
  unmetResearchRequirements,
  type Coordinates,
  type NpcTraitVector,
  type ResourceBundle,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getDefaultUniverseId } from '../../common/prisma/default-universe.helper';
import { BuildingsService } from '../game/buildings.service';
import { ColonizationService } from '../game/colonization.service';
import { ExpeditionsService } from '../game/expeditions.service';
import { FinalizationService } from '../game/finalization.service';
import { GameEngineService } from '../game/game-engine.service';
import { ResearchService } from '../game/research.service';
import { ShipsService } from '../game/ships.service';
import { WorldFactoryService } from '../game/world-factory.service';
import { CraftingService } from '../crafting/crafting.service';
import { MarketService } from '../market/market.service';
import { ProductionLinesService } from '../production-lines/production-lines.service';
import { PveService } from '../pve/pve.service';
import { PvpService } from '../pvp/pvp.service';
import { TradeRoutesService } from '../trade-routes/trade-routes.service';
import {
  chooseBuildingUpgrade,
  chooseShipProduction,
  marketNeededItems,
  planMarketOrders,
  preferredMarketItems,
  reserveProtectedAmounts,
  resourceRatio,
  shouldCreateTradeRoute,
  shouldLaunchAttack,
  sumCombatShips,
  type MarketLiquidityItemState,
  type MycosynthPlanetSnapshot,
} from './mycosynth-planner';
import { assignArchetype, deriveTraits, parseTraits } from './npc-personality';
import {
  decayMemory,
  emptyMemory,
  parseMemory,
  recordIncomingAttack,
  recordOutgoingAttack,
  topGrudge,
  totalThreat,
  type NpcMemoryState,
} from './npc-memory';
import { deriveMood, selectGoal, type NpcGoalContext } from './npc-goals';
import { actionUtility, effectiveAttackRatio } from './npc-utility';

interface NpcBotConfig {
  username: string;
  email: string;
  race: RaceType;
}

interface PlanetSnapshot extends MycosynthPlanetSnapshot {
  galaxy: number;
  system: number;
  position: number;
}

/** État du « cerveau » d'un bot, chargé/persisté depuis NpcProfile. */
interface BotBrain {
  archetype: NpcArchetype;
  traits: NpcTraitVector;
  goal: NpcGoal | null;
  goalTargetId: string | null;
  mood: NpcMood;
  memory: NpcMemoryState;
}

interface BotSnapshot {
  userId: string;
  username: string;
  universeId: string;
  race: RaceType;
  brain: BotBrain;
  planets: PlanetSnapshot[];
  homeworld: PlanetSnapshot;
  marketOrders: Array<{ itemKey: string; side: string }>;
  inventory: Array<{ planetId: string; itemKey: string; quantity: number }>;
  productionLines: Array<{
    id: string;
    planetId: string;
    recipeId: string;
    status: string;
  }>;
  tradeRoutes: Array<{
    fromPlanetId: string;
    toPlanetId: string;
    resource: string | null;
    itemKey: string | null;
    status: string;
  }>;
  pendingCraftingJobs: number;
  activePveMissions: number;
  activePvpMissions: number;
  activeExpeditions: number;
  spyReports: Array<{
    targetPlanetId: string;
    result: unknown;
    completedAt: Date | null;
  }>;
}

interface TargetCandidate {
  id: string;
  ownerId: string;
  galaxy: number;
  system: number;
  position: number;
  owner: { race: string };
  ships: Array<{ type: string; quantity: number }>;
}

type ShipCounts = Partial<Record<ShipType, number>>;

function buildBotConfigs(): NpcBotConfig[] {
  const configs: NpcBotConfig[] = [];
  const prefixes: Array<{ prefix: string; count: number }> = [
    { prefix: 'MYCO', count: 17 },
    { prefix: 'PHOTO', count: 17 },
    { prefix: 'CHITIN', count: 16 },
  ];
  for (const { prefix, count } of prefixes) {
    for (let i = 1; i <= count; i++) {
      const username = `${prefix}-${String(i).padStart(2, '0')}`;
      configs.push({
        username,
        email: `${username.toLowerCase()}@npc.internal`,
        race: RaceType.MYCOSYNTH,
      });
    }
  }
  return configs.slice(0, MYCOSYNTH_AI_CONFIG.botCount);
}

const BOT_CONFIGS = buildBotConfigs();

@Injectable()
export class MycosynthService {
  private readonly logger = new Logger(MycosynthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly buildings: BuildingsService,
    private readonly research: ResearchService,
    private readonly ships: ShipsService,
    private readonly colonization: ColonizationService,
    private readonly finalization: FinalizationService,
    private readonly world: WorldFactoryService,
    private readonly pvp: PvpService,
    private readonly pve: PveService,
    private readonly expeditions: ExpeditionsService,
    private readonly market: MarketService,
    private readonly tradeRoutes: TradeRoutesService,
    private readonly productionLines: ProductionLinesService,
    private readonly crafting: CraftingService,
  ) {}

  private logAction(
    snapshot: BotSnapshot,
    actionType: NpcActionType,
    status: NpcActionLogStatus,
    detail: Record<string, unknown> = {},
  ): Promise<void> {
    return this.prisma.npcActionLog
      .create({
        data: {
          universeId: snapshot.universeId,
          userId: snapshot.userId,
          actionType,
          status,
          detail: detail as Prisma.InputJsonValue,
        },
      })
      .then(() => void 0)
      .catch((err: unknown) => {
        this.logger.warn({ err }, "Échec de journalisation d'action NPC");
      });
  }

  private async runAndLog(
    snapshot: BotSnapshot,
    actionType: NpcActionType,
    run: () => Promise<unknown>,
    detail: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await run();
      await this.logAction(snapshot, actionType, NpcActionLogStatus.SUCCESS, detail);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await this.logAction(snapshot, actionType, NpcActionLogStatus.FAILED, {
        ...detail,
        error,
      });
      throw new Error('ACTION_FAILED');
    }
  }

  /** Crée les 50 bots NPC s'ils n'existent pas encore et les rattache à MYCOSYNTH. */
  async ensureAllExist(): Promise<void> {
    const universeId = await getDefaultUniverseId(this.prisma);
    const existing = await this.prisma.user.findMany({
      where: { role: UserRole.NPC, universeId },
      select: { username: true },
    });
    const existingNames = new Set(existing.map((u) => u.username));

    let created = 0;
    for (const cfg of BOT_CONFIGS) {
      if (existingNames.has(cfg.username)) continue;
      try {
        const user = await this.prisma.user.create({
          data: {
            email: cfg.email,
            username: cfg.username,
            passwordHash: `$npc$${randomUUID()}`,
            role: UserRole.NPC,
            race: cfg.race,
            displayName: cfg.username,
            universeId,
          },
        });
        await this.world.initNewPlayer(user.id, undefined, cfg.race);
        created++;
      } catch {
        // Doublon probable entre réplicas ; l'idempotence prime.
      }
    }

    await this.prisma.user.updateMany({
      where: { role: UserRole.NPC, universeId, race: { not: RaceType.MYCOSYNTH } },
      data: { race: RaceType.MYCOSYNTH },
    });

    await this.ensureProfiles(universeId);

    if (created > 0) {
      this.logger.log(`${created} bot(s) NPC créé(s) dans l'univers ${universeId}`);
    }
  }

  /** Attribue un cerveau (archétype + traits) à chaque bot qui n'en a pas encore. */
  private async ensureProfiles(universeId: string): Promise<void> {
    const [npcs, profiles] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: UserRole.NPC, universeId },
        select: { id: true, username: true },
      }),
      this.prisma.npcProfile.findMany({ where: { universeId }, select: { userId: true } }),
    ]);
    const withProfile = new Set(profiles.map((p) => p.userId));

    for (const npc of npcs) {
      if (withProfile.has(npc.id)) continue;
      const archetype = assignArchetype(npc.username);
      await this.prisma.npcProfile
        .create({
          data: {
            userId: npc.id,
            universeId,
            archetype,
            traits: deriveTraits(archetype, npc.username) as unknown as Prisma.InputJsonValue,
            mood: NpcMood.CALM,
            memory: emptyMemory() as unknown as Prisma.InputJsonValue,
          },
        })
        .catch(() => void 0);
    }
  }

  /** Tick principal : snapshot → une action empire → une action économie → une mission. */
  async tick(universeId: string): Promise<void> {
    const bots = await this.prisma.user.findMany({
      where: { role: UserRole.NPC, universeId },
      select: { id: true, race: true, username: true },
    });
    if (bots.length === 0) return;

    this.logger.debug(`MYCOSYNTH tick — ${bots.length} bots — univers ${universeId}`);

    for (let i = 0; i < bots.length; i += MYCOSYNTH_AI_CONFIG.tickConcurrency) {
      const batch = bots.slice(i, i + MYCOSYNTH_AI_CONFIG.tickConcurrency);
      await Promise.all(
        batch.map((bot) =>
          this.thinkForBot(bot.id, bot.username, bot.race as RaceType, universeId).catch(
            (e: unknown) => this.logger.debug({ err: e }, `Tick ignoré pour ${bot.username}`),
          ),
        ),
      );
    }
  }

  private async thinkForBot(
    userId: string,
    username: string,
    race: RaceType,
    universeId: string,
  ): Promise<void> {
    const snapshot = await this.buildSnapshot(userId, username, race, universeId);
    if (!snapshot) return;

    await this.runEmpireAction(snapshot).catch(() => void 0);
    await this.runEconomicAction(snapshot).catch(() => void 0);
    await this.runMarketLiquidity(snapshot).catch(() => void 0);
    await this.runMissionAction(snapshot).catch(() => void 0);
  }

  private async buildSnapshot(
    userId: string,
    username: string,
    race: RaceType,
    universeId: string,
  ): Promise<BotSnapshot | null> {
    await Promise.all([
      this.finalization.finalizeDueResearchForUser(userId),
      this.pvp.finalizeDueForUser(userId),
      this.pve.finalizeDueForUser(userId),
      this.expeditions.finalizeDueForUser(userId),
    ]);

    const planetRows = await this.prisma.planet.findMany({
      where: { ownerId: userId, universeId },
      orderBy: [{ isHomeworld: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        isHomeworld: true,
        galaxy: true,
        system: true,
        position: true,
      },
    });
    if (planetRows.length === 0) return null;

    await Promise.all(
      planetRows.flatMap((planet) => [
        this.finalization.finalizeDueForPlanet(planet.id),
        this.finalization.finalizeDueShipProduction(planet.id),
      ]),
    );

    const settled = await Promise.all(
      planetRows.map(async (planet) => ({
        planet,
        settled: await this.engine.settlePlanet(planet.id),
      })),
    );
    const planetIds = planetRows.map((p) => p.id);

    const [
      shipRows,
      inventory,
      marketOrders,
      productionLines,
      tradeRoutes,
      pendingCraftingJobs,
      activePveMissions,
      activePvpMissions,
      activeExpeditions,
      spyReports,
    ] = await Promise.all([
      this.prisma.planetShip.findMany({
        where: { planetId: { in: planetIds }, quantity: { gt: 0 } },
        select: { planetId: true, type: true, quantity: true },
      }),
      this.prisma.playerInventorySlot.findMany({
        where: { userId, planetId: { in: planetIds }, quantity: { gt: 0 } },
        select: { planetId: true, itemKey: true, quantity: true },
      }),
      this.prisma.marketOrder.findMany({
        where: {
          userId,
          universeId,
          status: { in: [MarketOrderStatus.OPEN, MarketOrderStatus.PARTIALLY_FILLED] },
        },
        select: { itemKey: true, side: true },
      }),
      this.prisma.productionLine.findMany({
        where: { userId, planetId: { in: planetIds } },
        select: { id: true, planetId: true, recipeId: true, status: true },
      }),
      this.prisma.tradeRoute.findMany({
        where: {
          userId,
          status: { in: [TradeRouteStatus.ACTIVE, TradeRouteStatus.INSUFFICIENT_SHIPS] },
        },
        select: {
          fromPlanetId: true,
          toPlanetId: true,
          resource: true,
          itemKey: true,
          status: true,
        },
      }),
      this.prisma.craftingJob.count({ where: { userId, status: 'PENDING' } }),
      this.prisma.pveMission.count({
        where: {
          userId,
          phase: {
            in: [PveMissionPhase.TRAVEL, PveMissionPhase.COMBAT, PveMissionPhase.RETURNING],
          },
        },
      }),
      this.prisma.pvpMission.count({
        where: {
          userId,
          phase: { in: [PvpMissionPhase.OUTBOUND, PvpMissionPhase.RETURNING] },
        },
      }),
      this.prisma.expeditionMission.count({
        where: {
          userId,
          phase: { in: [ExpeditionPhase.OUTBOUND, ExpeditionPhase.RETURNING] },
        },
      }),
      this.prisma.pvpMission.findMany({
        where: {
          userId,
          type: PrismaPvpMissionType.SPY,
          phase: PvpMissionPhase.COMPLETED,
          completedAt: {
            gte: new Date(Date.now() - MYCOSYNTH_AI_CONFIG.spyFreshnessHours * 3_600_000),
          },
        },
        select: { targetPlanetId: true, result: true, completedAt: true },
        orderBy: { completedAt: 'desc' },
        take: 20,
      }),
    ]);

    const shipsByPlanet = new Map<string, Partial<Record<ShipType, number>>>();
    for (const row of shipRows) {
      const map = shipsByPlanet.get(row.planetId) ?? {};
      map[row.type as ShipType] = row.quantity;
      shipsByPlanet.set(row.planetId, map);
    }

    const planets = settled.map(({ planet, settled: settledPlanet }) => {
      const resources = this.engine.buildResourceState(settledPlanet);
      return {
        id: planet.id,
        isHomeworld: planet.isHomeworld,
        galaxy: planet.galaxy,
        system: planet.system,
        position: planet.position,
        buildings: settledPlanet.buildings,
        research: settledPlanet.research,
        resources: {
          amounts: resources.amounts,
          capacity: resources.capacity,
          perHour: resources.perHour,
          energyRatio: resources.energyRatio,
        },
        ships: shipsByPlanet.get(planet.id) ?? {},
      } satisfies PlanetSnapshot;
    });

    const homeworld = planets[0];
    if (!homeworld) return null;

    const snapshot: BotSnapshot = {
      userId,
      username,
      universeId,
      race,
      brain: placeholderBrain(username),
      planets,
      homeworld,
      marketOrders,
      inventory,
      productionLines,
      tradeRoutes,
      pendingCraftingJobs,
      activePveMissions,
      activePvpMissions,
      activeExpeditions,
      spyReports,
    };

    snapshot.brain = await this.refreshBrain(snapshot);
    return snapshot;
  }

  // ─────────────────────────────── Cerveau NPC ────────────────────────────────

  /**
   * Charge le profil persistant du bot, ingère les attaques subies depuis la
   * dernière revue, puis (à cadence limitée) recalcule humeur et but
   * stratégique. La révision est espacée (hystérésis) pour donner une intention
   * tenue sur plusieurs ticks et limiter les écritures.
   */
  private async refreshBrain(snapshot: BotSnapshot): Promise<BotBrain> {
    const profile = await this.loadOrCreateProfile(snapshot.userId, snapshot.username);

    const archetype = parseArchetype(profile.archetype, snapshot.username);
    const traits = parseTraits(profile.traits, deriveTraits(archetype, snapshot.username));
    let memory = parseMemory(profile.memory);
    let goal = parseGoal(profile.goal);
    let goalTargetId = profile.goalTargetId;
    let mood = parseMood(profile.mood);

    const now = new Date();
    const intervalMs = MYCOSYNTH_BRAIN_CONFIG.goalReviewIntervalHours * 3_600_000;
    const due =
      !profile.lastStrategyReviewAt ||
      now.getTime() - profile.lastStrategyReviewAt.getTime() >= intervalMs;

    if (!due) {
      return { archetype, traits, goal, goalTargetId, mood, memory };
    }

    memory = await this.ingestIncomingAttacks(
      snapshot,
      memory,
      profile.lastStrategyReviewAt ??
        new Date(now.getTime() - MYCOSYNTH_BRAIN_CONFIG.threatWindowHours * 3_600_000),
    );
    memory = decayMemory(memory);

    const context = await this.buildGoalContext(snapshot, memory, archetype, traits, mood);
    const grudge = topGrudge(memory);
    const combatReady = context.combatShips >= context.minCombatForAttack;
    const hasReadyGrudge =
      !!grudge &&
      grudge.relation.grudge >= MYCOSYNTH_BRAIN_CONFIG.grudgeRetaliationThreshold &&
      combatReady;
    const winDelta = grudge ? grudge.relation.battlesWon - grudge.relation.battlesLost : 0;

    mood = deriveMood({
      traits,
      totalThreat: totalThreat(memory),
      hasReadyGrudge,
      winDelta,
      combatReady,
    });

    const selection = selectGoal(context, goal, hasReadyGrudge ? grudge.playerId : null);
    goal = selection.goal;
    goalTargetId = selection.targetId;

    await this.persistBrain(snapshot.userId, {
      traits,
      goal,
      goalTargetId,
      mood,
      memory,
      lastStrategyReviewAt: now,
    }).catch((err: unknown) => this.logger.debug({ err }, 'Persistance cerveau NPC échouée'));

    return { archetype, traits, goal, goalTargetId, mood, memory };
  }

  private async loadOrCreateProfile(
    userId: string,
    username: string,
  ): Promise<{
    archetype: string;
    traits: Prisma.JsonValue;
    goal: string | null;
    goalTargetId: string | null;
    mood: string;
    memory: Prisma.JsonValue;
    lastStrategyReviewAt: Date | null;
  }> {
    const existing = await this.prisma.npcProfile.findUnique({
      where: { userId },
      select: {
        archetype: true,
        traits: true,
        goal: true,
        goalTargetId: true,
        mood: true,
        memory: true,
        lastStrategyReviewAt: true,
      },
    });
    if (existing) return existing;

    const archetype = assignArchetype(username);
    const traits = deriveTraits(archetype, username);
    const universeId = await getDefaultUniverseId(this.prisma);
    await this.prisma.npcProfile
      .create({
        data: {
          userId,
          universeId,
          archetype,
          traits: traits as unknown as Prisma.InputJsonValue,
          mood: NpcMood.CALM,
          memory: emptyMemory() as unknown as Prisma.InputJsonValue,
        },
      })
      .catch(() => void 0);
    return {
      archetype,
      traits: traits as unknown as Prisma.JsonValue,
      goal: null,
      goalTargetId: null,
      mood: NpcMood.CALM,
      memory: emptyMemory() as unknown as Prisma.JsonValue,
      lastStrategyReviewAt: null,
    };
  }

  private async persistBrain(
    userId: string,
    data: {
      traits: NpcTraitVector;
      goal: NpcGoal | null;
      goalTargetId: string | null;
      mood: NpcMood;
      memory: NpcMemoryState;
      lastStrategyReviewAt: Date;
    },
  ): Promise<void> {
    await this.prisma.npcProfile.update({
      where: { userId },
      data: {
        traits: data.traits as unknown as Prisma.InputJsonValue,
        goal: data.goal,
        goalTargetId: data.goalTargetId,
        mood: data.mood,
        memory: data.memory as unknown as Prisma.InputJsonValue,
        lastStrategyReviewAt: data.lastStrategyReviewAt,
      },
    });
  }

  /** Après une attaque lancée, la rancune envers la cible retombe (best-effort). */
  private async recordRetaliation(snapshot: BotSnapshot, targetOwnerId: string): Promise<void> {
    const memory = recordOutgoingAttack(
      snapshot.brain.memory,
      targetOwnerId,
      new Date().toISOString(),
    );
    snapshot.brain.memory = memory;
    await this.prisma.npcProfile
      .update({
        where: { userId: snapshot.userId },
        data: { memory: memory as unknown as Prisma.InputJsonValue },
      })
      .catch(() => void 0);
  }

  /** Incrémente la menace/rancune pour chaque attaque de joueur subie depuis `since`. */
  private async ingestIncomingAttacks(
    snapshot: BotSnapshot,
    memory: NpcMemoryState,
    since: Date,
  ): Promise<NpcMemoryState> {
    const attacks = await this.prisma.pvpMission.findMany({
      where: {
        type: PrismaPvpMissionType.ATTACK,
        targetPlanet: { ownerId: snapshot.userId },
        user: { role: UserRole.PLAYER },
        createdAt: { gt: since },
      },
      select: { userId: true, createdAt: true },
      take: 100,
    });
    let next = memory;
    for (const attack of attacks) {
      next = recordIncomingAttack(next, attack.userId, attack.createdAt.toISOString());
    }
    return next;
  }

  /** Contexte compact pour la sélection de but. */
  private async buildGoalContext(
    snapshot: BotSnapshot,
    memory: NpcMemoryState,
    archetype: NpcArchetype,
    traits: NpcTraitVector,
    mood: NpcMood,
  ): Promise<NpcGoalContext> {
    const sporal = await this.currentResearchLevel(snapshot.userId, ResearchType.SPORAL_PROPULSION);
    const combatShips = snapshot.planets.reduce(
      (sum, planet) => sum + sumCombatShips(planet.ships),
      0,
    );
    const activeLines = snapshot.productionLines.filter(
      (line) => line.status === ProductionLineStatus.ACTIVE,
    ).length;
    const economyScore = Math.max(
      0,
      Math.min(
        1,
        (activeLines + snapshot.tradeRoutes.length) / Math.max(1, snapshot.planets.length * 3),
      ),
    );
    const grudge = topGrudge(memory);

    return {
      archetype,
      traits,
      mood,
      colonies: snapshot.planets.length,
      maxColonies: maxColonies(sporal),
      combatShips,
      minCombatForAttack: MYCOSYNTH_AI_CONFIG.minCombatShipsForAttack,
      totalThreat: totalThreat(memory),
      hasGrudgeTarget:
        !!grudge && grudge.relation.grudge >= MYCOSYNTH_BRAIN_CONFIG.grudgeRetaliationThreshold,
      economyScore,
      researchBacklog: (await this.findResearchCandidate(snapshot)) !== null,
    };
  }

  /** Applique la pondération d'utilité (personnalité + but + humeur) à un score. */
  private weigh(snapshot: BotSnapshot, baseScore: number, category: NpcActionCategory): number {
    return actionUtility({
      baseScore,
      category,
      archetype: snapshot.brain.archetype,
      goal: snapshot.brain.goal,
      mood: snapshot.brain.mood,
    });
  }

  private async runEmpireAction(snapshot: BotSnapshot): Promise<void> {
    // Construction : chaque planète possède sa propre file et sa propre économie ;
    // les chantiers ne se concurrencent donc pas. On lance le meilleur chantier
    // abordable sur CHAQUE planète éligible, en parallèle, pour une croissance
    // d'empire réaliste (comme un joueur qui construit sur toutes ses colonies).
    await Promise.all(
      snapshot.planets.map((planet) => this.runPlanetConstruction(snapshot, planet)),
    );

    // Action empire « globale » : recherche, colonisation ou production de
    // vaisseaux — la meilleure décision (par score) l'emporte.
    const candidates: Array<{ score: number; run: () => Promise<void> }> = [];

    const researchCandidate = await this.findResearchCandidate(snapshot);
    if (researchCandidate) {
      candidates.push({
        score: this.weigh(snapshot, researchCandidate.score, NpcActionCategory.RESEARCH),
        run: async () => {
          await this.runAndLog(
            snapshot,
            NpcActionType.RESEARCH,
            async () => {
              await this.research.start(
                snapshot.userId,
                snapshot.homeworld.id,
                researchCandidate.type,
              );
            },
            { planetId: snapshot.homeworld.id, researchType: researchCandidate.type },
          );
        },
      });
    }

    const colonizationCandidate = await this.findColonizationCandidate(snapshot);
    if (colonizationCandidate) {
      candidates.push({
        score: this.weigh(snapshot, 94, NpcActionCategory.EXPANSION),
        run: async () => {
          await this.runAndLog(
            snapshot,
            NpcActionType.COLONIZATION,
            async () => {
              await this.colonization.colonize(
                snapshot.userId,
                snapshot.homeworld.id,
                colonizationCandidate,
              );
            },
            { sourcePlanetId: snapshot.homeworld.id, target: colonizationCandidate },
          );
        },
      });
    }

    const shipCandidate = this.findShipProductionCandidate(snapshot);
    if (shipCandidate) {
      candidates.push({
        score: this.weigh(snapshot, shipCandidate.score, NpcActionCategory.FLEET),
        run: async () => {
          await this.runAndLog(
            snapshot,
            NpcActionType.SHIP_PRODUCTION,
            async () => {
              await this.ships.produce(snapshot.userId, {
                planetId: shipCandidate.planetId,
                type: shipCandidate.type,
                quantity: shipCandidate.quantity,
              });
            },
            {
              planetId: shipCandidate.planetId,
              shipType: shipCandidate.type,
              quantity: shipCandidate.quantity,
            },
          );
        },
      });
    }

    await this.runBest(candidates);
  }

  /** Lance le meilleur chantier abordable sur une planète, si sa file est libre. */
  private async runPlanetConstruction(
    snapshot: BotSnapshot,
    planet: PlanetSnapshot,
  ): Promise<void> {
    if (await this.hasPendingConstruction(planet.id)) return;
    const ranked = chooseBuildingUpgrade(planet)
      .map((decision) => ({
        decision,
        utility: this.weigh(snapshot, decision.score, buildingCategory(decision.type)),
      }))
      .sort((a, b) => b.utility - a.utility);
    for (const { decision } of ranked) {
      const current = planet.buildings[decision.type] ?? 0;
      if (current >= BUILDINGS[decision.type].maxLevel) continue;
      if (unmetBuildingRequirements(decision.type, planet).length > 0) continue;
      if (!canAfford(planet.resources.amounts, buildingCost(decision.type, current + 1))) continue;
      await this.runAndLog(
        snapshot,
        NpcActionType.BUILDING_UPGRADE,
        async () => {
          await this.buildings.upgrade(snapshot.userId, planet.id, decision.type);
        },
        { planetId: planet.id, buildingType: decision.type, fromLevel: current },
      ).catch(() => void 0);
      return;
    }
  }

  private async runEconomicAction(snapshot: BotSnapshot): Promise<void> {
    const candidates: Array<{ score: number; run: () => Promise<void> }> = [];

    const lineCandidate = this.findProductionLineCandidate(snapshot);
    if (lineCandidate) {
      candidates.push({
        score: lineCandidate.status === ProductionLineStatus.INPUT_SHORTAGE ? 86 : 82,
        run: async () => {
          await this.runAndLog(
            snapshot,
            NpcActionType.PRODUCTION_LINE,
            async () => {
              if (lineCandidate.id) {
                await this.productionLines.updateLine(snapshot.userId, lineCandidate.id, {
                  status: ProductionLineStatus.ACTIVE,
                });
                return;
              }
              await this.productionLines.createLine(snapshot.userId, {
                planetId: lineCandidate.planetId,
                recipeId: lineCandidate.recipeId,
              });
            },
            {
              planetId: lineCandidate.planetId,
              recipeId: lineCandidate.recipeId,
              resumed: !!lineCandidate.id,
            },
          );
        },
      });
    }

    const craftCandidate = this.findCraftingCandidate(snapshot);
    if (craftCandidate) {
      candidates.push({
        score: 78,
        run: async () => {
          await this.runAndLog(
            snapshot,
            NpcActionType.CRAFTING,
            async () => {
              await this.crafting.startCrafting(snapshot.userId, {
                planetId: craftCandidate.planetId,
                recipeId: craftCandidate.recipeId,
                quantity: 1,
              });
            },
            { planetId: craftCandidate.planetId, recipeId: craftCandidate.recipeId },
          );
        },
      });
    }

    const routeCandidate = this.findTradeRouteCandidate(snapshot);
    if (routeCandidate) {
      candidates.push({
        score: 72,
        run: async () => {
          await this.runAndLog(
            snapshot,
            NpcActionType.TRADE_ROUTE,
            async () => {
              await this.tradeRoutes.createRoute(snapshot.userId, {
                fromPlanetId: routeCandidate.fromPlanetId,
                toPlanetId: routeCandidate.toPlanetId,
                resource: routeCandidate.resource,
                quantityPerRun: routeCandidate.quantityPerRun,
                shipType: routeCandidate.shipType,
                shipCount: routeCandidate.shipCount,
                intervalHours: MYCOSYNTH_AI_CONFIG.tradeRouteIntervalHours,
              });
            },
            {
              fromPlanetId: routeCandidate.fromPlanetId,
              toPlanetId: routeCandidate.toPlanetId,
              resource: routeCandidate.resource,
              quantityPerRun: routeCandidate.quantityPerRun,
            },
          );
        },
      });
    }

    await this.runBest(candidates);
  }

  /**
   * Étape marché dédiée : apporte de la liquidité « intelligente » en posant des ordres
   * au repos ancrés à la juste valeur. Indépendante de `runEconomicAction` (qui ne joue
   * qu'une seule action par tick) pour que le marché soit alimenté régulièrement.
   */
  private async runMarketLiquidity(snapshot: BotSnapshot): Promise<void> {
    if (snapshot.marketOrders.length >= MYCOSYNTH_AI_CONFIG.maxOpenMarketOrders) return;

    const neededItems = marketNeededItems();
    const buyer = snapshot.homeworld;
    const protectedBiomass =
      buyer.resources.amounts[ResourceType.BIOMASS] -
      (MYCOSYNTH_AI_CONFIG.economyReserve[ResourceType.BIOMASS] ?? 0);

    // On considère les items qu'on aime trader (vente de surplus) ET les ingrédients
    // qu'on consomme (achat de besoin), même s'ils ne sont pas « préférés » à la revente.
    const itemUniverse = new Set<ItemKey>([...preferredMarketItems(), ...neededItems]);

    // Ne charge le carnet que pour les items susceptibles de produire un ordre.
    const states: MarketLiquidityItemState[] = [];
    for (const itemKey of itemUniverse) {
      const slots = snapshot.inventory
        .filter((slot) => slot.itemKey === itemKey)
        .sort((a, b) => b.quantity - a.quantity);
      const bestSlot = slots[0];
      const totalQuantity = this.totalInventoryQuantity(snapshot, itemKey);
      const hasOpenSell = this.hasOpenMarketOrder(snapshot, itemKey, MarketOrderSide.SELL);
      const hasOpenBuy = this.hasOpenMarketOrder(snapshot, itemKey, MarketOrderSide.BUY);

      const canSell = !hasOpenSell && !!bestSlot;
      const canBuy = !hasOpenBuy && neededItems.has(itemKey);
      if (!canSell && !canBuy) continue;

      const book = await this.market.getOrderBook(snapshot.universeId, itemKey);
      states.push({
        itemKey,
        totalQuantity,
        bestSurplus: bestSlot ? { planetId: bestSlot.planetId, quantity: bestSlot.quantity } : null,
        hasOpenSell,
        hasOpenBuy,
        book: {
          bestBid: book.bids[0]?.price ?? null,
          bestAsk: book.asks[0]?.price ?? null,
          lastPrice: book.lastPrice,
        },
      });
    }

    if (states.length === 0) return;

    const brain = snapshot.brain;
    const isMarketMaker =
      brain.archetype === NpcArchetype.ECONOMIST ||
      brain.goal === NpcGoal.MAX_ECONOMY ||
      brain.traits.greed >= MYCOSYNTH_AI_CONFIG.marketMakerGreedThreshold;

    const intents = planMarketOrders({
      isMarketMaker,
      openOrderCount: snapshot.marketOrders.length,
      protectedBiomass,
      buyerPlanetId: buyer.id,
      neededItems,
      items: states,
    });

    for (const intent of intents) {
      await this.runAndLog(
        snapshot,
        NpcActionType.MARKET_ORDER,
        async () => {
          await this.market.placeOrder(snapshot.userId, snapshot.universeId, {
            sourcePlanetId: intent.planetId,
            itemKey: intent.itemKey,
            side: intent.side,
            pricePerUnit: intent.pricePerUnit,
            quantity: intent.quantity,
          });
        },
        {
          planetId: intent.planetId,
          itemKey: intent.itemKey,
          side: intent.side,
          pricePerUnit: intent.pricePerUnit,
          quantity: intent.quantity,
          reason: intent.reason,
        },
      );
      // Maintient le compteur d'ordres ouverts à jour pour les ticks suivants du même tour.
      snapshot.marketOrders.push({ itemKey: intent.itemKey, side: intent.side });
    }
  }

  private async runMissionAction(snapshot: BotSnapshot): Promise<void> {
    if (snapshot.activePveMissions + snapshot.activePvpMissions + snapshot.activeExpeditions > 0) {
      return;
    }

    const pvpAction = await this.findPvpAction(snapshot);
    if (pvpAction) {
      await this.runAndLog(snapshot, pvpAction.actionType, pvpAction.run, pvpAction.detail);
      return;
    }

    const pveAction = await this.findPveAction(snapshot);
    if (pveAction) {
      await this.runAndLog(snapshot, NpcActionType.PVE_ATTACK, pveAction.run, pveAction.detail);
      return;
    }

    const expeditionAction = await this.findExpeditionAction(snapshot);
    if (expeditionAction) {
      await this.runAndLog(
        snapshot,
        NpcActionType.EXPEDITION,
        expeditionAction.run,
        expeditionAction.detail,
      );
      return;
    }
  }

  private async findResearchCandidate(
    snapshot: BotSnapshot,
  ): Promise<{ type: ResearchType; score: number } | null> {
    const pending = await this.prisma.researchJob.findFirst({
      where: { userId: snapshot.userId, status: JobStatus.PENDING },
      select: { id: true },
    });
    if (pending) return null;

    for (const type of MYCOSYNTH_AI_CONFIG.preferredResearch) {
      const level = await this.currentResearchLevel(snapshot.userId, type);
      if (level >= RESEARCHES[type].maxLevel) continue;
      if (unmetResearchRequirements(type, snapshot.homeworld).length > 0) continue;
      const cost = researchCost(type, level + 1, snapshot.race);
      if (!canAfford(snapshot.homeworld.resources.amounts, cost)) continue;
      return {
        type,
        score: type === ResearchType.SPORAL_PROPULSION ? 91 : 76 - level,
      };
    }
    return null;
  }

  private async currentResearchLevel(userId: string, type: ResearchType): Promise<number> {
    const level = await this.prisma.researchLevel.findUnique({
      where: { userId_type: { userId, type } },
      select: { level: true },
    });
    return level?.level ?? 0;
  }

  private async findColonizationCandidate(snapshot: BotSnapshot): Promise<Coordinates | null> {
    const sporal = await this.currentResearchLevel(snapshot.userId, ResearchType.SPORAL_PROPULSION);
    if (sporal < 1) return null;

    const [planetCount, pendingCount] = await Promise.all([
      this.prisma.planet.count({
        where: { ownerId: snapshot.userId, universeId: snapshot.universeId },
      }),
      this.prisma.colonizationJob.count({
        where: { userId: snapshot.userId, status: JobStatus.PENDING },
      }),
    ]);
    if (planetCount - 1 + pendingCount >= maxColonies(sporal)) return null;

    const protectedResources = reserveProtectedAmounts(snapshot.homeworld.resources.amounts);
    if (!canAfford(protectedResources, COLONIZATION_BASE_COST)) return null;

    return this.findNearbyFreeCoords(snapshot);
  }

  private findShipProductionCandidate(
    snapshot: BotSnapshot,
  ): { planetId: string; type: ShipType; quantity: number; score: number } | null {
    let best: { planetId: string; type: ShipType; quantity: number; score: number } | null = null;
    for (const planet of snapshot.planets) {
      const nursery = planet.buildings[BuildingType.ORBITAL_NURSERY] ?? 0;
      if (nursery < 1) continue;
      const buildable = SHIP_TYPES.filter((type) => {
        const cfg = SHIPS[type];
        if (cfg.restrictedToRaces && !cfg.restrictedToRaces.includes(snapshot.race)) return false;
        return nursery >= cfg.requiresNurseryLevel;
      });
      for (const decision of chooseShipProduction(planet, buildable)) {
        const quantity = this.affordableShipQuantity(planet, decision.type, decision.quantity);
        if (quantity <= 0) continue;
        const candidate = {
          planetId: planet.id,
          type: decision.type,
          quantity,
          score: decision.score,
        };
        if (!best || candidate.score > best.score) best = candidate;
        break;
      }
    }
    return best;
  }

  private findProductionLineCandidate(
    snapshot: BotSnapshot,
  ): { id?: string; planetId: string; recipeId: string; status?: string } | null {
    const activeCountByPlanet = new Map<string, number>();
    for (const line of snapshot.productionLines) {
      activeCountByPlanet.set(line.planetId, (activeCountByPlanet.get(line.planetId) ?? 0) + 1);
    }

    for (const line of snapshot.productionLines) {
      if (line.status !== ProductionLineStatus.INPUT_SHORTAGE) continue;
      const recipe = PRODUCTION_LINE_RECIPES.find((r) => r.id === line.recipeId);
      const planet = snapshot.planets.find((p) => p.id === line.planetId);
      if (recipe && planet && canAfford(planet.resources.amounts, recipe.inputs)) {
        return {
          id: line.id,
          planetId: line.planetId,
          recipeId: line.recipeId,
          status: line.status,
        };
      }
    }

    for (const planet of snapshot.planets) {
      if ((activeCountByPlanet.get(planet.id) ?? 0) >= MAX_PRODUCTION_LINES_PER_PLANET) continue;
      for (const recipeId of MYCOSYNTH_AI_CONFIG.preferredProductionLineRecipes) {
        if (
          snapshot.productionLines.some(
            (line) => line.planetId === planet.id && line.recipeId === recipeId,
          )
        ) {
          continue;
        }
        const recipe = PRODUCTION_LINE_RECIPES.find((r) => r.id === recipeId);
        if (!recipe || !canAfford(planet.resources.amounts, recipe.inputs)) continue;
        return { planetId: planet.id, recipeId };
      }
    }
    return null;
  }

  private findCraftingCandidate(
    snapshot: BotSnapshot,
  ): { planetId: string; recipeId: string } | null {
    if (snapshot.pendingCraftingJobs > 0) return null;
    for (const recipeId of MYCOSYNTH_AI_CONFIG.preferredCraftingRecipes) {
      const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
      if (!recipe) continue;
      for (const planet of snapshot.planets) {
        if (this.canCraftOnPlanet(snapshot, planet, recipe)) {
          return { planetId: planet.id, recipeId };
        }
      }
    }
    return null;
  }

  private findTradeRouteCandidate(snapshot: BotSnapshot): {
    fromPlanetId: string;
    toPlanetId: string;
    resource: ResourceType;
    quantityPerRun: number;
    shipType: (typeof TRANSPORT_SHIP_TYPES)[number];
    shipCount: number;
  } | null {
    if (snapshot.planets.length < 2) return null;
    const activeRoutes = snapshot.tradeRoutes.filter(
      (route) => route.status === TradeRouteStatus.ACTIVE,
    );

    for (const resource of Object.values(ResourceType)) {
      const source = [...snapshot.planets].sort(
        (a, b) => resourceRatio(b.resources, resource) - resourceRatio(a.resources, resource),
      )[0];
      const target = [...snapshot.planets].sort(
        (a, b) => resourceRatio(a.resources, resource) - resourceRatio(b.resources, resource),
      )[0];
      if (!source || !target || source.id === target.id) continue;

      const duplicateExists = snapshot.tradeRoutes.some(
        (route) =>
          route.fromPlanetId === source.id &&
          route.toPlanetId === target.id &&
          route.resource === resource,
      );
      if (
        !shouldCreateTradeRoute({
          activeRouteCount: activeRoutes.length,
          duplicateExists,
          sourceRatio: resourceRatio(source.resources, resource),
          targetRatio: resourceRatio(target.resources, resource),
        })
      ) {
        continue;
      }
      const transport = this.pickTransport(source);
      if (!transport) continue;
      return {
        fromPlanetId: source.id,
        toPlanetId: target.id,
        resource,
        quantityPerRun: Math.min(
          MYCOSYNTH_AI_CONFIG.tradeRouteMaxQuantity,
          Math.floor(source.resources.amounts[resource] * 0.15),
        ),
        shipType: transport.type,
        shipCount: transport.count,
      };
    }
    return null;
  }

  private async findPvpAction(snapshot: BotSnapshot): Promise<{
    actionType: NpcActionType;
    run: () => Promise<void>;
    detail: Record<string, unknown>;
  } | null> {
    const source = [...snapshot.planets]
      .filter(
        (planet) => sumCombatShips(planet.ships) >= MYCOSYNTH_AI_CONFIG.minCombatShipsForAttack,
      )
      .sort((a, b) => sumCombatShips(b.ships) - sumCombatShips(a.ships))[0];
    if (!source) return null;

    const preferredOwnerId =
      snapshot.brain.goalTargetId ?? topGrudge(snapshot.brain.memory)?.playerId ?? null;
    const target = await this.findTarget(snapshot, source, preferredOwnerId);
    if (!target) return null;

    const isGrudgeTarget = !!preferredOwnerId && target.ownerId === preferredOwnerId;
    const recent = await this.countRecentAttacks(snapshot.userId, target);
    const spyReport = this.findFreshSpyReport(snapshot, target.id);
    const attackFleet = this.buildCombatFleet(source.ships);
    const attackerPower = fleetCombatPower(attackFleet, snapshot.race);
    const defenderPower =
      spyReport?.defensePower ??
      computeDefensePower({
        ships: this.shipCountsFromRows(target.ships),
        race: target.owner.race as RaceType,
      });

    const minRatio = effectiveAttackRatio(
      MYCOSYNTH_AI_CONFIG.minAttackPowerRatio,
      snapshot.brain.traits,
      snapshot.brain.mood,
      isGrudgeTarget,
    );

    if (
      shouldLaunchAttack(
        {
          attackerPower,
          defenderPower,
          hasFreshSpy: !!spyReport,
          recentAttacksAgainstOwner: recent.owner,
          recentAttacksAgainstPlanet: recent.planet,
        },
        minRatio,
      )
    ) {
      return {
        actionType: NpcActionType.PVP_ATTACK,
        run: async () => {
          await this.pvp.attack(snapshot.userId, {
            sourcePlanetId: source.id,
            targetPlanetId: target.id,
            ships: this.completeShipCounts(attackFleet),
          });
          await this.recordRetaliation(snapshot, target.ownerId);
        },
        detail: {
          sourcePlanetId: source.id,
          targetPlanetId: target.id,
          targetOwnerId: target.ownerId,
          attackerPower,
          defenderPower,
          minRatio,
          retaliation: isGrudgeTarget,
          goal: snapshot.brain.goal,
          mood: snapshot.brain.mood,
        },
      };
    }

    const spyFleet = this.buildSpyFleet(source.ships);
    if (recent.owner === 0 && Object.values(spyFleet).some((qty) => qty > 0)) {
      return {
        actionType: NpcActionType.PVP_SPY,
        run: async () => {
          await this.pvp.spy(snapshot.userId, {
            sourcePlanetId: source.id,
            targetPlanetId: target.id,
            ships: this.completeShipCounts(spyFleet),
          });
        },
        detail: {
          sourcePlanetId: source.id,
          targetPlanetId: target.id,
          targetOwnerId: target.ownerId,
        },
      };
    }

    return null;
  }

  private async findPveAction(
    snapshot: BotSnapshot,
  ): Promise<{ run: () => Promise<void>; detail: Record<string, unknown> } | null> {
    const source = [...snapshot.planets]
      .filter((planet) => sumCombatShips(planet.ships) >= MYCOSYNTH_AI_CONFIG.minCombatShipsForPve)
      .sort((a, b) => sumCombatShips(b.ships) - sumCombatShips(a.ships))[0];
    if (!source) return null;

    const fleet = this.buildCombatFleet(source.ships);
    const fleetPower = fleetCombatPower(fleet, snapshot.race);
    if (fleetPower <= 0) return null;

    const minPveRatio = effectiveAttackRatio(
      MYCOSYNTH_AI_CONFIG.minPvePowerRatio,
      snapshot.brain.traits,
      snapshot.brain.mood,
      false,
    );

    const now = new Date();
    const encounters = await this.prisma.npcEncounter.findMany({
      where: { universeId: snapshot.universeId, expiresAt: { gt: now } },
      orderBy: { difficulty: 'asc' },
      take: 50,
    });
    const viable = encounters
      .map((encounter) => {
        const npcPower = npcCombatPower(encounter.difficulty);
        const cfg = NPC_ENCOUNTER_CONFIGS[encounter.type as NpcEncounterType];
        const distance =
          Math.abs(encounter.galaxy - source.galaxy) * 100 +
          Math.abs(encounter.system - source.system);
        const ratio = fleetPower / Math.max(1, npcPower);
        return { encounter, score: ratio * cfg.rewardMultiplier * 100 - distance };
      })
      .filter(({ encounter, score }) => {
        void score;
        return fleetPower / Math.max(1, npcCombatPower(encounter.difficulty)) >= minPveRatio;
      })
      .sort((a, b) => b.score - a.score)[0];

    if (!viable) return null;
    return {
      run: async () => {
        await this.pve.attack(snapshot.userId, viable.encounter.id, {
          planetId: source.id,
          ships: this.completeShipCounts(fleet),
        });
      },
      detail: {
        sourcePlanetId: source.id,
        encounterId: viable.encounter.id,
        encounterType: viable.encounter.type,
        difficulty: viable.encounter.difficulty,
        fleetPower,
      },
    };
  }

  private async findExpeditionAction(
    snapshot: BotSnapshot,
  ): Promise<{ run: () => Promise<void>; detail: Record<string, unknown> } | null> {
    const sporal = await this.currentResearchLevel(snapshot.userId, ResearchType.SPORAL_PROPULSION);
    if (sporal < 1) return null;
    const source = [...snapshot.planets]
      .filter((planet) => this.expeditionShipCount(planet.ships) > 0)
      .sort((a, b) => this.expeditionShipCount(b.ships) - this.expeditionShipCount(a.ships))[0];
    if (!source) return null;

    const target = {
      galaxy: source.galaxy,
      system: clamp(source.system + 4 + Math.floor(Math.random() * 6), 1, SYSTEMS_PER_GALAXY),
    };

    return {
      run: async () => {
        await this.expeditions.start(snapshot.userId, {
          planetId: source.id,
          target,
          ships: this.expeditionFleet(source.ships),
        });
      },
      detail: { sourcePlanetId: source.id, target },
    };
  }

  private async runBest(
    candidates: Array<{ score: number; run: () => Promise<unknown> }>,
  ): Promise<void> {
    for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
      try {
        await candidate.run();
        return;
      } catch {
        // Une décision devenue invalide entre snapshot et action ne bloque pas les suivantes.
      }
    }
  }

  private async hasPendingConstruction(planetId: string): Promise<boolean> {
    const pending = await this.prisma.constructionJob.findFirst({
      where: { planetId, status: JobStatus.PENDING },
      select: { id: true },
    });
    return !!pending;
  }

  private affordableShipQuantity(
    planet: PlanetSnapshot,
    type: ShipType,
    requestedQuantity: number,
  ): number {
    let quantity = Math.max(1, Math.min(100, Math.floor(requestedQuantity)));
    const protectedAmounts = reserveProtectedAmounts(planet.resources.amounts);
    while (quantity > 0) {
      if (canAfford(protectedAmounts, shipCost(type, quantity))) return quantity;
      quantity = Math.floor(quantity / 2);
    }
    return 0;
  }

  private async findNearbyFreeCoords(snapshot: BotSnapshot): Promise<Coordinates | null> {
    const occupied = new Set(
      (
        await this.prisma.planet.findMany({
          where: { universeId: snapshot.universeId },
          select: { galaxy: true, system: true, position: true },
        })
      ).map((p) => `${p.galaxy}:${p.system}:${p.position}`),
    );

    for (let attempt = 0; attempt < 80; attempt++) {
      const anchor = snapshot.planets[attempt % snapshot.planets.length] ?? snapshot.homeworld;
      const system =
        anchor.system +
        Math.floor(Math.random() * (MYCOSYNTH_AI_CONFIG.nearbyColonizationDriftSystems * 2 + 1)) -
        MYCOSYNTH_AI_CONFIG.nearbyColonizationDriftSystems;
      const coords = {
        galaxy: anchor.galaxy,
        system: clamp(system, 1, SYSTEMS_PER_GALAXY),
        position: Math.floor(Math.random() * POSITIONS_PER_SYSTEM) + 1,
      };
      if (!occupied.has(`${coords.galaxy}:${coords.system}:${coords.position}`)) return coords;
    }

    for (let attempt = 0; attempt < 40; attempt++) {
      const coords = {
        galaxy: Math.floor(Math.random() * GALAXY_COUNT) + 1,
        system: Math.floor(Math.random() * SYSTEMS_PER_GALAXY) + 1,
        position: Math.floor(Math.random() * POSITIONS_PER_SYSTEM) + 1,
      };
      if (!occupied.has(`${coords.galaxy}:${coords.system}:${coords.position}`)) return coords;
    }
    return null;
  }

  private canCraftOnPlanet(
    snapshot: BotSnapshot,
    planet: PlanetSnapshot,
    recipe: (typeof CRAFTING_RECIPES)[number],
  ): boolean {
    const protectedAmounts = reserveProtectedAmounts(planet.resources.amounts);
    const resourceCosts: ResourceBundle = {};
    for (const ingredient of recipe.ingredients) {
      if (ingredient.resource) {
        resourceCosts[ingredient.resource] =
          (resourceCosts[ingredient.resource] ?? 0) + ingredient.quantity;
      }
      if (
        ingredient.itemKey &&
        this.inventoryQuantity(snapshot, planet.id, ingredient.itemKey) < ingredient.quantity
      ) {
        return false;
      }
    }
    return canAfford(protectedAmounts, resourceCosts);
  }

  private hasOpenMarketOrder(
    snapshot: BotSnapshot,
    itemKey: ItemKey,
    side: MarketOrderSide,
  ): boolean {
    return snapshot.marketOrders.some((order) => order.itemKey === itemKey && order.side === side);
  }

  private inventoryQuantity(snapshot: BotSnapshot, planetId: string, itemKey: ItemKey): number {
    return (
      snapshot.inventory.find((item) => item.planetId === planetId && item.itemKey === itemKey)
        ?.quantity ?? 0
    );
  }

  private totalInventoryQuantity(snapshot: BotSnapshot, itemKey: ItemKey): number {
    return snapshot.inventory
      .filter((item) => item.itemKey === itemKey)
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  private pickTransport(
    planet: PlanetSnapshot,
  ): { type: (typeof TRANSPORT_SHIP_TYPES)[number]; count: number } | null {
    for (const type of TRANSPORT_SHIP_TYPES) {
      const count = planet.ships[type] ?? 0;
      if (count > 0) return { type, count: Math.min(count, 2) };
    }
    return null;
  }

  private async findTarget(
    snapshot: BotSnapshot,
    source: PlanetSnapshot,
    preferredOwnerId: string | null = null,
  ): Promise<TargetCandidate | null> {
    const targets = await this.prisma.planet.findMany({
      where: {
        universeId: snapshot.universeId,
        ownerId: { not: snapshot.userId },
        owner: { role: 'PLAYER' },
        galaxy: source.galaxy,
      },
      select: {
        id: true,
        ownerId: true,
        galaxy: true,
        system: true,
        position: true,
        owner: { select: { race: true } },
        ships: { select: { type: true, quantity: true } },
      },
      take: 50,
    });

    const distance = (target: TargetCandidate): number =>
      Math.abs(target.system - source.system) + Math.abs(target.position - source.position);

    // Une cible de rancune accessible passe avant la simple proximité.
    if (preferredOwnerId) {
      const grudgeTargets = targets
        .filter((target) => target.ownerId === preferredOwnerId)
        .sort((a, b) => distance(a) - distance(b));
      if (grudgeTargets[0]) return grudgeTargets[0];
    }

    return [...targets].sort((a, b) => distance(a) - distance(b))[0] ?? null;
  }

  private async countRecentAttacks(
    userId: string,
    target: { id: string; ownerId: string },
  ): Promise<{ planet: number; owner: number }> {
    const [planet, owner] = await Promise.all([
      this.prisma.pvpMission.count({
        where: {
          userId,
          type: PrismaPvpMissionType.ATTACK,
          targetPlanetId: target.id,
          createdAt: {
            gte: new Date(Date.now() - MYCOSYNTH_AI_CONFIG.attackCooldownHours * 3_600_000),
          },
        },
      }),
      this.prisma.pvpMission.count({
        where: {
          userId,
          type: PrismaPvpMissionType.ATTACK,
          targetPlanet: { ownerId: target.ownerId },
          createdAt: {
            gte: new Date(Date.now() - MYCOSYNTH_AI_CONFIG.targetOwnerCooldownHours * 3_600_000),
          },
        },
      }),
    ]);
    return { planet, owner };
  }

  private findFreshSpyReport(
    snapshot: BotSnapshot,
    targetPlanetId: string,
  ): { defensePower: number | null } | null {
    const report = snapshot.spyReports.find((mission) => mission.targetPlanetId === targetPlanetId);
    if (!report || !report.result || typeof report.result !== 'object') return null;
    const maybeReport = (report.result as Record<string, unknown>).report;
    if (!maybeReport || typeof maybeReport !== 'object') return null;
    const defensePower = (maybeReport as Record<string, unknown>).defensePower;
    return { defensePower: typeof defensePower === 'number' ? defensePower : null };
  }

  private buildCombatFleet(ships: ShipCounts): Record<ShipType, number> {
    const fleet = this.emptyShipCounts();
    for (const type of SHIP_TYPES) {
      const cfg = SHIPS[type];
      if (![ShipRole.COMBAT, ShipRole.SUPPORT, ShipRole.DEFENSE].includes(cfg.role)) continue;
      const available = ships[type] ?? 0;
      const send = Math.floor(available * (1 - MYCOSYNTH_AI_CONFIG.fleetReserveRatio));
      if (send > 0) fleet[type] = send;
    }
    return fleet;
  }

  private buildSpyFleet(ships: ShipCounts): Record<ShipType, number> {
    const fleet = this.emptyShipCounts();
    for (const type of SHIP_TYPES) {
      if (SHIPS[type].role !== ShipRole.ESPIONAGE) continue;
      const available = ships[type] ?? 0;
      if (available > 0) {
        fleet[type] = 1;
        return fleet;
      }
    }
    return fleet;
  }

  private expeditionFleet(ships: ShipCounts): {
    [ShipType.SPORAL_SCOUT]: number;
    [ShipType.SYMBIOTIC_HARVESTER]: number;
    [ShipType.MYCELIAL_TENDRIL]: number;
    [ShipType.CHITIN_FREIGHTER]: number;
    [ShipType.BIOLUMINESCENT_CRUISER]: number;
    [ShipType.SPOROGENESIS_TITAN]: number;
  } {
    return {
      [ShipType.SPORAL_SCOUT]: Math.min(ships[ShipType.SPORAL_SCOUT] ?? 0, 2),
      [ShipType.SYMBIOTIC_HARVESTER]: Math.min(ships[ShipType.SYMBIOTIC_HARVESTER] ?? 0, 2),
      [ShipType.MYCELIAL_TENDRIL]: Math.min(ships[ShipType.MYCELIAL_TENDRIL] ?? 0, 1),
      [ShipType.CHITIN_FREIGHTER]: Math.min(ships[ShipType.CHITIN_FREIGHTER] ?? 0, 1),
      [ShipType.BIOLUMINESCENT_CRUISER]: Math.min(ships[ShipType.BIOLUMINESCENT_CRUISER] ?? 0, 1),
      [ShipType.SPOROGENESIS_TITAN]: Math.min(ships[ShipType.SPOROGENESIS_TITAN] ?? 0, 1),
    };
  }

  private expeditionShipCount(ships: ShipCounts): number {
    return EXPEDITION_SHIP_TYPES.reduce((sum, type) => sum + (ships[type] ?? 0), 0);
  }

  private shipCountsFromRows(
    rows: Array<{ type: string; quantity: number }>,
  ): Record<ShipType, number> {
    const counts = this.emptyShipCounts();
    for (const row of rows) counts[row.type as ShipType] = row.quantity;
    return counts;
  }

  private completeShipCounts(ships: ShipCounts): Record<ShipType, number> {
    return { ...this.emptyShipCounts(), ...ships };
  }

  private emptyShipCounts(): Record<ShipType, number> {
    return Object.fromEntries(SHIP_TYPES.map((type) => [type, 0])) as Record<ShipType, number>;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Cerveau provisoire avant rafraîchissement (jamais utilisé pour décider). */
function placeholderBrain(username: string): BotBrain {
  const archetype = assignArchetype(username);
  return {
    archetype,
    traits: deriveTraits(archetype, username),
    goal: null,
    goalTargetId: null,
    mood: NpcMood.CALM,
    memory: emptyMemory(),
  };
}

function parseArchetype(value: string, fallbackKey: string): NpcArchetype {
  return (Object.values(NpcArchetype) as string[]).includes(value)
    ? (value as NpcArchetype)
    : assignArchetype(fallbackKey);
}

function parseGoal(value: string | null): NpcGoal | null {
  if (!value) return null;
  return (Object.values(NpcGoal) as string[]).includes(value) ? (value as NpcGoal) : null;
}

function parseMood(value: string): NpcMood {
  return (Object.values(NpcMood) as string[]).includes(value) ? (value as NpcMood) : NpcMood.CALM;
}

/** Catégorie d'utilité d'un chantier, pour que la personnalité oriente la file. */
function buildingCategory(type: BuildingType): NpcActionCategory {
  switch (type) {
    case BuildingType.BIOMASS_SYNTHESIZER:
    case BuildingType.SAP_WELL:
    case BuildingType.MINERAL_VEIN:
    case BuildingType.SPORANGE:
      return NpcActionCategory.ECONOMY;
    case BuildingType.ORBITAL_NURSERY:
      return NpcActionCategory.FLEET;
    case BuildingType.RESEARCH_NEXUS:
      return NpcActionCategory.RESEARCH;
    default:
      return NpcActionCategory.CONSTRUCTION;
  }
}
