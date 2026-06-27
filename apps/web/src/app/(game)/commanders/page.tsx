'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  COMMANDERS,
  CommanderTalentBranch,
  CommanderType,
  type CommanderView,
} from '@arborisis/shared';
import { api, ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { COMMANDER_VISUALS } from '@/lib/gameVisualAssets';
import { AnimatedButton } from '@/components/AnimatedButton';
import { GameAssetImage } from '@/components/GameAssetImage';
import { PageHeader } from '@/components/PageHeader';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ResourceCost } from '@/components/ResourceCost';
import { StatCard } from '@/components/StatCard';
import {
  FiActivity,
  FiChevronDown,
  FiMapPin,
  FiShield,
  FiStar,
  FiUser,
  FiZap,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Commun',
  UNCOMMON: 'Peu commun',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
};

const RARITY_CLASSES: Record<string, string> = {
  COMMON: 'border-canopy-700/20 text-canopy-100/55',
  UNCOMMON: 'border-canopy-500/25 text-canopy-300',
  RARE: 'border-spore-500/25 text-spore-400',
  EPIC: 'border-sap-400/25 text-sap-400',
  LEGENDARY: 'border-sap-400/40 text-sap-400 shadow-[inset_0_0_30px_rgba(245,201,107,0.05)]',
};

const STATUS_LABELS: Record<string, string> = {
  IDLE: 'Inactif',
  ASSIGNED_TO_PLANET: 'Sur planète',
  ON_FLEET: 'En flotte',
  ON_MISSION: 'En mission',
};

function TalentTree({
  commander,
  onInvest,
  disabled,
}: {
  commander: CommanderView;
  onInvest: (branch: CommanderTalentBranch, nodeId: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      {commander.talentBranches.map((branch) => (
        <div
          key={branch.branch}
          className="rounded-lg border border-canopy-700/15 bg-bark-950/35 p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm text-canopy-100/80">{branch.name}</h4>
            <span className="text-[10px] uppercase tracking-[0.16em] text-canopy-100/30">
              Talents
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {branch.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => node.available && onInvest(branch.branch, node.id)}
                disabled={!node.available || disabled}
                title={`${node.description} (+${node.effectValue * node.pointsInvested} ${node.effectKey})`}
                className={[
                  'inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed',
                  node.unlocked
                    ? 'border-canopy-400/35 bg-canopy-500/10 text-canopy-200'
                    : node.available
                      ? 'border-canopy-700/30 text-canopy-300 hover:bg-canopy-700/15'
                      : 'border-canopy-700/10 text-canopy-100/28',
                ].join(' ')}
              >
                {node.name}
                {node.pointsInvested > 0 && (
                  <span className="rounded bg-canopy-500/15 px-1.5 py-0.5 text-[10px] text-canopy-100/70">
                    {node.pointsInvested}/{node.maxPoints}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommanderCard({
  commander,
  expanded,
  onExpand,
  onAssign,
  onInvest,
  currentPlanetId,
  busy,
}: {
  commander: CommanderView;
  expanded: boolean;
  onExpand: () => void;
  onAssign: (planetId: string | null) => void;
  onInvest: (branch: CommanderTalentBranch, nodeId: string) => void;
  currentPlanetId?: string;
  busy: boolean;
}) {
  const xpPct = Math.min(100, Math.round((commander.xp / commander.xpToNextLevel) * 100));
  const rarityClass = RARITY_CLASSES[commander.rarity] ?? RARITY_CLASSES.COMMON;
  const stats: { label: string; value: number; Icon: IconType }[] = [
    { label: 'Attaque', value: commander.stats.attack, Icon: FiZap },
    { label: 'Défense', value: commander.stats.defense, Icon: FiShield },
    { label: 'Vitesse', value: commander.stats.speed, Icon: FiActivity },
    { label: 'Commandement', value: commander.stats.leadership, Icon: FiStar },
  ];

  return (
    <article className={`mycelium-panel overflow-hidden border ${rarityClass}`}>
      <button
        type="button"
        onClick={onExpand}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-canopy-500/[0.025]"
        aria-expanded={expanded}
      >
        <GameAssetImage
          asset={COMMANDER_VISUALS[commander.type]}
          className="h-12 w-12 rounded-lg"
          fallbackIcon="brain"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="truncate text-sm text-canopy-50/90">{commander.name}</h3>
            <span className={`text-xs ${rarityClass.split(' ')[1] ?? 'text-canopy-100/55'}`}>
              {RARITY_LABELS[commander.rarity]} · Niv. {commander.level}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-canopy-100/38">
            {commander.lore}
          </p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px] text-canopy-100/35">
              <span>XP</span>
              <span>
                {formatNumber(commander.xp)} / {formatNumber(commander.xpToNextLevel)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bark-950">
              <span
                className="block h-full rounded-full bg-canopy-500"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {commander.talentPoints > 0 && (
            <span className="rounded-full border border-sap-400/25 bg-sap-400/10 px-2 py-0.5 text-xs text-sap-400">
              +{commander.talentPoints}
            </span>
          )}
          <span className="rounded-full border border-canopy-700/20 px-2 py-0.5 text-xs text-canopy-100/45">
            {STATUS_LABELS[commander.status] ?? commander.status}
          </span>
          <FiChevronDown
            className={`h-4 w-4 text-canopy-100/35 transition ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-canopy-700/15 px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {stats.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="rounded-lg border border-canopy-700/12 bg-bark-950/35 px-3 py-2"
              >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-canopy-100/30">
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {label}
                </div>
                <p className="mt-1 text-sm text-canopy-100/80">{formatNumber(value)}</p>
              </div>
            ))}
          </div>

          {Object.keys(commander.activeBonus).length > 0 && (
            <div className="rounded-lg border border-canopy-700/15 bg-canopy-500/[0.035] p-3">
              <p className="mb-2 text-xs font-medium text-canopy-300">Bonus actifs</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(commander.activeBonus).map(([key, value]) => (
                  <span
                    key={key}
                    className="rounded-lg border border-canopy-700/15 bg-bark-950/45 px-2 py-1 text-xs text-canopy-100/70"
                  >
                    {key}: +{Math.round(Number(value) * 100)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {currentPlanetId && commander.assignedToPlanetId !== currentPlanetId && (
              <AnimatedButton
                variant="ghost"
                onClick={() => onAssign(currentPlanetId)}
                disabled={busy}
                className="flex-1"
              >
                <FiMapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Assigner ici
              </AnimatedButton>
            )}
            {commander.assignedToPlanetId && (
              <AnimatedButton
                variant="ghost"
                onClick={() => onAssign(null)}
                disabled={busy}
                className="flex-1 text-canopy-100/55"
              >
                Retirer
              </AnimatedButton>
            )}
          </div>

          {commander.talentBranches.length > 0 && (
            <TalentTree commander={commander} onInvest={onInvest} disabled={busy} />
          )}
        </div>
      )}
    </article>
  );
}

export default function CommandersPage() {
  const qc = useQueryClient();
  const { selectedId: selectedPlanetId } = usePlanetSelection();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const { data, isLoading } = useQuery({
    queryKey: ['commanders'],
    queryFn: () => api.commanders(),
  });

  const recruit = useMutation({
    mutationFn: (type: CommanderType) => api.recruitCommander(type),
    onSuccess: () => {
      setError(undefined);
      void qc.invalidateQueries({ queryKey: ['commanders'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Recrutement impossible.'),
  });

  const assign = useMutation({
    mutationFn: ({ id, planetId }: { id: string; planetId: string | null }) =>
      api.assignCommander(id, planetId),
    onSuccess: () => {
      setError(undefined);
      void qc.invalidateQueries({ queryKey: ['commanders'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Assignation impossible.'),
  });

  const invest = useMutation({
    mutationFn: ({
      id,
      branch,
      nodeId,
    }: {
      id: string;
      branch: CommanderTalentBranch;
      nodeId: string;
    }) => api.investTalent(id, branch, nodeId),
    onSuccess: () => {
      setError(undefined);
      void qc.invalidateQueries({ queryKey: ['commanders'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Talent indisponible.'),
  });

  const ownedTypes = useMemo(
    () => new Set(data?.commanders.map((commander) => commander.type) ?? []),
    [data?.commanders],
  );
  const activeCount = useMemo(
    () => data?.commanders.filter((commander) => commander.status !== 'IDLE').length ?? 0,
    [data?.commanders],
  );
  const busy = recruit.isPending || assign.isPending || invest.isPending;

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <>
            Commandants <span className="italic text-canopy-300">symbiotiques</span>
          </>
        }
        subtitle="Recrutez, assignez et développez vos symbiotes d'élite sans quitter la console impériale."
      >
        <StatCard
          label="Recrutés"
          value={`${data?.commanders.length ?? 0} / 12`}
          icon={<FiUser aria-hidden="true" />}
          color="green"
        />
        <StatCard
          label="Actifs"
          value={`${activeCount} / ${data?.maxActive ?? 0}`}
          icon={<FiActivity aria-hidden="true" />}
          color="purple"
          delay={0.05}
        />
      </PageHeader>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-canopy-100/50">Synchronisation des commandants…</p>
      ) : (
        <>
          <section className="mycelium-panel overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-canopy-700/15 px-5 py-4">
              <span
                className="h-1.5 w-1.5 rotate-45 bg-canopy-400/70"
                style={{ boxShadow: '0 0 10px rgba(63,217,137,0.5)' }}
                aria-hidden="true"
              />
              <h2 className="section-title">État-major</h2>
            </div>
            {data && data.commanders.length > 0 ? (
              <div className="grid gap-4 p-5 xl:grid-cols-2">
                {data.commanders.map((commander) => (
                  <CommanderCard
                    key={commander.id}
                    commander={commander}
                    expanded={expandedId === commander.id}
                    onExpand={() =>
                      setExpandedId(expandedId === commander.id ? null : commander.id)
                    }
                    onAssign={(planetId) => assign.mutate({ id: commander.id, planetId })}
                    onInvest={(branch, nodeId) =>
                      invest.mutate({ id: commander.id, branch, nodeId })
                    }
                    currentPlanetId={selectedPlanetId ?? undefined}
                    busy={busy}
                  />
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-sm text-canopy-100/45">
                Aucun commandant recruté. Le catalogue ci-dessous permet d'ouvrir le premier lien
                symbiotique.
              </div>
            )}
          </section>

          <section className="mycelium-panel overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-canopy-700/15 px-5 py-4">
              <span
                className="h-1.5 w-1.5 rotate-45 bg-sap-400/70"
                style={{ boxShadow: '0 0 10px rgba(245,201,107,0.45)' }}
                aria-hidden="true"
              />
              <h2 className="section-title">Recrutement</h2>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {Object.values(CommanderType).map((type) => {
                const config = COMMANDERS[type];
                if (!config) return null;
                const alreadyOwned = ownedTypes.has(type);
                const rarityClass = RARITY_CLASSES[config.rarity] ?? RARITY_CLASSES.COMMON;
                return (
                  <article
                    key={type}
                    className={`rounded-lg border bg-bark-950/35 p-4 transition ${
                      alreadyOwned ? 'border-canopy-700/10 opacity-55' : rarityClass
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <GameAssetImage
                        asset={COMMANDER_VISUALS[type]}
                        className="h-10 w-10 rounded-lg"
                        fallbackIcon="brain"
                      />
                      <div className="min-w-0">
                        <h3 className="truncate text-sm text-canopy-50/90">{config.name}</h3>
                        <p className="mt-0.5 text-xs text-canopy-100/40">
                          {RARITY_LABELS[config.rarity]}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-xs leading-5 text-canopy-100/38">
                      {config.lore}
                    </p>
                    <div className="mt-3">
                      <ResourceCost cost={config.recruitCost} />
                    </div>
                    <AnimatedButton
                      variant={alreadyOwned ? 'ghost' : 'primary'}
                      onClick={() => recruit.mutate(type)}
                      disabled={alreadyOwned || recruit.isPending}
                      loading={recruit.isPending && recruit.variables === type}
                      className="mt-4 w-full"
                    >
                      {alreadyOwned ? 'Déjà recruté' : 'Recruter'}
                    </AnimatedButton>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
