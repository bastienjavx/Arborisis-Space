'use client';

import { useState } from 'react';
import { ExpeditionOutcome, EXPEDITION_SHIP_TYPES, RESOURCE_TYPES, SHIPS } from '@arborisis/shared';
import { formatNumber, resourceLabel } from '@/lib/format';
import { useExpeditionReports, useMarkReportRead } from '@/lib/queries';
import { PageHeader } from '@/components/PageHeader';
import { ResourceCost } from '@/components/ResourceCost';
import { motion } from 'framer-motion';
import {
  FiAlertTriangle,
  FiArchive,
  FiCheckCircle,
  FiChevronRight,
  FiCircle,
  FiClock,
  FiEye,
  FiFileText,
} from 'react-icons/fi';

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading || !reports) return <p className="text-canopy-100/50">Lecture du mycélium…</p>;

  const selectedReport = reports.find((report) => report.id === selectedId) ?? reports[0] ?? null;

  function statusFor(outcome: ExpeditionOutcome) {
    if (outcome === ExpeditionOutcome.INCIDENT)
      return { label: 'Incident', className: 'text-red-300', icon: FiAlertTriangle };
    if (outcome === ExpeditionOutcome.VOID_ECHO)
      return { label: 'Signal', className: 'text-spore-400', icon: FiArchive };
    return { label: 'Succès', className: 'text-canopy-300', icon: FiCheckCircle };
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rapports d'exploration"
        subtitle="Journal des expéditions et découvertes."
      />

      {reports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mycelium-panel grid min-h-64 place-items-center px-5 py-10 text-center"
        >
          <div>
            <FiFileText className="mx-auto h-10 w-10 text-canopy-300/35" aria-hidden="true" />
            <p className="mt-4 text-sm text-canopy-100/45">Aucun signal n’a encore été rapporté.</p>
          </div>
        </motion.div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(24rem,0.75fr)_minmax(32rem,1fr)]">
          <section className="mycelium-panel overflow-hidden">
            <div className="divide-y divide-canopy-700/10">
              {reports.map((report, index) => {
                const status = statusFor(report.outcome);
                const StatusIcon = status.icon;
                const selected = selectedReport?.id === report.id;
                return (
                  <motion.button
                    key={report.id}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.35) }}
                    onClick={() => setSelectedId(report.id)}
                    className={`grid w-full grid-cols-[2.5rem_minmax(9rem,1fr)_5rem_1.5rem] items-center gap-3 border-l-2 px-4 py-3 text-left transition ${
                      selected
                        ? 'border-canopy-300 bg-canopy-500/[0.055]'
                        : 'border-transparent hover:bg-canopy-500/[0.025]'
                    } ${report.isRead ? '' : 'font-medium'}`}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-canopy-700/20 bg-bark-950/50 text-canopy-300/55">
                      <FiFileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="block truncate text-sm text-canopy-100/78">
                          {TITLES[report.outcome]}
                        </span>
                        {!report.isRead && (
                          <FiCircle
                            className="h-2 w-2 shrink-0 fill-spore-400 text-spore-400"
                            aria-label="Non lu"
                          />
                        )}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-canopy-100/30">
                        {new Date(report.occurredAt).toLocaleString('fr-FR')}
                      </span>
                    </span>
                    <span className={`flex items-center gap-1.5 text-xs ${status.className}`}>
                      <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {status.label}
                    </span>
                    <FiChevronRight className="h-4 w-4 text-canopy-100/25" aria-hidden="true" />
                  </motion.button>
                );
              })}
            </div>
            {reports.some((report) => !report.isRead) && (
              <div className="border-t border-canopy-700/15 p-4">
                <button
                  type="button"
                  onClick={() =>
                    reports
                      .filter((report) => !report.isRead)
                      .forEach((report) => markRead.mutate(report.id))
                  }
                  disabled={markRead.isPending}
                  className="btn-ghost w-full px-4 py-2 text-xs disabled:opacity-40"
                >
                  <FiEye className="h-4 w-4" aria-hidden="true" />
                  Tout marquer comme lu
                </button>
              </div>
            )}
          </section>

          {selectedReport && (
            <motion.article
              key={selectedReport.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="mycelium-panel overflow-hidden"
            >
              <div className="border-b border-canopy-700/15 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-canopy-700/25 bg-canopy-500/[0.035] text-canopy-300/65">
                      <FiArchive className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-display text-2xl text-canopy-50/90">
                        {TITLES[selectedReport.outcome]}
                      </h2>
                      <p className="mt-1 text-xs text-canopy-100/38">
                        {new Date(selectedReport.occurredAt).toLocaleString('fr-FR')} · règles v
                        {selectedReport.rulesetVersion} · tirage {selectedReport.roll}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const status = statusFor(selectedReport.outcome);
                      const StatusIcon = status.icon;
                      return (
                        <span className={`flex items-center gap-2 text-sm ${status.className}`}>
                          <StatusIcon className="h-4 w-4" aria-hidden="true" />
                          {status.label}
                        </span>
                      );
                    })()}
                    {!selectedReport.isRead && (
                      <button
                        type="button"
                        onClick={() => markRead.mutate(selectedReport.id)}
                        disabled={markRead.isPending}
                        className="btn-ghost px-3 py-2 text-xs disabled:opacity-40"
                      >
                        <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6">
                <section>
                  <h3 className="section-title mb-3">Ressources</h3>
                  <div className="grid gap-4 rounded-xl border border-canopy-700/15 bg-bark-950/35 p-4 sm:grid-cols-2">
                    <div>
                      <span className="label">Gains</span>
                      {RESOURCE_TYPES.some((type) => selectedReport.rewards[type] > 0) ? (
                        <ResourceCost cost={selectedReport.rewards} />
                      ) : (
                        <span className="text-xs text-canopy-100/35">Aucun gain</span>
                      )}
                    </div>
                    <div>
                      <span className="label text-red-300/55">Stockage saturé</span>
                      {RESOURCE_TYPES.some((type) => selectedReport.overflow[type] > 0) ? (
                        <p className="text-xs leading-5 text-red-300/70">
                          {RESOURCE_TYPES.filter((type) => selectedReport.overflow[type] > 0)
                            .map(
                              (type) =>
                                `${formatNumber(selectedReport.overflow[type])} ${resourceLabel(type)}`,
                            )
                            .join(' · ')}
                        </p>
                      ) : (
                        <span className="text-xs text-canopy-100/35">Aucune perte</span>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="section-title mb-3">Effets sur la flotte</h3>
                  {EXPEDITION_SHIP_TYPES.some((type) => selectedReport.losses[type] > 0) ? (
                    <div className="divide-y divide-canopy-700/10 rounded-xl border border-red-500/15">
                      {EXPEDITION_SHIP_TYPES.filter((type) => selectedReport.losses[type] > 0).map(
                        (type) => (
                          <div key={type} className="flex items-center justify-between px-4 py-3">
                            <span className="text-xs text-canopy-100/62">{SHIPS[type].name}</span>
                            <span className="text-xs text-red-300">
                              −{selectedReport.losses[type]}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-canopy-700/15 px-4 py-3 text-xs text-canopy-100/40">
                      Aucun vaisseau perdu pendant cette expédition.
                    </p>
                  )}
                  {selectedReport.outcome === ExpeditionOutcome.DERELICT_SHIP && (
                    <p className="mt-3 text-sm text-canopy-300/75">
                      Un Éclaireur sporique a rejoint l’essaim.
                    </p>
                  )}
                </section>

                <section>
                  <h3 className="section-title mb-3">Traçabilité</h3>
                  <div className="flex items-center gap-3 text-xs text-canopy-100/42">
                    <FiClock className="h-4 w-4 text-canopy-300/55" aria-hidden="true" />
                    {selectedReport.returnedAt
                      ? `Flotte revenue le ${new Date(selectedReport.returnedAt).toLocaleString('fr-FR')}`
                      : 'Flotte encore sur le trajet retour.'}
                  </div>
                </section>
              </div>
            </motion.article>
          )}
        </div>
      )}
    </div>
  );
}
