'use client';

import { useMemo, useState } from 'react';
import {
  fleetCargoCapacity,
  GALAXY_COUNT,
  RESOURCE_TYPES,
  SHIPS,
  ShipType,
  SHIP_TYPES,
  SYSTEMS_PER_GALAXY,
  TRANSPORT_SHIP_TYPES,
  type ExpeditionShipType,
  type ResourceType,
  type ShipCounts,
} from '@arborisis/shared';
import { FleetView } from '@/components/three';
import { PageHeader } from '@/components/PageHeader';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { AnimatedButton } from '@/components/AnimatedButton';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ResourceBar } from '@/components/ResourceBar';
import { ResourceCost } from '@/components/ResourceCost';
import { QuantityControl } from '@/components/QuantityControl';
import { WikiPopover } from '@/components/WikiPopover';
import { codexId } from '@/lib/codex';
import { ApiError } from '@/lib/api';
import { formatDuration, formatNumber } from '@/lib/format';
import {
  useExpeditions,
  useFleet,
  useLaunchTransfer,
  usePlanetDetail,
  usePlanets,
  useProduceShips,
  useStartExpedition,
  useTransfers,
} from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiLock, FiNavigation, FiSend, FiTruck } from 'react-icons/fi';

export default function FleetsPage() {
  const { selectedId } = usePlanetSelection();
  const { data: fleet, isLoading } = useFleet(selectedId);
  const { data: planet } = usePlanetDetail(selectedId);
  const { data: planets } = usePlanets();
  const { data: missions } = useExpeditions();
  const { data: transfers } = useTransfers();
  const produce = useProduceShips(selectedId ?? '');
  const launch = useStartExpedition(selectedId ?? '');
  const launchTransfer = useLaunchTransfer();
  const [quantities, setQuantities] = useState<Record<ShipType, number>>(
    Object.fromEntries(SHIP_TYPES.map((type) => [type, 1])) as Record<ShipType, number>,
  );
  const EXPEDITION_SHIP_TYPES: ExpeditionShipType[] = [
    ShipType.SPORAL_SCOUT,
    ShipType.SYMBIOTIC_HARVESTER,
    ShipType.MYCELIAL_TENDRIL,
    ShipType.CHITIN_FREIGHTER,
    ShipType.BIOLUMINESCENT_CRUISER,
    ShipType.SPOROGENESIS_TITAN,
  ];

  const [ships, setShips] = useState<Record<ExpeditionShipType, number>>(
    Object.fromEntries(EXPEDITION_SHIP_TYPES.map((type) => [type, 0])) as Record<
      ExpeditionShipType,
      number
    >,
  );
  const [targetPlanetId, setTargetPlanetId] = useState<string>('');
  const [transferResources, setTransferResources] = useState<Record<ResourceType, number>>(
    Object.fromEntries(RESOURCE_TYPES.map((type) => [type, 0])) as Record<ResourceType, number>,
  );
  const [transferShips, setTransferShips] = useState<Record<ShipType, number>>(
    Object.fromEntries(TRANSPORT_SHIP_TYPES.map((type) => [type, 0])) as Record<ShipType, number>,
  );
  const [galaxy, setGalaxy] = useState(1);
  const [system, setSystem] = useState(1);
  const [error, setError] = useState<string>();
  const active = useMemo(
    () => missions?.find((mission) => mission.planetId === selectedId),
    [missions, selectedId],
  );

  const cargoCapacity = useMemo(() => fleetCargoCapacity(transferShips), [transferShips]);
  const totalResources = useMemo(
    () => RESOURCE_TYPES.reduce((sum, r) => sum + (transferResources[r] ?? 0), 0),
    [transferResources],
  );
  const totalTransportShips = useMemo(
    () => TRANSPORT_SHIP_TYPES.reduce((sum, t) => sum + (transferShips[t] ?? 0), 0),
    [transferShips],
  );

  if (isLoading || !fleet || !planet)
    return <p className="text-canopy-100/50">Croissance du hangar…</p>;

  const dockedShips: ShipCounts = Object.fromEntries(
    SHIP_TYPES.map((type) => [type, fleet.ships.find((s) => s.type === type)?.available ?? 0]),
  ) as ShipCounts;
  const totalDocked = fleet.ships.reduce((sum, ship) => sum + ship.available, 0);

  function message(reason: unknown) {
    setError(reason instanceof ApiError ? reason.message : 'Une erreur est survenue.');
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Flottes organiques"
        subtitle="Commandez vos essaims et étendez le mycélium."
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ResourceBar resources={planet.resources} className="lg:hidden" />
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="grid gap-5 xl:grid-cols-[minmax(34rem,1.15fr)_minmax(24rem,0.85fr)]">
        <div className="space-y-5">
          <section className="mycelium-panel overflow-hidden">
            <div className="border-b border-canopy-700/15 px-5 py-3">
              <h2 className="section-title">Essaim orbital</h2>
            </div>
            <div className="grid lg:grid-cols-[1fr_15rem]">
              <div className="grid grid-cols-2 gap-px bg-canopy-700/10 sm:grid-cols-3">
                <div className="bg-bark-950/45 px-4 py-4">
                  <span className="block text-[10px] uppercase tracking-[0.13em] text-canopy-100/30">
                    Vaisseaux totaux
                  </span>
                  <span className="mt-1 block font-display text-2xl text-canopy-100/85">
                    {formatNumber(totalDocked)}
                  </span>
                </div>
                {fleet.ships.slice(0, 5).map((ship) => (
                  <div key={ship.type} className="bg-bark-950/45 px-4 py-4">
                    <span className="block truncate text-[10px] uppercase tracking-[0.13em] text-canopy-100/30">
                      {ship.name}
                    </span>
                    <span className="mt-1 block font-display text-2xl text-canopy-300/80">
                      {formatNumber(ship.available)}
                    </span>
                  </div>
                ))}
              </div>
              <FleetView
                ships={dockedShips}
                className="hidden h-40 border-l border-canopy-700/15 lg:block"
              />
            </div>
          </section>

          <section className="mycelium-panel overflow-hidden">
            <div className="border-b border-canopy-700/15 px-5 py-3">
              <h2 className="section-title">Berceau orbital</h2>
              <p className="mt-1 text-xs text-canopy-100/38">
                Produisez de nouveaux vaisseaux bio-organiques.
              </p>
            </div>
            <div className="hidden grid-cols-[minmax(14rem,1.4fr)_minmax(10rem,1fr)_6rem_8rem] gap-4 border-b border-canopy-700/15 px-5 py-2.5 text-[10px] uppercase tracking-[0.13em] text-canopy-100/30 md:grid">
              <span>Vaisseau</span>
              <span>Coût</span>
              <span>Quantité</span>
              <span className="text-right">Produire</span>
            </div>
            <div className="divide-y divide-canopy-700/10">
              {fleet.ships.map((ship, index) => (
                <motion.article
                  key={ship.type}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.3) }}
                  className={`grid gap-4 px-5 py-3.5 md:grid-cols-[minmax(14rem,1.4fr)_minmax(10rem,1fr)_6rem_8rem] md:items-center ${!ship.unlocked ? 'opacity-50' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm text-canopy-50/85">
                        <WikiPopover entryId={codexId.ship(ship.type)}>{ship.name}</WikiPopover>
                      </h3>
                      <span className="text-[10px] text-canopy-300/55">
                        {ship.available} dispo.
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-canopy-100/35">
                      {ship.description}
                    </p>
                    <p className="mt-1 text-[10px] text-canopy-100/28">
                      {formatDuration(ship.productionTimeSeconds)} / unité · charge {ship.cargo}
                    </p>
                  </div>
                  <ResourceCost cost={ship.cost} have={planet.resources.amounts} />
                  <QuantityControl
                    value={quantities[ship.type]}
                    min={1}
                    max={100}
                    label={`Quantité de ${ship.name}`}
                    onChange={(quantity) =>
                      setQuantities((value) => ({ ...value, [ship.type]: quantity }))
                    }
                  />
                  <AnimatedButton
                    variant="ghost"
                    className="w-full whitespace-nowrap px-3"
                    disabled={!ship.unlocked || !!fleet.productionJob || produce.isPending}
                    loading={produce.isPending && produce.variables?.type === ship.type}
                    onClick={() => {
                      setError(undefined);
                      produce.mutate(
                        { planetId: planet.id, type: ship.type, quantity: quantities[ship.type] },
                        { onError: message },
                      );
                    }}
                    ariaLabel={`Produire ${ship.name}`}
                  >
                    {!ship.unlocked && <FiLock className="h-3.5 w-3.5" aria-hidden="true" />}
                    {ship.unlocked ? 'Produire' : `Niv. ${ship.requiredNurseryLevel}`}
                  </AnimatedButton>
                </motion.article>
              ))}
            </div>
          </section>

          <AnimatePresence>
            {fleet.productionJob && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mycelium-panel overflow-hidden"
              >
                <div className="border-b border-canopy-700/15 px-5 py-3">
                  <h2 className="section-title">File de production</h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <FiClock className="h-5 w-5 text-canopy-300/60" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-canopy-100/75">
                      {fleet.productionJob.quantity} × {SHIPS[fleet.productionJob.shipType].name}
                    </p>
                    <p className="mt-1 text-xs text-canopy-100/35">Croissance en cours</p>
                  </div>
                  <span className="text-canopy-300">
                    <AnimatedCountdown finishesAt={fleet.productionJob.finishesAt} />
                  </span>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-5">
          <section className="mycelium-panel overflow-hidden">
            <div className="border-b border-canopy-700/15 px-5 py-4">
              <h2 className="section-title">Expédition</h2>
              <p className="mt-1 text-xs text-canopy-100/38">
                Composez un essaim et envoyez-le vers un système.
              </p>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label">Galaxie</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={GALAXY_COUNT}
                    value={galaxy}
                    onChange={(event) =>
                      setGalaxy(Math.min(GALAXY_COUNT, Math.max(1, Number(event.target.value))))
                    }
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
                    onChange={(event) =>
                      setSystem(
                        Math.min(SYSTEMS_PER_GALAXY, Math.max(1, Number(event.target.value))),
                      )
                    }
                  />
                </label>
              </div>

              <div className="divide-y divide-canopy-700/10 rounded-xl border border-canopy-700/15">
                {EXPEDITION_SHIP_TYPES.map((type) => {
                  const ship = fleet.ships.find((entry) => entry.type === type);
                  if (!ship) return null;
                  const minimum = type === ShipType.SPORAL_SCOUT && ship.available > 0 ? 1 : 0;
                  return (
                    <div key={type} className="flex items-center gap-3 px-3 py-3">
                      <FiNavigation className="h-4 w-4 text-spore-400/55" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-canopy-100/70">
                          <WikiPopover entryId={codexId.ship(type)}>{ship.name}</WikiPopover>
                        </p>
                        <p className="mt-0.5 text-[10px] text-canopy-100/30">
                          {ship.available} disponibles
                        </p>
                      </div>
                      <QuantityControl
                        value={ships[type]}
                        min={minimum}
                        max={ship.available}
                        label={`${ship.name} pour l’expédition`}
                        onChange={(quantity) =>
                          setShips((value) => ({ ...value, [type]: quantity }))
                        }
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-canopy-100/40">
                <span>Total des vaisseaux</span>
                <span>
                  {Object.values(ships).reduce((sum, quantity) => sum + quantity, 0)} /{' '}
                  {totalDocked}
                </span>
              </div>

              <AnimatedButton
                variant="ghost"
                className="w-full"
                disabled={launch.isPending || !!active || ships[ShipType.SPORAL_SCOUT] < 1}
                loading={launch.isPending}
                onClick={() => {
                  setError(undefined);
                  launch.mutate(
                    { planetId: planet.id, target: { galaxy, system }, ships },
                    { onError: message },
                  );
                }}
              >
                <FiSend className="h-4 w-4" aria-hidden="true" />
                {active ? 'Expédition déjà active' : 'Lancer l’expédition'}
              </AnimatedButton>
            </div>
          </section>

          <section className="mycelium-panel overflow-hidden">
            <div className="border-b border-canopy-700/15 px-5 py-4">
              <h2 className="section-title">Expéditions actives</h2>
            </div>
            {missions && missions.length > 0 ? (
              <div className="divide-y divide-canopy-700/10">
                {missions.map((mission) => (
                  <div key={mission.id} className="flex items-center gap-3 px-5 py-4">
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-spore-500/20 bg-spore-500/[0.04] text-spore-400/65">
                      <FiNavigation className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-canopy-100/72">
                        Système {mission.target.galaxy}:{mission.target.system}
                      </p>
                      <p className="mt-1 text-[10px] text-canopy-100/30">
                        {Object.values(mission.ships).reduce((sum, quantity) => sum + quantity, 0)}{' '}
                        vaisseaux · {mission.phase === 'OUTBOUND' ? 'Trajet aller' : 'Retour'}
                      </p>
                    </div>
                    <span className="text-xs text-spore-400">
                      <AnimatedCountdown
                        finishesAt={
                          mission.phase === 'OUTBOUND' ? mission.arrivesAt : mission.returnsAt
                        }
                      />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-6 text-sm text-canopy-100/38">Aucune expédition en vol.</p>
            )}
          </section>

          <section className="mycelium-panel overflow-hidden">
            <div className="border-b border-canopy-700/15 px-5 py-4">
              <h2 className="section-title">Transfert inter-planète</h2>
              <p className="mt-1 text-xs text-canopy-100/38">
                Déployez des vaisseaux transporteurs vers une autre colonie.
              </p>
            </div>
            <div className="space-y-5 p-5">
              <label>
                <span className="label">Planète de destination</span>
                <select
                  className="input w-full"
                  value={targetPlanetId}
                  onChange={(event) => setTargetPlanetId(event.target.value)}
                >
                  <option value="">Sélectionner une planète</option>
                  {planets
                    ?.filter((p) => p.id !== selectedId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.coordinates.galaxy}:{p.coordinates.system}:
                        {p.coordinates.position})
                      </option>
                    ))}
                </select>
              </label>

              <div className="divide-y divide-canopy-700/10 rounded-xl border border-canopy-700/15">
                {TRANSPORT_SHIP_TYPES.map((type) => {
                  const ship = fleet.ships.find((entry) => entry.type === type);
                  if (!ship) return null;
                  return (
                    <div key={type} className="flex items-center gap-3 px-3 py-3">
                      <FiTruck className="h-4 w-4 text-spore-400/55" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-canopy-100/70">
                          <WikiPopover entryId={codexId.ship(type)}>{ship.name}</WikiPopover>
                        </p>
                        <p className="mt-0.5 text-[10px] text-canopy-100/30">
                          {ship.available} disponibles · charge {ship.cargo}
                        </p>
                      </div>
                      <QuantityControl
                        value={transferShips[type]}
                        min={0}
                        max={ship.available}
                        label={`${ship.name} pour le transfert`}
                        onChange={(quantity) =>
                          setTransferShips((value) => ({ ...value, [type]: quantity }))
                        }
                      />
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {RESOURCE_TYPES.map((resource) => (
                  <label key={resource}>
                    <span className="label">{resource}</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={transferResources[resource]}
                      onChange={(event) =>
                        setTransferResources((value) => ({
                          ...value,
                          [resource]: Math.max(0, Number(event.target.value)),
                        }))
                      }
                    />
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-canopy-100/40">
                <span>Capacité de cargaison</span>
                <span className={totalResources > cargoCapacity ? 'text-red-400' : ''}>
                  {totalResources} / {cargoCapacity}
                </span>
              </div>

              <AnimatedButton
                variant="ghost"
                className="w-full"
                disabled={
                  launchTransfer.isPending ||
                  !targetPlanetId ||
                  totalResources === 0 ||
                  totalResources > cargoCapacity ||
                  totalTransportShips === 0
                }
                loading={launchTransfer.isPending}
                onClick={() => {
                  setError(undefined);
                  launchTransfer.mutate(
                    {
                      sourcePlanetId: planet.id,
                      targetPlanetId,
                      ships: transferShips,
                      resources: transferResources,
                    },
                    {
                      onSuccess: () => {
                        setTargetPlanetId('');
                        setTransferResources(
                          Object.fromEntries(RESOURCE_TYPES.map((type) => [type, 0])) as Record<
                            ResourceType,
                            number
                          >,
                        );
                        setTransferShips(
                          Object.fromEntries(
                            TRANSPORT_SHIP_TYPES.map((type) => [type, 0]),
                          ) as Record<ShipType, number>,
                        );
                      },
                      onError: message,
                    },
                  );
                }}
              >
                <FiTruck className="h-4 w-4" aria-hidden="true" />
                Transférer
              </AnimatedButton>
            </div>
          </section>

          <section className="mycelium-panel overflow-hidden">
            <div className="border-b border-canopy-700/15 px-5 py-4">
              <h2 className="section-title">Transferts en cours</h2>
            </div>
            {transfers && transfers.length > 0 ? (
              <div className="divide-y divide-canopy-700/10">
                {transfers.map((mission) => (
                  <div key={mission.id} className="flex items-center gap-3 px-5 py-4">
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-spore-500/20 bg-spore-500/[0.04] text-spore-400/65">
                      <FiTruck className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-canopy-100/72">
                        {mission.sourcePlanetName} → {mission.targetPlanetName}
                      </p>
                      <p className="mt-1 text-[10px] text-canopy-100/30">
                        {Object.values(mission.ships).reduce((sum, quantity) => sum + quantity, 0)}{' '}
                        vaisseaux ·{' '}
                        {Object.values(mission.resources).reduce(
                          (sum, quantity) => sum + quantity,
                          0,
                        )}{' '}
                        ressources
                      </p>
                    </div>
                    <span className="text-xs text-spore-400">
                      <AnimatedCountdown finishesAt={mission.arrivesAt} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-6 text-sm text-canopy-100/38">Aucun transfert en cours.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
