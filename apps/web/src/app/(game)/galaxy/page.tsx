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
import { FiChevronLeft, FiChevronRight, FiCrosshair, FiEye } from 'react-icons/fi';

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

  return (
    <div className="space-y-5">
      <PageHeader title="Galaxie vivante" subtitle="Sondez les systèmes et étendez votre empire.">
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
            <AnimatedButton variant="ghost" onClick={() => step(-1)} ariaLabel="Système précédent">
              <FiChevronLeft aria-hidden="true" />
            </AnimatedButton>
            <AnimatedButton variant="ghost" onClick={() => step(1)} ariaLabel="Système suivant">
              <FiChevronRight aria-hidden="true" />
            </AnimatedButton>
          </div>
        </div>
      </PageHeader>

      {!isLoading && data && (
        <div className="flex flex-wrap gap-3">
          <StatCard
            label="Mondes"
            value={data.slots.filter((s) => s.occupied).length.toString()}
            hint={`${data.slots.filter((s) => s.isOwn).length} vous appartiennent`}
            color="purple"
            delay={0.1}
          />
          <StatCard
            label="Vides"
            value={data.slots.filter((s) => !s.occupied).length.toString()}
            hint="disponibles à la colonisation"
            color="green"
            delay={0.15}
          />
        </div>
      )}

      <AnimatePresence>
        {inbound && inbound.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AnimatedCard glow="purple">
              <h2 className="section-title mb-2">Essaimages en route</h2>
              <ul className="space-y-1 text-sm">
                {inbound.map((j) => (
                  <motion.li
                    key={j.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between"
                  >
                    <span className="text-canopy-100/70">Essaimage #{j.id.slice(0, 8)}</span>
                    <span className="font-mono text-spore-400">
                      <AnimatedCountdown finishesAt={j.finishesAt} />
                    </span>
                  </motion.li>
                ))}
              </ul>
            </AnimatedCard>
          </motion.div>
        )}
      </AnimatePresence>

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

      {isLoading || !data ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-canopy-100/50">
          Sondage du système…
        </motion.p>
      ) : (
        <>
          <AnimatedCard glow="purple" className="overflow-hidden p-0">
            <GalaxyView
              slots={data.slots}
              selectedSlot={selectedSlot}
              onSelect={(slot) => setSelectedSlot(slot)}
              className="h-80 w-full"
            />
          </AnimatedCard>

          <AnimatedCard glow="green" className="overflow-x-auto p-0">
            <table className="min-w-[38rem] w-full text-sm">
              <thead className="bg-bark-850 text-left text-xs uppercase tracking-wide text-canopy-100/40">
                <tr>
                  <th className="px-4 py-2">Pos.</th>
                  <th className="px-4 py-2">Monde</th>
                  <th className="px-4 py-2">Propriétaire</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.slots.map((slot, index) => (
                  <motion.tr
                    key={slot.coordinates.position}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ backgroundColor: 'rgba(22, 191, 108, 0.05)' }}
                    onClick={() => setSelectedSlot(slot)}
                    className={`cursor-pointer border-t border-canopy-700/10 ${
                      selectedSlot?.coordinates.position === slot.coordinates.position
                        ? 'bg-canopy-700/10'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-canopy-100/50">{slot.coordinates.position}</td>
                    <td className="px-4 py-2">
                      {slot.occupied ? (
                        <span className={slot.isOwn ? 'text-canopy-300' : 'text-canopy-100/80'}>
                          {slot.planetName}
                        </span>
                      ) : (
                        <motion.span
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="text-canopy-100/30"
                        >
                          — vide —
                        </motion.span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-canopy-100/60">{slot.ownerName ?? ''}</td>
                    <td className="px-4 py-2 text-right">
                      {!slot.occupied ? (
                        <AnimatedButton
                          variant="ghost"
                          className="px-3 py-1"
                          onClick={() => onColonize(slot)}
                          disabled={colonize.isPending || !selectedId}
                          glow
                        >
                          Essaimer
                        </AnimatedButton>
                      ) : !slot.isOwn ? (
                        <div className="flex justify-end gap-2">
                          <AnimatedButton
                            variant="ghost"
                            className="px-2 py-1"
                            onClick={() => {
                              setModalSlot(slot);
                              setModalMode('spy');
                              setError(undefined);
                            }}
                            ariaLabel="Espionner"
                          >
                            <FiEye className="h-4 w-4" aria-hidden="true" />
                          </AnimatedButton>
                          <AnimatedButton
                            variant="ghost"
                            className="px-2 py-1"
                            onClick={() => {
                              setModalSlot(slot);
                              setModalMode('attack');
                              setError(undefined);
                            }}
                            ariaLabel="Attaquer"
                          >
                            <FiCrosshair className="h-4 w-4" aria-hidden="true" />
                          </AnimatedButton>
                        </div>
                      ) : null}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </AnimatedCard>
        </>
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
