'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RESEARCHES, type ResearchType } from '@arborisis/shared';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { AnimatedButton } from '@/components/AnimatedButton';
import { ResourceBar } from '@/components/ResourceBar';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ApiError } from '@/lib/api';
import { formatCost, formatDuration } from '@/lib/format';
import { keys, usePlanetDetail, useResearch, useStartResearch } from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';

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
        title="Mycélium de recherche"
        subtitle="Les recherches profitent à tout l'empire. Les ressources sont prélevées sur la planète active."
      />

      <ResourceBar resources={planet.resources} />

      <div className="flex flex-wrap gap-3">
        <StatCard
          label="Niveau total"
          value={data.researches.reduce((sum, r) => sum + r.level, 0).toString()}
          color="purple"
          delay={0.1}
        />
        <StatCard
          label="Technologies"
          value={data.researches.length.toString()}
          hint={`${data.researches.filter((r) => r.level > 0).length} débloquées`}
          color="gold"
          delay={0.15}
        />
      </div>

      <AnimatePresence>
        {data.activeJob && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AnimatedCard
              className="flex items-center justify-between border-spore-500/40"
              glow="purple"
            >
              <div>
                <p className="text-sm text-canopy-100/60">
                  {RESEARCHES[data.activeJob.targetType as ResearchType]?.name} → niveau{' '}
                  {data.activeJob.targetLevel}
                </p>
                <p className="font-mono text-spore-400">
                  <AnimatedCountdown
                    finishesAt={data.activeJob.finishesAt}
                    onDone={() => qc.invalidateQueries({ queryKey: keys.research(selectedId!) })}
                    showRing
                    totalSeconds={totalResearchTime}
                  />
                </p>
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="h-3 w-3 rounded-full bg-spore-500"
              />
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.researches.map((r, index) => {
          const locked = r.unmet.length > 0;
          const canStart = !busy && !locked && r.canAfford && !start.isPending;
          return (
            <AnimatedCard
              key={r.type}
              delay={index * 0.08}
              hover={!locked}
              className={locked ? 'grayscale opacity-60' : ''}
              glow={!locked && canStart ? 'purple' : 'none'}
            >
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium text-canopy-100">{r.name}</h3>
                  <span className="text-sm text-spore-400">niv. {r.level}</span>
                </div>
                <p className="mt-1 text-xs text-canopy-100/50">{r.description}</p>
              </div>

              <div className="mt-auto space-y-1 text-xs text-canopy-100/60">
                <p>
                  <span className="text-canopy-100/40">Coût niv. {r.level + 1} :</span>{' '}
                  {formatCost(r.nextLevelCost)}
                </p>
                <p>
                  <span className="text-canopy-100/40">Durée :</span>{' '}
                  {formatDuration(r.nextLevelTimeSeconds)}
                </p>
                {locked && (
                  <p className="text-sap-400">
                    Requis : {r.unmet.map((u) => `${u.type} niv. ${u.requiredLevel}`).join(', ')}
                  </p>
                )}
              </div>

              <AnimatedButton
                variant="primary"
                onClick={() => onStart(r.type)}
                disabled={!canStart}
                glow={canStart}
              >
                {busy
                  ? 'Occupé'
                  : locked
                    ? 'Verrouillé'
                    : r.canAfford
                      ? 'Étudier'
                      : 'Ressources insuffisantes'}
              </AnimatedButton>
            </AnimatedCard>
          );
        })}
      </div>
    </div>
  );
}
