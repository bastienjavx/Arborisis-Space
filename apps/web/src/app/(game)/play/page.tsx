'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  BUILDINGS,
  PLANET_SPECIALIZATIONS,
  PlanetSpecialization,
  SPECIALIZATION_CONFIGS,
  type BuildingType,
} from '@arborisis/shared';
import { useState } from 'react';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ResourceBar } from '@/components/ResourceBar';
import { keys, usePlanetDetail, useRenamePlanet, useSetSpecialization } from '@/lib/queries';
import { PlanetView } from '@/components/three';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { motion } from 'framer-motion';
import { FiCpu, FiEdit3, FiLayers, FiLock, FiShield, FiSun } from 'react-icons/fi';

const SPEC_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  leaf: FiSun,
  shield: FiShield,
  flask: FiCpu,
  lock: FiLock,
};

function RenameButton({ planetId, currentName }: { planetId: string; currentName: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const rename = useRenamePlanet(planetId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() && name.trim() !== currentName) {
      await rename.mutateAsync({ name: name.trim() });
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          type="text"
          className="input h-8 py-1 text-base"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          minLength={3}
          autoFocus
        />
        <button type="submit" className="text-xs text-canopy-300 hover:underline">
          OK
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setName(currentName);
          }}
          className="text-xs text-canopy-100/50 hover:text-canopy-100"
        >
          Annuler
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="ml-3 inline-grid h-8 w-8 place-items-center rounded-full border border-canopy-700/20 text-canopy-100/40 transition hover:border-canopy-400/40 hover:text-canopy-300"
      title="Renommer la planète"
      aria-label="Renommer la planète"
    >
      <FiEdit3 className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

export default function PlayPage() {
  const qc = useQueryClient();
  const { selectedId } = usePlanetSelection();
  const { data: planet, isLoading } = usePlanetDetail(selectedId);
  const specialize = useSetSpecialization(planet?.id ?? '');

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
    <div className="relative space-y-5">
      <PageHeader
        title={
          <span className="inline-flex items-center">
            {planet.name}
            <RenameButton planetId={planet.id} currentName={planet.name} />
          </span>
        }
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
        <ResourceBar resources={planet.resources} className="lg:hidden" />
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(25rem,0.8fr)_minmax(32rem,1.2fr)]">
        <div className="space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mycelium-panel overflow-hidden"
          >
            <div className="border-b border-canopy-700/15 px-5 py-4">
              <h2 className="section-title">Construction en cours</h2>
            </div>
            {planet.constructionJob ? (
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-canopy-700/25 bg-canopy-500/5 text-canopy-300">
                  <FiLayers className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-canopy-50">
                    {BUILDINGS[planet.constructionJob.targetType as BuildingType]?.name}
                  </p>
                  <p className="mt-1 text-xs text-canopy-100/38">
                    Croissance vers le niveau {planet.constructionJob.targetLevel}
                  </p>
                </div>
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
                className="px-5 py-5 text-sm text-canopy-100/40"
              >
                Aucune structure en croissance.
              </motion.p>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mycelium-panel overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-canopy-700/15 px-5 py-4">
              <h2 className="section-title">Structures notables</h2>
              <span className="text-[10px] uppercase tracking-[0.16em] text-canopy-100/30">
                Niveau
              </span>
            </div>
            {topBuildings.length > 0 ? (
              <div className="divide-y divide-canopy-700/10">
                {topBuildings.map((building, index) => (
                  <motion.div
                    key={building.type}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.42 + index * 0.05 }}
                    className="group flex items-center gap-3 px-5 py-3 transition hover:bg-canopy-500/[0.035]"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-canopy-700/20 bg-bark-950/60 text-canopy-400/60">
                      <FiLayers className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-sm text-canopy-100/75 group-hover:text-canopy-50">
                      {building.name}
                    </span>
                    <span className="font-display text-lg text-canopy-300/80">
                      {building.level}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-5 py-5 text-sm text-canopy-100/40"
              >
                Votre monde est vierge. Faites pousser vos premières structures.
              </motion.p>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mycelium-panel overflow-hidden"
          >
            <div className="border-b border-canopy-700/15 px-5 py-4">
              <h2 className="section-title">Spécialisation</h2>
              <p className="mt-1 text-xs text-canopy-100/38">
                Orientez le développement de cette colonie.
              </p>
            </div>
            <div className="grid gap-2 p-5 sm:grid-cols-2">
              <button
                type="button"
                disabled={specialize.isPending}
                onClick={() => specialize.mutate({ specialization: null })}
                className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition ${
                  planet.specialization === null
                    ? 'border-canopy-400/40 bg-canopy-500/10'
                    : 'border-canopy-700/15 hover:border-canopy-500/30 hover:bg-canopy-500/[0.035]'
                }`}
              >
                <span className="text-sm font-medium text-canopy-100/80">Aucune</span>
                <span className="text-[10px] leading-tight text-canopy-100/35">
                  Pas de bonus ni de malus.
                </span>
              </button>
              {PLANET_SPECIALIZATIONS.map((spec) => {
                const cfg = SPECIALIZATION_CONFIGS[spec];
                const Icon = SPEC_ICONS[cfg.icon];
                const active = planet.specialization === spec;
                return (
                  <button
                    key={spec}
                    type="button"
                    disabled={specialize.isPending}
                    onClick={() => specialize.mutate({ specialization: spec })}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-canopy-400/40 bg-canopy-500/10'
                        : 'border-canopy-700/15 hover:border-canopy-500/30 hover:bg-canopy-500/[0.035]'
                    }`}
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                      style={{ backgroundColor: `${cfg.color}22`, color: cfg.color }}
                    >
                      <Icon className="h-4 w-4" aria-hidden={true} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-canopy-100/80">
                        {cfg.name}
                      </span>
                      <span className="block text-[10px] leading-tight text-canopy-100/35">
                        {cfg.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.section>
        </div>

        <motion.section
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mycelium-panel relative min-h-[28rem] overflow-hidden xl:min-h-[37rem]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-canopy-700/15 bg-bark-950/45 px-5 py-4 backdrop-blur-md">
            <h2 className="section-title">Vue orbitale</h2>
            <span className="text-[10px] uppercase tracking-[0.18em] text-canopy-100/30">
              Synchronisation active
            </span>
          </div>
          <PlanetView className="absolute inset-0 h-full w-full pt-14" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_90px_rgba(0,0,0,0.55)]" />
        </motion.section>
      </div>
    </div>
  );
}
