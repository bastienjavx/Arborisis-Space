import { NpcArchetype } from '@arborisis/shared';
import { hashString } from './npc-personality';

/**
 * Génération de répliques de chat pour les bots MYCOSYNTH : templates persona
 * déterministes (aucun appel LLM). Le choix de variante est dérivé d'une graine
 * stable (hash), de sorte qu'un même évènement produit une ligne reproductible
 * mais que la population varie. Thème organique/mycélien, en français.
 */

export enum NpcChatEvent {
  /** Déclaration de guerre formelle contre une alliance/un joueur. */
  WAR_DECLARED = 'WAR_DECLARED',
  /** Raillerie après le lancement d'un raid. */
  RAID_TAUNT = 'RAID_TAUNT',
  /** Vantardise après une victoire. */
  VICTORY = 'VICTORY',
  /** Appel au recrutement / cohésion d'alliance. */
  RECRUIT = 'RECRUIT',
  /** Acceptation d'une offre diplomatique. */
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  /** Rejet d'une offre diplomatique. */
  OFFER_REJECTED = 'OFFER_REJECTED',
  /** Avertissement lancé sous la menace. */
  THREATENED_WARNING = 'THREATENED_WARNING',
}

export interface ChatVars {
  /** Nom de la cible (joueur ou alliance) si pertinent. */
  target?: string;
  /** Nom de l'alliance concernée si pertinent. */
  alliance?: string;
}

/** Répliques génériques par évènement (repli quand l'archétype n'a pas de variante). */
const GENERIC: Record<NpcChatEvent, string[]> = {
  [NpcChatEvent.WAR_DECLARED]: [
    'Le mycélium a tranché : guerre ouverte à {target}.',
    'Que les spores se durcissent. {target} est désormais notre ennemi.',
    'Nos hyphes se rétractent de {target}. Place aux toxines.',
  ],
  [NpcChatEvent.RAID_TAUNT]: [
    'Vos défenses sentent déjà la pourriture, {target}.',
    'Nos drones essaiment vers {target}. Récoltez ce que vous avez semé.',
    'Une colonie mûre ne se garde pas seule, {target}.',
  ],
  [NpcChatEvent.VICTORY]: [
    'La biomasse de {target} nourrit nos racines. Merci.',
    'Encore une colonie absorbée. Le réseau croît.',
    'Victoire digérée. À qui le tour ?',
  ],
  [NpcChatEvent.RECRUIT]: [
    "Le réseau {alliance} s'étend. Joignez vos spores aux nôtres.",
    'Une hyphe isolée meurt ; un réseau prospère. {alliance} recrute.',
    'Force du nombre, force du mycélium. {alliance} accueille les siens.',
  ],
  [NpcChatEvent.OFFER_ACCEPTED]: [
    'Nos hyphes se mêlent aux vôtres. Pacte scellé, {target}.',
    'Symbiose acceptée. Que la sève circule, {target}.',
    'Accord conclu. Vos frontières sont les nôtres désormais, {target}.',
  ],
  [NpcChatEvent.OFFER_REJECTED]: [
    'Vos spores ne nous inspirent pas confiance, {target}.',
    'Le mycélium refuse cette greffe. Non, {target}.',
    'Pas de symbiose avec vous, {target}. Pas encore.',
  ],
  [NpcChatEvent.THREATENED_WARNING]: [
    'Approchez nos colonies et vous goûterez nos toxines.',
    'Le réseau veille. Une attaque appellera dix réponses.',
    "Nos racines sont plus profondes qu'elles ne paraissent. Prudence.",
  ],
};

/** Variantes propres à un archétype, qui priment sur le générique. */
const BY_ARCHETYPE: Partial<Record<NpcArchetype, Partial<Record<NpcChatEvent, string[]>>>> = {
  [NpcArchetype.RAIDER]: {
    [NpcChatEvent.WAR_DECLARED]: [
      '{target}, vos colonies sont déjà du compost. Guerre.',
      "On ne négocie pas avec une proie. {target}, c'est la guerre.",
    ],
    [NpcChatEvent.RAID_TAUNT]: [
      'Trop lent, {target}. Nos acides sont déjà sur vous.',
      'Je sens votre biomasse d’ici, {target}. On vient se servir.',
    ],
    [NpcChatEvent.THREATENED_WARNING]: ['Menacez-nous, et nous viendrons festoyer en premier.'],
  },
  [NpcArchetype.ECONOMIST]: {
    [NpcChatEvent.OFFER_ACCEPTED]: [
      'Le commerce profite à nos deux réseaux, {target}. Affaire conclue.',
      'Nos sèves circuleront ensemble, {target}. Excellente affaire.',
    ],
    [NpcChatEvent.RECRUIT]: ['Routes commerciales ouvertes : {alliance} enrichit ses membres.'],
  },
  [NpcArchetype.TURTLE]: {
    [NpcChatEvent.THREATENED_WARNING]: [
      'Nos carapaces de chitine n’ont jamais cédé. Tournez les talons.',
      'Patient et blindé. Brisez-vous donc sur nos remparts.',
    ],
    [NpcChatEvent.OFFER_ACCEPTED]: ['La paix nourrit mieux que la guerre, {target}. Accordé.'],
  },
  [NpcArchetype.EXPANSIONIST]: {
    [NpcChatEvent.VICTORY]: ['Une frontière de plus pour le réseau. {target} était sur le chemin.'],
  },
};

/** Choisit et interpole une réplique stable pour `(event, archetype, seed)`. */
export function composeLine(
  event: NpcChatEvent,
  archetype: NpcArchetype,
  vars: ChatVars,
  seed: string,
): string {
  const overrides = BY_ARCHETYPE[archetype]?.[event];
  const pool = overrides && overrides.length > 0 ? overrides : GENERIC[event];
  const index = hashString(`${seed}:${archetype}:${event}`) % pool.length;
  return interpolate(pool[index]!, vars);
}

function interpolate(template: string, vars: ChatVars): string {
  return template
    .replace(/\{target\}/g, vars.target ?? 'cette colonie')
    .replace(/\{alliance\}/g, vars.alliance ?? 'le réseau');
}
