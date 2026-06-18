'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { BuildingType } from '@arborisis/shared';
import { Countdown } from '@/components/Countdown';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ApiError } from '@/lib/api';
import { formatCost, formatDuration } from '@/lib/format';
import { keys, useCancelConstruction, usePlanetDetail, useUpgradeBuilding } from '@/lib/queries';
import { useState } from 'react';

export default function BuildingsPage() {
  const qc = useQueryClient();
  const { selectedId } = usePlanetSelection();
  const { data: planet, isLoading } = usePlanetDetail(selectedId);
  const upgrade = useUpgradeBuilding(selectedId ?? '');
  const cancel = useCancelConstruction(selectedId ?? '');
  const [error, setError] = useState<string>();

  if (isLoading || !planet) return <p className="text-canopy-100/50">Chargement…</p>;

  const busy = !!planet.constructionJob;

  function onBuild(type: BuildingType) {
    setError(undefined);
    upgrade.mutate(
      { planetId: planet!.id, type },
      { onError: (e) => setError(e instanceof ApiError ? e.message : 'Erreur') },
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-canopy-100">Structures organiques</h1>

      {planet.constructionJob && (
        <div className="card flex items-center justify-between border-canopy-500/40">
          <div>
            <p className="text-sm text-canopy-100/60">
              En croissance · niveau {planet.constructionJob.targetLevel}
            </p>
            <p className="font-mono text-canopy-300">
              <Countdown
                finishesAt={planet.constructionJob.finishesAt}
                onDone={() => qc.invalidateQueries({ queryKey: keys.planet(planet.id) })}
              />
            </p>
          </div>
          <button className="btn-ghost" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            Annuler
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {planet.buildings.map((b) => {
          const locked = b.unmet.length > 0;
          const canBuild = !busy && !locked && b.canAfford && !upgrade.isPending;
          return (
            <div key={b.type} className="card flex flex-col gap-3">
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium text-canopy-100">{b.name}</h3>
                  <span className="text-sm text-canopy-300">niv. {b.level}</span>
                </div>
                <p className="mt-1 text-xs text-canopy-100/50">{b.description}</p>
              </div>

              {b.currentProduction > 0 && (
                <p className="text-xs text-canopy-100/50">
                  Production actuelle : {b.currentProduction}/h
                </p>
              )}

              <div className="mt-auto space-y-1 text-xs text-canopy-100/60">
                <p>
                  <span className="text-canopy-100/40">Coût niv. {b.level + 1} :</span>{' '}
                  {formatCost(b.nextLevelCost)}
                </p>
                <p>
                  <span className="text-canopy-100/40">Durée :</span>{' '}
                  {formatDuration(b.nextLevelTimeSeconds)}
                </p>
                {locked && (
                  <p className="text-sap-400">
                    Requis : {b.unmet.map((u) => `${u.type} niv. ${u.requiredLevel}`).join(', ')}
                  </p>
                )}
              </div>

              <button className="btn-primary" onClick={() => onBuild(b.type)} disabled={!canBuild}>
                {busy
                  ? 'Occupé'
                  : locked
                    ? 'Verrouillé'
                    : b.canAfford
                      ? 'Faire croître'
                      : 'Ressources insuffisantes'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
