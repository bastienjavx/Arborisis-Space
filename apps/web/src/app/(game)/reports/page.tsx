'use client';

import { useState } from 'react';
import { ExpeditionOutcome, EXPEDITION_SHIP_TYPES, RESOURCE_TYPES, SHIPS } from '@arborisis/shared';
import { formatNumber, resourceLabel } from '@/lib/format';
import { useExpeditionReports, useMarkReportRead } from '@/lib/queries';
import { AnimatedCard } from '@/components/AnimatedCard';
import { PageHeader } from '@/components/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';

const TITLES: Record<ExpeditionOutcome, string> = {
  [ExpeditionOutcome.RESOURCE_CACHE]: 'Réserve organique découverte',
  [ExpeditionOutcome.RARE_SPORES]: 'Spores rares récoltées',
  [ExpeditionOutcome.DERELICT_SHIP]: 'Bio-vaisseau abandonné réveillé',
  [ExpeditionOutcome.INCIDENT]: 'Incident dans le vide',
  [ExpeditionOutcome.ANOMALY]: 'Artefact arborisien découvert',
  [ExpeditionOutcome.ANCIENT_ARCHIVE]: 'Archive ancienne des Tisserands',
  [ExpeditionOutcome.VOID_ECHO]: 'Écho du Vide détecté',
  [ExpeditionOutcome.CONVERGENCE_BLOOM]: 'Floraison de Convergence',
};

export default function ReportsPage() {
  const { data: reports, isLoading } = useExpeditionReports();
  const markRead = useMarkReportRead();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading || !reports) return <p className="text-canopy-100/50">Lecture du mycélium…</p>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rapports d'exploration"
        subtitle="Journal auditable des rencontres de vos essaims."
      />

      {reports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card text-sm text-canopy-100/50"
        >
          Aucun signal n'a encore été rapporté.
        </motion.div>
      ) : (
        reports.map((report, index) => {
          const rewards = RESOURCE_TYPES.filter((type) => report.rewards[type] > 0);
          const losses = EXPEDITION_SHIP_TYPES.filter((type) => report.losses[type] > 0);
          const overflow = RESOURCE_TYPES.filter((type) => report.overflow[type] > 0);
          const isExpanded = expandedId === report.id;

          return (
            <AnimatedCard
              key={report.id}
              delay={index * 0.08}
              hover
              className={report.isRead ? '' : 'border-spore-500/50'}
            >
              <div
                className="flex flex-wrap items-start justify-between gap-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-canopy-100">{TITLES[report.outcome]}</h2>
                    {!report.isRead && (
                      <motion.span
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="rounded-full bg-spore-500/20 px-2 py-0.5 text-[10px] uppercase text-spore-400"
                      >
                        Nouveau
                      </motion.span>
                    )}
                  </div>
                  <p className="text-xs text-canopy-100/40">
                    {new Date(report.occurredAt).toLocaleString('fr-FR')} · règles v
                    {report.rulesetVersion} · tirage {report.roll}
                  </p>
                </div>
                {!report.isRead && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-ghost px-3 py-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead.mutate(report.id);
                    }}
                  >
                    Marquer comme lu
                  </motion.button>
                )}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3 space-y-2 overflow-hidden"
                  >
                    {report.outcome === ExpeditionOutcome.DERELICT_SHIP && (
                      <p className="text-sm text-canopy-300">
                        Un Éclaireur sporique a rejoint l'essaim.
                      </p>
                    )}
                    {rewards.length > 0 && (
                      <p className="text-sm text-canopy-100/70">
                        Gains :{' '}
                        {rewards
                          .map(
                            (type) =>
                              `${formatNumber(report.rewards[type])} ${resourceLabel(type)}`,
                          )
                          .join(' · ')}
                      </p>
                    )}
                    {losses.length > 0 && (
                      <p className="text-sm text-red-400">
                        Pertes :{' '}
                        {losses
                          .map((type) => `${report.losses[type]} ${SHIPS[type].name}`)
                          .join(' · ')}
                      </p>
                    )}
                    {overflow.length > 0 && (
                      <p className="text-xs text-sap-400">
                        Stockage saturé, perdu :{' '}
                        {overflow
                          .map(
                            (type) =>
                              `${formatNumber(report.overflow[type])} ${resourceLabel(type)}`,
                          )
                          .join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-canopy-100/40">
                      {report.returnedAt
                        ? `Flotte revenue le ${new Date(report.returnedAt).toLocaleString('fr-FR')}`
                        : 'Flotte encore sur le trajet retour.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </AnimatedCard>
          );
        })
      )}
    </div>
  );
}
