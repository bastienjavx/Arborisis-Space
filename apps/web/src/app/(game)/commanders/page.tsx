'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COMMANDERS, CommanderType, type CommanderView } from '@arborisis/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { usePlanetSelection } from '@/components/PlanetContext';

const RARITY_COLORS: Record<string, string> = {
  COMMON: 'text-gray-400 border-gray-600',
  UNCOMMON: 'text-green-400 border-green-600',
  RARE: 'text-blue-400 border-blue-600',
  EPIC: 'text-purple-400 border-purple-600',
  LEGENDARY: 'text-amber-400 border-amber-600',
};

const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Commun',
  UNCOMMON: 'Peu commun',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
};

function TalentTree({
  commander,
  onInvest,
}: {
  commander: CommanderView;
  onInvest: (branch: string, nodeId: string) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      {commander.talentBranches.map((branch) => (
        <div
          key={branch.branch}
          className="rounded-lg border border-emerald-900/40 bg-black/20 p-3"
        >
          <h4 className="mb-2 text-sm font-semibold text-emerald-400">{branch.name}</h4>
          <div className="flex flex-wrap gap-2">
            {branch.nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => node.available && onInvest(branch.branch, node.id)}
                disabled={!node.available}
                title={`${node.description} (+${node.effectValue * node.pointsInvested} ${node.effectKey})`}
                className={[
                  'relative rounded px-3 py-1.5 text-xs font-medium transition-all',
                  node.unlocked
                    ? 'border border-emerald-500 bg-emerald-900/50 text-emerald-300'
                    : node.available
                      ? 'border border-emerald-700 bg-emerald-950/50 text-emerald-400 hover:bg-emerald-900/30'
                      : 'border border-gray-800 bg-gray-950/50 text-gray-600 cursor-not-allowed',
                ].join(' ')}
              >
                {node.name}
                {node.pointsInvested > 0 && (
                  <span className="ml-1 rounded bg-emerald-600 px-1 py-0.5 text-[10px]">
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
}: {
  commander: CommanderView;
  expanded: boolean;
  onExpand: () => void;
  onAssign: (planetId: string | null) => void;
  onInvest: (branch: string, nodeId: string) => void;
  currentPlanetId?: string;
}) {
  const xpPct = Math.min(100, (commander.xp / commander.xpToNextLevel) * 100);
  const rarityClasses = RARITY_COLORS[commander.rarity] ?? RARITY_COLORS.COMMON;

  return (
    <div className={`rounded-xl border ${rarityClasses} bg-gray-950 p-4 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 cursor-pointer" onClick={onExpand}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{'🧬'}</span>
            <div>
              <h3 className="font-bold text-white">{commander.name}</h3>
              <span className={`text-xs ${rarityClasses.split(' ')[0]}`}>
                {RARITY_LABELS[commander.rarity]} · Niv. {commander.level}
              </span>
            </div>
          </div>

          {/* XP Bar */}
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-[10px] text-gray-500">
              <span>XP</span>
              <span>
                {commander.xp} / {commander.xpToNextLevel}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {commander.talentPoints > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
              +{commander.talentPoints} pts talent
            </span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
              commander.status === 'IDLE'
                ? 'border-gray-700 text-gray-400'
                : commander.status === 'ASSIGNED_TO_PLANET'
                  ? 'border-emerald-700 text-emerald-400'
                  : 'border-blue-700 text-blue-400'
            }`}
          >
            {commander.status === 'IDLE'
              ? 'Inactif'
              : commander.status === 'ASSIGNED_TO_PLANET'
                ? 'Sur planète'
                : 'En mission'}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-gray-800 pt-3">
          {/* Lore */}
          <p className="text-xs italic text-gray-400">{commander.lore}</p>

          {/* Bonus actifs */}
          {Object.keys(commander.activeBonus).length > 0 && (
            <div className="rounded-lg bg-emerald-950/30 p-2">
              <p className="mb-1 text-xs font-semibold text-emerald-400">Bonus actifs</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(commander.activeBonus).map(([key, value]) => (
                  <span
                    key={key}
                    className="rounded bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-300"
                  >
                    {key}: +{Math.round(Number(value) * 100)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Assigner à la planète */}
          <div className="flex gap-2">
            {currentPlanetId && commander.assignedToPlanetId !== currentPlanetId && (
              <button
                onClick={() => onAssign(currentPlanetId)}
                className="flex-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
              >
                Assigner ici
              </button>
            )}
            {commander.assignedToPlanetId && (
              <button
                onClick={() => onAssign(null)}
                className="flex-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800"
              >
                Retirer
              </button>
            )}
          </div>

          {/* Arbre de talents */}
          {commander.talentBranches.length > 0 && (
            <TalentTree commander={commander} onInvest={onInvest} />
          )}
        </div>
      )}
    </div>
  );
}

export default function CommandersPage() {
  const qc = useQueryClient();
  const { selectedId: selectedPlanetId } = usePlanetSelection();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['commanders'],
    queryFn: () => api.commanders(),
  });

  const recruit = useMutation({
    mutationFn: (type: CommanderType) => api.recruitCommander(type),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commanders'] }),
  });

  const assign = useMutation({
    mutationFn: ({ id, planetId }: { id: string; planetId: string | null }) =>
      api.assignCommander(id, planetId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commanders'] }),
  });

  const invest = useMutation({
    mutationFn: ({ id, branch, nodeId }: { id: string; branch: string; nodeId: string }) =>
      api.investTalent(id, branch as any, nodeId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commanders'] }),
  });

  const ownedTypes = new Set(data?.commanders.map((c) => c.type) ?? []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader title="Commandants" subtitle="Recrutez et développez vos symbiotes d'élite" />

      <div className="mx-auto max-w-5xl px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Commandants recrutés */}
            {data && data.commanders.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-emerald-400">
                  Mes Commandants ({data.commanders.length} / {data.maxActive} actifs max)
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.commanders.map((c) => (
                    <CommanderCard
                      key={c.id}
                      commander={c}
                      expanded={expandedId === c.id}
                      onExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      onAssign={(planetId) => assign.mutate({ id: c.id, planetId })}
                      onInvest={(branch, nodeId) => invest.mutate({ id: c.id, branch, nodeId })}
                      currentPlanetId={selectedPlanetId ?? undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Recrutement */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-white">Recruter un Commandant</h2>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {Object.values(CommanderType).map((type) => {
                  const config = COMMANDERS[type];
                  if (!config) return null;
                  const alreadyOwned = ownedTypes.has(type);
                  return (
                    <div
                      key={type}
                      className={`rounded-xl border p-4 transition-all ${
                        alreadyOwned
                          ? 'border-gray-800 bg-gray-950/50 opacity-50'
                          : (RARITY_COLORS[config.rarity] ?? RARITY_COLORS.COMMON)
                      } bg-gray-950`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{'🧬'}</span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{config.name}</h3>
                          <span className="text-xs text-gray-400">
                            {RARITY_LABELS[config.rarity]}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-400 line-clamp-2">{config.lore}</p>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {Object.entries(config.recruitCost)
                          .filter(([, v]) => (v ?? 0) > 0)
                          .map(([res, val]) => (
                            <span
                              key={res}
                              className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300"
                            >
                              {val?.toLocaleString()} {res}
                            </span>
                          ))}
                      </div>

                      <button
                        onClick={() => recruit.mutate(type)}
                        disabled={alreadyOwned || recruit.isPending}
                        className={`mt-3 w-full rounded-lg py-1.5 text-xs font-medium transition-all ${
                          alreadyOwned
                            ? 'cursor-not-allowed bg-gray-800 text-gray-600'
                            : 'bg-emerald-700 text-white hover:bg-emerald-600 active:scale-95'
                        }`}
                      >
                        {alreadyOwned ? 'Déjà recruté' : 'Recruter'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
