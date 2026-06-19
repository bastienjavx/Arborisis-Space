'use client';

import {
  PvpMissionPhase,
  PvpMissionType,
  PvpOutcome,
  SHIPS,
  ShipType,
  SHIP_TYPES,
} from '@arborisis/shared';
import { AnimatedButton } from '@/components/AnimatedButton';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { PageHeader } from '@/components/PageHeader';
import { usePvpMissions } from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function PvpPage() {
  const { data: missions, isLoading } = usePvpMissions();

  if (isLoading) return <p className="text-canopy-100/50">Scan des missions…</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Guerre des spores" subtitle="Espionnez et frappez les mondes adverses." />

      <section>
        <h2 className="section-title mb-3">Missions actives</h2>
        {!missions || missions.length === 0 ? (
          <p className="text-canopy-100/50">Aucune mission PvP en cours.</p>
        ) : (
          <div className="grid gap-4">
            {missions.map((mission, index) => (
              <AnimatedCard
                key={mission.id}
                delay={index * 0.05}
                glowColor={
                  mission.type === PvpMissionType.ATTACK
                    ? 'rgba(239, 68, 68, 0.25)'
                    : 'rgba(147, 51, 234, 0.25)'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-canopy-100/80">
                      {TYPE_LABELS[mission.type]} · {PHASE_LABELS[mission.phase]}
                    </p>
                    <p className="text-xs text-canopy-100/40">
                      {mission.source.galaxy}:{mission.source.system}:{mission.source.position} →{' '}
                      {mission.target.galaxy}:{mission.target.system}:{mission.target.position}
                    </p>
                  </div>
                  <span className="font-mono text-spore-400">
                    <AnimatedCountdown
                      finishesAt={
                        mission.phase === PvpMissionPhase.OUTBOUND
                          ? mission.arrivesAt
                          : mission.returnsAt
                      }
                    />
                  </span>
                </div>

                {mission.result && (
                  <div className="mt-2 space-y-1 text-xs text-canopy-100/60">
                    <p>Résultat : {OUTCOME_LABELS[mission.result.outcome]}</p>
                    {mission.result.report && (
                      <p>Puissance défensive cible : {mission.result.report.defensePower}</p>
                    )}
                    {mission.result.loot && (
                      <p>
                        Butin estimé :{' '}
                        {Object.entries(mission.result.loot)
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => `${k} ${v}`)
                          .join(', ')}
                      </p>
                    )}
                    <p>
                      Pertes attaquant :{' '}
                      {Object.entries(mission.result.lostShips).reduce(
                        (sum, [, v]) => sum + (v ?? 0),
                        0,
                      )}{' '}
                      vaisseaux
                    </p>
                  </div>
                )}
              </AnimatedCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
