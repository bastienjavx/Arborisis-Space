'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DEFENSES, DefenseType } from '@arborisis/shared';
import { useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { usePlanetSelection } from '@/components/PlanetContext';
import { FiShield, FiZap } from 'react-icons/fi';

const DEFENSE_ICONS: Partial<Record<DefenseType, string>> = {
  [DefenseType.ION_CANNON]: '⚡',
  [DefenseType.SPORE_NET]: '🕸️',
  [DefenseType.SHIELD_MEMBRANE]: '🛡️',
  [DefenseType.MYCELIAL_TURRET]: '🔫',
  [DefenseType.VOID_LANCE]: '🌑',
};

export default function DefensesPage() {
  const qc = useQueryClient();
  const { selectedId: selectedPlanetId } = usePlanetSelection();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['defenses', selectedPlanetId],
    queryFn: () => (selectedPlanetId ? api.defenses(selectedPlanetId) : null),
    enabled: !!selectedPlanetId,
  });

  const build = useMutation({
    mutationFn: ({ defenseType, quantity }: { defenseType: DefenseType; quantity: number }) =>
      api.buildDefense(selectedPlanetId!, defenseType, quantity),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['defenses', selectedPlanetId] });
      setQuantities({});
    },
  });

  if (!selectedPlanetId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-gray-400">Sélectionnez une planète pour gérer ses défenses.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader
        title="Défenses Orbitales"
        subtitle="Fortifiez vos planètes avec des structures défensives permanentes"
      />

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Résumé */}
        {data && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">
              <div className="flex items-center gap-2 text-red-400">
                <FiZap />
                <span className="text-sm font-medium">Attaque totale</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {data.totalAttack.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
              <div className="flex items-center gap-2 text-blue-400">
                <FiShield />
                <span className="text-sm font-medium">Défense totale</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {data.totalDefense.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.defenses ?? []).map((defense) => {
              const config = DEFENSES[defense.type];
              const qty = quantities[defense.type] ?? 1;
              return (
                <div
                  key={defense.type}
                  className={`rounded-xl border p-4 transition-all ${
                    defense.quantity > 0
                      ? 'border-emerald-900/60 bg-emerald-950/20'
                      : 'border-gray-800 bg-gray-950'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{DEFENSE_ICONS[defense.type] ?? '🔰'}</span>
                      <div>
                        <h3 className="font-semibold text-white">{defense.name}</h3>
                        <span className="text-xs text-gray-400">
                          {defense.quantity > 0
                            ? `${defense.quantity.toLocaleString()} unités`
                            : 'Aucune'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-gray-400 line-clamp-2">{defense.description}</p>

                  {/* Stats */}
                  <div className="mt-3 flex gap-3 text-xs">
                    <span className="flex items-center gap-1 text-red-400">
                      <FiZap size={10} /> {defense.attack}
                    </span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <FiShield size={10} /> {defense.defense}
                    </span>
                    <span className="text-gray-500">Coque: {defense.hull}</span>
                  </div>

                  {/* Coût */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(defense.cost)
                      .filter(([, v]) => (v ?? 0) > 0)
                      .map(([res, val]) => (
                        <span
                          key={res}
                          className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300"
                        >
                          {(val ?? 0) * qty} {res}
                        </span>
                      ))}
                  </div>

                  {/* Quantité + bouton */}
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={qty}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [defense.type]: Math.max(1, parseInt(e.target.value) || 1),
                        }))
                      }
                      className="w-20 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white"
                    />
                    <button
                      onClick={() => build.mutate({ defenseType: defense.type, quantity: qty })}
                      disabled={build.isPending || !defense.canAfford}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                        defense.canAfford
                          ? 'bg-emerald-700 text-white hover:bg-emerald-600 active:scale-95'
                          : 'cursor-not-allowed bg-gray-800 text-gray-600'
                      }`}
                    >
                      {defense.canAfford ? 'Construire' : 'Ressources insuffisantes'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
