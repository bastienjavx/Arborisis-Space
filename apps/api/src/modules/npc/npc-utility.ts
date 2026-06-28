import {
  MYCOSYNTH_BRAIN_CONFIG,
  NpcActionCategory,
  NpcArchetype,
  NpcGoal,
  NpcMood,
  type NpcTraitVector,
} from '@arborisis/shared';
import { archetypeProfile } from './npc-personality';

/**
 * Moteur d'utilité : pondère le score brut d'une action candidate par la
 * personnalité du bot, son but courant et son humeur. C'est le point unique qui
 * transforme un planificateur glouton uniforme en 50 agents aux comportements
 * distincts.
 *
 *   utilité = scoreBrut × poidsArchétype × boostBut × modulateurHumeur
 */

export interface UtilityInput {
  baseScore: number;
  category: NpcActionCategory;
  archetype: NpcArchetype;
  goal: NpcGoal | null;
  mood: NpcMood;
}

export function actionUtility(input: UtilityInput): number {
  const weights = archetypeProfile(input.archetype).categoryWeights;
  const archetypeWeight = weights[input.category] ?? 1;
  const goalBoost = goalCategoryBoost(input.goal, input.category);
  const moodModifier = moodCategoryModifier(input.mood, input.category);
  return input.baseScore * archetypeWeight * goalBoost * moodModifier;
}

export function goalCategoryBoost(goal: NpcGoal | null, category: NpcActionCategory): number {
  if (!goal) return 1;
  return MYCOSYNTH_BRAIN_CONFIG.goalCategoryBoost[goal]?.[category] ?? 1;
}

export function moodCategoryModifier(mood: NpcMood, category: NpcActionCategory): number {
  return MYCOSYNTH_BRAIN_CONFIG.moodCategoryModifier[mood]?.[category] ?? 1;
}

/**
 * Seuil effectif de ratio de puissance requis avant d'attaquer. Les bots
 * prudents exigent une marge plus large, les agressifs frappent plus tôt, et un
 * bot vengeur prend davantage de risques contre la cible de sa rancune. Le
 * résultat est borné pour éviter les attaques suicides.
 */
export function effectiveAttackRatio(
  baseRatio: number,
  traits: NpcTraitVector,
  mood: NpcMood,
  isGrudgeTarget: boolean,
): number {
  const cfg = MYCOSYNTH_BRAIN_CONFIG;
  let ratio =
    baseRatio *
    (1 +
      traits.caution * cfg.cautionAttackRatioPenalty -
      traits.aggression * cfg.aggressionAttackRatioRelief);
  if (mood === NpcMood.VENGEFUL && isGrudgeTarget) {
    ratio -= baseRatio * cfg.vengeanceAttackRatioRelief;
  }
  const floor = baseRatio * 0.7;
  const ceiling = baseRatio * 1.6;
  return Math.max(floor, Math.min(ceiling, ratio));
}
