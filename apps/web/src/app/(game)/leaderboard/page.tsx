'use client';

import { useState } from 'react';
import { FiAward, FiUsers } from 'react-icons/fi';
import { PageHeader } from '@/components/PageHeader';
import { VirtualList } from '@/components/VirtualList';
import { useAllianceLeaderboard, useLeaderboard } from '@/lib/queries';
import { formatNumber } from '@/lib/format';

type Tab = 'players' | 'alliances';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('players');
  const { data: players, isLoading: loadingPlayers } = useLeaderboard();
  const { data: alliances, isLoading: loadingAlliances } = useAllianceLeaderboard();

  return (
    <div className="space-y-5">
      <PageHeader title="Classement" subtitle="Les essaims les plus puissants de l’univers." />

      <div className="flex gap-1 rounded-xl border border-canopy-700/15 bg-bark-950/40 p-1">
        {[
          { key: 'players', label: 'Joueurs', icon: FiAward },
          { key: 'alliances', label: 'Alliances', icon: FiUsers },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as Tab)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              tab === key
                ? 'bg-canopy-500/15 text-canopy-100'
                : 'text-canopy-100/40 hover:bg-canopy-500/[0.06] hover:text-canopy-100/70'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <section className="mycelium-panel overflow-hidden">
          <div className="hidden grid-cols-[3.5rem_1fr_6rem_6rem_6rem] gap-4 border-b border-canopy-700/15 bg-canopy-500/[0.02] px-5 py-2.5 text-[10px] uppercase tracking-[0.13em] text-canopy-100/30 md:grid">
            <span>Rang</span>
            <span>Joueur</span>
            <span className="text-right">Score</span>
            <span className="text-right">Colonies</span>
            <span className="text-right">Vaisseaux</span>
          </div>
          <VirtualList
            items={players ?? []}
            estimateSize={64}
            loading={loadingPlayers}
            className="max-h-[calc(100vh-16rem)]"
            keyExtractor={(entry) => `player-${entry.rank}-${entry.username}`}
            renderItem={(entry) => (
              <div className="grid grid-cols-[3.5rem_1fr] items-center gap-4 border-b border-canopy-700/10 px-5 py-3 md:grid-cols-[3.5rem_1fr_6rem_6rem_6rem]">
                <span className="font-display text-lg text-canopy-300/70">#{entry.rank}</span>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium text-canopy-100/80">
                    {entry.title ? `${entry.title} ` : ''}
                    {entry.username}
                  </span>
                  <span className="block text-[10px] text-canopy-100/30">
                    Actif le {new Date(entry.lastActive).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <span className="col-span-2 text-right text-sm text-canopy-300/80 md:col-span-1">
                  {formatNumber(entry.score)}
                </span>
                <span className="hidden text-right text-sm text-canopy-100/55 md:block">
                  {entry.colonies}
                </span>
                <span className="hidden text-right text-sm text-canopy-100/55 md:block">
                  {entry.ships}
                </span>
              </div>
            )}
            empty={
              <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
                <FiAward className="mx-auto h-10 w-10 text-canopy-300/35" aria-hidden="true" />
                <p className="mt-4 text-sm text-canopy-100/45">
                  Aucun joueur classé pour le moment.
                </p>
              </div>
            }
          />
        </section>
      )}

      {tab === 'alliances' && (
        <section className="mycelium-panel overflow-hidden">
          <div className="hidden grid-cols-[3.5rem_1fr_6rem_6rem] gap-4 border-b border-canopy-700/15 bg-canopy-500/[0.02] px-5 py-2.5 text-[10px] uppercase tracking-[0.13em] text-canopy-100/30 md:grid">
            <span>Rang</span>
            <span>Alliance</span>
            <span className="text-right">Membres</span>
            <span className="text-right">Score</span>
          </div>
          <VirtualList
            items={alliances ?? []}
            estimateSize={64}
            loading={loadingAlliances}
            className="max-h-[calc(100vh-16rem)]"
            keyExtractor={(entry) => `alliance-${entry.rank}-${entry.tag}`}
            renderItem={(entry) => (
              <div className="grid grid-cols-[3.5rem_1fr] items-center gap-4 border-b border-canopy-700/10 px-5 py-3 md:grid-cols-[3.5rem_1fr_6rem_6rem]">
                <span className="font-display text-lg text-canopy-300/70">#{entry.rank}</span>
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold text-bark-950"
                    style={{ backgroundColor: entry.bannerColor }}
                  >
                    {entry.tag.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-canopy-100/80">
                      [{entry.tag}] {entry.name}
                    </span>
                  </div>
                </div>
                <span className="col-span-2 text-right text-sm text-canopy-100/55 md:col-span-1">
                  {entry.memberCount}
                </span>
                <span className="col-span-2 text-right text-sm text-canopy-300/80 md:col-span-1">
                  {formatNumber(entry.score)}
                </span>
              </div>
            )}
            empty={
              <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
                <FiUsers className="mx-auto h-10 w-10 text-canopy-300/35" aria-hidden="true" />
                <p className="mt-4 text-sm text-canopy-100/45">
                  Aucune alliance classée pour le moment.
                </p>
              </div>
            }
          />
        </section>
      )}
    </div>
  );
}
