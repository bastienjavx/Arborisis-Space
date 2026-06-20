/** Réglages anti-triche centralisés (hors équilibrage gameplay). */

/** Catégories d'anomalies (valeurs internes, jamais exposées au client). */
export const AntiCheatEventType = {
  /** Solde de ressources négatif persistant (devrait être impossible). */
  NEGATIVE_BALANCE: 'NEGATIVE_BALANCE',
  /** Niveau de recherche/bâtiment au-delà du maximum configuré. */
  IMPOSSIBLE_LEVEL: 'IMPOSSIBLE_LEVEL',
  /** Plusieurs comptes partagent la même empreinte IP. */
  SHARED_IP: 'SHARED_IP',
} as const;
export type AntiCheatEventType = (typeof AntiCheatEventType)[keyof typeof AntiCheatEventType];

export type AntiCheatSeverity = 'INFO' | 'WARN' | 'CRITICAL';

/** Nombre de comptes distincts sur une même IP avant signalement. */
export const SHARED_IP_THRESHOLD = 3;

/** Fenêtre de déduplication des accès (un upsert max par couple user/IP). */
export const ACCESS_DEDUP_TTL_MS = 10 * 60 * 1_000;

/** Cadence du balayage d'intégrité (vérification des invariants stockés). */
export const SWEEP_INTERVAL_MS = 30 * 60 * 1_000;
/** Délai avant le premier balayage après le démarrage. */
export const SWEEP_BOOT_DELAY_MS = 20 * 1_000;
/** Nombre maximal de lignes remontées par requête de balayage. */
export const SWEEP_BATCH_LIMIT = 200;
