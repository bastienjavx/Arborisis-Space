'use client';

import type { ResourceBundle } from '@arborisis/shared';

interface ResourceCostProps {
  cost: ResourceBundle;
  className?: string;
}

export function ResourceCost({ cost, className = '' }: ResourceCostProps) {
  return (
    <div className={`flex flex-wrap gap-2 text-xs text-canopy-100/70 ${className}`}>
      {Object.entries(cost).map(([resource, amount]) =>
        amount > 0 ? (
          <span key={resource} className="rounded-md bg-bark-950/50 px-2 py-1">
            {resource}: {amount}
          </span>
        ) : null,
      )}
    </div>
  );
}
