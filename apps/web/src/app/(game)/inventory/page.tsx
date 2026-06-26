'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CRAFTING_RECIPES, ITEMS, ItemCategory, type ItemKey } from '@arborisis/shared';
import { api } from '@/lib/api';
import { GameIcon } from '@/components/GameIcon';
import { PageHeader } from '@/components/PageHeader';
import { FiPackage, FiArrowRight, FiRepeat, FiTool } from 'react-icons/fi';

export default function InventoryPage() {
  const { data: slots, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.inventory(),
  });

  // Group by planet
  const byPlanet: Record<string, { planetName: string; slots: typeof slots }> = {};
  for (const slot of slots ?? []) {
    if (!byPlanet[slot.planetId]) {
      byPlanet[slot.planetId] = { planetName: slot.planetName, slots: [] };
    }
    byPlanet[slot.planetId].slots!.push(slot);
  }

  const totalItems = slots?.reduce((sum, s) => sum + s.quantity, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventaire"
        subtitle="Objets farmés en PvE et expéditions, stockés sur vos planètes."
      />

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-bark-800/50" />
          ))}
        </div>
      )}

      {!isLoading && totalItems === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-canopy-700/20 bg-bark-900/40 py-16">
          <FiPackage className="h-12 w-12 text-canopy-100/20" aria-hidden />
          <p className="text-sm text-canopy-100/40">Votre inventaire est vide.</p>
          <p className="text-xs text-canopy-100/30">
            Combattez des anomalies PvE ou activez des lignes de production pour obtenir des objets.
          </p>
          <div className="flex gap-3">
            <Link href="/pve" className="btn btn-sm">
              Aller en PvE
            </Link>
            <Link href="/production" className="btn btn-sm btn-ghost">
              Lignes de production
            </Link>
          </div>
        </div>
      )}

      {Object.entries(byPlanet).map(([planetId, { planetName, slots: planetSlots }]) => (
        <section key={planetId}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/40">
            {planetName}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {planetSlots!.map((slot) => {
              const item = ITEMS[slot.itemKey as ItemKey];
              if (!item) return null;
              const isIngredient = CRAFTING_RECIPES.some((r) =>
                r.ingredients.some((ing) => ing.itemKey === slot.itemKey),
              );
              return (
                <div
                  key={`${planetId}-${slot.itemKey}`}
                  className="flex flex-col gap-2 rounded-xl border bg-bark-900/60 p-3"
                  style={{ borderColor: `${item.rarityColor}20` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">
                      <GameIcon name={item.icon} className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <p
                        className="truncate text-xs font-semibold"
                        style={{ color: item.rarityColor }}
                      >
                        {item.name}
                      </p>
                      <p className="text-[10px] text-canopy-100/30">
                        {item.category === ItemCategory.RAW_MATERIAL ? 'Matière' : 'Traité'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="font-mono text-lg font-bold text-canopy-100">
                      {slot.quantity.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1">
                      {isIngredient && (
                        <Link
                          href="/crafting"
                          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-canopy-100/40 hover:bg-bark-700/50 hover:text-canopy-300"
                          title="Transformer en artisanat"
                        >
                          <FiTool className="h-2.5 w-2.5" aria-hidden />
                        </Link>
                      )}
                      <Link
                        href={`/market/${slot.itemKey}`}
                        className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-canopy-100/40 hover:bg-bark-700/50 hover:text-canopy-300"
                      >
                        Vendre <FiArrowRight className="h-2.5 w-2.5" aria-hidden />
                      </Link>
                    </div>
                  </div>
                  <div className="text-[10px] text-canopy-100/25">
                    ~{(item.baseValue * slot.quantity).toLocaleString()} B valeur
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
