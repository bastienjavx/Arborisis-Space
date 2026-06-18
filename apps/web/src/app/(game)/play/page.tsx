'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BUILDINGS, type BuildingType } from '@arborisis/shared';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import GlowText from '@/components/GlowText';
import { ParticleBackground } from '@/components/ParticleBackground';
import { StaggerContainer, StaggerItem } from '@/components/StaggerContainer';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ResourceBar } from '@/components/ResourceBar';
import { keys, usePlanetDetail } from '@/lib/queries';
import { PlanetView } from '@/components/three';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { motion } from 'framer-motion';

export default function PlayPage() {
  const qc = useQueryClient();
  const { selectedId } = usePlanetSelection();
  const { data: planet, isLoading } = usePlanetDetail(selectedId);

  if (isLoading || !planet) {
    return (
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-canopy-100/50">
        Chargement de la planète…
      </motion.p>
    );
  }

  const topBuildings = [...planet.buildings]
    .filter((b) => b.level > 0)
    .sort((a, b) => b.level - a.level)
    .slice(0, 6);

  const totalConstructionTime = planet.constructionJob
    ? (new Date(planet.constructionJob.finishesAt).getTime() -
        new Date(planet.constructionJob.startedAt ?? planet.constructionJob.finishesAt).getTime()) /
      1000
    : undefined;

  return (
    <div className="relative space-y-6">
      <ParticleBackground count={20} color="#16bf6c" />

      <PageHeader
        title={planet.name}
        subtitle={`${planet.isHomeworld ? 'Noyau-Monde' : 'Colonie'} · ${planet.coordinates.galaxy}:${planet.coordinates.system}:${planet.coordinates.position}`}
      >
        <StatCard
          label="Emplacements"
          value={`${planet.usedFields} / ${planet.maxFields}`}
          color="green"
          delay={0.1}
        />
      </PageHeader>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ResourceBar resources={planet.resources} />
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AnimatedCard delay={0.4} glow="green">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-canopy-100/60">
              Construction en cours
            </h2>
            {planet.constructionJob ? (
              <div className="flex items-center justify-between">
                <span>
                  {BUILDINGS[planet.constructionJob.targetType as BuildingType]?.name} → niveau{' '}
                  {planet.constructionJob.targetLevel}
                </span>
                <AnimatedCountdown
                  finishesAt={planet.constructionJob.finishesAt}
                  onDone={() => qc.invalidateQueries({ queryKey: keys.planet(planet.id) })}
                  showRing
                  totalSeconds={totalConstructionTime}
                />
              </div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-canopy-100/40"
              >
                Aucune structure en croissance.
              </motion.p>
            )}
          </AnimatedCard>

          <AnimatedCard delay={0.5} glow="green">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-canopy-100/60">
              Structures notables
            </h2>
            {topBuildings.length > 0 ? (
              <StaggerContainer staggerDelay={0.08} className="space-y-1 text-sm">
                {topBuildings.map((b) => (
                  <StaggerItem key={b.type}>
                    <div className="flex justify-between">
                      <span className="text-canopy-100/80">{b.name}</span>
                      <span className="text-canopy-300">niv. {b.level}</span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-canopy-100/40"
              >
                Votre monde est vierge. Faites pousser vos premières structures.
              </motion.p>
            )}
          </AnimatedCard>
        </div>

        <AnimatedCard delay={0.6} glow="purple" className="min-h-[16rem] lg:min-h-full">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-canopy-100/60">
            Vue orbitale
          </h2>
          <PlanetView className="h-64 w-full lg:h-[calc(100%-2rem)]" />
        </AnimatedCard>
      </div>
    </div>
  );
}
