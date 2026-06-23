'use client';

import { PvpMissionPhase, PvpMissionType, PvpOutcome, SHIPS, ShipType } from '@arborisis/shared';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { PageHeader } from '@/components/PageHeader';
import { ResourceCost } from '@/components/ResourceCost';
import { usePvpMissions, usePvpReports } from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiCrosshair,
  FiEye,
  FiMinus,
  FiNavigation,
  FiShield,
} from 'react-icons/fi';

const TYPE_LABELS: Record<PvpMissionType, string> = {
  [PvpMissionType.SPY]: 'Espionnage',
  [PvpMissionType.ATTACK]: 'Attaque',
};

const PHASE_LABELS: Record<PvpMissionPhase, string> = {
  [PvpMissionPhase.OUTBOUND]: 'Trajet',
  [PvpMissionPhase.RETURNING]: 'Retour',
  [PvpMissionPhase.COMPLETED]: 'Terminée',
};

const OUTCOME_LABELS: Record<PvpOutcome, string> = {
  [PvpOutcome.SUCCESS]: 'Succès',
  [PvpOutcome.FAILURE]: 'Échec',
  [PvpOutcome.DRAW]: 'Match nul',
};

function pvpOutcomeStyle(outcome: string) {
  if (outcome === PvpOutcome.SUCCESS)
    return { label: 'Victoire', cls: 'text-canopy-300', Icon: FiCheckCircle };
  if (outcome === PvpOutcome.FAILURE)
    return { label: 'Défaite', cls: 'text-red-300', Icon: FiAlertTriangle };
  if (outcome === PvpOutcome.DRAW) return { label: 'Nul', cls: 'text-sap-400', Icon: FiMinus };
  return { label: '—', cls: 'text-canopy-100/30', Icon: FiMinus };
}

export default function PvpPage() {
  const { data: missions, isLoading } = usePvpMissions();
  const { data: history } = usePvpReports();
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);

  if (isLoading) return <p className="text-canopy-100/50">Scan des missions…</p>;

  return (
    <div className="space-y-5">
      <PageHeader title="Guerre des spores" subtitle="Missions d’espionnage et d’attaque." />

      <section className="mycelium-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-canopy-700/15 px-5 py-3">
          <h2 className="section-title">Missions actives</h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-canopy-100/30">
            {missions?.length ?? 0} opérations
          </span>
        </div>
        {!missions || missions.length === 0 ? (
          <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
            <div>
              <FiShield className="mx-auto h-10 w-10 text-canopy-300/35" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl text-canopy-100/72">
                Aucune mission en cours
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-canopy-100/38">
                Vos réseaux de spores sont en sommeil. Lancez une opération depuis la Galaxie.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(12rem,1.25fr)_9rem_minmax(12rem,1fr)_8rem_8rem_7rem_2rem] gap-4 border-b border-canopy-700/15 bg-canopy-500/[0.02] px-5 py-2.5 text-[10px] uppercase tracking-[0.13em] text-canopy-100/30 xl:grid">
              <span>Cible</span>
              <span>Type</span>
              <span>Flotte</span>
              <span>Statut</span>
              <span>Retour</span>
              <span>Fin</span>
              <span />
            </div>
            <div className="divide-y divide-canopy-700/10">
              {missions.map((mission, index) => {
                const expanded = expandedMissionId === mission.id;
                const missionShips = Object.entries(mission.ships).filter(([, count]) => count > 0);
                const totalShips = missionShips.reduce((sum, [, count]) => sum + count, 0);
                const isAttack = mission.type === PvpMissionType.ATTACK;
                const phaseColor =
                  mission.phase === PvpMissionPhase.RETURNING
                    ? 'text-spore-400'
                    : isAttack
                      ? 'text-red-300/80'
                      : 'text-canopy-300/75';

                return (
                  <motion.article
                    key={mission.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.045 }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedMissionId(expanded ? null : mission.id)}
                      className="grid w-full gap-4 px-5 py-4 text-left transition hover:bg-canopy-500/[0.025] xl:grid-cols-[minmax(12rem,1.25fr)_9rem_minmax(12rem,1fr)_8rem_8rem_7rem_2rem] xl:items-center"
                      aria-expanded={expanded}
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-canopy-700/25 bg-bark-950/55 text-canopy-300/60">
                          <FiNavigation className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm text-canopy-100/78">
                            {mission.target.galaxy}:{mission.target.system}:
                            {mission.target.position}
                          </span>
                          <span className="mt-1 block text-[10px] text-canopy-100/30">
                            depuis {mission.source.galaxy}:{mission.source.system}:
                            {mission.source.position}
                          </span>
                        </span>
                      </span>

                      <span className="flex items-center gap-2">
                        {isAttack ? (
                          <FiCrosshair className="h-4 w-4 text-red-300/65" aria-hidden="true" />
                        ) : (
                          <FiEye className="h-4 w-4 text-spore-400/65" aria-hidden="true" />
                        )}
                        <span>
                          <span className="block text-xs text-canopy-100/70">
                            {TYPE_LABELS[mission.type]}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-canopy-100/28">
                            {isAttack ? 'Assaut' : 'Reconnaissance'}
                          </span>
                        </span>
                      </span>

                      <span>
                        <span className="block text-xs text-canopy-100/65">
                          {totalShips} vaisseaux
                        </span>
                        <span className="mt-1 block truncate text-[10px] text-canopy-100/30">
                          {missionShips
                            .slice(0, 2)
                            .map(([type, count]) => `${count} ${SHIPS[type as ShipType].name}`)
                            .join(' · ')}
                        </span>
                      </span>

                      <span>
                        <span className={`block text-xs ${phaseColor}`}>
                          {PHASE_LABELS[mission.phase]}
                        </span>
                        <span className="mt-1 block text-[10px] text-canopy-100/28">
                          {mission.phase === PvpMissionPhase.RETURNING ? 'En retour' : 'En route'}
                        </span>
                      </span>

                      <span className="text-xs text-canopy-100/48">
                        {mission.phase === PvpMissionPhase.RETURNING ? 'En cours' : 'Prévu'}
                      </span>

                      <span className="flex items-center gap-2 text-xs text-canopy-300/75">
                        <FiClock className="h-3.5 w-3.5" aria-hidden="true" />
                        <AnimatedCountdown
                          finishesAt={
                            mission.phase === PvpMissionPhase.OUTBOUND
                              ? mission.arrivesAt
                              : mission.returnsAt
                          }
                        />
                      </span>

                      <FiChevronDown
                        className={`h-4 w-4 text-canopy-100/35 transition ${expanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>

                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-4 border-t border-canopy-700/10 bg-bark-950/35 px-5 py-4 text-xs sm:grid-cols-3">
                            {mission.result ? (
                              <>
                                <div>
                                  <span className="label">Résultat</span>
                                  <span
                                    className={
                                      mission.result.outcome === PvpOutcome.SUCCESS
                                        ? 'text-canopy-300'
                                        : mission.result.outcome === PvpOutcome.FAILURE
                                          ? 'text-red-300'
                                          : 'text-sap-400'
                                    }
                                  >
                                    {OUTCOME_LABELS[mission.result.outcome]}
                                  </span>
                                </div>
                                <div>
                                  <span className="label">Pertes attaquant</span>
                                  <span className="text-canopy-100/68">
                                    {Object.values(mission.result.lostShips).reduce(
                                      (sum, count) => sum + (count ?? 0),
                                      0,
                                    )}{' '}
                                    vaisseaux
                                  </span>
                                </div>
                                {mission.result.report && (
                                  <div>
                                    <span className="label">Défense cible</span>
                                    <span className="text-canopy-100/68">
                                      {mission.result.report.defensePower} puissance
                                    </span>
                                  </div>
                                )}
                                {mission.result.loot && (
                                  <div className="sm:col-span-3">
                                    <span className="label">Butin</span>
                                    <ResourceCost cost={mission.result.loot} />
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-canopy-100/38 sm:col-span-3">
                                Le rapport sera disponible à la résolution de l’opération.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="mycelium-panel overflow-hidden">
        <div className="border-b border-canopy-700/15 px-5 py-3">
          <h2 className="section-title">Historique récent</h2>
        </div>
        {!history || history.length === 0 ? (
          <p className="px-5 py-6 text-sm text-canopy-100/40">Aucun combat terminé.</p>
        ) : (
          <div className="divide-y divide-canopy-700/10">
            {history.slice(0, 10).map((report, index) => {
              const { label, cls, Icon } = pvpOutcomeStyle(report.result?.outcome ?? '');
              const isAttack = report.type === PvpMissionType.ATTACK;
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                  className="grid gap-3 px-5 py-3.5 sm:grid-cols-[2rem_minmax(10rem,1fr)_6rem_6rem_1fr] sm:items-center"
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full border text-xs ${
                      isAttack
                        ? 'border-red-500/25 bg-red-500/[0.04] text-red-300/70'
                        : 'border-canopy-500/25 bg-canopy-500/[0.04] text-canopy-300/70'
                    }`}
                  >
                    {isAttack ? (
                      <FiCrosshair className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-canopy-100/75">
                      {report.targetName ??
                        `${report.target.galaxy}:${report.target.system}:${report.target.position}`}
                    </span>
                    <span className="block text-[10px] text-canopy-100/30">
                      {report.target.galaxy}:{report.target.system}:{report.target.position} ·{' '}
                      {isAttack ? 'Attaque' : 'Espionnage'}
                    </span>
                  </span>
                  <span className={`flex items-center gap-1.5 text-xs ${cls}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </span>
                  <span className="text-xs">
                    {report.result?.loot && <ResourceCost cost={report.result.loot} />}
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
