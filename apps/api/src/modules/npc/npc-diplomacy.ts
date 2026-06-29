import {
  DiplomaticStatus,
  MYCOSYNTH_BRAIN_CONFIG,
  NpcMood,
  type NpcTraitVector,
} from '@arborisis/shared';

/**
 * Décisions diplomatiques d'un bot MYCOSYNTH, en fonctions pures et
 * déterministes. Le service agrège l'état du monde (puissances d'alliance,
 * rancune mémorisée, statut courant) et passe ici des scalaires : aucune I/O,
 * tout est testable et équilibrable via `MYCOSYNTH_BRAIN_CONFIG.social`.
 *
 * Rappel d'architecture : la diplomatie du jeu est alliance↔alliance. Les
 * offres ne portent que sur NON_AGGRESSION_PACT et TRADE_ALLIANCE ; la guerre
 * se déclare en posant directement une relation WAR (pas via offre).
 */

export interface DiplomaticOfferDecisionInput {
  /** Statut proposé par l'offre reçue. */
  proposedStatus: DiplomaticStatus;
  /** Puissance combat agrégée de mon alliance. */
  myAlliancePower: number;
  /** Puissance combat agrégée de l'alliance proposante. */
  theirAlliancePower: number;
  traits: NpcTraitVector;
  mood: NpcMood;
  /** Rancune agrégée de ma mémoire envers les membres de l'alliance proposante. */
  grudgeToward: number;
}

export interface DiplomaticDecision {
  accept: boolean;
  reason: string;
}

/**
 * Répond à une offre reçue. Une rancune mûre fait toujours refuser (on garde
 * l'ennemi désigné). Sinon : un NAP est accepté d'autant plus volontiers qu'on
 * est prudent, menacé ou plus faible ; une alliance commerciale séduit les
 * cupides peu agressifs.
 */
export function decideOfferResponse(input: DiplomaticOfferDecisionInput): DiplomaticDecision {
  const cfg = MYCOSYNTH_BRAIN_CONFIG.social;

  if (input.grudgeToward >= cfg.warDeclareGrudgeThreshold) {
    return { accept: false, reason: 'standing_grudge' };
  }

  const powerRatio = input.theirAlliancePower / Math.max(1, input.myAlliancePower);

  if (input.proposedStatus === DiplomaticStatus.NON_AGGRESSION_PACT) {
    const inclination =
      input.traits.caution * 0.6 +
      (powerRatio - 1) * 0.5 +
      (input.mood === NpcMood.THREATENED ? 0.4 : 0) -
      input.traits.aggression * 0.4;
    const accept = inclination >= cfg.offerAcceptPowerMargin;
    return { accept, reason: accept ? 'nap_favorable' : 'nap_declined' };
  }

  if (input.proposedStatus === DiplomaticStatus.TRADE_ALLIANCE) {
    const inclination = input.traits.greed * 0.8 + (1 - input.traits.aggression) * 0.3;
    const accept = inclination >= cfg.tradeAllianceGreedThreshold;
    return { accept, reason: accept ? 'trade_favorable' : 'trade_declined' };
  }

  return { accept: false, reason: 'unsupported_status' };
}

/** Alliance tierce, pré-agrégée par le service, candidate à une action diplomatique. */
export interface AllianceCandidate {
  allianceId: string;
  /** Puissance combat agrégée de cette alliance. */
  power: number;
  /** Vraie si l'alliance est composée de bots (utile pour le ciblage et le ton). */
  isBotAlliance: boolean;
  /** Rancune agrégée de ma mémoire envers les membres de cette alliance. */
  grudgeToward: number;
  /** Statut diplomatique courant avec cette alliance, sinon null. */
  currentStatus: DiplomaticStatus | null;
}

export interface ProposeDiplomacyInput {
  myAlliancePower: number;
  traits: NpcTraitVector;
  mood: NpcMood;
  /** Menace cumulée mémorisée (somme des threats). */
  totalThreat: number;
  candidates: AllianceCandidate[];
}

export type DiplomacyIntent =
  | { kind: 'OFFER'; status: DiplomaticStatus; targetAllianceId: string; reason: string }
  | { kind: 'WAR'; targetAllianceId: string; reason: string };

/**
 * Choisit au plus UNE initiative diplomatique par révision, par priorité :
 *   1. Guerre formelle si rancune mûre + supériorité nette.
 *   2. Pacte de non-agression si menacé/prudent, vers une alliance forte et neutre.
 *   3. Alliance commerciale si cupide, vers un pair neutre compatible.
 */
export function proposeDiplomacy(input: ProposeDiplomacyInput): DiplomacyIntent | null {
  const cfg = MYCOSYNTH_BRAIN_CONFIG.social;

  // 1) Guerre : rancune mûre, supériorité nette, pas déjà en guerre, tempérament agressif.
  if (input.traits.aggression >= 0.4) {
    const warTarget = [...input.candidates]
      .filter(
        (c) =>
          c.currentStatus !== DiplomaticStatus.WAR &&
          c.grudgeToward >= cfg.warDeclareGrudgeThreshold &&
          input.myAlliancePower > c.power * (1 + cfg.offerAcceptPowerMargin),
      )
      .sort((a, b) => b.grudgeToward - a.grudgeToward)[0];
    if (warTarget) {
      return { kind: 'WAR', targetAllianceId: warTarget.allianceId, reason: 'grudge_war' };
    }
  }

  // 2) Pacte de non-agression : on cherche un protecteur fort et neutre.
  if (input.totalThreat >= cfg.napThreatThreshold || input.traits.caution >= 0.7) {
    const napTarget = [...input.candidates]
      .filter(
        (c) =>
          c.currentStatus == null &&
          c.grudgeToward < cfg.warDeclareGrudgeThreshold &&
          c.power >= input.myAlliancePower,
      )
      .sort((a, b) => b.power - a.power)[0];
    if (napTarget) {
      return {
        kind: 'OFFER',
        status: DiplomaticStatus.NON_AGGRESSION_PACT,
        targetAllianceId: napTarget.allianceId,
        reason: 'seek_protection',
      };
    }
  }

  // 3) Alliance commerciale : les cupides tissent des liens avec un pair neutre.
  if (input.traits.greed >= cfg.tradeAllianceGreedThreshold) {
    const tradeTarget = [...input.candidates]
      .filter((c) => c.currentStatus == null && c.grudgeToward < cfg.napThreatThreshold)
      .sort((a, b) => a.power - b.power)[0];
    if (tradeTarget) {
      return {
        kind: 'OFFER',
        status: DiplomaticStatus.TRADE_ALLIANCE,
        targetAllianceId: tradeTarget.allianceId,
        reason: 'commerce',
      };
    }
  }

  return null;
}
