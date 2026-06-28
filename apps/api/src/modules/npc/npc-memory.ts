import { MYCOSYNTH_BRAIN_CONFIG } from '@arborisis/shared';

/**
 * Mémoire relationnelle d'un bot MYCOSYNTH.
 *
 * Le bot retient, par joueur rencontré, un niveau de menace (a-t-il été
 * attaqué ?), une rancune (qui alimente la rétorsion) et son bilan de batailles.
 * Toutes les fonctions sont pures et renvoient un nouvel état, pour rester
 * testables et facilement persistables dans la colonne JSON `NpcProfile.memory`.
 */

export interface NpcRelation {
  /** Menace perçue : monte avec les attaques subies, décroît avec le temps. */
  threat: number;
  /** Rancune : alimente le ciblage de rétorsion, retombe quand on rend les coups. */
  grudge: number;
  battlesWon: number;
  battlesLost: number;
  /** ISO de la dernière attaque subie de ce joueur. */
  lastTheyAttackedAt?: string;
  /** ISO de la dernière attaque lancée contre ce joueur. */
  lastWeAttackedAt?: string;
}

export interface NpcMemoryState {
  relations: Record<string, NpcRelation>;
  version: number;
}

const MEMORY_VERSION = 1;
const MIN_RETAINED = 0.05;

export function emptyMemory(): NpcMemoryState {
  return { relations: {}, version: MEMORY_VERSION };
}

function emptyRelation(): NpcRelation {
  return { threat: 0, grudge: 0, battlesWon: 0, battlesLost: 0 };
}

/** Lecture défensive depuis une valeur JSON persistée. */
export function parseMemory(raw: unknown): NpcMemoryState {
  if (!raw || typeof raw !== 'object') return emptyMemory();
  const obj = raw as Record<string, unknown>;
  const rawRelations = obj.relations;
  if (!rawRelations || typeof rawRelations !== 'object') return emptyMemory();

  const relations: Record<string, NpcRelation> = {};
  for (const [playerId, value] of Object.entries(rawRelations as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const r = value as Record<string, unknown>;
    relations[playerId] = {
      threat: num(r.threat),
      grudge: num(r.grudge),
      battlesWon: num(r.battlesWon),
      battlesLost: num(r.battlesLost),
      lastTheyAttackedAt:
        typeof r.lastTheyAttackedAt === 'string' ? r.lastTheyAttackedAt : undefined,
      lastWeAttackedAt: typeof r.lastWeAttackedAt === 'string' ? r.lastWeAttackedAt : undefined,
    };
  }
  return { relations, version: MEMORY_VERSION };
}

export function getRelation(memory: NpcMemoryState, playerId: string): NpcRelation {
  return memory.relations[playerId] ?? emptyRelation();
}

function withRelation(
  memory: NpcMemoryState,
  playerId: string,
  mutate: (relation: NpcRelation) => NpcRelation,
): NpcMemoryState {
  const next = mutate({ ...getRelation(memory, playerId) });
  return {
    version: MEMORY_VERSION,
    relations: { ...memory.relations, [playerId]: next },
  };
}

/** Enregistre une attaque subie : la menace et la rancune montent. */
export function recordIncomingAttack(
  memory: NpcMemoryState,
  playerId: string,
  at: string,
  weight = 1,
): NpcMemoryState {
  return withRelation(memory, playerId, (relation) => ({
    ...relation,
    threat: relation.threat + weight,
    grudge: relation.grudge + weight,
    lastTheyAttackedAt: at,
  }));
}

/** Enregistre une attaque lancée : la rancune retombe (vengeance assouvie). */
export function recordOutgoingAttack(
  memory: NpcMemoryState,
  playerId: string,
  at: string,
): NpcMemoryState {
  return withRelation(memory, playerId, (relation) => ({
    ...relation,
    grudge: Math.max(0, relation.grudge - 1),
    lastWeAttackedAt: at,
  }));
}

export function recordBattleResult(
  memory: NpcMemoryState,
  playerId: string,
  won: boolean,
): NpcMemoryState {
  return withRelation(memory, playerId, (relation) => ({
    ...relation,
    battlesWon: relation.battlesWon + (won ? 1 : 0),
    battlesLost: relation.battlesLost + (won ? 0 : 1),
  }));
}

/**
 * Décroissance temporelle : menace et rancune sont multipliées par `factor`.
 * Les relations devenues négligeables et sans historique sont oubliées.
 */
export function decayMemory(
  memory: NpcMemoryState,
  factor = MYCOSYNTH_BRAIN_CONFIG.memoryDecay,
): NpcMemoryState {
  const relations: Record<string, NpcRelation> = {};
  for (const [playerId, relation] of Object.entries(memory.relations)) {
    const threat = relation.threat * factor;
    const grudge = relation.grudge * factor;
    const hasHistory = relation.battlesWon + relation.battlesLost > 0;
    if (!hasHistory && threat < MIN_RETAINED && grudge < MIN_RETAINED) continue;
    relations[playerId] = {
      ...relation,
      threat: threat < MIN_RETAINED ? 0 : threat,
      grudge: grudge < MIN_RETAINED ? 0 : grudge,
    };
  }
  return { version: MEMORY_VERSION, relations };
}

export function totalThreat(memory: NpcMemoryState): number {
  return Object.values(memory.relations).reduce((sum, relation) => sum + relation.threat, 0);
}

/** Joueur le plus rancunièrement visé (rancune la plus haute, > 0). */
export function topGrudge(
  memory: NpcMemoryState,
): { playerId: string; relation: NpcRelation } | null {
  let best: { playerId: string; relation: NpcRelation } | null = null;
  for (const [playerId, relation] of Object.entries(memory.relations)) {
    if (relation.grudge <= 0) continue;
    if (!best || relation.grudge > best.relation.grudge) best = { playerId, relation };
  }
  return best;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
