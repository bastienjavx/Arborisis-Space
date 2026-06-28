import {
  MYCOSYNTH_BRAIN_CONFIG,
  NPC_ARCHETYPES,
  NpcArchetype,
  type NpcArchetypeProfile,
  type NpcTraitVector,
} from '@arborisis/shared';

/**
 * Personnalités des bots MYCOSYNTH.
 *
 * Fonctions pures et déterministes : à partir d'une clé stable (le username du
 * bot) on dérive un archétype et un vecteur de traits reproductibles. La
 * détermination garantit qu'un bot conserve sa personnalité entre les ticks et
 * que la population se répartit selon `archetypeDistribution`.
 */

/** Hash FNV-1a 32 bits, stable et indépendant de la plateforme. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Archétype attribué de façon déterministe et pondérée à partir de la clé. */
export function assignArchetype(key: string): NpcArchetype {
  const dist = MYCOSYNTH_BRAIN_CONFIG.archetypeDistribution;
  const entries = NPC_ARCHETYPES.map((archetype) => [archetype, dist[archetype] ?? 1] as const);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let pick = hashString(`archetype:${key}`) % total;
  for (const [archetype, weight] of entries) {
    if (pick < weight) return archetype;
    pick -= weight;
  }
  return entries[entries.length - 1]![0];
}

export function archetypeProfile(archetype: NpcArchetype): NpcArchetypeProfile {
  return MYCOSYNTH_BRAIN_CONFIG.archetypes[archetype];
}

/**
 * Traits dérivés de l'archétype, avec un léger bruit déterministe (±0.1) pour
 * que deux bots du même archétype ne jouent pas exactement à l'identique.
 */
export function deriveTraits(archetype: NpcArchetype, key: string): NpcTraitVector {
  const base = archetypeProfile(archetype).traits;
  const jitter = (trait: string): number =>
    ((hashString(`${key}:${trait}`) % 1000) / 1000 - 0.5) * 0.2;
  return {
    aggression: clamp01(base.aggression + jitter('aggression')),
    greed: clamp01(base.greed + jitter('greed')),
    caution: clamp01(base.caution + jitter('caution')),
    ambition: clamp01(base.ambition + jitter('ambition')),
    curiosity: clamp01(base.curiosity + jitter('curiosity')),
  };
}

/** Valide/normalise un vecteur de traits issu de la persistance JSON. */
export function parseTraits(raw: unknown, fallback: NpcTraitVector): NpcTraitVector {
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Record<string, unknown>;
  const read = (key: keyof NpcTraitVector): number =>
    typeof obj[key] === 'number' ? clamp01(obj[key] as number) : fallback[key];
  return {
    aggression: read('aggression'),
    greed: read('greed'),
    caution: read('caution'),
    ambition: read('ambition'),
    curiosity: read('curiosity'),
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
