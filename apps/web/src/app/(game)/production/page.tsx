'use client';

import {
  BUILDINGS,
  BuildingType,
  ITEMS,
  PRODUCTION_LINE_RECIPES,
  ProductionLineStatus,
  ResourceType,
  effectiveStability,
  type SetProductionIntensitiesDto,
} from '@arborisis/shared';
import { GameIcon } from '@/components/GameIcon';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiPause,
  FiPlay,
  FiSave,
  FiShield,
  FiSliders,
  FiTrash2,
  FiZap,
} from 'react-icons/fi';
import { AnimatedButton } from '@/components/AnimatedButton';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { PageHeader } from '@/components/PageHeader';
import { usePlanetSelection } from '@/components/PlanetContext';
import { MobileResourceBar } from '@/components/MobileResourceBar';
import { StatCard } from '@/components/StatCard';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import {
  useCreateProductionLine,
  useDeleteProductionLine,
  usePlanetDetail,
  useProductionLines,
  useSetProductionIntensities,
  useUpdateProductionLine,
} from '@/lib/queries';

type Intensities = Partial<Record<BuildingType, number>>;
type Tab = 'structures' | 'lines';

const RESOURCE_LABELS: Record<ResourceType, string> = {
  [ResourceType.BIOMASS]: 'Biomasse',
  [ResourceType.SAP]: 'Sève',
  [ResourceType.MINERALS]: 'Minéraux',
  [ResourceType.SPORES]: 'Spores',
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  [ResourceType.BIOMASS]: 'leaf',
  [ResourceType.SAP]: 'droplets',
  [ResourceType.MINERALS]: 'pickaxe',
  [ResourceType.SPORES]: 'sparkles',
};

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function statusLabel(status: ProductionLineStatus) {
  if (status === ProductionLineStatus.ACTIVE) return 'Active';
  if (status === ProductionLineStatus.INPUT_SHORTAGE) return 'Intrants manquants';
  return 'En pause';
}

export default function ProductionPage() {
  const { selectedId } = usePlanetSelection();
  const { data: planet, isLoading } = usePlanetDetail(selectedId);
  const { data: productionLines } = useProductionLines();
  const mutation = useSetProductionIntensities(planet?.id ?? '');
  const createLine = useCreateProductionLine();
  const updateLine = useUpdateProductionLine();
  const deleteLine = useDeleteProductionLine();
  const [tab, setTab] = useState<Tab>('structures');
  const [intensities, setIntensities] = useState<Intensities>({});
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string>();
  const [lineError, setLineError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const producers = useMemo(
    () =>
      planet?.buildings.filter(
        (building) => BUILDINGS[building.type].producesResource && building.level > 0,
      ) ?? [],
    [planet],
  );

  useEffect(() => {
    if (!planet || dirty) return;
    setIntensities(
      Object.fromEntries(
        planet.buildings.map((building) => [building.type, building.productionIntensity]),
      ) as Intensities,
    );
  }, [planet, dirty]);

  if (isLoading || !planet) return <p className="text-canopy-100/50">Chargement…</p>;

  const currentPlanetId = planet.id;
  const planetLines = (productionLines ?? []).filter((line) => line.planetId === planet.id);
  const planetResources = planet.resources.amounts;

  const projectedConsumption = producers.reduce(
    (total, building) =>
      total +
      building.currentEnergyConsumption *
        ((intensities[building.type] ?? building.productionIntensity) / 100),
    0,
  );
  const projectedRatio =
    projectedConsumption > 0
      ? Math.min(1, planet.resources.energyProduced / projectedConsumption)
      : 1;
  const projectedStability = Math.round(
    effectiveStability(
      planet.resources.ecologicalStability,
      projectedRatio,
      planet.resources.stabilityMaximum,
    ),
  );
  const balanced = projectedRatio >= 1;

  function changeIntensity(type: BuildingType, value: number) {
    setIntensities((current) => ({ ...current, [type]: value }));
    setDirty(true);
    setSaved(false);
    setError(undefined);
  }

  async function save() {
    setError(undefined);
    try {
      const body: SetProductionIntensitiesDto = {
        intensities: Object.fromEntries(
          producers.map((building) => [
            building.type,
            intensities[building.type] ?? building.productionIntensity,
          ]),
        ),
      };
      const updated = await mutation.mutateAsync(body);
      setIntensities(
        Object.fromEntries(
          updated.buildings.map((building) => [building.type, building.productionIntensity]),
        ) as Intensities,
      );
      setDirty(false);
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Impossible d’enregistrer les réglages.',
      );
    }
  }

  async function createProductionLine(recipeId: string) {
    setLineError(undefined);
    try {
      await createLine.mutateAsync({ planetId: currentPlanetId, recipeId });
    } catch (cause) {
      setLineError(
        cause instanceof ApiError ? cause.message : 'Impossible de créer la ligne de production.',
      );
    }
  }

  async function setLineStatus(id: string, status: ProductionLineStatus) {
    setLineError(undefined);
    try {
      await updateLine.mutateAsync({ id, body: { status } });
    } catch (cause) {
      setLineError(
        cause instanceof ApiError
          ? cause.message
          : 'Impossible de modifier la ligne de production.',
      );
    }
  }

  async function removeLine(id: string) {
    setLineError(undefined);
    try {
      await deleteLine.mutateAsync(id);
    } catch (cause) {
      setLineError(
        cause instanceof ApiError
          ? cause.message
          : 'Impossible de supprimer la ligne de production.',
      );
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Régulation de production"
        subtitle="Ajustez l’activité des structures productrices pour équilibrer la photosynthèse et préserver l’écosystème."
      >
        <div className="flex flex-wrap gap-2">
          <StatCard
            label="Photosynthèse projetée"
            value={formatNumber(planet.resources.energyProduced - projectedConsumption)}
            hint={`${formatNumber(planet.resources.energyProduced)} produits · ${formatNumber(projectedConsumption)} consommés`}
            icon={<FiZap />}
            color={balanced ? 'green' : 'red'}
          />
          <StatCard
            label="Stabilité projetée"
            value={`${projectedStability}%`}
            hint={balanced ? 'Équilibre restauré' : 'Déficit actif'}
            icon={<FiShield />}
            color={balanced ? 'purple' : 'red'}
          />
        </div>
      </PageHeader>

      <MobileResourceBar resources={planet.resources} />

      <div className="inline-flex rounded-lg border border-canopy-700/20 bg-bark-900/70 p-1">
        <button
          type="button"
          onClick={() => setTab('structures')}
          className={`rounded-md px-3 py-2 text-sm transition ${
            tab === 'structures'
              ? 'bg-canopy-500/20 text-canopy-100'
              : 'text-canopy-100/45 hover:text-canopy-100/75'
          }`}
        >
          Structures
        </button>
        <button
          type="button"
          onClick={() => setTab('lines')}
          className={`rounded-md px-3 py-2 text-sm transition ${
            tab === 'lines'
              ? 'bg-canopy-500/20 text-canopy-100'
              : 'text-canopy-100/45 hover:text-canopy-100/75'
          }`}
        >
          Lignes automatiques
        </button>
      </div>

      {tab === 'structures' && !balanced && (
        <section className="rounded-xl border border-red-500/25 bg-red-950/25 px-5 py-4 text-sm text-red-200/80">
          Le réseau consomme plus de photosynthèse qu’il n’en produit. Les rendements et la
          stabilité sont réduits à {Math.round(projectedRatio * 100)} %.
        </section>
      )}

      {tab === 'structures' && (
        <section className="mycelium-panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-canopy-700/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title">Intensité des structures</h2>
              <p className="mt-1 text-xs text-canopy-100/38">
                La production et la consommation varient ensemble.
              </p>
            </div>
            <AnimatedButton
              onClick={save}
              disabled={!dirty || producers.length === 0}
              loading={mutation.isPending}
              className="w-full sm:w-auto"
            >
              <FiSave className="h-4 w-4" aria-hidden="true" />
              Enregistrer
            </AnimatedButton>
          </div>

          {producers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-canopy-100/42">
              Développez une structure productrice pour accéder aux réglages.
            </p>
          ) : (
            <div className="divide-y divide-canopy-700/10">
              {producers.map((building, index) => {
                const intensity = intensities[building.type] ?? building.productionIntensity;
                const effectiveProduction = building.currentProduction * (intensity / 100);
                const energyUse = building.currentEnergyConsumption * (intensity / 100);
                return (
                  <motion.article
                    key={building.type}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(14rem,1fr)_minmax(18rem,1.4fr)_12rem] lg:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-canopy-700/25 bg-canopy-500/5 text-canopy-300/70">
                        <FiActivity className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-sm text-canopy-50/90">{building.name}</h3>
                        <p className="mt-1 text-xs text-canopy-100/38">Niveau {building.level}</p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-canopy-100/45">Intensité</span>
                        <span className="font-semibold text-canopy-300">{intensity} %</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={intensity}
                        onChange={(event) =>
                          changeIntensity(building.type, Number(event.target.value))
                        }
                        className="h-2 w-full cursor-pointer accent-canopy-500"
                        aria-label={`Intensité de ${building.name}`}
                      />
                      <div className="mt-2 flex justify-between text-[10px] text-canopy-100/30">
                        <span>Veille</span>
                        <span>Rendement maximal</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs lg:grid-cols-1">
                      <span className="rounded-lg border border-canopy-700/15 px-3 py-2 text-canopy-100/48">
                        Production{' '}
                        <strong className="float-right text-canopy-100/80">
                          {formatNumber(effectiveProduction)}/h
                        </strong>
                      </span>
                      <span className="rounded-lg border border-canopy-700/15 px-3 py-2 text-canopy-100/48">
                        Photosynthèse{' '}
                        <strong className="float-right text-sap-400">
                          -{formatNumber(energyUse)}
                        </strong>
                      </span>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'lines' && (
        <section className="space-y-5">
          {lineError && (
            <p className="rounded-lg border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {lineError}
            </p>
          )}

          <div className="mycelium-panel overflow-hidden">
            <div className="border-b border-canopy-700/15 px-5 py-4">
              <h2 className="section-title">Lignes actives sur {planet.name}</h2>
              <p className="mt-1 text-xs text-canopy-100/38">
                {planetLines.length} / 3 lignes occupées.
              </p>
            </div>

            {planetLines.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-canopy-100/42">
                Aucune ligne automatique sur cette planète.
              </p>
            ) : (
              <div className="divide-y divide-canopy-700/10">
                {planetLines.map((line) => {
                  const item = ITEMS[line.outputKey];
                  return (
                    <article
                      key={line.id}
                      className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(14rem,1fr)_minmax(12rem,0.8fr)_auto] lg:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">
                          <GameIcon name={item.icon} className="h-6 w-6" />
                        </span>
                        <div>
                          <h3 className="text-sm text-canopy-50/90">{item.name}</h3>
                          <p className="mt-1 text-xs text-canopy-100/40">
                            {line.outputQty} unité(s) toutes les {formatDuration(line.cycleSeconds)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            line.status === ProductionLineStatus.INPUT_SHORTAGE
                              ? 'text-red-300'
                              : 'text-canopy-300'
                          }`}
                        >
                          {statusLabel(line.status)}
                        </p>
                        <p className="mt-1 text-xs text-canopy-100/38">
                          {line.nextRunAt ? (
                            <AnimatedCountdown finishesAt={line.nextRunAt} />
                          ) : (
                            'Aucun cycle planifié'
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {line.status === ProductionLineStatus.ACTIVE ? (
                          <button
                            type="button"
                            onClick={() => setLineStatus(line.id, ProductionLineStatus.PAUSED)}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-canopy-700/20 text-canopy-100/65 hover:bg-bark-800"
                            aria-label="Mettre en pause"
                          >
                            <FiPause aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setLineStatus(line.id, ProductionLineStatus.ACTIVE)}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-canopy-700/20 text-canopy-100/65 hover:bg-bark-800"
                            aria-label="Relancer"
                          >
                            <FiPlay aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/20 text-red-300/70 hover:bg-red-950/30"
                          aria-label="Supprimer"
                        >
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {PRODUCTION_LINE_RECIPES.map((recipe) => {
              const item = ITEMS[recipe.outputKey];
              const canStart = planetLines.length < 3;
              const affordable = Object.entries(recipe.inputs).every(
                ([resource, quantity]) =>
                  (planetResources[resource as ResourceType] ?? 0) >= (quantity ?? 0),
              );
              return (
                <article
                  key={recipe.id}
                  className="rounded-lg border border-canopy-700/15 bg-bark-900/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      <GameIcon name={item.icon} className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-canopy-50/90">{item.name}</h3>
                      <p className="mt-1 text-xs text-canopy-100/42">
                        {recipe.outputQty} unité(s) / {formatDuration(recipe.cycleSeconds)}
                      </p>
                    </div>
                    <a
                      href={`/market/${recipe.outputKey}`}
                      className="shrink-0 rounded-md border border-canopy-700/15 px-2 py-1 text-[10px] text-canopy-100/35 hover:border-canopy-500/30 hover:text-canopy-300"
                      title="Voir sur le marché"
                    >
                      ~{(item.baseValue * recipe.outputQty).toLocaleString()} B
                    </a>
                  </div>
                  <div className="mt-4 space-y-2">
                    {Object.entries(recipe.inputs).map(([resource, quantity]) => {
                      const key = resource as ResourceType;
                      const have = planetResources[key] ?? 0;
                      const ok = have >= (quantity ?? 0);
                      return (
                        <div key={resource} className="flex items-center gap-2 text-xs">
                          <span aria-hidden="true">
                            <GameIcon name={RESOURCE_ICONS[key]} className="h-4 w-4" />
                          </span>
                          <span className="flex-1 text-canopy-100/58">{RESOURCE_LABELS[key]}</span>
                          <span className={ok ? 'text-canopy-300' : 'text-red-300'}>
                            {formatNumber(have)} / {formatNumber(quantity ?? 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <AnimatedButton
                    onClick={() => createProductionLine(recipe.id)}
                    disabled={!canStart || createLine.isPending}
                    loading={createLine.isPending}
                    className="mt-4 w-full"
                  >
                    <FiPlay className="h-4 w-4" aria-hidden="true" />
                    {affordable ? 'Créer la ligne' : 'Créer malgré stock bas'}
                  </AnimatedButton>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'structures' && (error || saved) && (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? 'border-red-500/20 bg-red-950/30 text-red-300'
              : 'border-canopy-500/20 bg-canopy-950/30 text-canopy-300'
          }`}
        >
          {error ?? 'Réglages enregistrés. La stabilité a été recalculée.'}
        </p>
      )}

      {tab === 'structures' && (
        <p className="flex items-center gap-2 text-xs text-canopy-100/35">
          <FiSliders className="h-4 w-4" aria-hidden="true" />
          Les ressources déjà produites sont comptabilisées avant tout changement d’intensité.
        </p>
      )}
    </div>
  );
}
