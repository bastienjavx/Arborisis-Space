'use client';

import { useState } from 'react';
import { GALAXY_COUNT, SYSTEMS_PER_GALAXY, type GalaxySlot } from '@arborisis/shared';
import { GalaxyView } from '@/components/three';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { usePlanetSelection } from '@/components/PlanetContext';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { AnimatedButton } from '@/components/AnimatedButton';
import { ApiError } from '@/lib/api';
import { useColonizations, useColonize, useGalaxy } from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';

export default function GalaxyPage() {
  const { selectedId } = usePlanetSelection();
  const [galaxy, setGalaxy] = useState(1);
  const [system, setSystem] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<GalaxySlot | null>(null);
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
            <AnimatedButton variant="ghost" onClick={() => step(-1)}>
              ◀
            </AnimatedButton>
            <AnimatedButton variant="ghost" onClick={() => step(1)}>
              ▶
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
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-canopy-100/60">
                Essaimages en route
              </h2>
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

          <AnimatedCard glow="green" className="overflow-hidden p-0">
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
                      {!slot.occupied && (
                        <AnimatedButton
                          variant="ghost"
                          className="px-3 py-1"
                          onClick={() => onColonize(slot)}
                          disabled={colonize.isPending || !selectedId}
                          glow
                        >
                          Essaimer
                        </AnimatedButton>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </AnimatedCard>
        </>
      )}
    </div>
  );
}
