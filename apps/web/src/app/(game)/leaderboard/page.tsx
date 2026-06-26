'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { FiAward, FiClock, FiGift, FiGlobe, FiNavigation, FiUser, FiUsers } from 'react-icons/fi';
import type { AllianceLeaderboardEntry, LeaderboardEntry } from '@arborisis/shared';
import {
  useAllianceLeaderboard,
  useClaimSeasonRewards,
  useLeaderboard,
  useMe,
  useSeasons,
} from '@/lib/queries';
import { PageHeader } from '@/components/PageHeader';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { ResourceCost } from '@/components/ResourceCost';
import { VirtualList } from '@/components/VirtualList';

const RANK_STYLES = [
  'border-sap-400/35 bg-sap-400/[0.045] text-sap-400',
  'border-canopy-100/25 bg-canopy-100/[0.025] text-canopy-100/75',
  'border-amber-600/30 bg-amber-600/[0.035] text-amber-500',
];

function SeasonBanner() {
  const { data } = useSeasons();
  const claim = useClaimSeasonRewards();
  if (!data?.current) return null;

  const rewards = data.unclaimedRewards;

  return (
    <section className="mycelium-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-canopy-700/15 px-5 py-4">
        <div>
          <h2 className="section-title">Saison {data.current.index}</h2>
          <p className="mt-1 text-xs text-canopy-100/40">
            Les classements sont figés à la fin de la saison et récompensés.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-canopy-700/20 bg-bark-950/40 px-3 py-1.5 text-sm text-canopy-200">
          <FiClock className="h-4 w-4 text-canopy-300" aria-hidden="true" />
          <AnimatedCountdown
            finishesAt={data.current.endsAt}
            className="font-mono text-canopy-200"
          />
        </div>
      </div>

      {rewards.length > 0 && (
        <div className="space-y-3 px-5 py-4">
          <p className="flex items-center gap-2 text-sm text-canopy-100/70">
            <FiGift className="h-4 w-4 text-canopy-300" aria-hidden="true" />
            Récompenses de saison à réclamer
          </p>
          <div className="space-y-2">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-canopy-700/20 bg-bark-950/40 px-4 py-2.5"
              >
                <div className="text-xs text-canopy-100/65">
                  <span className="font-medium text-canopy-100/85">
                    {reward.scope === 'ALLIANCE' ? 'Alliance' : 'Joueur'} · rang {reward.rank}
                  </span>
                  {reward.title && (
                    <span className="ml-2 rounded-full bg-canopy-500/15 px-2 py-0.5 text-[10px] text-canopy-200">
                      {reward.title}
                    </span>
                  )}
                  <span className="ml-2 text-canopy-100/35">Saison {reward.seasonIndex}</span>
                </div>
                <ResourceCost cost={reward.reward} />
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={claim.isPending}
            onClick={() => claim.mutate()}
            className="w-full rounded-xl border border-canopy-400/40 bg-canopy-500/15 py-2.5 text-sm font-medium text-canopy-50 transition hover:bg-canopy-500/25 disabled:opacity-60"
          >
            {claim.isPending ? 'Récolte…' : 'Tout réclamer'}
          </button>
        </div>
      )}
    </section>
  );
}

const PlayerRow = memo(function PlayerRow({
  entry,
  index,
  isMe,
}: {
  entry: LeaderboardEntry;
  index: number;
  isMe: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[4rem_1fr_6rem] items-center gap-4 border-b px-5 py-3.5 transition-colors last:border-0 md:grid-cols-[5rem_1fr_8rem_8rem_8rem] ${
        isMe
          ? 'border-canopy-300/35 bg-canopy-500/[0.075] shadow-[inset_3px_0_rgba(126,236,174,0.65)]'
          : index < 3
            ? RANK_STYLES[index]
            : 'border-canopy-700/10 hover:bg-canopy-500/[0.025]'
      }`}
    >
      <div>
        {entry.rank <= 3 ? (
          <span className="inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-current/30 px-2 font-display text-lg">
            <FiAward className="h-3.5 w-3.5" aria-hidden="true" /> {entry.rank}
          </span>
        ) : (
          <span className="pl-3 font-display text-lg text-canopy-100/48">{entry.rank}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-canopy-700/25 bg-bark-950/55 text-canopy-300/55">
          <FiUser className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-base text-canopy-100/85 md:text-lg">
            <span className="truncate">{entry.username}</span>
            {entry.title && (
              <span className="shrink-0 rounded-full bg-sap-400/15 px-2 py-0.5 text-[10px] font-normal text-sap-400">
                {entry.title}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[10px] text-canopy-100/32">
            {isMe ? 'Vous' : `Actif le ${new Date(entry.lastActive).toLocaleDateString('fr-FR')}`}
          </p>
        </div>
      </div>
      <div className="hidden text-xs text-canopy-100/55 md:flex md:items-center md:gap-2">
        <FiGlobe className="h-4 w-4 text-canopy-300/50" aria-hidden="true" />
        {entry.colonies} colonies
      </div>
      <div className="hidden text-xs text-canopy-100/55 md:flex md:items-center md:gap-2">
        <FiNavigation className="h-4 w-4 text-spore-400/50" aria-hidden="true" />
        {entry.ships.toLocaleString('fr-FR')}
      </div>
      <div
        className={`text-right font-display text-lg md:text-xl ${
          index === 0 ? 'text-sap-400' : isMe ? 'text-canopy-300' : 'text-canopy-100/58'
        }`}
      >
        {entry.score.toLocaleString('fr-FR')}
      </div>
    </div>
  );
});

const AllianceRow = memo(function AllianceRow({
  entry,
  index,
}: {
  entry: AllianceLeaderboardEntry;
  index: number;
}) {
  return (
    <div
      className={`grid grid-cols-[4rem_1fr_6rem] items-center gap-4 border-b px-5 py-3.5 transition-colors last:border-0 md:grid-cols-[5rem_1fr_8rem_8rem] ${
        index < 3 ? RANK_STYLES[index] : 'border-canopy-700/10 hover:bg-canopy-500/[0.025]'
      }`}
    >
      <div>
        {entry.rank <= 3 ? (
          <span className="inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-current/30 px-2 font-display text-lg">
            <FiAward className="h-3.5 w-3.5" aria-hidden="true" /> {entry.rank}
          </span>
        ) : (
          <span className="pl-3 font-display text-lg text-canopy-100/48">{entry.rank}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border text-xs font-display"
          style={{
            borderColor: `${entry.bannerColor}55`,
            backgroundColor: `${entry.bannerColor}18`,
            color: entry.bannerColor,
          }}
        >
          {entry.tag}
        </span>
        <p className="truncate font-display text-base text-canopy-100/85 md:text-lg">
          {entry.name}
        </p>
      </div>
      <div className="hidden text-xs text-canopy-100/55 md:flex md:items-center md:gap-2">
        <FiUsers className="h-4 w-4 text-canopy-300/50" aria-hidden="true" />
        {entry.memberCount}
      </div>
      <div
        className={`text-right font-display text-lg md:text-xl ${
          index === 0 ? 'text-sap-400' : 'text-canopy-100/58'
        }`}
      >
        {entry.score.toLocaleString('fr-FR')}
      </div>
    </div>
  );
});

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'players' | 'alliances'>('players');
  const { data: entries, isLoading } = useLeaderboard();
  const { data: alliances, isLoading: alliancesLoading } = useAllianceLeaderboard();
  const { data: user } = useMe();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Classement galactique"
        subtitle="Les civilisations les plus florissantes de la galaxie."
      />

      <SeasonBanner />

      <div className="flex gap-2">
        {(
          [
            { id: 'players', label: 'Stratèges', icon: FiUser },
            { id: 'alliances', label: 'Alliances', icon: FiUsers },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
              tab === id
                ? 'border-canopy-400/45 bg-canopy-500/15 text-canopy-50'
                : 'border-canopy-700/20 text-canopy-100/55 hover:border-canopy-500/30 hover:text-canopy-100'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'players' ? (
        isLoading || !entries ? (
          <p className="text-canopy-100/50">Croissance du classement…</p>
        ) : (
          <section className="mycelium-panel overflow-hidden">
            <div className="hidden grid-cols-[4rem_1fr_6rem] gap-4 border-b border-canopy-700/20 bg-canopy-500/[0.018] px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-canopy-100/32 md:grid md:grid-cols-[5rem_1fr_8rem_8rem_8rem]">
              <span>Rang</span>
              <span>Civilisation / Stratège</span>
              <span>Expansion</span>
              <span>Flotte</span>
              <span className="text-right">Score</span>
            </div>
            <VirtualList
              items={entries}
              estimateSize={72}
              className="max-h-[calc(100vh-20rem)]"
              keyExtractor={(entry) => `player-${entry.rank}-${entry.username}`}
              renderItem={(entry, index) => (
                <PlayerRow entry={entry} index={index} isMe={entry.username === user?.username} />
              )}
              empty={
                <p className="px-4 py-8 text-center text-sm text-canopy-100/40">
                  Aucune civilisation répertoriée pour l'instant.
                </p>
              }
            />
          </section>
        )
      ) : alliancesLoading || !alliances ? (
        <p className="text-canopy-100/50">Croissance du classement…</p>
      ) : (
        <section className="mycelium-panel overflow-hidden">
          <div className="hidden grid-cols-[4rem_1fr_6rem] gap-4 border-b border-canopy-700/20 bg-canopy-500/[0.018] px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-canopy-100/32 md:grid md:grid-cols-[5rem_1fr_8rem_8rem]">
            <span>Rang</span>
            <span>Alliance</span>
            <span>Membres</span>
            <span className="text-right">Score cumulé</span>
          </div>
          <VirtualList
            items={alliances}
            estimateSize={72}
            className="max-h-[calc(100vh-20rem)]"
            keyExtractor={(entry) => `alliance-${entry.rank}-${entry.tag}`}
            renderItem={(entry, index) => <AllianceRow entry={entry} index={index} />}
            empty={
              <p className="px-4 py-8 text-center text-sm text-canopy-100/40">
                Aucune alliance répertoriée pour l'instant.
              </p>
            }
          />
        </section>
      )}
    </div>
  );
}
