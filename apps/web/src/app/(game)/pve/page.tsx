'use client';

import { useMemo, useState } from 'react';
import {
  NpcEncounterType,
  PveMissionPhase,
  SHIPS,
  ShipType,
  SHIP_TYPES,
  type NpcEncounterView,
} from '@arborisis/shared';
import { AnimatedButton } from '@/components/AnimatedButton';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { PageHeader } from '@/components/PageHeader';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ApiError } from '@/lib/api';
import { formatCost } from '@/lib/format';
import { useAttackEncounter, useEncounters, useFleet, usePveMissions } from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';

const ENCOUNTER_NAMES: Record<NpcEncounterType, string> = {
  [NpcEncounterType.VOID_RIFT]: 'Fissure du Vide',
  [NpcEncounterType.MYCOXIN_NEST]: 'Nid Mycoxin',
  [NpcEncounterType.ABANDONED_DERELICT]: 'Dérélitc abandonné',
};

const PHASE_LABELS: Record<PveMissionPhase, string> = {
  [PveMissionPhase.TRAVEL]: 'Trajet',
  [PveMissionPhase.COMBAT]: 'Combat',
  [PveMissionPhase.RETURNING]: 'Retour',
  [PveMissionPhase.COMPLETED]: 'Terminée',
};

export default function PvePage() {
  const { selectedId } = usePlanetSelection();
  const { data: encounters, isLoading: loadingEncounters } = useEncounters();
  const { data: missions, isLoading: loadingMissions } = usePveMissions();
  const { data: fleet, isLoading: loadingFleet } = useFleet(selectedId);
  const [selectedEncounter, setSelectedEncounter] = useState<NpcEncounterView | null>(null);
  const [ships, setShips] = useState<Record<ShipType, number>>(
    Object.fromEntries(SHIP_TYPES.map((type) => [type, 0])) as Record<ShipType, number>,
  );
  const [error, setError] = useState<string>();
  const attack = useAttackEncounter(selectedEncounter?.id ?? '', selectedId ?? '');

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
    <div className="space-y-6">
      <PageHeader
        title="Anomalies hostiles"
        subtitle="Détectez et éliminez les menaces organiques stellaires."
      />

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

      <section>
        <h2 className="section-title mb-3">Menaces détectées</h2>
        {!encounters || encounters.length === 0 ? (
          <p className="text-canopy-100/50">Aucune anomalie hostile dans ce secteur.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {encounters.map((encounter, index) => (
              <AnimatedCard
                key={encounter.id}
                delay={index * 0.05}
                hover
                className={`cursor-pointer ${selectedEncounter?.id === encounter.id ? 'ring-1 ring-canopy-400' : ''}`}
                onClick={() => {
                  setSelectedEncounter(encounter);
                  resetForm();
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-canopy-100">
                      {ENCOUNTER_NAMES[encounter.type]}
                    </h3>
                    <p className="text-xs text-canopy-100/50">
                      {encounter.coordinates.galaxy}:{encounter.coordinates.system}:
                      {encounter.coordinates.position} · Difficulté {encounter.difficulty}
                    </p>
                  </div>
                  <span className="text-xs text-red-300/80">
                    {encounter.health}/{encounter.maxHealth} PV
                  </span>
                </div>
                <div className="mt-2 text-xs text-canopy-100/60">
                  Récompenses : {formatCost(encounter.rewards)}
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}
      </section>

      {selectedEncounter && (
        <AnimatedCard delay={0.1} glow="purple" className="space-y-4">
          <div>
            <h2 className="font-medium text-canopy-100">
              Raid sur {ENCOUNTER_NAMES[selectedEncounter.type]}
            </h2>
            <p className="text-xs text-canopy-100/50">
              Cible {selectedEncounter.coordinates.galaxy}:{selectedEncounter.coordinates.system}:
              {selectedEncounter.coordinates.position}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SHIP_TYPES.map((type) => {
              const ship = fleet.ships.find((s) => s.type === type);
              const available = docked[type] ?? 0;
              if (!ship || available <= 0) return null;
              return (
                <motion.label
                  key={type}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="label">
                    {ship.name} (max. {available})
                  </span>
                  <motion.input
                    className="input"
                    type="number"
                    min={0}
                    max={available}
                    value={ships[type]}
                    onChange={(e) =>
                      setShips((value) => ({
                        ...value,
                        [type]: Math.min(available, Math.max(0, Number(e.target.value))),
                      }))
                    }
                    whileFocus={{ scale: 1.02 }}
                  />
                </motion.label>
              );
            })}
          </div>
          <div className="flex gap-3">
            <AnimatedButton
              disabled={attack.isPending}
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
              glow
            >
              Lancer le raid
            </AnimatedButton>
            <AnimatedButton variant="ghost" onClick={() => setSelectedEncounter(null)}>
              Annuler
            </AnimatedButton>
          </div>
        </AnimatedCard>
      )}

      <section>
        <h2 className="section-title mb-3">Missions actives</h2>
        {!missions || missions.length === 0 ? (
          <p className="text-canopy-100/50">Aucun raid en cours.</p>
        ) : (
          <div className="grid gap-4">
            {missions.map((mission, index) => (
              <AnimatedCard
                key={mission.id}
                delay={index * 0.05}
                glowColor="rgba(239, 68, 68, 0.25)"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-canopy-100/80">
                      {ENCOUNTER_NAMES[mission.encounter.type]} · {PHASE_LABELS[mission.phase]}
                    </p>
                    <p className="text-xs text-canopy-100/40">
                      Départ {mission.encounter.coordinates.galaxy}:
                      {mission.encounter.coordinates.system}:
                      {mission.encounter.coordinates.position}
                    </p>
                  </div>
                  <span className="font-mono text-spore-400">
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
                </div>
                {mission.result && (
                  <p className="mt-2 text-xs text-canopy-100/60">
                    Dernier résultat : {mission.result.outcome} · pertes{' '}
                    {Object.entries(mission.result.lostShips).reduce(
                      (sum, [, v]) => sum + (v ?? 0),
                      0,
                    )}{' '}
                    vaisseaux
                  </p>
                )}
              </AnimatedCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
