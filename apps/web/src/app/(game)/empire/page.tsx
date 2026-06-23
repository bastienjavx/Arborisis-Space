'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { useEmpireOverview } from '@/lib/queries';
import { formatNumber } from '@/lib/format';
import { motion } from 'framer-motion';
import { FiGlobe, FiLayers, FiNavigation, FiTrendingUp, FiZap } from 'react-icons/fi';
import type { EmpirePlanetStats, ResourceBundle } from '@arborisis/shared';

const RESOURCE_LABELS: Record<string, string> = {
  BIOMASS: 'Biomasse',
  SAP: 'Sève',
  MINERALS: 'Minéraux',
  SPORES: 'Spores',
};

const RESOURCE_COLORS: Record<string, string> = {
  BIOMASS: 'text-canopy-300',
  SAP: 'text-amber-300',
  MINERALS: 'text-slate-300',
  SPORES: 'text-violet-300',
};

function ResourceRow({
  label,
  amount,
  rate,
  colorClass,
}: {
  label: string;
  amount: number;
  rate: number | undefined;
  colorClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
      <div className="flex items-center gap-3 text-right">
        <span className="text-xs text-canopy-100/70">{formatNumber(amount)}</span>
        <span className="min-w-[5rem] text-right text-[11px] text-canopy-400/70">
          +{formatNumber(rate ?? 0)}/h
        </span>
      </div>
    </div>
  );
}

function PlanetCard({ planet }: { planet: EmpirePlanetStats }) {
  const resourceEntries = Object.entries(planet.resources) as [string, number | undefined][];

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mycelium-panel overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-canopy-700/15 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <FiGlobe className="h-4 w-4 text-canopy-300/70" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-medium text-canopy-100">{planet.planetName}</h3>
            <p className="text-[11px] text-canopy-400/60">
              {planet.coordinates.galaxy}:{planet.coordinates.system}:{planet.coordinates.position}
            </p>
          </div>
        </div>
        <Link
          href="/play"
          className="text-[11px] text-canopy-400/60 transition hover:text-canopy-300"
        >
          Gérer →
        </Link>
      </div>

      <div className="grid grid-cols-1 divide-y divide-canopy-700/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-canopy-400/50">
            Ressources
          </p>
          {resourceEntries.map(([key, amount]) => (
            <ResourceRow
              key={key}
              label={RESOURCE_LABELS[key] ?? key}
              amount={amount ?? 0}
              rate={planet.production[key as keyof typeof planet.production]}
              colorClass={RESOURCE_COLORS[key] ?? 'text-canopy-300'}
            />
          ))}
        </div>

        <div className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-canopy-400/50">
              Flotte &amp; Stabilité
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                planet.stability >= 80
                  ? 'bg-canopy-500/15 text-canopy-300'
                  : planet.stability >= 50
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-red-500/15 text-red-300'
              }`}
            >
              Stabilité {planet.stability}%
            </span>
          </div>
          {Object.entries(planet.ships).map(([type, qty]) =>
            (qty ?? 0) > 0 ? (
              <div key={type} className="flex items-center justify-between py-1">
                <span className="text-xs text-canopy-100/60">{type}</span>
                <span className="text-xs text-canopy-300/80">{formatNumber(qty ?? 0)}</span>
              </div>
            ) : null,
          )}
          {planet.totalShips === 0 && (
            <p className="text-xs text-canopy-400/40">Aucun vaisseau stationné</p>
          )}
          <div className="mt-3 border-t border-canopy-700/10 pt-3 text-[11px] text-canopy-400/50">
            {planet.usedFields}/{planet.maxFields} emplacements utilisés
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function EmpirePage() {
  const { data: empire, isLoading } = useEmpireOverview();

  if (isLoading || !empire) {
    return <p className="text-canopy-100/50">Chargement de l&apos;empire…</p>;
  }

  const totalShipCount = empire.totalShips;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            Vue <span className="italic text-canopy-300">d&apos;Empire</span>
          </>
        }
        subtitle="Synthèse mycélienne de toutes vos colonies et de leurs ressources agrégées."
      >
        <div className="flex flex-wrap gap-2">
          <StatCard
            label="Colonies"
            value={empire.planets.length.toString()}
            icon={<FiGlobe />}
            color="green"
            delay={0.05}
          />
          <StatCard
            label="Vaisseaux"
            value={formatNumber(totalShipCount)}
            icon={<FiNavigation />}
            color="purple"
            delay={0.1}
          />
          <StatCard
            label="Jobs actifs"
            value={Object.values(empire.activeJobs)
              .reduce((a, b) => a + b, 0)
              .toString()}
            icon={<FiZap />}
            color="purple"
            delay={0.15}
          />
        </div>
      </PageHeader>

      {/* Agrégats de ressources */}
      <section className="mycelium-panel overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-canopy-700/15 px-5 py-3.5">
          <FiTrendingUp className="h-4 w-4 text-canopy-300/70" aria-hidden="true" />
          <h2 className="section-title">Production agrégée</h2>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-x divide-canopy-700/10 sm:grid-cols-4">
          {(Object.entries(empire.totalResources) as [string, number | undefined][]).map(
            ([key, amount]) => (
              <div key={key} className="px-5 py-4">
                <p className={`text-xs font-medium ${RESOURCE_COLORS[key] ?? 'text-canopy-300'}`}>
                  {RESOURCE_LABELS[key] ?? key}
                </p>
                <p className="mt-1 font-display text-xl text-canopy-100">
                  {formatNumber(amount ?? 0)}
                </p>
                <p className="mt-0.5 text-[11px] text-canopy-400/60">
                  +
                  {formatNumber(
                    (empire.totalProduction as ResourceBundle)[key as keyof ResourceBundle] ?? 0,
                  )}
                  /h
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Jobs actifs */}
      {(Object.values(empire.activeJobs) as number[]).some((n) => n > 0) && (
        <section className="mycelium-panel overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-canopy-700/15 px-5 py-3.5">
            <FiZap className="h-4 w-4 text-canopy-300/70" aria-hidden="true" />
            <h2 className="section-title">Jobs en cours</h2>
          </div>
          <div className="flex flex-wrap gap-4 px-5 py-4">
            {(
              [
                { key: 'constructions', label: 'Constructions', icon: FiLayers },
                { key: 'researches', label: 'Recherches', icon: FiZap },
                { key: 'expeditions', label: 'Expéditions', icon: FiNavigation },
                { key: 'pvpMissions', label: 'Missions PvP', icon: FiNavigation },
                { key: 'pveMissions', label: 'Missions PvE', icon: FiNavigation },
                { key: 'transfers', label: 'Transferts', icon: FiNavigation },
                { key: 'colonizations', label: 'Essaimages', icon: FiGlobe },
              ] as {
                key: keyof typeof empire.activeJobs;
                label: string;
                icon: React.ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>;
              }[]
            )
              .filter(({ key }) => empire.activeJobs[key] > 0)
              .map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-full border border-canopy-700/25 bg-canopy-500/5 px-3 py-1.5"
                >
                  <Icon className="h-3.5 w-3.5 text-canopy-300/70" aria-hidden="true" />
                  <span className="text-xs text-canopy-200/80">{label}</span>
                  <span className="font-display text-sm text-canopy-300">
                    {empire.activeJobs[key]}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Liste des colonies */}
      <section className="space-y-4">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-canopy-400/50">
          Colonies ({empire.planets.length})
        </h2>
        {empire.planets.map((planet) => (
          <PlanetCard key={planet.planetId} planet={planet} />
        ))}
      </section>
    </div>
  );
}
