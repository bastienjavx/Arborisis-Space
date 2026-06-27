'use client';

import { useState, memo, useCallback } from 'react';
import {
  ExpeditionOutcome,
  EXPEDITION_SHIP_TYPES,
  NPC_ENCOUNTER_CONFIGS,
  NpcEncounterType,
  PvpMissionType,
  PvpOutcome,
  RESOURCE_TYPES,
  SHIPS,
  type ExpeditionReportView,
  type PveReportView,
  type PvpReportView,
} from '@arborisis/shared';
import { formatNumber, resourceLabel } from '@/lib/format';
import {
  useExpeditionReports,
  useMarkReportRead,
  usePveReports,
  usePvpReports,
} from '@/lib/queries';
import { PageHeader } from '@/components/PageHeader';
import { ResourceCost } from '@/components/ResourceCost';
import { VirtualList } from '@/components/VirtualList';
import { motion } from 'framer-motion';
import {
  FiAlertTriangle,
  FiArchive,
  FiCheckCircle,
  FiChevronRight,
  FiCircle,
  FiClock,
  FiCrosshair,
  FiEye,
  FiFileText,
  FiMinus,
  FiShield,
} from 'react-icons/fi';

const EXPEDITION_TITLES: Record<ExpeditionOutcome, string> = {
  [ExpeditionOutcome.RESOURCE_CACHE]: 'Réserve organique découverte',
  [ExpeditionOutcome.RARE_SPORES]: 'Spores rares récoltées',
  [ExpeditionOutcome.DERELICT_SHIP]: 'Bio-vaisseau abandonné réveillé',
  [ExpeditionOutcome.INCIDENT]: 'Incident dans le vide',
  [ExpeditionOutcome.ANOMALY]: 'Artefact arborisien découvert',
  [ExpeditionOutcome.ANCIENT_ARCHIVE]: 'Archive ancienne des Tisserands',
  [ExpeditionOutcome.VOID_ECHO]: 'Écho du Vide détecté',
  [ExpeditionOutcome.CONVERGENCE_BLOOM]: 'Floraison de Convergence',
};

const ENCOUNTER_NAMES: Record<NpcEncounterType, string> = Object.fromEntries(
  Object.entries(NPC_ENCOUNTER_CONFIGS).map(([type, cfg]) => [type, cfg.name]),
) as Record<NpcEncounterType, string>;

type Tab = 'expeditions' | 'pvp' | 'pve';

function outcomeStyle(outcome: string) {
  if (outcome === PvpOutcome.SUCCESS)
    return { label: 'Victoire', cls: 'text-canopy-300', Icon: FiCheckCircle };
  if (outcome === PvpOutcome.FAILURE)
    return { label: 'Défaite', cls: 'text-red-300', Icon: FiAlertTriangle };
  if (outcome === PvpOutcome.DRAW) return { label: 'Nul', cls: 'text-sap-400', Icon: FiMinus };
  return { label: '—', cls: 'text-canopy-100/30', Icon: FiMinus };
}

function expeditionStatus(outcome: ExpeditionOutcome) {
  if (outcome === ExpeditionOutcome.INCIDENT)
    return { label: 'Incident', className: 'text-red-300', icon: FiAlertTriangle };
  if (outcome === ExpeditionOutcome.VOID_ECHO)
    return { label: 'Signal', className: 'text-spore-400', icon: FiArchive };
  return { label: 'Succès', className: 'text-canopy-300', icon: FiCheckCircle };
}

const ExpeditionReportRow = memo(function ExpeditionReportRow({
  report,
  selected,
  onSelect,
}: {
  report: ExpeditionReportView;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const status = expeditionStatus(report.outcome);
  const StatusIcon = status.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(report.id)}
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
            {EXPEDITION_TITLES[report.outcome]}
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
    </button>
  );
});

const ExpeditionDetail = memo(function ExpeditionDetail({
  report,
}: {
  report: ExpeditionReportView;
}) {
  const markRead = useMarkReportRead();
  const status = expeditionStatus(report.outcome);
  const StatusIcon = status.icon;

  return (
    <motion.article
      key={report.id}
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
                {EXPEDITION_TITLES[report.outcome]}
              </h2>
              <p className="mt-1 text-xs text-canopy-100/38">
                {new Date(report.occurredAt).toLocaleString('fr-FR')} · règles v
                {report.rulesetVersion} · tirage {report.roll}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-2 text-sm ${status.className}`}>
              <StatusIcon className="h-4 w-4" aria-hidden="true" />
              {status.label}
            </span>
            {!report.isRead && (
              <button
                type="button"
                onClick={() => markRead.mutate(report.id)}
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
              {RESOURCE_TYPES.some((type) => report.rewards[type] > 0) ? (
                <ResourceCost cost={report.rewards} />
              ) : (
                <span className="text-xs text-canopy-100/35">Aucun gain</span>
              )}
            </div>
            <div>
              <span className="label text-red-300/55">Stockage saturé</span>
              {RESOURCE_TYPES.some((type) => report.overflow[type] > 0) ? (
                <p className="text-xs leading-5 text-red-300/70">
                  {RESOURCE_TYPES.filter((type) => report.overflow[type] > 0)
                    .map((type) => `${formatNumber(report.overflow[type])} ${resourceLabel(type)}`)
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
          {EXPEDITION_SHIP_TYPES.some((type) => report.losses[type] > 0) ? (
            <div className="divide-y divide-canopy-700/10 rounded-xl border border-red-500/15">
              {EXPEDITION_SHIP_TYPES.filter((type) => report.losses[type] > 0).map((type) => (
                <div key={type} className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-canopy-100/62">{SHIPS[type].name}</span>
                  <span className="text-xs text-red-300">−{report.losses[type]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-canopy-700/15 px-4 py-3 text-xs text-canopy-100/40">
              Aucun vaisseau perdu pendant cette expédition.
            </p>
          )}
          {report.outcome === ExpeditionOutcome.DERELICT_SHIP && (
            <p className="mt-3 text-sm text-canopy-300/75">
              Un Éclaireur sporique a rejoint l'essaim.
            </p>
          )}
        </section>

        <section>
          <h3 className="section-title mb-3">Traçabilité</h3>
          <div className="flex items-center gap-3 text-xs text-canopy-100/42">
            <FiClock className="h-4 w-4 text-canopy-300/55" aria-hidden="true" />
            {report.returnedAt
              ? `Flotte revenue le ${new Date(report.returnedAt).toLocaleString('fr-FR')}`
              : 'Flotte encore sur le trajet retour.'}
          </div>
        </section>
      </div>
    </motion.article>
  );
});

const PvpReportRow = memo(function PvpReportRow({ report }: { report: PvpReportView }) {
  const { label, cls, Icon } = outcomeStyle(report.result?.outcome ?? '');
  const isAttack = report.type === PvpMissionType.ATTACK;
  return (
    <div className="grid gap-3 border-b border-canopy-700/10 px-5 py-4 xl:grid-cols-[2.5rem_minmax(12rem,1.2fr)_7rem_7rem_1fr] xl:items-center">
      <span
        className={`grid h-9 w-9 place-items-center rounded-full border ${
          isAttack
            ? 'border-red-500/25 bg-red-500/[0.04] text-red-300/70'
            : 'border-canopy-500/25 bg-canopy-500/[0.04] text-canopy-300/70'
        }`}
      >
        {isAttack ? (
          <FiCrosshair className="h-4 w-4" aria-hidden="true" />
        ) : (
          <FiEye className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-canopy-100/78">
          {report.targetName ??
            `${report.target.galaxy}:${report.target.system}:${report.target.position}`}
        </span>
        <span className="mt-1 block text-[10px] text-canopy-100/30">
          {report.target.galaxy}:{report.target.system}:{report.target.position}
        </span>
      </span>
      <span className="text-xs text-canopy-100/55">{isAttack ? 'Attaque' : 'Espionnage'}</span>
      {report.result ? (
        <span className={`flex items-center gap-1.5 text-xs ${cls}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </span>
      ) : (
        <span className="text-xs text-canopy-100/30">—</span>
      )}
      <span>
        <span className="block text-[10px] text-canopy-100/35">
          {new Date(report.completedAt).toLocaleString('fr-FR')}
        </span>
        {report.result?.loot && (
          <span className="mt-1 block">
            <ResourceCost cost={report.result.loot} />
          </span>
        )}
      </span>
    </div>
  );
});

const PveReportRow = memo(function PveReportRow({ report }: { report: PveReportView }) {
  const { label, cls, Icon } = outcomeStyle(report.result?.outcome ?? '');
  return (
    <div className="grid gap-3 border-b border-canopy-700/10 px-5 py-4 xl:grid-cols-[2.5rem_minmax(12rem,1fr)_7rem_minmax(12rem,0.8fr)_8rem] xl:items-center">
      <span className="grid h-9 w-9 place-items-center rounded-full border border-red-500/25 bg-red-500/[0.04] text-red-300/70">
        <FiAlertTriangle className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-canopy-100/78">
          {ENCOUNTER_NAMES[report.encounter.type as NpcEncounterType] ?? report.encounter.type}
        </span>
        <span className="mt-1 block text-[10px] text-canopy-100/30">
          Niveau {report.encounter.difficulty} · {report.encounter.coordinates.galaxy}:
          {report.encounter.coordinates.system}:{report.encounter.coordinates.position}
        </span>
      </span>
      {report.result ? (
        <span className={`flex items-center gap-1.5 text-xs ${cls}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </span>
      ) : (
        <span className="text-xs text-canopy-100/30">—</span>
      )}
      <span>
        <ResourceCost cost={report.encounter.rewards} />
      </span>
      <span className="text-[10px] text-canopy-100/35">
        {new Date(report.completedAt).toLocaleString('fr-FR')}
      </span>
    </div>
  );
});

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('expeditions');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: expeditions, isLoading: loadingExp } = useExpeditionReports();
  const { data: pvpReports, isLoading: loadingPvp } = usePvpReports();
  const { data: pveReports, isLoading: loadingPve } = usePveReports();
  const markRead = useMarkReportRead();

  const unreadCount = expeditions?.filter((r) => !r.isRead).length ?? 0;
  const selectedReport = expeditions?.find((r) => r.id === selectedId) ?? expeditions?.[0] ?? null;

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'expeditions', label: 'Expéditions', count: expeditions?.length },
    { key: 'pvp', label: 'Combats PvP', count: pvpReports?.length },
    { key: 'pve', label: 'Anomalies PvE', count: pveReports?.length },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rapports de combat"
        subtitle="Journal des expéditions, affrontements PvP et anomalies PvE."
      />

      <div className="flex gap-1 rounded-xl border border-canopy-700/15 bg-bark-950/40 p-1">
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              tab === key
                ? 'bg-canopy-500/15 text-canopy-100'
                : 'text-canopy-100/40 hover:bg-canopy-500/[0.06] hover:text-canopy-100/70'
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10px] ${tab === key ? 'bg-canopy-500/20 text-canopy-300' : 'bg-canopy-700/25 text-canopy-100/40'}`}
              >
                {count}
              </span>
            )}
            {key === 'expeditions' && unreadCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>

      {tab === 'expeditions' && (
        <>
          {loadingExp || !expeditions ? (
            <p className="text-canopy-100/50">Lecture du mycélium…</p>
          ) : expeditions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mycelium-panel grid min-h-64 place-items-center px-5 py-10 text-center"
            >
              <div>
                <FiFileText className="mx-auto h-10 w-10 text-canopy-300/35" aria-hidden="true" />
                <p className="mt-4 text-sm text-canopy-100/45">
                  Aucun signal n'a encore été rapporté.
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(24rem,0.75fr)_minmax(32rem,1fr)]">
              <section className="mycelium-panel flex flex-col overflow-hidden">
                <VirtualList
                  items={expeditions}
                  estimateSize={72}
                  className="max-h-[calc(100vh-16rem)]"
                  keyExtractor={(report) => report.id}
                  renderItem={(report) => (
                    <ExpeditionReportRow
                      report={report}
                      selected={selectedReport?.id === report.id}
                      onSelect={handleSelect}
                    />
                  )}
                />
                {expeditions.some((r) => !r.isRead) && (
                  <div className="border-t border-canopy-700/15 p-4">
                    <button
                      type="button"
                      onClick={() =>
                        expeditions.filter((r) => !r.isRead).forEach((r) => markRead.mutate(r.id))
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

              {selectedReport && <ExpeditionDetail report={selectedReport} />}
            </div>
          )}
        </>
      )}

      {tab === 'pvp' && (
        <>
          {loadingPvp || !pvpReports ? (
            <p className="text-canopy-100/50">Récupération des rapports…</p>
          ) : pvpReports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mycelium-panel grid min-h-64 place-items-center px-5 py-10 text-center"
            >
              <div>
                <FiShield className="mx-auto h-10 w-10 text-canopy-300/35" aria-hidden="true" />
                <p className="mt-4 text-sm text-canopy-100/45">Aucun combat PvP enregistré.</p>
              </div>
            </motion.div>
          ) : (
            <section className="mycelium-panel overflow-hidden">
              <div className="hidden grid-cols-[2.5rem_minmax(12rem,1.2fr)_7rem_7rem_1fr] gap-4 border-b border-canopy-700/15 bg-canopy-500/[0.02] px-5 py-2.5 text-[10px] uppercase tracking-[0.13em] text-canopy-100/30 xl:grid">
                <span />
                <span>Cible</span>
                <span>Type</span>
                <span>Résultat</span>
                <span>Date · Butin</span>
              </div>
              <VirtualList
                items={pvpReports}
                estimateSize={80}
                className="max-h-[calc(100vh-16rem)]"
                keyExtractor={(report) => report.id}
                renderItem={(report) => <PvpReportRow report={report} />}
              />
            </section>
          )}
        </>
      )}

      {tab === 'pve' && (
        <>
          {loadingPve || !pveReports ? (
            <p className="text-canopy-100/50">Récupération des rapports…</p>
          ) : pveReports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mycelium-panel grid min-h-64 place-items-center px-5 py-10 text-center"
            >
              <div>
                <FiShield className="mx-auto h-10 w-10 text-canopy-300/35" aria-hidden="true" />
                <p className="mt-4 text-sm text-canopy-100/45">Aucune anomalie PvE affrontée.</p>
              </div>
            </motion.div>
          ) : (
            <section className="mycelium-panel overflow-hidden">
              <div className="hidden grid-cols-[2.5rem_minmax(12rem,1fr)_7rem_minmax(12rem,0.8fr)_8rem] gap-4 border-b border-canopy-700/15 bg-canopy-500/[0.02] px-5 py-2.5 text-[10px] uppercase tracking-[0.13em] text-canopy-100/30 xl:grid">
                <span />
                <span>Anomalie</span>
                <span>Résultat</span>
                <span>Récompenses</span>
                <span>Date</span>
              </div>
              <VirtualList
                items={pveReports}
                estimateSize={76}
                className="max-h-[calc(100vh-16rem)]"
                keyExtractor={(report) => report.id}
                renderItem={(report) => <PveReportRow report={report} />}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
