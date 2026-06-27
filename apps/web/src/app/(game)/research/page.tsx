'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RESEARCHES, type ResearchType } from '@arborisis/shared';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { AnimatedButton } from '@/components/AnimatedButton';
import { MobileResourceBar } from '@/components/MobileResourceBar';
import { ResourceCost } from '@/components/ResourceCost';
import { WikiPopover } from '@/components/WikiPopover';
import { codexId } from '@/lib/codex';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ApiError } from '@/lib/api';
import { formatDuration } from '@/lib/format';
import { keys, usePlanetDetail, useResearch, useStartResearch } from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiLock, FiShare2 } from 'react-icons/fi';

export default function ResearchPage() {
  const qc = useQueryClient();
  const { selectedId } = usePlanetSelection();
  const { data, isLoading } = useResearch(selectedId);
  const { data: planet } = usePlanetDetail(selectedId);
  const start = useStartResearch(selectedId ?? '');
  const [error, setError] = useState<string>();

  if (isLoading || !data || !planet) return <p className="text-canopy-100/50">Chargement…</p>;

  const busy = !!data.activeJob;

  function onStart(type: ResearchType) {
    setError(undefined);
    start.mutate(
      { planetId: selectedId!, type },
      { onError: (e) => setError(e instanceof ApiError ? e.message : 'Erreur') },
    );
  }

  const totalResearchTime = data.activeJob
    ? (new Date(data.activeJob.finishesAt).getTime() -
        new Date(data.activeJob.startedAt ?? data.activeJob.finishesAt).getTime()) /
      1000
    : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <>
            Mycélium de <span className="italic text-spore-400">recherche</span>
          </>
        }
        subtitle="Recherchez et développez les connaissances du réseau mycélien."
      >
        <div className="flex flex-wrap gap-2">
          <StatCard
            label="Niveau total"
            value={data.researches.reduce((sum, research) => sum + research.level, 0).toString()}
            color="purple"
            delay={0.1}
          />
          <StatCard
            label="Technologies"
            value={data.researches.length.toString()}
            hint={`${data.researches.filter((research) => research.level > 0).length} débloquées`}
            color="gold"
            delay={0.15}
          />
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-x-6 gap-y-2 px-1 text-xs text-canopy-100/42">
        <span className="inline-flex items-center gap-2">
          <FiShare2 className="h-4 w-4 text-spore-400/60" aria-hidden="true" />
          Portée : tout l’empire
        </span>
        <span>Ressources : {planet.name}</span>
      </div>

      <MobileResourceBar resources={planet.resources} />

      <AnimatePresence>
        {data.activeJob && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <section className="mycelium-panel overflow-hidden">
              <div className="border-b border-canopy-700/15 px-5 py-3">
                <h2 className="section-title">Recherche active</h2>
              </div>
              <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-spore-500/25 bg-spore-500/5 text-spore-400">
                  <FiShare2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-canopy-50">
                    {RESEARCHES[data.activeJob.targetType as ResearchType]?.name} → niveau{' '}
                    {data.activeJob.targetLevel}
                  </p>
                  <p className="mt-1 text-xs text-canopy-100/38">Propagation dans tout l’empire</p>
                </div>
                <div className="min-w-0 flex-[1.5] text-spore-400">
                  <AnimatedCountdown
                    finishesAt={data.activeJob.finishesAt}
                    onDone={() => qc.invalidateQueries({ queryKey: keys.research(selectedId!) })}
                    showRing
                    totalSeconds={totalResearchTime}
                  />
                </div>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

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
            className="h-1.5 w-1.5 rotate-45 bg-spore-400/70"
            style={{ boxShadow: '0 0 10px rgba(155,140,255,0.5)' }}
            aria-hidden="true"
          />
          <h2 className="section-title">Technologies</h2>
        </div>
        <div className="hidden grid-cols-[minmax(16rem,1.6fr)_6rem_minmax(13rem,1.1fr)_7rem_minmax(11rem,1fr)_9rem] gap-4 border-b border-canopy-700/15 bg-spore-500/[0.02] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-canopy-100/32 xl:grid">
          <span>Technologie</span>
          <span>Niveau</span>
          <span>Coût</span>
          <span>Durée</span>
          <span>Prérequis</span>
          <span className="text-right">Action</span>
        </div>
        <div className="divide-y divide-canopy-700/10">
          {data.researches.map((research, index) => {
            const locked = research.unmet.length > 0;
            const isActive = data.activeJob?.targetType === research.type;
            const canStart = !busy && !locked && research.canAfford && !start.isPending;
            const buttonLabel = isActive
              ? 'En cours'
              : busy
                ? 'Mycélium occupé'
                : locked
                  ? 'Verrouillé'
                  : research.canAfford
                    ? 'Rechercher'
                    : 'Ressources requises';

            return (
              <motion.article
                key={research.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.045, 0.4) }}
                className={`grid gap-4 px-5 py-4 transition hover:bg-spore-500/[0.025] xl:grid-cols-[minmax(16rem,1.6fr)_6rem_minmax(13rem,1.1fr)_7rem_minmax(11rem,1fr)_9rem] xl:items-center ${locked ? 'opacity-55' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-spore-500/20 bg-spore-500/[0.035] text-spore-400/70">
                    <FiShare2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm text-canopy-50/90">
                      <WikiPopover entryId={codexId.research(research.type)}>
                        {research.name}
                      </WikiPopover>
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-canopy-100/38">
                      {research.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between xl:block">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-canopy-100/30 xl:hidden">
                    Niveau
                  </span>
                  <span className="font-display text-xl text-canopy-100/85">
                    {research.level} <span className="text-spore-400/55">→</span>{' '}
                    {research.level + 1}
                  </span>
                </div>
                <div>
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-canopy-100/30 xl:hidden">
                    Coût
                  </span>
                  <ResourceCost cost={research.nextLevelCost} have={planet.resources.amounts} />
                </div>
                <div className="flex items-center gap-2 text-xs text-canopy-100/50">
                  <FiClock className="h-4 w-4 text-spore-400/55" aria-hidden="true" />
                  {formatDuration(research.nextLevelTimeSeconds)}
                </div>
                <div className="text-xs leading-5">
                  {locked ? (
                    <span className="text-red-300/75">
                      {research.unmet
                        .map(
                          (requirement) => `${requirement.type} niv. ${requirement.requiredLevel}`,
                        )
                        .join(', ')}
                    </span>
                  ) : research.canAfford ? (
                    <span className="text-canopy-100/42">Conditions remplies</span>
                  ) : (
                    <span className="text-red-300/70">Ressources insuffisantes</span>
                  )}
                </div>
                <AnimatedButton
                  variant="ghost"
                  onClick={() => onStart(research.type)}
                  disabled={!canStart}
                  loading={start.isPending && start.variables?.type === research.type}
                  className="w-full whitespace-nowrap xl:w-36"
                  ariaLabel={`${buttonLabel} ${research.name}`}
                >
                  {locked && <FiLock className="h-3.5 w-3.5" aria-hidden="true" />}
                  {buttonLabel}
                </AnimatedButton>
              </motion.article>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-2 rounded-xl border border-canopy-700/15 bg-bark-950/35 px-5 py-4 text-xs text-canopy-100/42 sm:flex-row sm:justify-between">
        <span>Les technologies de recherche s’appliquent à tout l’empire.</span>
        <span>Les ressources sont prélevées sur {planet.name}.</span>
      </div>
    </div>
  );
}
