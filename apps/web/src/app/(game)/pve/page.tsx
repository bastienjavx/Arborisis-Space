'use client';

import { useMemo, useState } from 'react';
import {
  NpcEncounterType,
  NPC_ENCOUNTER_CONFIGS,
  PveMissionPhase,
  ShipType,
  SHIP_TYPES,
  type NpcEncounterView,
} from '@arborisis/shared';
import { AnimatedButton } from '@/components/AnimatedButton';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { PageHeader } from '@/components/PageHeader';
import { usePlanetSelection } from '@/components/PlanetContext';
import { QuantityControl } from '@/components/QuantityControl';
import { ResourceCost } from '@/components/ResourceCost';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { useAttackEncounter, useEncounters, useFleet, usePveMissions, usePveReports } from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCircle,
  FiClock,
  FiCrosshair,
  FiFilter,
  FiMinus,
  FiShield,
} from 'react-icons/fi';

const ENCOUNTER_NAMES: Record<NpcEncounterType, string> = Object.fromEntries(
  Object.entries(NPC_ENCOUNTER_CONFIGS).map(([type, config]) => [type, config.name]),
) as Record<NpcEncounterType, string>;

const PHASE_LABELS: Record<PveMissionPhase, string> = {
  [PveMissionPhase.TRAVEL]: 'Trajet',
  [PveMissionPhase.COMBAT]: 'Combat',
  [PveMissionPhase.RETURNING]: 'Retour',
  [PveMissionPhase.COMPLETED]: 'Terminée',
};

type TierFilter = 'all' | 'easy' | 'medium' | 'hard' | 'elite';

const TIER_FILTERS: TierFilter[] = ['all', 'easy', 'medium', 'hard', 'elite'];

const TIER_LABELS: Record<TierFilter, string> = {
  all: 'Tous',
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
  elite: 'Élite',
};

const ENCOUNTER_NAMES_PVE: Record<NpcEncounterType, string> = Object.fromEntries(
  Object.entries(NPC_ENCOUNTER_CONFIGS).map(([type, cfg]) => [type, cfg.name]),
) as Record<NpcEncounterType, string>;

function pveOutcomeStyle(outcome: string) {
  if (outcome === 'SUCCESS') return { label: 'Victoire', cls: 'text-canopy-300', Icon: FiCheckCircle };
  if (outcome === 'FAILURE') return { label: 'Défaite', cls: 'text-red-300', Icon: FiAlertTriangle };
  if (outcome === 'DRAW') return { label: 'Nul', cls: 'text-sap-400', Icon: FiMinus };
  return { label: '—', cls: 'text-canopy-100/30', Icon: FiMinus };
}

export default function PvePage() {
  const { selectedId } = usePlanetSelection();
  const { data: encounters, isLoading: loadingEncounters } = useEncounters();
  const { data: missions, isLoading: loadingMissions } = usePveMissions();
  const { data: fleet, isLoading: loadingFleet } = useFleet(selectedId);
  const { data: history } = usePveReports();
  const [selectedEncounter, setSelectedEncounter] = useState<NpcEncounterView | null>(null);
  const [ships, setShips] = useState<Record<ShipType, number>>(
    Object.fromEntries(SHIP_TYPES.map((type) => [type, 0])) as Record<ShipType, number>,
  );
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [error, setError] = useState<string>();

  const filteredEncounters = useMemo(() => {
    if (!encounters) return [];
    if (tierFilter === 'all') return encounters;
    return encounters.filter((e) => NPC_ENCOUNTER_CONFIGS[e.type].tier === tierFilter);
  }, [encounters, tierFilter]);

  const activeEncounter = selectedEncounter ?? filteredEncounters?.[0] ?? null;
  const attack = useAttackEncounter(activeEncounter?.id ?? '', selectedId ?? '');

  const docked = useMemo(() => {
    if (!fleet) return {} as Record<ShipType, number>;
    return Object.fromEntries(
      SHIP_TYPES.map((type) => [type, fleet.ships.find((s) => s.type === type)?.available ?? 0]),
    ) as Record<ShipType, number>;
  }, [fleet]);

  function resetForm() {
    setShips(Object.fromEntries(SHIP_TYPES.map((type) => [type, 0])) as Record<ShipType, number>);
    setError(undefined);
  }

  function message(reason: unknown) {
    setError(reason instanceof ApiError ? reason.message : 'Une erreur est survenue.');
  }

  if (loadingEncounters || loadingMissions || loadingFleet || !fleet)
    return <p className="text-canopy-100/50">Scan des anomalies…</p>;

  return (
    <div className="space-y-5">
      <PageHeader title="Anomalies hostiles" subtitle="Menaces détectées autour de votre empire." />

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

      {!encounters || encounters.length === 0 ? (
        <div className="mycelium-panel px-5 py-8 text-sm text-canopy-100/45">
          Aucune anomalie hostile dans ce secteur.
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(28rem,1fr)_minmax(25rem,0.85fr)]">
          <section className="mycelium-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-canopy-700/15 px-5 py-3">
              <h2 className="section-title">Anomalies détectées</h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.14em] text-canopy-100/30">
                  {filteredEncounters.length} signaux
                </span>
                <div className="flex items-center gap-2">
                  <FiFilter className="h-3.5 w-3.5 text-canopy-100/30" aria-hidden="true" />
                  {TIER_FILTERS.map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => {
                        setTierFilter(tier);
                        setSelectedEncounter(null);
                      }}
                      className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider transition ${
                        tierFilter === tier
                          ? 'bg-canopy-500/20 text-canopy-200'
                          : 'text-canopy-100/40 hover:bg-canopy-500/10 hover:text-canopy-200/70'
                      }`}
                    >
                      {TIER_LABELS[tier]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="divide-y divide-canopy-700/10">
              {filteredEncounters.map((encounter, index) => {
                const selected = activeEncounter?.id === encounter.id;
                return (
                  <motion.button
                    key={encounter.id}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.045 }}
                    onClick={() => {
                      setSelectedEncounter(encounter);
                      resetForm();
                    }}
                    className={`grid w-full gap-4 border-l-2 px-5 py-4 text-left transition sm:grid-cols-[3rem_minmax(10rem,1.3fr)_minmax(9rem,1fr)_5rem] sm:items-center ${
                      selected
                        ? 'border-red-400 bg-red-500/[0.045]'
                        : 'border-transparent hover:bg-canopy-500/[0.025]'
                    }`}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-red-500/25 bg-red-500/[0.045] text-red-300/75">
                      <FiAlertTriangle className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="block truncate font-display text-lg text-canopy-50/88">
                          {ENCOUNTER_NAMES[encounter.type]}
                        </span>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                          style={{
                            backgroundColor: `${NPC_ENCOUNTER_CONFIGS[encounter.type].color}22`,
                            color: NPC_ENCOUNTER_CONFIGS[encounter.type].color,
                          }}
                        >
                          {TIER_LABELS[NPC_ENCOUNTER_CONFIGS[encounter.type].tier]}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-canopy-100/38">
                        Niveau {encounter.difficulty} · {encounter.coordinates.galaxy}:
                        {encounter.coordinates.system}:{encounter.coordinates.position}
                      </span>
                    </span>
                    <span>
                      <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-canopy-100/28">
                        Récompenses
                      </span>
                      <ResourceCost cost={encounter.rewards} />
                    </span>
                    <span className="text-right">
                      <span className="block text-[10px] uppercase tracking-[0.12em] text-canopy-100/28">
                        Risque
                      </span>
                      <span className="mt-2 flex justify-end gap-1">
                        {Array.from({ length: 5 }, (_, risk) => (
                          <FiCircle
                            key={risk}
                            className={`h-2.5 w-2.5 ${risk < encounter.difficulty ? 'fill-red-400/75 text-red-400/75' : 'text-canopy-700/40'}`}
                            aria-hidden="true"
                          />
                        ))}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </section>

          {activeEncounter && (
            <motion.section
              key={activeEncounter.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="mycelium-panel h-fit overflow-hidden"
            >
              <div className="border-b border-red-500/15 bg-red-500/[0.025] px-5 py-4">
                <span className="section-kicker text-red-300/60">Rencontre sélectionnée</span>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div>
                    <span className="mb-1.5 inline-flex items-center gap-2">
                      <h2 className="font-display text-2xl text-canopy-50/90">
                        {ENCOUNTER_NAMES[activeEncounter.type]}
                      </h2>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                        style={{
                          backgroundColor: `${NPC_ENCOUNTER_CONFIGS[activeEncounter.type].color}22`,
                          color: NPC_ENCOUNTER_CONFIGS[activeEncounter.type].color,
                        }}
                      >
                        {TIER_LABELS[NPC_ENCOUNTER_CONFIGS[activeEncounter.type].tier]}
                      </span>
                    </span>
                    <p className="text-xs text-red-300/70">
                      Niveau {activeEncounter.difficulty} · coordonnées{' '}
                      {activeEncounter.coordinates.galaxy}:{activeEncounter.coordinates.system}:
                      {activeEncounter.coordinates.position}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-red-300/80">
                    {formatNumber(activeEncounter.health)} /{' '}
                    {formatNumber(activeEncounter.maxHealth)} PV
                  </span>
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <h3 className="mb-3 text-[10px] uppercase tracking-[0.15em] text-canopy-100/32">
                    Composer la flotte
                  </h3>
                  <div className="divide-y divide-canopy-700/10 rounded-xl border border-canopy-700/15">
                    {SHIP_TYPES.map((type) => {
                      const ship = fleet.ships.find((entry) => entry.type === type);
                      const available = docked[type] ?? 0;
                      if (!ship || available <= 0) return null;
                      return (
                        <div key={type} className="flex items-center gap-3 px-3 py-3">
                          <FiShield className="h-4 w-4 text-canopy-300/55" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-canopy-100/72">{ship.name}</p>
                            <p className="mt-0.5 text-[10px] text-canopy-100/30">
                              {available} disponibles
                            </p>
                          </div>
                          <QuantityControl
                            value={ships[type]}
                            min={0}
                            max={available}
                            label={`${ship.name} pour le raid`}
                            onChange={(quantity) =>
                              setShips((value) => ({ ...value, [type]: quantity }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-canopy-100/40">
                  <span>Flotte engagée</span>
                  <span>
                    {Object.values(ships).reduce((sum, quantity) => sum + quantity, 0)} vaisseaux
                  </span>
                </div>

                <AnimatedButton
                  variant="ghost"
                  className="w-full border-red-500/25 text-red-200/80 hover:bg-red-500/10"
                  disabled={
                    attack.isPending ||
                    Object.values(ships).reduce((sum, quantity) => sum + quantity, 0) === 0
                  }
                  loading={attack.isPending}
                  onClick={() => {
                    if (!selectedId) {
                      setError('Sélectionnez une planète source.');
                      return;
                    }
                    setError(undefined);
                    attack.mutate(
                      { planetId: selectedId, ships },
                      {
                        onSuccess: () => {
                          setSelectedEncounter(null);
                          resetForm();
                        },
                        onError: message,
                      },
                    );
                  }}
                >
                  <FiCrosshair className="h-4 w-4" aria-hidden="true" />
                  Lancer l’attaque
                </AnimatedButton>
              </div>
            </motion.section>
          )}
        </div>
      )}

      <section className="mycelium-panel overflow-hidden">
        <div className="border-b border-canopy-700/15 px-5 py-3">
          <h2 className="section-title">Missions actives</h2>
        </div>
        {!missions || missions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-canopy-100/40">Aucun raid en cours.</p>
        ) : (
          <div className="divide-y divide-canopy-700/10">
            {missions.map((mission, index) => (
              <motion.article
                key={mission.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.045 }}
                className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(13rem,1fr)_minmax(10rem,0.8fr)_8rem] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-red-500/20 bg-red-500/[0.035] text-red-300/65">
                    <FiAlertTriangle className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-canopy-100/78">
                      {ENCOUNTER_NAMES[mission.encounter.type]}
                    </p>
                    <p className="mt-1 text-[10px] text-canopy-100/30">
                      {mission.encounter.coordinates.galaxy}:{mission.encounter.coordinates.system}:
                      {mission.encounter.coordinates.position}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-canopy-100/65">{PHASE_LABELS[mission.phase]}</p>
                  <p className="mt-1 text-[10px] text-canopy-100/30">
                    {Object.values(mission.ships).reduce((sum, quantity) => sum + quantity, 0)}{' '}
                    vaisseaux engagés
                  </p>
                </div>
                <span className="flex items-center gap-2 text-xs text-spore-400">
                  <FiClock className="h-4 w-4" aria-hidden="true" />
                  <AnimatedCountdown
                    finishesAt={
                      mission.phase === PveMissionPhase.TRAVEL
                        ? mission.travelArrivesAt
                        : mission.phase === PveMissionPhase.COMBAT
                          ? mission.combatEndsAt
                          : mission.returnsAt
                    }
                  />
                </span>
                {mission.result && (
                  <p className="text-xs text-canopy-100/50 sm:col-span-3">
                    Dernier résultat : {mission.result.outcome} · pertes{' '}
                    {Object.entries(mission.result.lostShips).reduce(
                      (sum, [, v]) => sum + (v ?? 0),
                      0,
                    )}{' '}
                    vaisseaux
                  </p>
                )}
              </motion.article>
            ))}
          </div>
        )}
      </section>

      <section className="mycelium-panel overflow-hidden">
        <div className="border-b border-canopy-700/15 px-5 py-3">
          <h2 className="section-title">Historique récent</h2>
        </div>
        {!history || history.length === 0 ? (
          <p className="px-5 py-6 text-sm text-canopy-100/40">Aucune anomalie terminée.</p>
        ) : (
          <div className="divide-y divide-canopy-700/10">
            {history.slice(0, 10).map((report, index) => {
              const { label, cls, Icon } = pveOutcomeStyle(report.result?.outcome ?? '');
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                  className="grid gap-3 px-5 py-3.5 sm:grid-cols-[2rem_minmax(10rem,1fr)_6rem_1fr_8rem] sm:items-center"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-red-500/25 bg-red-500/[0.04] text-red-300/65">
                    <FiAlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-canopy-100/75">
                      {ENCOUNTER_NAMES_PVE[report.encounter.type as NpcEncounterType] ??
                        report.encounter.type}
                    </span>
                    <span className="block text-[10px] text-canopy-100/30">
                      Niveau {report.encounter.difficulty}
                    </span>
                  </span>
                  <span className={`flex items-center gap-1.5 text-xs ${cls}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </span>
                  <span>
                    <ResourceCost cost={report.encounter.rewards} />
                  </span>
                  <span className="text-[10px] text-canopy-100/30">
                    {new Date(report.completedAt).toLocaleString('fr-FR')}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
