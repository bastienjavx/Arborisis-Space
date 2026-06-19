'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { BuildingType } from '@arborisis/shared';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { AnimatedButton } from '@/components/AnimatedButton';
import { ResourceBar } from '@/components/ResourceBar';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ApiError } from '@/lib/api';
import { formatCost, formatDuration } from '@/lib/format';
import { keys, useCancelConstruction, usePlanetDetail, useUpgradeBuilding } from '@/lib/queries';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BuildingsPage() {
  const qc = useQueryClient();
  const { selectedId } = usePlanetSelection();
  const { data: planet, isLoading } = usePlanetDetail(selectedId);
  const upgrade = useUpgradeBuilding(selectedId ?? '');
  const cancel = useCancelConstruction(selectedId ?? '');
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
        title="Structures organiques"
        subtitle="Développez les tissus vivants de votre monde."
      />

      <ResourceBar resources={planet.resources} />

      <div className="flex flex-wrap gap-3">
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
            planet.buildings.reduce((sum, b) => sum + b.level, 0) / planet.buildings.length
          ).toFixed(1)}
          color="purple"
          delay={0.15}
        />
      </div>

      <AnimatePresence>
        {planet.constructionJob && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AnimatedCard
              className="flex items-center justify-between border-canopy-500/40"
              glow="green"
            >
              <div>
                <p className="text-sm text-canopy-100/60">
                  En croissance · niveau {planet.constructionJob.targetLevel}
                </p>
                <p className="font-mono text-canopy-300">
                  <AnimatedCountdown
                    finishesAt={planet.constructionJob.finishesAt}
                    onDone={() => qc.invalidateQueries({ queryKey: keys.planet(planet.id) })}
                    showRing
                    totalSeconds={totalConstructionTime}
                  />
                </p>
              </div>
              <AnimatedButton
                variant="ghost"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                Annuler
              </AnimatedButton>
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
        {planet.buildings.map((b, index) => {
          const locked = b.unmet.length > 0;
          const canBuild = !busy && !locked && b.canAfford && !upgrade.isPending;
          return (
            <AnimatedCard
              key={b.type}
              delay={index * 0.08}
              hover={!locked}
              className={locked ? 'grayscale opacity-60' : ''}
              glow={!locked && canBuild ? 'green' : 'none'}
            >
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium text-canopy-100">{b.name}</h3>
                  <span className="text-sm text-canopy-300">niv. {b.level}</span>
                </div>
                <p className="mt-1 text-xs text-canopy-100/50">{b.description}</p>
              </div>

              {b.currentProduction > 0 && (
                <p className="text-xs text-canopy-100/50">
                  Production actuelle : {b.currentProduction}/h
                </p>
              )}

              <div className="mt-auto space-y-1 text-xs text-canopy-100/60">
                <p>
                  <span className="text-canopy-100/40">Coût niv. {b.level + 1} :</span>{' '}
                  {formatCost(b.nextLevelCost)}
                </p>
                <p>
                  <span className="text-canopy-100/40">Durée :</span>{' '}
                  {formatDuration(b.nextLevelTimeSeconds)}
                </p>
                {locked && (
                  <p className="text-sap-400">
                    Requis : {b.unmet.map((u) => `${u.type} niv. ${u.requiredLevel}`).join(', ')}
                  </p>
                )}
              </div>

              <AnimatedButton
                variant="primary"
                onClick={() => onBuild(b.type)}
                disabled={!canBuild}
                glow={canBuild}
              >
                {busy
                  ? 'Occupé'
                  : locked
                    ? 'Verrouillé'
                    : b.canAfford
                      ? 'Faire croître'
                      : 'Ressources insuffisantes'}
              </AnimatedButton>
            </AnimatedCard>
          );
        })}
      </div>
    </div>
  );
}
