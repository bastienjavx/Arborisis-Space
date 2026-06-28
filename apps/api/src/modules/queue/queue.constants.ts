export const CONSTRUCTION_QUEUE = 'construction';
export const RESEARCH_QUEUE = 'research';
export const COLONIZATION_QUEUE = 'colonization';
export const SHIP_PRODUCTION_QUEUE = 'ship-production';
export const EXPEDITION_QUEUE = 'expedition';
export const PVE_QUEUE = 'pve';
export const PVP_QUEUE = 'pvp';
export const GAME_EVENT_QUEUE = 'game-events';
export const PROVISIONING_QUEUE = 'provisioning';
export const CRAFTING_QUEUE = 'crafting';
export const PRODUCTION_LINE_QUEUE = 'production-lines';
export const TRADE_ROUTE_QUEUE = 'trade-routes';
export const MARKET_EXPIRY_QUEUE = 'market-expiry';

export const FINALIZE_JOB = 'finalize';
export const TRIGGER_EVENT_JOB = 'TRIGGER_EVENT';
export const PROVISION_UNIVERSE_JOB = 'provisioning.universe';
export const RECONCILE_UNIVERSES_JOB = 'provisioning.reconcile';
export const SPAWN_NPC_JOB = 'SPAWN_NPC_JOB';
export const TRANSFER_QUEUE = 'transfer';
export const NOTIFICATIONS_QUEUE = 'notifications';
export const RUN_PRODUCTION_LINE_JOB = 'run-production-line';
export const RUN_TRADE_ROUTE_JOB = 'run-trade-route';
export const EXPIRE_MARKET_ORDER_JOB = 'expire-market-order';
export const SEND_NOTIFICATION_JOB = 'send-notification';

export const NPC_QUEUE = 'npc';
export const MYCOSYNTH_TICK_JOB = 'mycosynth-tick';
export const MYCOSYNTH_TICK_INTERVAL_MS = 5 * 60 * 1_000;

/** Données portées par un job de file : l'identifiant du job métier à finaliser. */
export interface FinalizeJobData {
  jobId: string;
  universeId: string;
}
