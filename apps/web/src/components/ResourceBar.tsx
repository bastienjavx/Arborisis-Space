'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RESOURCE_TYPES, ResourceType, type ResourceState } from '@arborisis/shared';
import { FiShield, FiZap } from 'react-icons/fi';
import { formatNumber, resourceLabel } from '@/lib/format';
import { RESOURCE_VISUALS } from '@/lib/resourceVisuals';
import { codexId } from '@/lib/codex';
import { AnimatedCounter } from './AnimatedCounter';
import { WikiPopover } from './WikiPopover';

/**
 * Barre de ressources avec accumulation fluide côté client (extrapolation de la
 * production), recalée à chaque rafraîchissement serveur — qui reste l'autorité.
 */
export function ResourceBar({
  resources,
  compact = false,
  className = '',
}: {
  resources: ResourceState;
  compact?: boolean;
  className?: string;
}) {
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
    <div
      className={`${compact ? 'grid grid-cols-6 gap-0 overflow-visible' : 'flex gap-2 overflow-x-auto sm:grid sm:grid-cols-3 sm:overflow-visible'} text-sm ${className}`}
    >
      {RESOURCE_TYPES.map((r) => {
        const full = display[r] >= resources.capacity[r];
        const ResourceIcon = RESOURCE_VISUALS[r].Icon;
        return (
          <motion.div
            key={r}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * RESOURCE_TYPES.indexOf(r) }}
            className={`relative min-w-[9.5rem] overflow-hidden border-canopy-700/15 bg-bark-900/45 backdrop-blur-xl sm:min-w-0 ${compact ? 'border-r px-4 py-2 last:border-r-0' : 'rounded-xl border px-3.5 py-3'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-canopy-100/38">
                  <WikiPopover entryId={codexId.resource(r)} underline={false}>
                    {resourceLabel(r)}
                  </WikiPopover>
                </span>
                <span
                  className={full ? 'font-semibold text-sap-400' : 'font-semibold text-canopy-50'}
                >
                  <AnimatedCounter value={Math.floor(display[r])} duration={1} />
                </span>
              </div>
              <ResourceIcon
                className={`h-4 w-4 shrink-0 ${RESOURCE_VISUALS[r].className}`}
                aria-hidden="true"
              />
            </div>
            <span className={`${compact ? 'mt-0.5' : 'mt-1'} text-[10px] text-canopy-100/35`}>
              +{formatNumber(resources.perHour[r])}/h · cap. {formatNumber(resources.capacity[r])}
            </span>
          </motion.div>
        );
      })}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`min-w-[9.5rem] border-canopy-700/15 bg-bark-900/45 backdrop-blur-xl sm:min-w-0 ${compact ? 'border-r px-4 py-2' : 'rounded-xl border px-3.5 py-3'}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-canopy-100/38">
              Photosynthèse
            </span>
            <span
              className={
                resources.energyRatio < 1
                  ? 'font-semibold text-red-400'
                  : 'font-semibold text-canopy-300'
              }
            >
              {formatNumber(resources.energyProduced - resources.energyConsumed)}
            </span>
          </div>
          <FiZap className="h-4 w-4 text-sap-400/65" aria-hidden="true" />
        </div>
        <span className="mt-1 text-[10px] text-canopy-100/35">
          {formatNumber(resources.energyProduced)} / {formatNumber(resources.energyConsumed)}
          {resources.energyRatio < 1 && (
            <Link href="/production" className="ml-2 text-red-300 underline underline-offset-2">
              Régler
            </Link>
          )}
        </span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`min-w-[9.5rem] bg-bark-900/45 backdrop-blur-xl sm:min-w-0 ${compact ? 'px-4 py-2' : 'rounded-xl border border-canopy-700/15 px-3.5 py-3'}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-canopy-100/38">
              Stabilité
            </span>
            <span className="font-semibold text-spore-400">{Math.round(resources.stability)}%</span>
          </div>
          <FiShield className="h-4 w-4 text-spore-400/65" aria-hidden="true" />
        </div>
        <span className="mt-1 text-[10px] text-canopy-100/35">Équilibre planétaire</span>
      </motion.div>
    </div>
  );
}
