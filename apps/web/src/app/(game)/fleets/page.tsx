'use client';

import { useMemo, useState } from 'react';
import {
  GALAXY_COUNT,
  SHIPS,
  ShipType,
  SHIP_TYPES,
  SYSTEMS_PER_GALAXY,
  type ExpeditionShipType,
  type ShipCounts,
} from '@arborisis/shared';
import { FleetView } from '@/components/three';
import { PageHeader } from '@/components/PageHeader';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { AnimatedButton } from '@/components/AnimatedButton';
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
import { motion, AnimatePresence } from 'framer-motion';

export default function FleetsPage() {
  const { selectedId } = usePlanetSelection();
  const { data: fleet, isLoading } = useFleet(selectedId);
  const { data: planet } = usePlanetDetail(selectedId);
  const { data: missions } = useExpeditions();
  const produce = useProduceShips(selectedId ?? '');
  const launch = useStartExpedition(selectedId ?? '');
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
  const [galaxy, setGalaxy] = useState(1);
  const [system, setSystem] = useState(1);
  const [error, setError] = useState<string>();
  const active = useMemo(
    () => missions?.find((mission) => mission.planetId === selectedId),
    [missions, selectedId],
  );

  if (isLoading || !fleet || !planet)
    return <p className="text-canopy-100/50">Croissance du hangar…</p>;

  const dockedShips: ShipCounts = Object.fromEntries(
    SHIP_TYPES.map((type) => [type, fleet.ships.find((s) => s.type === type)?.available ?? 0]),
  ) as ShipCounts;

  function message(reason: unknown) {
    setError(reason instanceof ApiError ? reason.message : 'Une erreur est survenue.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flottes organiques"
        subtitle="Faites éclore des bio-vaisseaux puis sondez les systèmes inconnus."
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ResourceBar resources={planet.resources} />
      </motion.div>

      <AnimatedCard delay={0.15} glow="purple" className="overflow-hidden p-0">
        <div className="grid lg:grid-cols-3">
          <div className="p-5 lg:col-span-1">
            <h2 className="section-title mb-2">Essaim orbital</h2>
            <p className="text-sm text-canopy-100/50">
              {fleet.ships.reduce((sum, s) => sum + s.available, 0)} bio-vaisseaux en orbite.
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {fleet.ships.map((s) => (
                <li key={s.type} className="flex justify-between">
                  <span className="text-canopy-100/70">{s.name}</span>
                  <span className="text-canopy-300">{s.available}</span>
                </li>
              ))}
            </ul>
          </div>
          <FleetView ships={dockedShips} className="h-64 w-full lg:col-span-2 lg:h-80" />
        </div>
      </AnimatedCard>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fleet.productionJob && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AnimatedCard
              className="flex items-center justify-between border-canopy-500/40"
              glow="green"
            >
              <div>
                <p className="text-sm text-canopy-100/60">Production en cours</p>
                <p>
                  {fleet.productionJob.quantity} × {SHIPS[fleet.productionJob.shipType].name}
                </p>
              </div>
              <span className="font-mono text-canopy-300">
                <AnimatedCountdown finishesAt={fleet.productionJob.finishesAt} />
              </span>
            </AnimatedCard>
          </motion.section>
        )}
      </AnimatePresence>

      <section>
        <h2 className="section-title mb-3">Berceau orbital</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {fleet.ships.map((ship, index) => (
            <AnimatedCard key={ship.type} delay={index * 0.1} hover>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-canopy-100">{ship.name}</h3>
                  <p className="mt-1 text-xs text-canopy-100/50">{ship.description}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-canopy-100/40">
                    {ship.role}
                  </p>
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
                <motion.input
                  className="input w-24"
                  type="number"
                  min={1}
                  max={100}
                  value={quantities[ship.type]}
                  onChange={(event) =>
                    setQuantities((value) => ({
                      ...value,
                      [ship.type]: Math.min(100, Math.max(1, Number(event.target.value))),
                    }))
                  }
                  aria-label={`Quantité de ${ship.name}`}
                  whileFocus={{ scale: 1.05 }}
                />
                <AnimatedButton
                  className="flex-1"
                  disabled={!ship.unlocked || !!fleet.productionJob || produce.isPending}
                  onClick={() => {
                    setError(undefined);
                    produce.mutate(
                      { planetId: planet.id, type: ship.type, quantity: quantities[ship.type] },
                      { onError: message },
                    );
                  }}
                  glow={ship.unlocked && !fleet.productionJob}
                >
                  {!ship.unlocked
                    ? `Berceau niv. ${ship.requiredNurseryLevel} requis`
                    : 'Faire éclore'}
                </AnimatedButton>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </section>

      <AnimatedCard delay={0.2} className="space-y-4">
        <div>
          <h2 className="font-medium text-canopy-100">Expédition</h2>
          <p className="text-xs text-canopy-100/50">
            Une seule mission peut partir de cette planète à la fois.
          </p>
        </div>
        {active ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap items-center justify-between gap-3"
          >
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
              <AnimatedCountdown
                finishesAt={active.phase === 'OUTBOUND' ? active.arrivesAt : active.returnsAt}
              />
            </span>
          </motion.div>
        ) : (
          <div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <motion.label
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span className="label">Galaxie</span>
                <motion.input
                  className="input"
                  type="number"
                  min={1}
                  max={GALAXY_COUNT}
                  value={galaxy}
                  onChange={(e) => setGalaxy(Number(e.target.value))}
                  whileFocus={{ scale: 1.02 }}
                />
              </motion.label>
              <motion.label
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <span className="label">Système</span>
                <motion.input
                  className="input"
                  type="number"
                  min={1}
                  max={SYSTEMS_PER_GALAXY}
                  value={system}
                  onChange={(e) => setSystem(Number(e.target.value))}
                  whileFocus={{ scale: 1.02 }}
                />
              </motion.label>
              {EXPEDITION_SHIP_TYPES.map((type, index) => {
                const ship = fleet.ships.find((s) => s.type === type);
                if (!ship) return null;
                return (
                  <motion.label
                    key={type}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <span className="label">
                      {ship.name} (max. {ship.available})
                    </span>
                    <motion.input
                      className="input"
                      type="number"
                      min={type === ShipType.SPORAL_SCOUT ? 1 : 0}
                      max={ship.available}
                      value={ships[type]}
                      onChange={(e) =>
                        setShips((value) => ({
                          ...value,
                          [type]: Math.min(ship.available, Math.max(0, Number(e.target.value))),
                        }))
                      }
                      whileFocus={{ scale: 1.02 }}
                    />
                  </motion.label>
                );
              })}
            </div>
            <AnimatedButton
              disabled={launch.isPending || ships[ShipType.SPORAL_SCOUT] < 1}
              onClick={() => {
                setError(undefined);
                launch.mutate(
                  { planetId: planet.id, target: { galaxy, system }, ships },
                  { onError: message },
                );
              }}
              glow
            >
              Lancer l'expédition
            </AnimatedButton>
          </div>
        )}
      </AnimatedCard>
    </div>
  );
}
