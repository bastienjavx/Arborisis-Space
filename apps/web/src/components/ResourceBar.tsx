'use client';

import { useEffect, useRef, useState } from 'react';
import { RESOURCE_TYPES, ResourceType, type ResourceState } from '@arborisis/shared';
import { formatNumber, resourceLabel } from '@/lib/format';

/**
 * Barre de ressources avec accumulation fluide côté client (extrapolation de la
 * production), recalée à chaque rafraîchissement serveur — qui reste l'autorité.
 */
export function ResourceBar({ resources }: { resources: ResourceState }) {
  const base = useRef({ amounts: resources.amounts, at: Date.now() });
  const [display, setDisplay] = useState(resources.amounts);

  useEffect(() => {
    base.current = { amounts: resources.amounts, at: Date.now() };
    setDisplay(resources.amounts);
  }, [resources]);

  useEffect(() => {
    const id = setInterval(() => {
      const hours = (Date.now() - base.current.at) / 3_600_000;
      const next = {} as Record<ResourceType, number>;
      for (const r of RESOURCE_TYPES) {
        const projected = base.current.amounts[r] + resources.perHour[r] * hours;
        next[r] = Math.min(resources.capacity[r], projected);
      }
      setDisplay(next);
    }, 1000);
    return () => clearInterval(id);
  }, [resources]);

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {RESOURCE_TYPES.map((r) => {
        const full = display[r] >= resources.capacity[r];
        return (
          <div key={r} className="card flex min-w-[8.5rem] flex-col px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-canopy-100/50">
              {resourceLabel(r)}
            </span>
            <span className={full ? 'font-semibold text-sap-400' : 'font-semibold'}>
              {formatNumber(display[r])}
            </span>
            <span className="text-[11px] text-canopy-100/40">
              +{formatNumber(resources.perHour[r])}/h
            </span>
          </div>
        );
      })}
      <div className="card flex min-w-[8.5rem] flex-col px-3 py-2">
        <span className="text-xs uppercase tracking-wide text-canopy-100/50">Photosynthèse</span>
        <span
          className={
            resources.energyRatio < 1 ? 'font-semibold text-red-400' : 'font-semibold text-canopy-300'
          }
        >
          {formatNumber(resources.energyProduced - resources.energyConsumed)}
        </span>
        <span className="text-[11px] text-canopy-100/40">
          {formatNumber(resources.energyProduced)} / {formatNumber(resources.energyConsumed)}
        </span>
      </div>
      <div className="card flex min-w-[8.5rem] flex-col px-3 py-2">
        <span className="text-xs uppercase tracking-wide text-canopy-100/50">Stabilité</span>
        <span className="font-semibold text-spore-400">{Math.round(resources.stability)}%</span>
      </div>
    </div>
  );
}
