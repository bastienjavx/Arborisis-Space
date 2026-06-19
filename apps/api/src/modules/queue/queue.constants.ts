export const CONSTRUCTION_QUEUE = 'construction';
export const RESEARCH_QUEUE = 'research';
export const COLONIZATION_QUEUE = 'colonization';
export const SHIP_PRODUCTION_QUEUE = 'ship-production';
export const EXPEDITION_QUEUE = 'expedition';
export const PVE_QUEUE = 'pve';
export const PVP_QUEUE = 'pvp';
export const GAME_EVENT_QUEUE = 'game-events';
export const PROVISIONING_QUEUE = 'provisioning';

export const FINALIZE_JOB = 'finalize';
export const TRIGGER_EVENT_JOB = 'TRIGGER_EVENT';
export const PROVISION_UNIVERSE_JOB = 'provisioning.universe';
export const SPAWN_NPC_JOB = 'SPAWN_NPC_JOB';
export const TRANSFER_QUEUE = 'transfer';

/** Données portées par un job de file : l'identifiant du job métier à finaliser. */
export interface FinalizeJobData {
  jobId: string;
  universeId: string;
}
