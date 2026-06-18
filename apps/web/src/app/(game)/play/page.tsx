'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BUILDINGS, type BuildingType } from '@arborisis/shared';
import { Countdown } from '@/components/Countdown';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ResourceBar } from '@/components/ResourceBar';
import { keys, usePlanetDetail } from '@/lib/queries';

export default function PlayPage() {
  const qc = useQueryClient();
  const { selectedId } = usePlanetSelection();
  const { data: planet, isLoading } = usePlanetDetail(selectedId);

  if (isLoading || !planet) {
    return <p className="text-canopy-100/50">Chargement de la planète…</p>;
  }

  const topBuildings = [...planet.buildings]
    .filter((b) => b.level > 0)
    .sort((a, b) => b.level - a.level)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-canopy-100">{planet.name}</h1>
        <p className="text-sm text-canopy-100/50">
          {planet.isHomeworld ? 'Noyau-Monde' : 'Colonie'} · {planet.coordinates.galaxy}:
          {planet.coordinates.system}:{planet.coordinates.position} · Emplacements{' '}
          {planet.usedFields}/{planet.maxFields}
        </p>
      </div>

      <ResourceBar resources={planet.resources} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-canopy-100/60">
            Construction en cours
          </h2>
          {planet.constructionJob ? (
            <div className="flex items-center justify-between">
              <span>
                {BUILDINGS[planet.constructionJob.targetType as BuildingType]?.name} → niveau{' '}
                {planet.constructionJob.targetLevel}
              </span>
              <span className="font-mono text-canopy-300">
                <Countdown
                  finishesAt={planet.constructionJob.finishesAt}
                  onDone={() => qc.invalidateQueries({ queryKey: keys.planet(planet.id) })}
                />
              </span>
            </div>
          ) : (
            <p className="text-sm text-canopy-100/40">Aucune structure en croissance.</p>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-canopy-100/60">
            Structures notables
          </h2>
          {topBuildings.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {topBuildings.map((b) => (
                <li key={b.type} className="flex justify-between">
                  <span className="text-canopy-100/80">{b.name}</span>
                  <span className="text-canopy-300">niv. {b.level}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-canopy-100/40">
              Votre monde est vierge. Faites pousser vos premières structures.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
