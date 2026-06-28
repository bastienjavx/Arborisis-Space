import {
  MYCOSYNTH_BRAIN_CONFIG,
  NpcArchetype,
  NpcGoal,
  NpcMood,
  type NpcTraitVector,
} from '@arborisis/shared';
import { archetypeProfile } from './npc-personality';

/**
 * Sélection du but stratégique (GOAP-lite) et de l'humeur d'un bot.
 *
 * Le but est tenu plusieurs ticks et oriente, via `goalCategoryBoost`, la
 * catégorie d'actions qui l'avance. La sélection est déterministe et applique
 * une hystérésis pour éviter qu'un bot ne change d'objectif à chaque tick.
 */

export interface NpcGoalContext {
  archetype: NpcArchetype;
  traits: NpcTraitVector;
  mood: NpcMood;
  /** Nombre de colonies actuelles (planètes possédées). */
  colonies: number;
  /** Plafond de colonies autorisé par la recherche. */
  maxColonies: number;
  combatShips: number;
  minCombatForAttack: number;
  totalThreat: number;
  hasGrudgeTarget: boolean;
  /** Développement économique normalisé 0..1 (1 = saturé). */
  economyScore: number;
  /** Une recherche utile est disponible et abordable. */
  researchBacklog: boolean;
}

export interface GoalSelection {
  goal: NpcGoal;
  targetId: string | null;
}

/** Marge d'hystérésis : on garde le but courant s'il reste compétitif. */
const HYSTERESIS = 0.12;

/** Score d'utilité brut d'un but candidat dans le contexte donné. */
export function goalUtility(goal: NpcGoal, ctx: NpcGoalContext): number {
  const t = ctx.traits;
  switch (goal) {
    case NpcGoal.BUILD_WAR_FLEET:
      return t.aggression * (ctx.combatShips < ctx.minCombatForAttack ? 1 : 0.2);
    case NpcGoal.EXPAND_COLONIES:
      return t.ambition * (ctx.colonies < ctx.maxColonies ? 1 : 0);
    case NpcGoal.MAX_ECONOMY:
      return t.greed * (1 - clamp01(ctx.economyScore)) + 0.1;
    case NpcGoal.RAID_TARGET:
      return ctx.hasGrudgeTarget && ctx.combatShips >= ctx.minCombatForAttack
        ? 0.6 + t.aggression * 0.6
        : 0;
    case NpcGoal.FORTIFY:
      return ctx.totalThreat > 0
        ? t.caution * Math.min(1, ctx.totalThreat / MYCOSYNTH_BRAIN_CONFIG.threatenedThreshold)
        : t.caution * 0.1;
    case NpcGoal.RESEARCH_PUSH:
      return t.ambition * 0.45 + (ctx.researchBacklog ? 0.25 : 0);
    default:
      return 0;
  }
}

/**
 * Choisit le but courant. Priorités fortes : se fortifier sous la menace, ou
 * venger une rancune si la flotte est prête. Sinon, meilleur but par utilité,
 * avec hystérésis en faveur du but actuel et départage par préférence
 * d'archétype.
 */
export function selectGoal(
  ctx: NpcGoalContext,
  currentGoal: NpcGoal | null,
  grudgeTargetId: string | null,
): GoalSelection {
  const threatened = ctx.totalThreat >= MYCOSYNTH_BRAIN_CONFIG.threatenedThreshold;

  if (threatened && ctx.archetype !== NpcArchetype.RAIDER) {
    return { goal: NpcGoal.FORTIFY, targetId: null };
  }
  if (
    grudgeTargetId &&
    ctx.hasGrudgeTarget &&
    ctx.combatShips >= ctx.minCombatForAttack &&
    ctx.traits.aggression >= 0.4
  ) {
    return { goal: NpcGoal.RAID_TARGET, targetId: grudgeTargetId };
  }

  const preferred = archetypeProfile(ctx.archetype).preferredGoals;
  const ordered = orderedGoals(preferred);

  let best: { goal: NpcGoal; score: number } | null = null;
  for (const goal of ordered) {
    const score = goalUtility(goal, ctx);
    if (!best || score > best.score) best = { goal, score };
  }
  const winner = best?.goal ?? NpcGoal.MAX_ECONOMY;

  if (currentGoal && currentGoal !== winner) {
    const currentScore = goalUtility(currentGoal, ctx);
    const winnerScore = best?.score ?? 0;
    if (currentScore + HYSTERESIS >= winnerScore) {
      return {
        goal: currentGoal,
        targetId: currentGoal === NpcGoal.RAID_TARGET ? grudgeTargetId : null,
      };
    }
  }

  return { goal: winner, targetId: winner === NpcGoal.RAID_TARGET ? grudgeTargetId : null };
}

/** Le but est-il déjà atteint (utile pour forcer une révision) ? */
export function isGoalSatisfied(goal: NpcGoal, ctx: NpcGoalContext): boolean {
  switch (goal) {
    case NpcGoal.BUILD_WAR_FLEET:
      return ctx.combatShips >= ctx.minCombatForAttack;
    case NpcGoal.EXPAND_COLONIES:
      return ctx.colonies >= ctx.maxColonies;
    case NpcGoal.MAX_ECONOMY:
      return ctx.economyScore >= 0.95;
    case NpcGoal.RAID_TARGET:
      return !ctx.hasGrudgeTarget;
    case NpcGoal.FORTIFY:
      return ctx.totalThreat < MYCOSYNTH_BRAIN_CONFIG.threatenedThreshold;
    case NpcGoal.RESEARCH_PUSH:
      return !ctx.researchBacklog;
    default:
      return false;
  }
}

/**
 * Humeur dérivée de la situation. Module ensuite les seuils d'agressivité et la
 * pondération d'utilité (voir MYCOSYNTH_BRAIN_CONFIG.moodCategoryModifier).
 */
export function deriveMood(input: {
  traits: NpcTraitVector;
  totalThreat: number;
  hasReadyGrudge: boolean;
  winDelta: number;
  combatReady: boolean;
}): NpcMood {
  const threatened = input.totalThreat >= MYCOSYNTH_BRAIN_CONFIG.threatenedThreshold;
  if (threatened) return input.hasReadyGrudge ? NpcMood.VENGEFUL : NpcMood.THREATENED;
  if (input.hasReadyGrudge) return NpcMood.VENGEFUL;
  if (input.combatReady && input.winDelta >= 2) return NpcMood.CONFIDENT;
  if (input.traits.ambition >= 0.7) return NpcMood.AMBITIOUS;
  return NpcMood.CALM;
}

/** Préférences d'archétype d'abord, puis le reste des buts pour exhaustivité. */
function orderedGoals(preferred: NpcGoal[]): NpcGoal[] {
  const rest = Object.values(NpcGoal).filter((goal) => !preferred.includes(goal));
  return [...preferred, ...rest];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
