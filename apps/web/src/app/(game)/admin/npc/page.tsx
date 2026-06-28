'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  NpcActionLogStatus,
  NpcActionType,
  NpcArchetype,
  NpcGoal,
  NpcMood,
  UserRole,
  type NpcActionLogQueryDto,
} from '@arborisis/shared';
import {
  FiActivity,
  FiAlertCircle,
  FiClock,
  FiCpu,
  FiFilter,
  FiTarget,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { createChart, ColorType, HistogramSeries } from 'lightweight-charts';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { useMe, useNpcActionLogs, useNpcActionStats, useNpcBrains } from '@/lib/queries';

const STATUS_STYLES: Record<NpcActionLogStatus, string> = {
  [NpcActionLogStatus.SUCCESS]: 'border-emerald-400/25 text-emerald-200/70 bg-emerald-400/5',
  [NpcActionLogStatus.FAILED]: 'border-red-400/25 text-red-200/70 bg-red-400/5',
  [NpcActionLogStatus.SKIPPED]: 'border-canopy-400/25 text-canopy-200/70 bg-canopy-400/5',
};

const ACTION_LABELS: Record<NpcActionType, string> = {
  [NpcActionType.BUILDING_UPGRADE]: 'Bâtiment',
  [NpcActionType.RESEARCH]: 'Recherche',
  [NpcActionType.COLONIZATION]: 'Colonisation',
  [NpcActionType.SHIP_PRODUCTION]: 'Vaisseaux',
  [NpcActionType.PRODUCTION_LINE]: 'Ligne de prod.',
  [NpcActionType.CRAFTING]: 'Artisanat',
  [NpcActionType.TRADE_ROUTE]: 'Route commerciale',
  [NpcActionType.MARKET_ORDER]: 'Ordre de marché',
  [NpcActionType.PVP_ATTACK]: 'Attaque PvP',
  [NpcActionType.PVP_SPY]: 'Espionnage PvP',
  [NpcActionType.PVE_ATTACK]: 'Attaque PvE',
  [NpcActionType.EXPEDITION]: 'Expédition',
};

const ARCHETYPE_LABELS: Record<NpcArchetype, string> = {
  [NpcArchetype.RAIDER]: 'Pillard',
  [NpcArchetype.ECONOMIST]: 'Économiste',
  [NpcArchetype.EXPANSIONIST]: 'Expansionniste',
  [NpcArchetype.TURTLE]: 'Défenseur',
  [NpcArchetype.OPPORTUNIST]: 'Opportuniste',
};

const ARCHETYPE_STYLES: Record<NpcArchetype, string> = {
  [NpcArchetype.RAIDER]: 'border-red-400/25 text-red-200/80 bg-red-400/5',
  [NpcArchetype.ECONOMIST]: 'border-amber-400/25 text-amber-200/80 bg-amber-400/5',
  [NpcArchetype.EXPANSIONIST]: 'border-sky-400/25 text-sky-200/80 bg-sky-400/5',
  [NpcArchetype.TURTLE]: 'border-emerald-400/25 text-emerald-200/80 bg-emerald-400/5',
  [NpcArchetype.OPPORTUNIST]: 'border-canopy-400/25 text-canopy-200/80 bg-canopy-400/5',
};

const GOAL_LABELS: Record<NpcGoal, string> = {
  [NpcGoal.BUILD_WAR_FLEET]: 'Armer une flotte',
  [NpcGoal.EXPAND_COLONIES]: 'Coloniser',
  [NpcGoal.MAX_ECONOMY]: 'Maximiser l’économie',
  [NpcGoal.RAID_TARGET]: 'Frapper une cible',
  [NpcGoal.FORTIFY]: 'Se fortifier',
  [NpcGoal.RESEARCH_PUSH]: 'Pousser la recherche',
};

const MOOD_LABELS: Record<NpcMood, string> = {
  [NpcMood.CALM]: 'Calme',
  [NpcMood.AMBITIOUS]: 'Ambitieux',
  [NpcMood.THREATENED]: 'Menacé',
  [NpcMood.VENGEFUL]: 'Vengeur',
  [NpcMood.CONFIDENT]: 'Confiant',
};

const MOOD_STYLES: Record<NpcMood, string> = {
  [NpcMood.CALM]: 'text-canopy-100/50',
  [NpcMood.AMBITIOUS]: 'text-sky-200/70',
  [NpcMood.THREATENED]: 'text-amber-200/80',
  [NpcMood.VENGEFUL]: 'text-red-200/80',
  [NpcMood.CONFIDENT]: 'text-emerald-200/80',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SimpleBarChart({
  data,
  label,
  color = '#4ade80',
}: {
  data: Array<{ label: string; value: number }>;
  label: string;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-canopy-700/20 bg-bark-900/40 p-4 text-sm text-canopy-100/30">
        Aucune donnée
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-canopy-100/30">{label}</p>
      <div className="space-y-1.5">
        {data.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-canopy-100/55" title={row.label}>
              {row.label}
            </span>
            <div className="h-2 flex-1 rounded-full bg-canopy-700/10">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${(row.value / max) * 100}%`, backgroundColor: color }}
              />
            </div>
            <span className="w-8 text-right text-canopy-100/70">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineChart({ data }: { data: Array<{ bucket: string; count: number }> }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        time: (new Date(d.bucket).getTime() / 1000) as never,
        value: d.count,
      })),
    [data],
  );

  useEffect(() => {
    if (!containerRef.current || chartData.length === 0) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 240,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(200,230,200,0.55)',
        fontFamily: 'ui-monospace, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(74,222,128,0.25)', labelBackgroundColor: '#1a2e1a' },
        horzLine: { color: 'rgba(74,222,128,0.25)', labelBackgroundColor: '#1a2e1a' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(HistogramSeries, {
      color: 'rgba(74,222,128,0.45)',
      priceFormat: { type: 'volume' },
    });
    series.setData(chartData);
    chart.timeScale().fitContent();

    const resize = () => {
      if (containerRef.current) chart.resize(containerRef.current.clientWidth, 240);
    };
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.remove();
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-canopy-700/20 bg-bark-900/40 text-sm text-canopy-100/30"
        style={{ height: 240 }}
      >
        Pas assez d’historique
      </div>
    );
  }

  return <div ref={containerRef} className="w-full" style={{ height: 240 }} />;
}

export default function AdminNpcPage() {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();
  const authorized = me?.role === UserRole.ADMIN || me?.role === UserRole.MODERATOR;

  const [filters, setFilters] = useState<NpcActionLogQueryDto>({ limit: 100 });
  const [liveFilters, setLiveFilters] = useState(filters);

  const { data: stats } = useNpcActionStats(authorized);
  const { data: brains = [] } = useNpcBrains(authorized);
  const { data: logs = [], isLoading: logsLoading } = useNpcActionLogs(filters, authorized);

  useEffect(() => {
    if (!meLoading && !authorized) router.replace('/play');
  }, [authorized, meLoading, router]);

  function applyFilters() {
    const next: NpcActionLogQueryDto = { limit: 100 };
    if (liveFilters.actionType) next.actionType = liveFilters.actionType;
    if (liveFilters.status) next.status = liveFilters.status;
    if (liveFilters.userId) next.userId = liveFilters.userId;
    if (liveFilters.from) next.from = liveFilters.from;
    if (liveFilters.to) next.to = liveFilters.to;
    setFilters(next);
  }

  if (meLoading) return <p className="text-canopy-100/40">Vérification des permissions…</p>;
  if (!me || !authorized) return null;

  const actionTypeOptions = Array.from(
    new Set([...Object.values(NpcActionType), ...(stats?.byType.map((t) => t.actionType) ?? [])]),
  ).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observatoire Mycosynth"
        subtitle="Journal temps réel et analytique de l’activité des IA NPC."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Actions 24 h"
          value={stats?.totalLast24h ?? 0}
          icon={<FiActivity />}
          color="green"
          delay={0}
        />
        <StatCard
          label="Actions 1 h"
          value={stats?.totalLast1h ?? 0}
          icon={<FiZap />}
          color="gold"
          delay={0.05}
        />
        <StatCard
          label="Échecs 24 h"
          value={stats?.failedLast24h ?? 0}
          icon={<FiAlertCircle />}
          color="red"
          delay={0.1}
        />
        <StatCard
          label="Bots actifs / NPC"
          value={`${stats?.activeBotCount ?? 0} / ${stats?.npcBotCount ?? 0}`}
          icon={<FiCpu />}
          color="purple"
          delay={0.15}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-canopy-700/20 bg-bark-900/70 p-5">
        <div className="mb-4 flex items-center gap-3">
          <FiClock className="h-5 w-5 text-canopy-300/60" aria-hidden="true" />
          <div>
            <h2 className="font-display text-xl text-canopy-50">Activité sur 24 heures</h2>
            <p className="text-xs text-canopy-100/35">
              Volume d’actions NPC regroupées par intervalle de 10 minutes.
            </p>
          </div>
        </div>
        <TimelineChart data={stats?.timeline ?? []} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-canopy-700/20 bg-bark-900/70 p-5">
          <SimpleBarChart
            data={(stats?.byType ?? []).map((t) => ({
              label: ACTION_LABELS[t.actionType] ?? t.actionType,
              value: t.count,
            }))}
            label="Répartition par action"
            color="#4ade80"
          />
        </div>
        <div className="rounded-2xl border border-canopy-700/20 bg-bark-900/70 p-5">
          <SimpleBarChart
            data={(stats?.byStatus ?? []).map((s) => ({
              label: s.status,
              value: s.count,
            }))}
            label="Répartition par statut"
            color="#a78bfa"
          />
        </div>
        <div className="rounded-2xl border border-canopy-700/20 bg-bark-900/70 p-5">
          <SimpleBarChart
            data={(stats?.byBot ?? []).map((b) => ({
              label: b.username,
              value: b.count,
            }))}
            label="Top bots actifs"
            color="#34d399"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-canopy-700/20 bg-bark-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-canopy-700/15 p-4">
          <div className="flex items-center gap-3">
            <FiTarget className="h-5 w-5 text-canopy-300/60" aria-hidden="true" />
            <div>
              <h2 className="font-display text-xl text-canopy-50">Cerveaux des bots</h2>
              <p className="text-xs text-canopy-100/35">
                Personnalité, but stratégique courant, humeur et relations mémorisées.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(NpcArchetype).map((archetype) => {
              const count = brains.filter((b) => b.archetype === archetype).length;
              return (
                <span
                  key={archetype}
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${ARCHETYPE_STYLES[archetype]}`}
                >
                  {ARCHETYPE_LABELS[archetype]} · {count}
                </span>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] text-left">
            <thead className="border-b border-canopy-700/15 text-[10px] uppercase tracking-[0.14em] text-canopy-100/30">
              <tr>
                <th className="px-4 py-3 font-medium">Bot</th>
                <th className="px-4 py-3 font-medium">Archétype</th>
                <th className="px-4 py-3 font-medium">But courant</th>
                <th className="px-4 py-3 font-medium">Humeur</th>
                <th className="px-4 py-3 font-medium">Traits (agr/avi/pru/amb/cur)</th>
                <th className="px-4 py-3 font-medium">Relations</th>
              </tr>
            </thead>
            <tbody>
              {brains.map((brain) => (
                <tr key={brain.userId} className="border-b border-canopy-700/10 last:border-0">
                  <td className="px-4 py-3 text-xs text-canopy-100/80">{brain.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${ARCHETYPE_STYLES[brain.archetype]}`}
                    >
                      {ARCHETYPE_LABELS[brain.archetype] ?? brain.archetype}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-canopy-100/65">
                    {brain.goal ? (GOAL_LABELS[brain.goal] ?? brain.goal) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${MOOD_STYLES[brain.mood] ?? 'text-canopy-100/50'}`}>
                      {MOOD_LABELS[brain.mood] ?? brain.mood}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-canopy-100/45">
                    {['aggression', 'greed', 'caution', 'ambition', 'curiosity']
                      .map((trait) => (brain.traits[trait] ?? 0).toFixed(2))
                      .join(' / ')}
                  </td>
                  <td className="px-4 py-3">
                    {brain.topRelations.length === 0 ? (
                      <span className="text-[10px] text-canopy-100/25">aucune</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {brain.topRelations.map((relation) => (
                          <span
                            key={relation.playerId}
                            className="rounded border border-canopy-700/20 px-1.5 py-0.5 text-[10px] text-canopy-100/55"
                            title={`menace ${relation.threat} · rancune ${relation.grudge} · ${relation.battlesWon}V/${relation.battlesLost}D`}
                          >
                            {relation.username} ⚔{relation.grudge}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!brains.length && (
            <p className="p-5 text-sm text-canopy-100/35">Aucun cerveau de bot disponible.</p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-canopy-700/20 bg-bark-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-canopy-700/15 p-4">
          <div className="flex items-center gap-3">
            <FiUsers className="h-5 w-5 text-canopy-300/60" aria-hidden="true" />
            <div>
              <h2 className="font-display text-xl text-canopy-50">Journal d’actions NPC</h2>
              <p className="text-xs text-canopy-100/35">Les 100 derniers événements enregistrés.</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              value={liveFilters.actionType ?? ''}
              onChange={(e) =>
                setLiveFilters((prev) => ({
                  ...prev,
                  actionType: (e.target.value as NpcActionType) || undefined,
                }))
              }
              className="rounded-lg border border-canopy-700/25 bg-bark-950/70 px-3 py-2 text-xs text-canopy-100 outline-none"
            >
              <option value="">Tous les types</option>
              {actionTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {ACTION_LABELS[type as NpcActionType] ?? type}
                </option>
              ))}
            </select>
            <select
              value={liveFilters.status ?? ''}
              onChange={(e) =>
                setLiveFilters((prev) => ({
                  ...prev,
                  status: (e.target.value as NpcActionLogStatus) || undefined,
                }))
              }
              className="rounded-lg border border-canopy-700/25 bg-bark-950/70 px-3 py-2 text-xs text-canopy-100 outline-none"
            >
              <option value="">Tous les statuts</option>
              {Object.values(NpcActionLogStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={liveFilters.from ?? ''}
              onChange={(e) =>
                setLiveFilters((prev) => ({
                  ...prev,
                  from: e.target.value || undefined,
                }))
              }
              className="rounded-lg border border-canopy-700/25 bg-bark-950/70 px-3 py-2 text-xs text-canopy-100 outline-none"
              placeholder="Depuis"
            />
            <input
              type="datetime-local"
              value={liveFilters.to ?? ''}
              onChange={(e) =>
                setLiveFilters((prev) => ({
                  ...prev,
                  to: e.target.value || undefined,
                }))
              }
              className="rounded-lg border border-canopy-700/25 bg-bark-950/70 px-3 py-2 text-xs text-canopy-100 outline-none"
              placeholder="Jusqu’à"
            />
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-canopy-700/25 bg-canopy-500/10 px-3 py-2 text-xs text-canopy-200/70 transition hover:bg-canopy-500/20"
            >
              <FiFilter className="h-3.5 w-3.5" />
              Filtrer
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left">
            <thead className="border-b border-canopy-700/15 text-[10px] uppercase tracking-[0.14em] text-canopy-100/30">
              <tr>
                <th className="px-4 py-3 font-medium">Horodatage</th>
                <th className="px-4 py-3 font-medium">Bot</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Détails</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-canopy-700/10 last:border-0">
                  <td className="px-4 py-3 text-xs text-canopy-100/50">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-canopy-100/80">{log.username}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-canopy-100/70">
                      {ACTION_LABELS[log.actionType] ?? log.actionType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                        STATUS_STYLES[log.status] ?? 'border-canopy-700/20 text-canopy-100/40'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-xs truncate font-mono text-[10px] text-canopy-100/35">
                      {JSON.stringify(log.detail)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logsLoading && <p className="p-5 text-sm text-canopy-100/35">Chargement…</p>}
          {!logsLoading && !logs.length && (
            <p className="p-5 text-sm text-canopy-100/35">Aucune action NPC enregistrée.</p>
          )}
        </div>
      </section>
    </div>
  );
}
