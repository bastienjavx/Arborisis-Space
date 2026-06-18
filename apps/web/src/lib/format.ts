import type { ResourceBundle } from '@arborisis/shared';
import { RESOURCE_TYPES, ResourceType } from '@arborisis/shared';

const RESOURCE_LABELS: Record<ResourceType, string> = {
  [ResourceType.BIOMASS]: 'Biomasse',
  [ResourceType.SAP]: 'Sève',
  [ResourceType.MINERALS]: 'Minéraux',
  [ResourceType.SPORES]: 'Spores',
};

export function resourceLabel(r: ResourceType): string {
  return RESOURCE_LABELS[r];
}

export function formatNumber(n: number): string {
  return Math.floor(n).toLocaleString('fr-FR');
}

/** Liste lisible d'un coût, ex: « 60 Biomasse · 15 Minéraux ». */
export function formatCost(cost: ResourceBundle): string {
  const parts = RESOURCE_TYPES.filter((r) => (cost[r] ?? 0) > 0).map(
    (r) => `${formatNumber(cost[r] ?? 0)} ${RESOURCE_LABELS[r]}`,
  );
  return parts.length ? parts.join(' · ') : 'Gratuit';
}

/** Formate une durée en secondes → « 1j 02:03:04 ». */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return days > 0 ? `${days}j ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

export function secondsUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 1000;
}
