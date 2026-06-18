'use client';

import { ExpeditionOutcome, RESOURCE_TYPES, SHIPS, SHIP_TYPES } from '@arborisis/shared';
import { formatNumber, resourceLabel } from '@/lib/format';
import { useExpeditionReports, useMarkReportRead } from '@/lib/queries';

const TITLES: Record<ExpeditionOutcome, string> = {
  [ExpeditionOutcome.RESOURCE_CACHE]: 'Réserve organique découverte',
  [ExpeditionOutcome.RARE_SPORES]: 'Spores rares récoltées',
  [ExpeditionOutcome.DERELICT_SHIP]: 'Bio-vaisseau abandonné réveillé',
  [ExpeditionOutcome.INCIDENT]: 'Incident dans le vide',
  [ExpeditionOutcome.ANOMALY]: 'Anomalie silencieuse',
};

export default function ReportsPage() {
  const { data: reports, isLoading } = useExpeditionReports();
  const markRead = useMarkReportRead();
  if (isLoading || !reports) return <p className="text-canopy-100/50">Lecture du mycélium…</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-canopy-100">Rapports d’exploration</h1>
        <p className="text-sm text-canopy-100/50">
          Journal auditable des rencontres de vos essaims.
        </p>
      </div>
      {reports.length === 0 ? (
        <div className="card text-sm text-canopy-100/50">Aucun signal n’a encore été rapporté.</div>
      ) : (
        reports.map((report) => {
          const rewards = RESOURCE_TYPES.filter((type) => report.rewards[type] > 0);
          const losses = SHIP_TYPES.filter((type) => report.losses[type] > 0);
          const overflow = RESOURCE_TYPES.filter((type) => report.overflow[type] > 0);
          return (
            <article
              key={report.id}
              className={`card space-y-3 ${report.isRead ? '' : 'border-spore-500/50'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-canopy-100">{TITLES[report.outcome]}</h2>
                    {!report.isRead && (
                      <span className="rounded-full bg-spore-500/20 px-2 py-0.5 text-[10px] uppercase text-spore-400">
                        Nouveau
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-canopy-100/40">
                    {new Date(report.occurredAt).toLocaleString('fr-FR')} · règles v
                    {report.rulesetVersion} · tirage {report.roll}
                  </p>
                </div>
                {!report.isRead && (
                  <button
                    className="btn-ghost px-3 py-1"
                    onClick={() => markRead.mutate(report.id)}
                  >
                    Marquer comme lu
                  </button>
                )}
              </div>
              {report.outcome === ExpeditionOutcome.DERELICT_SHIP && (
                <p className="text-sm text-canopy-300">Un Éclaireur sporique a rejoint l’essaim.</p>
              )}
              {rewards.length > 0 && (
                <p className="text-sm text-canopy-100/70">
                  Gains :{' '}
                  {rewards
                    .map((type) => `${formatNumber(report.rewards[type])} ${resourceLabel(type)}`)
                    .join(' · ')}
                </p>
              )}
              {losses.length > 0 && (
                <p className="text-sm text-red-400">
                  Pertes :{' '}
                  {losses.map((type) => `${report.losses[type]} ${SHIPS[type].name}`).join(' · ')}
                </p>
              )}
              {overflow.length > 0 && (
                <p className="text-xs text-sap-400">
                  Stockage saturé, perdu :{' '}
                  {overflow
                    .map((type) => `${formatNumber(report.overflow[type])} ${resourceLabel(type)}`)
                    .join(' · ')}
                </p>
              )}
              <p className="text-xs text-canopy-100/40">
                {report.returnedAt
                  ? `Flotte revenue le ${new Date(report.returnedAt).toLocaleString('fr-FR')}`
                  : 'Flotte encore sur le trajet retour.'}
              </p>
            </article>
          );
        })
      )}
    </div>
  );
}
