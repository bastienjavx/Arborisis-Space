'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RESEARCHES, type ResearchType } from '@arborisis/shared';
import { Countdown } from '@/components/Countdown';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ApiError } from '@/lib/api';
import { formatCost, formatDuration } from '@/lib/format';
import { keys, useResearch, useStartResearch } from '@/lib/queries';

export default function ResearchPage() {
  const qc = useQueryClient();
  const { selectedId } = usePlanetSelection();
  const { data, isLoading } = useResearch(selectedId);
  const start = useStartResearch(selectedId ?? '');
  const [error, setError] = useState<string>();

  if (isLoading || !data) return <p className="text-canopy-100/50">Chargement…</p>;

  const busy = !!data.activeJob;

  function onStart(type: ResearchType) {
    setError(undefined);
    start.mutate(
      { planetId: selectedId!, type },
      { onError: (e) => setError(e instanceof ApiError ? e.message : 'Erreur') },
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-canopy-100">Mycélium de recherche</h1>
      <p className="text-sm text-canopy-100/50">
        Les recherches profitent à tout l’empire. Les ressources sont prélevées sur la planète active.
      </p>

      {data.activeJob && (
        <div className="card flex items-center justify-between border-spore-500/40">
          <div>
            <p className="text-sm text-canopy-100/60">
              {RESEARCHES[data.activeJob.targetType as ResearchType]?.name} → niveau{' '}
              {data.activeJob.targetLevel}
            </p>
            <p className="font-mono text-spore-400">
              <Countdown
                finishesAt={data.activeJob.finishesAt}
                onDone={() => qc.invalidateQueries({ queryKey: keys.research(selectedId!) })}
              />
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.researches.map((r) => {
          const locked = r.unmet.length > 0;
          const canStart = !busy && !locked && r.canAfford && !start.isPending;
          return (
            <div key={r.type} className="card flex flex-col gap-3">
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium text-canopy-100">{r.name}</h3>
                  <span className="text-sm text-spore-400">niv. {r.level}</span>
                </div>
                <p className="mt-1 text-xs text-canopy-100/50">{r.description}</p>
              </div>

              <div className="mt-auto space-y-1 text-xs text-canopy-100/60">
                <p>
                  <span className="text-canopy-100/40">Coût niv. {r.level + 1} :</span>{' '}
                  {formatCost(r.nextLevelCost)}
                </p>
                <p>
                  <span className="text-canopy-100/40">Durée :</span>{' '}
                  {formatDuration(r.nextLevelTimeSeconds)}
                </p>
                {locked && (
                  <p className="text-sap-400">
                    Requis : {r.unmet.map((u) => `${u.type} niv. ${u.requiredLevel}`).join(', ')}
                  </p>
                )}
              </div>

              <button className="btn-primary" onClick={() => onStart(r.type)} disabled={!canStart}>
                {busy ? 'Occupé' : locked ? 'Verrouillé' : r.canAfford ? 'Étudier' : 'Ressources insuffisantes'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
