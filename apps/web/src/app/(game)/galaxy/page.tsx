'use client';

import { useMemo, useState } from 'react';
import {
  GALAXY_COUNT,
  SHIPS,
  ShipType,
  SHIP_TYPES,
  SYSTEMS_PER_GALAXY,
  type GalaxySlot,
  type ShipCounts,
} from '@arborisis/shared';
import { GalaxyView } from '@/components/three';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { usePlanetSelection } from '@/components/PlanetContext';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { AnimatedButton } from '@/components/AnimatedButton';
import { ApiError } from '@/lib/api';
import {
  useColonizations,
  useColonize,
  useFleet,
  useGalaxy,
  usePlanets,
  useAttackPlanet,
  useSpyPlanet,
} from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiChevronLeft,
  FiChevronRight,
  FiCrosshair,
  FiEye,
  FiGlobe,
  FiMapPin,
  FiNavigation,
} from 'react-icons/fi';

interface PvpModalProps {
  slot: GalaxySlot;
  mode: 'spy' | 'attack';
  planets: {
    id: string;
    name: string;
    coordinates: { galaxy: number; system: number; position: number };
  }[];
  onClose: () => void;
}

function PvpModal({ slot, mode, planets, onClose }: PvpModalProps) {
  const [sourcePlanetId, setSourcePlanetId] = useState(planets[0]?.id ?? '');
  const { data: fleet } = useFleet(sourcePlanetId || undefined);
  const [ships, setShips] = useState<Record<ShipType, number>>(
    Object.fromEntries(SHIP_TYPES.map((type) => [type, 0])) as Record<ShipType, number>,
  );
  const [error, setError] = useState<string>();
  const spy = useSpyPlanet(sourcePlanetId);
  const attack = useAttackPlanet(sourcePlanetId);
  const isPending = spy.isPending || attack.isPending;

  const docked = useMemo(() => {
    if (!fleet) return {} as ShipCounts;
    return Object.fromEntries(
      SHIP_TYPES.map((type) => [type, fleet.ships.find((s) => s.type === type)?.available ?? 0]),
    ) as ShipCounts;
  }, [fleet]);

  function reset() {
    setShips(Object.fromEntries(SHIP_TYPES.map((type) => [type, 0])) as Record<ShipType, number>);
    setError(undefined);
  }

  function submit() {
    if (!sourcePlanetId) {
      setError('Sélectionnez une planète source.');
      return;
    }
    if (!slot.planetId) {
      setError('Cible invalide.');
      return;
    }
    const body = {
      sourcePlanetId,
      targetPlanetId: slot.planetId,
      ships,
    };
    setError(undefined);
    const mutation = mode === 'spy' ? spy : attack;
    mutation.mutate(body, {
      onSuccess: () => {
        reset();
        onClose();
      },
      onError: (e) => setError(e instanceof ApiError ? e.message : 'Une erreur est survenue.'),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bark-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl"
      >
        <AnimatedCard
          glowColor={mode === 'attack' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(123, 102, 240, 0.25)'}
          className="space-y-4"
        >
          <div>
            <h2 className="font-medium text-canopy-100">
              {mode === 'spy' ? 'Espionner' : 'Attaquer'} {slot.planetName}
            </h2>
            <p className="text-xs text-canopy-100/50">
              Cible {slot.coordinates.galaxy}:{slot.coordinates.system}:{slot.coordinates.position}{' '}
              · propriétaire {slot.ownerName}
            </p>
          </div>

          <label>
            <span className="label">Planète source</span>
            <select
              className="input w-full"
              value={sourcePlanetId}
              onChange={(e) => {
                setSourcePlanetId(e.target.value);
                reset();
              }}
            >
              {planets.map((planet) => (
                <option key={planet.id} value={planet.id}>
                  {planet.name} · {planet.coordinates.galaxy}:{planet.coordinates.system}:
                  {planet.coordinates.position}
                </option>
              ))}
            </select>
          </label>

          {fleet && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SHIP_TYPES.map((type) => {
                const ship = fleet.ships.find((s) => s.type === type);
                const available = docked[type] ?? 0;
                if (mode === 'spy' && SHIPS[type].role !== 'ESPIONAGE') return null;
                if (mode === 'attack' && available <= 0) return null;
                if (
                  mode === 'attack' &&
                  !['COMBAT', 'DEFENSE', 'SUPPORT'].includes(SHIPS[type].role)
                )
                  return null;
                if (!ship) return null;
                return (
                  <motion.label
                    key={type}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="label">
                      {ship.name} (max. {available})
                    </span>
                    <motion.input
                      className="input"
                      type="number"
                      min={0}
                      max={available}
                      value={ships[type]}
                      onChange={(e) =>
                        setShips((value) => ({
                          ...value,
                          [type]: Math.min(available, Math.max(0, Number(e.target.value))),
                        }))
                      }
                      whileFocus={{ scale: 1.02 }}
                    />
                  </motion.label>
                );
              })}
            </div>
          )}

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

          <div className="flex gap-3">
            <AnimatedButton disabled={isPending || !fleet} onClick={submit} glow>
              {mode === 'spy' ? 'Lancer espionnage' : "Lancer l'attaque"}
            </AnimatedButton>
            <AnimatedButton variant="ghost" onClick={onClose} disabled={isPending}>
              Annuler
            </AnimatedButton>
          </div>
        </AnimatedCard>
      </motion.div>
    </motion.div>
  );
}

export default function GalaxyPage() {
  const { selectedId } = usePlanetSelection();
  const [galaxy, setGalaxy] = useState(1);
  const [system, setSystem] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<GalaxySlot | null>(null);
  const [modalSlot, setModalSlot] = useState<GalaxySlot | null>(null);
  const [modalMode, setModalMode] = useState<'spy' | 'attack' | null>(null);
  const { data, isLoading } = useGalaxy(galaxy, system);
  const { data: inbound } = useColonizations();
  const { data: planets } = usePlanets();
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

  const activeSlot =
    selectedSlot?.coordinates.galaxy === galaxy && selectedSlot.coordinates.system === system
      ? selectedSlot
      : (data?.slots[0] ?? null);

  const occupiedCount = data?.slots.filter((slot) => slot.occupied).length ?? 0;
  const emptyCount = data?.slots.length ? data.slots.length - occupiedCount : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Galaxie vivante" subtitle="Explorez, colonisez et étendez le mycélium.">
        <div className="flex flex-wrap items-end justify-end gap-2">
          <div className="flex items-end gap-1 rounded-xl border border-canopy-700/20 bg-bark-950/45 p-1.5">
            <AnimatedButton
              variant="ghost"
              onClick={() => setGalaxy((value) => Math.max(1, value - 1))}
              ariaLabel="Galaxie précédente"
              className="h-9 min-h-0 px-2"
            >
              <FiChevronLeft aria-hidden="true" />
            </AnimatedButton>
            <label className="min-w-20">
              <span className="label text-center">Galaxie</span>
              <select
                className="input h-9 min-h-0 py-1 text-center"
                value={galaxy}
                onChange={(event) => setGalaxy(Number(event.target.value))}
              >
                {Array.from({ length: GALAXY_COUNT }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {String(value).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </label>
            <AnimatedButton
              variant="ghost"
              onClick={() => setGalaxy((value) => Math.min(GALAXY_COUNT, value + 1))}
              ariaLabel="Galaxie suivante"
              className="h-9 min-h-0 px-2"
            >
              <FiChevronRight aria-hidden="true" />
            </AnimatedButton>
          </div>

          <div className="flex items-end gap-1 rounded-xl border border-canopy-700/20 bg-bark-950/45 p-1.5">
            <AnimatedButton
              variant="ghost"
              onClick={() => step(-1)}
              ariaLabel="Système précédent"
              className="h-9 min-h-0 px-2"
            >
              <FiChevronLeft aria-hidden="true" />
            </AnimatedButton>
            <label className="min-w-20">
              <span className="label text-center">Système</span>
              <input
                type="number"
                min={1}
                max={SYSTEMS_PER_GALAXY}
                className="input h-9 min-h-0 py-1 text-center"
                value={system}
                onChange={(event) =>
                  setSystem(Math.min(SYSTEMS_PER_GALAXY, Math.max(1, Number(event.target.value))))
                }
              />
            </label>
            <AnimatedButton
              variant="ghost"
              onClick={() => step(1)}
              ariaLabel="Système suivant"
              className="h-9 min-h-0 px-2"
            >
              <FiChevronRight aria-hidden="true" />
            </AnimatedButton>
          </div>

          <StatCard label="Mondes" value={occupiedCount.toString()} color="purple" delay={0.1} />
          <StatCard label="Vides" value={emptyCount.toString()} color="green" delay={0.15} />
        </div>
      </PageHeader>

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

      {isLoading || !data ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-canopy-100/50">
          Sondage du système…
        </motion.p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(34rem,1.65fr)_minmax(19rem,0.75fr)]">
          <div className="space-y-5">
            <section className="mycelium-panel grid min-h-[32rem] overflow-hidden md:grid-cols-[14rem_1fr]">
              <div className="border-b border-canopy-700/15 md:border-b-0 md:border-r">
                <div className="border-b border-canopy-700/15 px-4 py-3">
                  <h2 className="section-title">Positions du système</h2>
                </div>
                <div className="max-h-[28rem] overflow-y-auto py-1">
                  {data.slots.map((slot, index) => {
                    const active = activeSlot?.coordinates.position === slot.coordinates.position;
                    return (
                      <motion.button
                        key={slot.coordinates.position}
                        type="button"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setSelectedSlot(slot)}
                        className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left transition ${
                          active
                            ? 'border-canopy-400 bg-canopy-500/[0.06]'
                            : 'border-transparent hover:bg-canopy-500/[0.025]'
                        }`}
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-canopy-700/30 font-display text-sm text-canopy-100/70">
                          {slot.coordinates.position}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-xs ${slot.isOwn ? 'text-canopy-300' : 'text-canopy-100/72'}`}
                          >
                            {slot.planetName ?? 'Position vide'}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-canopy-100/30">
                            {slot.ownerName ?? 'Disponible'}
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              <div className="relative min-h-[26rem]">
                <GalaxyView
                  slots={data.slots}
                  selectedSlot={activeSlot}
                  onSelect={(slot) => setSelectedSlot(slot)}
                  className="absolute inset-0 h-full w-full"
                />
                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.52)]" />
              </div>
            </section>

            <AnimatePresence>
              {inbound && inbound.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mycelium-panel overflow-hidden"
                >
                  <div className="border-b border-canopy-700/15 px-5 py-3">
                    <h2 className="section-title">Essaimages en route</h2>
                  </div>
                  <ul className="divide-y divide-canopy-700/10">
                    {inbound.map((job) => (
                      <li key={job.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                        <FiNavigation className="h-4 w-4 text-spore-400/70" aria-hidden="true" />
                        <span className="flex-1 text-canopy-100/65">
                          Essaimage #{job.id.slice(0, 8)}
                        </span>
                        <span className="text-spore-400">
                          <AnimatedCountdown finishesAt={job.finishesAt} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {activeSlot && (
            <motion.aside
              key={`${galaxy}-${system}-${activeSlot.coordinates.position}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="mycelium-panel h-fit overflow-hidden"
            >
              <div className="border-b border-canopy-700/15 bg-spore-500/[0.025] px-5 py-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-canopy-700/30 font-display text-xl text-canopy-100/75">
                    {activeSlot.coordinates.position}
                  </span>
                  <div>
                    <p className="text-xs text-canopy-100/38">
                      Position {activeSlot.coordinates.position}
                    </p>
                    <h2 className="font-display text-2xl text-canopy-50/90">
                      {activeSlot.planetName ?? 'Vide'}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div className="flex items-start gap-3 text-sm">
                  {activeSlot.occupied ? (
                    <FiGlobe className="mt-0.5 h-4 w-4 text-spore-400/70" aria-hidden="true" />
                  ) : (
                    <FiMapPin className="mt-0.5 h-4 w-4 text-canopy-300/70" aria-hidden="true" />
                  )}
                  <div>
                    <p className="text-canopy-100/70">
                      {activeSlot.occupied
                        ? activeSlot.isOwn
                          ? 'Monde de votre empire'
                          : `Monde de ${activeSlot.ownerName}`
                        : 'Aucun monde présent'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-canopy-100/38">
                      {activeSlot.occupied
                        ? `Coordonnées ${galaxy}:${system}:${activeSlot.coordinates.position}`
                        : 'Cette position peut accueillir un nouveau nœud du mycélium.'}
                    </p>
                  </div>
                </div>

                {!activeSlot.occupied ? (
                  <div className="border-t border-canopy-700/15 pt-5">
                    <h3 className="section-title mb-2">Colonisation</h3>
                    <p className="mb-4 text-xs leading-5 text-canopy-100/40">
                      Établissez un nouveau monde depuis la planète active.
                    </p>
                    <AnimatedButton
                      variant="ghost"
                      className="w-full"
                      onClick={() => onColonize(activeSlot)}
                      disabled={colonize.isPending || !selectedId}
                      loading={colonize.isPending}
                    >
                      Coloniser
                    </AnimatedButton>
                  </div>
                ) : !activeSlot.isOwn ? (
                  <div className="space-y-3 border-t border-canopy-700/15 pt-5">
                    <h3 className="section-title">Opérations</h3>
                    <AnimatedButton
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setModalSlot(activeSlot);
                        setModalMode('spy');
                        setError(undefined);
                      }}
                    >
                      <FiEye className="h-4 w-4" aria-hidden="true" />
                      Espionner
                    </AnimatedButton>
                    <AnimatedButton
                      variant="ghost"
                      className="w-full border-red-500/20 text-red-200/75 hover:bg-red-500/10"
                      onClick={() => {
                        setModalSlot(activeSlot);
                        setModalMode('attack');
                        setError(undefined);
                      }}
                    >
                      <FiCrosshair className="h-4 w-4" aria-hidden="true" />
                      Attaquer
                    </AnimatedButton>
                  </div>
                ) : (
                  <p className="border-t border-canopy-700/15 pt-5 text-xs text-canopy-100/40">
                    Gérez ce monde depuis le sélecteur de planète de la navigation.
                  </p>
                )}
              </div>
            </motion.aside>
          )}
        </div>
      )}

      <AnimatePresence>
        {modalSlot && modalMode && planets && (
          <PvpModal
            slot={modalSlot}
            mode={modalMode}
            planets={planets}
            onClose={() => setModalSlot(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
