'use client';

import { useState } from 'react';
import { GALAXY_COUNT, SYSTEMS_PER_GALAXY, type GalaxySlot } from '@arborisis/shared';
import { usePlanetSelection } from '@/components/PlanetContext';
import { Countdown } from '@/components/Countdown';
import { ApiError } from '@/lib/api';
import { useColonizations, useColonize, useGalaxy } from '@/lib/queries';

export default function GalaxyPage() {
  const { selectedId } = usePlanetSelection();
  const [galaxy, setGalaxy] = useState(1);
  const [system, setSystem] = useState(1);
  const { data, isLoading } = useGalaxy(galaxy, system);
  const { data: inbound } = useColonizations();
  const colonize = useColonize();
  const [error, setError] = useState<string>();

  function step(delta: number) {
    setSystem((s) => Math.min(SYSTEMS_PER_GALAXY, Math.max(1, s + delta)));
  }

  function onColonize(slot: GalaxySlot) {
    if (!selectedId) return;
    setError(undefined);
    colonize.mutate(
      { sourcePlanetId: selectedId, target: slot.coordinates },
      { onError: (e) => setError(e instanceof ApiError ? e.message : 'Erreur') },
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-canopy-100">Galaxie vivante</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Galaxie</label>
          <select
            className="input"
            value={galaxy}
            onChange={(e) => setGalaxy(Number(e.target.value))}
          >
            {Array.from({ length: GALAXY_COUNT }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="label">Système</label>
            <input
              type="number"
              min={1}
              max={SYSTEMS_PER_GALAXY}
              className="input w-24"
              value={system}
              onChange={(e) =>
                setSystem(Math.min(SYSTEMS_PER_GALAXY, Math.max(1, Number(e.target.value))))
              }
            />
          </div>
          <button className="btn-ghost" onClick={() => step(-1)}>
            ◀
          </button>
          <button className="btn-ghost" onClick={() => step(1)}>
            ▶
          </button>
        </div>
      </div>

      {inbound && inbound.length > 0 && (
        <div className="card border-spore-500/40">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-canopy-100/60">
            Essaimages en route
          </h2>
          <ul className="space-y-1 text-sm">
            {inbound.map((j) => (
              <li key={j.id} className="flex justify-between">
                <span className="text-canopy-100/70">Essaimage #{j.id.slice(0, 8)}</span>
                <span className="font-mono text-spore-400">
                  <Countdown finishesAt={j.finishesAt} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {isLoading || !data ? (
        <p className="text-canopy-100/50">Sondage du système…</p>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-bark-850 text-left text-xs uppercase tracking-wide text-canopy-100/40">
              <tr>
                <th className="px-4 py-2">Pos.</th>
                <th className="px-4 py-2">Monde</th>
                <th className="px-4 py-2">Propriétaire</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.slots.map((slot) => (
                <tr key={slot.coordinates.position} className="border-t border-canopy-700/10">
                  <td className="px-4 py-2 text-canopy-100/50">{slot.coordinates.position}</td>
                  <td className="px-4 py-2">
                    {slot.occupied ? (
                      <span className={slot.isOwn ? 'text-canopy-300' : 'text-canopy-100/80'}>
                        {slot.planetName}
                      </span>
                    ) : (
                      <span className="text-canopy-100/30">— vide —</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-canopy-100/60">{slot.ownerName ?? ''}</td>
                  <td className="px-4 py-2 text-right">
                    {!slot.occupied && (
                      <button
                        className="btn-ghost px-3 py-1"
                        onClick={() => onColonize(slot)}
                        disabled={colonize.isPending || !selectedId}
                      >
                        Essaimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
