'use client';

import { useMemo, useState } from 'react';
import {
  GALAXY_COUNT,
  SHIPS,
  ShipType,
  SYSTEMS_PER_GALAXY,
  type ShipCounts,
} from '@arborisis/shared';
import { Countdown } from '@/components/Countdown';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ResourceBar } from '@/components/ResourceBar';
import { ApiError } from '@/lib/api';
import { formatCost, formatDuration } from '@/lib/format';
import {
  useExpeditions,
  useFleet,
  usePlanetDetail,
  useProduceShips,
  useStartExpedition,
} from '@/lib/queries';

export default function FleetsPage() {
  const { selectedId } = usePlanetSelection();
  const { data: fleet, isLoading } = useFleet(selectedId);
  const { data: planet } = usePlanetDetail(selectedId);
  const { data: missions } = useExpeditions();
  const produce = useProduceShips(selectedId ?? '');
  const launch = useStartExpedition(selectedId ?? '');
  const [quantities, setQuantities] = useState<Record<ShipType, number>>({
    [ShipType.SPORAL_SCOUT]: 1,
    [ShipType.SYMBIOTIC_HARVESTER]: 1,
  });
  const [ships, setShips] = useState<ShipCounts>({
    [ShipType.SPORAL_SCOUT]: 1,
    [ShipType.SYMBIOTIC_HARVESTER]: 0,
  });
  const [galaxy, setGalaxy] = useState(1);
  const [system, setSystem] = useState(1);
  const [error, setError] = useState<string>();
  const active = useMemo(
    () => missions?.find((mission) => mission.planetId === selectedId),
    [missions, selectedId],
  );

  if (isLoading || !fleet || !planet)
    return <p className="text-canopy-100/50">Croissance du hangar…</p>;

  function message(reason: unknown) {
    setError(reason instanceof ApiError ? reason.message : 'Une erreur est survenue.');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-canopy-100">Flottes organiques</h1>
        <p className="text-sm text-canopy-100/50">
          Faites éclore des bio-vaisseaux puis sondez les systèmes inconnus.
        </p>
      </div>
      <ResourceBar resources={planet.resources} />
      {error && <p className="text-sm text-red-400">{error}</p>}

      {fleet.productionJob && (
        <section className="card flex items-center justify-between border-canopy-500/40">
          <div>
            <p className="text-sm text-canopy-100/60">Production en cours</p>
            <p>
              {fleet.productionJob.quantity} × {SHIPS[fleet.productionJob.shipType].name}
            </p>
          </div>
          <span className="font-mono text-canopy-300">
            <Countdown finishesAt={fleet.productionJob.finishesAt} />
          </span>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-canopy-100/60">
          Berceau orbital
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {fleet.ships.map((ship) => (
            <article key={ship.type} className="card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-canopy-100">{ship.name}</h3>
                  <p className="mt-1 text-xs text-canopy-100/50">{ship.description}</p>
                </div>
                <span className="whitespace-nowrap text-canopy-300">{ship.available} dispo.</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-canopy-100/60">
                <span>Cargaison : {ship.cargo}</span>
                <span>Vitesse : {ship.speed}</span>
                <span className="col-span-2">Coût : {formatCost(ship.cost)}</span>
                <span className="col-span-2">
                  Durée/unité : {formatDuration(ship.productionTimeSeconds)}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  className="input w-24"
                  type="number"
                  min={1}
                  max={100}
                  value={quantities[ship.type]}
                  onChange={(event) =>
                    setQuantities((value) => ({
                      ...value,
                      [ship.type]: Math.max(1, Number(event.target.value)),
                    }))
                  }
                  aria-label={`Quantité de ${ship.name}`}
                />
                <button
                  className="btn-primary flex-1"
                  disabled={!ship.unlocked || !!fleet.productionJob || produce.isPending}
                  onClick={() => {
                    setError(undefined);
                    produce.mutate(
                      { planetId: planet.id, type: ship.type, quantity: quantities[ship.type] },
                      { onError: message },
                    );
                  }}
                >
                  {!ship.unlocked
                    ? `Berceau niv. ${ship.requiredNurseryLevel} requis`
                    : 'Faire éclore'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-medium text-canopy-100">Expédition</h2>
          <p className="text-xs text-canopy-100/50">
            Une seule mission peut partir de cette planète à la fois.
          </p>
        </div>
        {active ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-canopy-100/70">
                Cible {active.target.galaxy}:{active.target.system} ·{' '}
                {active.phase === 'OUTBOUND' ? 'Trajet aller' : 'Retour'}
              </p>
              <p className="text-xs text-canopy-100/40">
                {active.ships[ShipType.SPORAL_SCOUT]} éclaireur(s) ·{' '}
                {active.ships[ShipType.SYMBIOTIC_HARVESTER]} moissonneur(s)
              </p>
            </div>
            <span className="font-mono text-spore-400">
              <Countdown
                finishesAt={active.phase === 'OUTBOUND' ? active.arrivesAt : active.returnsAt}
              />
            </span>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label>
                <span className="label">Galaxie</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={GALAXY_COUNT}
                  value={galaxy}
                  onChange={(e) => setGalaxy(Number(e.target.value))}
                />
              </label>
              <label>
                <span className="label">Système</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={SYSTEMS_PER_GALAXY}
                  value={system}
                  onChange={(e) => setSystem(Number(e.target.value))}
                />
              </label>
              {fleet.ships.map((ship) => (
                <label key={ship.type}>
                  <span className="label">
                    {ship.name} (max. {ship.available})
                  </span>
                  <input
                    className="input"
                    type="number"
                    min={ship.type === ShipType.SPORAL_SCOUT ? 1 : 0}
                    max={ship.available}
                    value={ships[ship.type]}
                    onChange={(e) =>
                      setShips((value) => ({
                        ...value,
                        [ship.type]: Math.max(0, Number(e.target.value)),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <button
              className="btn-primary"
              disabled={launch.isPending || ships[ShipType.SPORAL_SCOUT] < 1}
              onClick={() => {
                setError(undefined);
                launch.mutate(
                  { planetId: planet.id, target: { galaxy, system }, ships },
                  { onError: message },
                );
              }}
            >
              Lancer l’expédition
            </button>
          </>
        )}
      </section>
    </div>
  );
}
