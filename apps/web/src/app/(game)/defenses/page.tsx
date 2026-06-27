'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BUILDINGS,
  RESEARCHES,
  DefenseType,
  RESOURCE_TYPES,
  type ResourceBundle,
} from '@arborisis/shared';
import { api, ApiError } from '@/lib/api';
import { formatDuration, formatNumber } from '@/lib/format';
import { keys, usePlanetDetail } from '@/lib/queries';
import { AnimatedButton } from '@/components/AnimatedButton';
import { MobileResourceBar } from '@/components/MobileResourceBar';
import { PageHeader } from '@/components/PageHeader';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ResourceCost } from '@/components/ResourceCost';
import { StatCard } from '@/components/StatCard';
import { FiClock, FiCrosshair, FiLock, FiShield, FiZap } from 'react-icons/fi';

const DEFENSE_ICONS: Record<DefenseType, typeof FiShield> = {
  [DefenseType.ION_CANNON]: FiZap,
  [DefenseType.SPORE_NET]: FiCrosshair,
  [DefenseType.SHIELD_MEMBRANE]: FiShield,
  [DefenseType.MYCELIAL_TURRET]: FiCrosshair,
  [DefenseType.VOID_LANCE]: FiZap,
  [DefenseType.ORBITAL_THORN_BED]: FiShield,
};

function multiplyCost(cost: ResourceBundle, quantity: number): ResourceBundle {
  const total: ResourceBundle = {};
  for (const resource of RESOURCE_TYPES) {
    const amount = cost[resource] ?? 0;
    if (amount > 0) total[resource] = amount * quantity;
  }
  return total;
}

function maxAffordable(cost: ResourceBundle, have: ResourceBundle | undefined): number {
  if (!have) return 0;
  let max = Number.POSITIVE_INFINITY;
  for (const resource of RESOURCE_TYPES) {
    const amount = cost[resource] ?? 0;
    if (amount <= 0) continue;
    max = Math.min(max, Math.floor((have[resource] ?? 0) / amount));
  }
  return Number.isFinite(max) ? Math.max(0, max) : 10_000;
}

function requirementLabel(requirement: {
  kind: 'building' | 'research';
  type: string;
  requiredLevel: number;
}) {
  const name =
    requirement.kind === 'building'
      ? BUILDINGS[requirement.type as keyof typeof BUILDINGS]?.name
      : RESEARCHES[requirement.type as keyof typeof RESEARCHES]?.name;
  return `${name ?? requirement.type} niv. ${requirement.requiredLevel}`;
}

export default function DefensesPage() {
  const qc = useQueryClient();
  const { selectedId: selectedPlanetId } = usePlanetSelection();
  const { data: planet } = usePlanetDetail(selectedPlanetId);
  const [quantities, setQuantities] = useState<Partial<Record<DefenseType, number>>>({});
  const [error, setError] = useState<string>();

  const { data, isLoading } = useQuery({
    queryKey: ['defenses', selectedPlanetId],
    queryFn: () => api.defenses(selectedPlanetId!),
    enabled: !!selectedPlanetId,
  });

  const build = useMutation({
    mutationFn: ({ defenseType, quantity }: { defenseType: DefenseType; quantity: number }) =>
      api.buildDefense(selectedPlanetId!, defenseType, quantity),
    onSuccess: () => {
      setError(undefined);
      setQuantities({});
      void qc.invalidateQueries({ queryKey: ['defenses', selectedPlanetId] });
      if (selectedPlanetId) void qc.invalidateQueries({ queryKey: keys.planet(selectedPlanetId) });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Construction impossible.'),
  });

  const totalOwned = useMemo(
    () => (data?.defenses ?? []).reduce((sum, defense) => sum + defense.quantity, 0),
    [data?.defenses],
  );

  if (!selectedPlanetId) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-canopy-100/50">
        Sélectionnez une planète pour gérer ses défenses.
      </div>
    );
  }

  if (isLoading || !data || !planet) {
    return <p className="text-canopy-100/50">Chargement des défenses…</p>;
  }

  const amounts = planet.resources.amounts;

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <>
            Défenses <span className="italic text-canopy-300">orbitales</span>
          </>
        }
        subtitle="Fortifiez vos planètes avec des structures permanentes et lisibles avant chaque engagement."
      >
        <StatCard
          label="Unités"
          value={formatNumber(totalOwned)}
          hint="Défenses construites"
          icon={<FiShield aria-hidden="true" />}
          color="green"
        />
        <StatCard
          label="Attaque"
          value={formatNumber(data.totalAttack)}
          icon={<FiZap aria-hidden="true" />}
          color="red"
          delay={0.05}
        />
        <StatCard
          label="Défense"
          value={formatNumber(data.totalDefense)}
          icon={<FiShield aria-hidden="true" />}
          color="purple"
          delay={0.1}
        />
      </PageHeader>

      <MobileResourceBar resources={planet.resources} />

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <section className="mycelium-panel overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-canopy-700/15 px-5 py-4">
          <span
            className="h-1.5 w-1.5 rotate-45 bg-canopy-400/70"
            style={{ boxShadow: '0 0 10px rgba(63,217,137,0.5)' }}
            aria-hidden="true"
          />
          <h2 className="section-title">Catalogue défensif</h2>
        </div>

        <div className="hidden grid-cols-[minmax(16rem,1.35fr)_5rem_minmax(12rem,1fr)_7rem_7rem_minmax(11rem,0.85fr)_10rem] gap-4 border-b border-canopy-700/15 bg-canopy-500/[0.025] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-canopy-100/32 xl:grid">
          <span>Défense</span>
          <span>Stock</span>
          <span>Coût</span>
          <span>Temps</span>
          <span>Max</span>
          <span>Quantité</span>
          <span className="text-right">Action</span>
        </div>

        <div className="divide-y divide-canopy-700/10">
          {data.defenses.map((defense) => {
            const Icon = DEFENSE_ICONS[defense.type] ?? FiShield;
            const requested = quantities[defense.type] ?? 1;
            const max = Math.min(10_000, maxAffordable(defense.cost, amounts));
            const locked = defense.unmet.length > 0;
            const clamped = Math.min(10_000, Math.max(1, requested));
            const totalCost = multiplyCost(defense.cost, clamped);
            const canAffordQuantity = !locked && clamped <= max;
            const loading = build.isPending && build.variables?.defenseType === defense.type;

            return (
              <article
                key={defense.type}
                className={`grid gap-4 px-5 py-4 transition hover:bg-canopy-500/[0.025] xl:grid-cols-[minmax(16rem,1.35fr)_5rem_minmax(12rem,1fr)_7rem_7rem_minmax(11rem,0.85fr)_10rem] xl:items-center ${
                  locked ? 'opacity-60' : ''
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-canopy-700/25 bg-bark-950/60 text-canopy-300/70">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm text-canopy-50/90">{defense.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-canopy-100/38">
                      {defense.description}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-canopy-100/38">
                      <span>Att. {formatNumber(defense.attack)}</span>
                      <span>Déf. {formatNumber(defense.defense)}</span>
                      <span>Coque {formatNumber(defense.hull)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between xl:block">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-canopy-100/30 xl:hidden">
                    Stock
                  </span>
                  <span className="font-display text-2xl text-canopy-100/85">
                    {formatNumber(defense.quantity)}
                  </span>
                </div>

                <div>
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-canopy-100/30 xl:hidden">
                    Coût
                  </span>
                  <ResourceCost cost={totalCost} have={amounts} />
                </div>

                <div className="flex items-center gap-2 text-xs text-canopy-100/50">
                  <FiClock className="h-4 w-4 text-canopy-300/50" aria-hidden="true" />
                  {formatDuration(defense.buildTimeSeconds * clamped)}
                </div>

                <div className="text-xs text-canopy-100/50">
                  <span className="mr-2 text-[10px] uppercase tracking-[0.12em] text-canopy-100/30 xl:hidden">
                    Max
                  </span>
                  {locked ? 'Verrouillé' : formatNumber(max)}
                </div>

                <div className="space-y-1">
                  <input
                    type="number"
                    min={1}
                    max={10_000}
                    value={requested}
                    onChange={(event) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [defense.type]: Math.min(
                          10_000,
                          Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                        ),
                      }))
                    }
                    className="input min-h-9 py-1.5 text-xs"
                    aria-label={`Quantité de ${defense.name}`}
                  />
                  {!locked && max > 0 && requested > max && (
                    <button
                      type="button"
                      onClick={() =>
                        setQuantities((prev) => ({
                          ...prev,
                          [defense.type]: max,
                        }))
                      }
                      className="text-[10px] text-canopy-300/75 transition hover:text-canopy-200"
                    >
                      Ajuster à {formatNumber(max)}
                    </button>
                  )}
                  {locked && (
                    <p className="text-[10px] leading-4 text-red-300/75">
                      {defense.unmet.map(requirementLabel).join(', ')}
                    </p>
                  )}
                </div>

                <AnimatedButton
                  variant="ghost"
                  onClick={() => {
                    setError(undefined);
                    build.mutate({ defenseType: defense.type, quantity: clamped });
                  }}
                  disabled={build.isPending || !canAffordQuantity}
                  loading={loading}
                  className="whitespace-nowrap xl:w-40"
                  ariaLabel={`Construire ${defense.name}`}
                >
                  {locked && <FiLock className="h-3.5 w-3.5" aria-hidden="true" />}
                  {locked ? 'Verrouillé' : canAffordQuantity ? 'Construire' : 'Ressources'}
                </AnimatedButton>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
