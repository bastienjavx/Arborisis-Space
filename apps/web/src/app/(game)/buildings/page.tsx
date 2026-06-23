'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BUILDINGS, type BuildingType } from '@arborisis/shared';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { AnimatedButton } from '@/components/AnimatedButton';
import { ResourceBar } from '@/components/ResourceBar';
import { ResourceCost } from '@/components/ResourceCost';
import { WikiPopover } from '@/components/WikiPopover';
import { codexId } from '@/lib/codex';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ApiError } from '@/lib/api';
import { formatDuration, formatNumber } from '@/lib/format';
import {
  keys,
  useCancelConstruction,
  useConstructionQueue,
  useAddToConstructionQueue,
  useRemoveFromConstructionQueue,
  usePlanetDetail,
  useUpgradeBuilding,
} from '@/lib/queries';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiLayers, FiLock, FiPlus, FiTrash2 } from 'react-icons/fi';

export default function BuildingsPage() {
  const qc = useQueryClient();
  const { selectedId } = usePlanetSelection();
  const { data: planet, isLoading } = usePlanetDetail(selectedId);
  const upgrade = useUpgradeBuilding(selectedId ?? '');
  const cancel = useCancelConstruction(selectedId ?? '');
  const { data: queue } = useConstructionQueue(selectedId ?? '');
  const addToQueue = useAddToConstructionQueue(selectedId ?? '');
  const removeFromQueue = useRemoveFromConstructionQueue(selectedId ?? '');
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

  const totalConstructionTime = planet.constructionJob
    ? (new Date(planet.constructionJob.finishesAt).getTime() -
        new Date(planet.constructionJob.startedAt ?? planet.constructionJob.finishesAt).getTime()) /
      1000
    : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <>
            Structures <span className="italic text-canopy-300">organiques</span>
          </>
        }
        subtitle="Développez les organes vivants de votre mycélium pour étendre sa portée et sa résilience."
      >
        <div className="flex flex-wrap gap-2">
          <StatCard
            label="Emplacements"
            value={`${planet.usedFields} / ${planet.maxFields}`}
            hint={`${planet.maxFields - planet.usedFields} disponibles`}
            color="green"
            delay={0.1}
          />
          <StatCard
            label="Niveau moyen"
            value={(
              planet.buildings.reduce((sum, building) => sum + building.level, 0) /
              planet.buildings.length
            ).toFixed(1)}
            color="purple"
            delay={0.15}
          />
        </div>
      </PageHeader>

      <ResourceBar resources={planet.resources} className="lg:hidden" />

      <AnimatePresence>
        {planet.constructionJob && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <section className="mycelium-panel overflow-hidden">
              <div className="border-b border-canopy-700/15 px-5 py-3">
                <h2 className="section-title">File de construction</h2>
              </div>
              <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-canopy-700/25 bg-canopy-500/5 text-canopy-300">
                  <FiLayers className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-canopy-50">
                    {planet.constructionJob.targetType
                      ? BUILDINGS[planet.constructionJob.targetType as BuildingType]?.name
                      : 'Structure organique'}
                  </p>
                  <p className="mt-1 text-xs text-canopy-100/40">
                    Niveau {Math.max(0, (planet.constructionJob.targetLevel ?? 1) - 1)} →{' '}
                    {planet.constructionJob.targetLevel}
                  </p>
                </div>
                <div className="min-w-0 flex-[1.4]">
                  <AnimatedCountdown
                    finishesAt={planet.constructionJob.finishesAt}
                    onDone={() => qc.invalidateQueries({ queryKey: keys.planet(planet.id) })}
                    showRing
                    totalSeconds={totalConstructionTime}
                  />
                </div>
                <AnimatedButton
                  variant="ghost"
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                  className="w-full min-w-28 sm:w-auto"
                >
                  Annuler
                </AnimatedButton>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Construction queue */}
      {queue && queue.length > 0 && (
        <section className="mycelium-panel overflow-hidden">
          <div className="border-b border-canopy-700/15 px-5 py-3">
            <h2 className="section-title">File d&apos;attente ({queue.length}/5)</h2>
          </div>
          <ol className="divide-y divide-canopy-700/10">
            {queue.map((item, idx) => (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-canopy-500/10 text-[11px] font-bold text-canopy-300">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-canopy-100/85">
                    {BUILDINGS[item.targetType]?.name ?? item.targetType}
                  </p>
                  <p className="text-xs text-canopy-400/50">Niveau {item.targetLevel}</p>
                </div>
                <button
                  type="button"
                  aria-label="Retirer de la file"
                  onClick={() => removeFromQueue.mutate(item.id)}
                  className="text-canopy-400/50 transition hover:text-red-300"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

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

      <section className="mycelium-panel overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-canopy-700/15 px-5 py-4">
          <span
            className="h-1.5 w-1.5 rotate-45 bg-canopy-400/70"
            style={{ boxShadow: '0 0 10px rgba(63,217,137,0.5)' }}
            aria-hidden="true"
          />
          <h2 className="section-title">Catalogue des structures</h2>
        </div>

        <div className="hidden grid-cols-[minmax(16rem,1.7fr)_4rem_minmax(13rem,1.15fr)_7rem_minmax(11rem,1fr)_9rem] gap-4 border-b border-canopy-700/15 bg-canopy-500/[0.025] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-canopy-100/32 xl:grid">
          <span>Structure</span>
          <span>Niveau</span>
          <span>Coût suivant</span>
          <span>Durée</span>
          <span>Exigences</span>
          <span className="text-right">Action</span>
        </div>

        <div className="divide-y divide-canopy-700/10">
          {planet.buildings.map((building, index) => {
            const locked = building.unmet.length > 0;
            const canBuild = !busy && !locked && building.canAfford && !upgrade.isPending;
            const buttonLabel = busy
              ? 'File occupée'
              : locked
                ? 'Verrouillé'
                : building.canAfford
                  ? 'Développer'
                  : 'Ressources requises';

            return (
              <motion.article
                key={building.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.045, 0.4) }}
                className={`grid gap-4 px-5 py-4 transition hover:bg-canopy-500/[0.025] xl:grid-cols-[minmax(16rem,1.7fr)_4rem_minmax(13rem,1.15fr)_7rem_minmax(11rem,1fr)_9rem] xl:items-center ${locked ? 'opacity-55' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-canopy-700/25 bg-bark-950/60 text-canopy-300/65">
                    <FiLayers className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm text-canopy-50/90">
                      <WikiPopover entryId={codexId.building(building.type)}>
                        {building.name}
                      </WikiPopover>
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-canopy-100/38">
                      {building.description}
                    </p>
                    {building.currentProduction > 0 && (
                      <p className="mt-1 text-[10px] text-canopy-300/50">
                        Production {formatNumber(building.currentProduction)}/h
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between xl:block">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-canopy-100/30 xl:hidden">
                    Niveau
                  </span>
                  <span className="font-display text-2xl text-canopy-100/85">{building.level}</span>
                </div>

                <div>
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-canopy-100/30 xl:hidden">
                    Coût suivant
                  </span>
                  <ResourceCost cost={building.nextLevelCost} have={planet.resources.amounts} />
                </div>

                <div className="flex items-center gap-2 text-xs text-canopy-100/50">
                  <FiClock className="h-4 w-4 text-canopy-300/50" aria-hidden="true" />
                  {formatDuration(building.nextLevelTimeSeconds)}
                </div>

                <div className="text-xs leading-5">
                  {locked ? (
                    <span className="text-red-300/75">
                      {building.unmet
                        .map(
                          (requirement) => `${requirement.type} niv. ${requirement.requiredLevel}`,
                        )
                        .join(', ')}
                    </span>
                  ) : (
                    <span className="text-canopy-100/42">Conditions remplies</span>
                  )}
                </div>

                <div className="flex items-center gap-2 xl:flex-col xl:items-stretch">
                  <AnimatedButton
                    variant="ghost"
                    onClick={() => onBuild(building.type)}
                    disabled={!canBuild}
                    loading={upgrade.isPending && upgrade.variables?.type === building.type}
                    className="flex-1 whitespace-nowrap xl:w-36"
                    ariaLabel={`${buttonLabel} ${building.name}`}
                  >
                    {locked && <FiLock className="h-3.5 w-3.5" aria-hidden="true" />}
                    {buttonLabel}
                  </AnimatedButton>
                  {!locked && (
                    <AnimatedButton
                      variant="ghost"
                      onClick={() =>
                        addToQueue.mutate(
                          { planetId: planet!.id, targetType: building.type },
                          {
                            onError: (e) =>
                              setError(e instanceof ApiError ? e.message : 'Erreur file'),
                          },
                        )
                      }
                      disabled={addToQueue.isPending || (queue?.length ?? 0) >= 5}
                      className="flex-1 whitespace-nowrap text-canopy-400 xl:w-36"
                      ariaLabel={`Mettre en file ${building.name}`}
                    >
                      <FiPlus className="h-3.5 w-3.5" />
                      File
                    </AnimatedButton>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
