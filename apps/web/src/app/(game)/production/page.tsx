'use client';

import {
  BUILDINGS,
  BuildingType,
  effectiveStability,
  type SetProductionIntensitiesDto,
} from '@arborisis/shared';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { FiActivity, FiSave, FiShield, FiSliders, FiZap } from 'react-icons/fi';
import { AnimatedButton } from '@/components/AnimatedButton';
import { PageHeader } from '@/components/PageHeader';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ResourceBar } from '@/components/ResourceBar';
import { StatCard } from '@/components/StatCard';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { usePlanetDetail, useSetProductionIntensities } from '@/lib/queries';

type Intensities = Partial<Record<BuildingType, number>>;

export default function ProductionPage() {
  const { selectedId } = usePlanetSelection();
  const { data: planet, isLoading } = usePlanetDetail(selectedId);
  const mutation = useSetProductionIntensities(planet?.id ?? '');
  const [intensities, setIntensities] = useState<Intensities>({});
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string>();
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

      <ResourceBar resources={planet.resources} className="lg:hidden" />

      {!balanced && (
        <section className="rounded-xl border border-red-500/25 bg-red-950/25 px-5 py-4 text-sm text-red-200/80">
          Le réseau consomme plus de photosynthèse qu’il n’en produit. Les rendements et la
          stabilité sont réduits à {Math.round(projectedRatio * 100)} %.
        </section>
      )}

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

      {(error || saved) && (
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

      <p className="flex items-center gap-2 text-xs text-canopy-100/35">
        <FiSliders className="h-4 w-4" aria-hidden="true" />
        Les ressources déjà produites sont comptabilisées avant tout changement d’intensité.
      </p>
    </div>
  );
}
