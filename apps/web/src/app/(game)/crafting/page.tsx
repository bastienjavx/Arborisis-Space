'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ITEMS,
  CRAFTING_RECIPES,
  type CraftingRecipeConfig,
  type ItemKey,
  ResourceType,
} from '@arborisis/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { usePlanetSelection } from '@/components/PlanetContext';
import { AnimatedCountdown } from '@/components/AnimatedCountdown';
import { FiClock, FiZap } from 'react-icons/fi';

const RESOURCE_ICONS: Record<string, string> = {
  [ResourceType.BIOMASS]: '🌿',
  [ResourceType.SAP]: '💧',
  [ResourceType.MINERALS]: '⛏️',
  [ResourceType.SPORES]: '✨',
};

function RecipeCard({
  recipe,
  inventory,
  planetResources,
  onCraft,
}: {
  recipe: CraftingRecipeConfig;
  inventory: Record<string, number>;
  planetResources: Record<string, number>;
  onCraft: (recipeId: string, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const output = ITEMS[recipe.outputKey as ItemKey];

  const canCraft = recipe.ingredients.every((ing) => {
    const need = ing.quantity * qty;
    if (ing.itemKey) return (inventory[ing.itemKey] ?? 0) >= need;
    if (ing.resource) return (planetResources[ing.resource] ?? 0) >= need;
    return false;
  });

  const totalTime = recipe.craftTimeSeconds * qty;
  const formatTime = (s: number) => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  return (
    <div className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4">
      {/* Output */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-3xl leading-none">{output?.icon}</span>
        <div>
          <p className="font-semibold text-canopy-100" style={{ color: output?.rarityColor }}>
            {output?.name}
          </p>
          <p className="text-xs text-canopy-100/40">
            Produit : {recipe.outputQty} × {qty} = {recipe.outputQty * qty} unités
          </p>
        </div>
      </div>

      {/* Ingredients */}
      <div className="mb-4 space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest text-canopy-100/30">Ingrédients</p>
        {recipe.ingredients.map((ing, i) => {
          const need = ing.quantity * qty;
          let have = 0;
          let label = '';
          let icon = '';
          if (ing.itemKey) {
            have = inventory[ing.itemKey] ?? 0;
            const item = ITEMS[ing.itemKey as ItemKey];
            label = item?.name ?? ing.itemKey;
            icon = item?.icon ?? '📦';
          } else if (ing.resource) {
            have = planetResources[ing.resource] ?? 0;
            label = ing.resource;
            icon = RESOURCE_ICONS[ing.resource] ?? '📦';
          }
          const ok = have >= need;
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span>{icon}</span>
              <span className="flex-1 text-canopy-100/70">{label}</span>
              <span className={`font-mono ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {have.toLocaleString()} / {need.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time + Qty */}
      <div className="mb-3 flex items-center gap-3">
        <FiClock className="h-3.5 w-3.5 text-canopy-100/30" aria-hidden />
        <span className="text-xs text-canopy-100/50">{formatTime(totalTime)}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="h-7 w-7 rounded-md bg-bark-800/60 text-sm hover:bg-bark-700"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-mono font-semibold text-canopy-100">{qty}</span>
          <button
            onClick={() => setQty(Math.min(100, qty + 1))}
            className="h-7 w-7 rounded-md bg-bark-800/60 text-sm hover:bg-bark-700"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={() => onCraft(recipe.id, qty)}
        disabled={!canCraft}
        className="w-full rounded-lg bg-canopy-600/25 py-2 text-sm font-semibold text-canopy-300 transition hover:bg-canopy-600/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FiZap className="mr-1 inline h-3.5 w-3.5" aria-hidden />
        Fabriquer
      </button>
    </div>
  );
}

export default function CraftingPage() {
  const qc = useQueryClient();
  const { selectedId: planetId } = usePlanetSelection();
  const [craftError, setCraftError] = useState('');

  const { data: jobs } = useQuery({
    queryKey: ['crafting', 'jobs'],
    queryFn: () => api.craftingJobs(),
    refetchInterval: 5_000,
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.inventory(),
  });

  const { data: planet } = useQuery({
    queryKey: ['planet', planetId],
    queryFn: () => (planetId ? api.planet(planetId) : null),
    enabled: !!planetId,
  });

  const inventoryMap: Record<string, number> = {};
  for (const slot of inventory ?? []) {
    if (!planetId || slot.planetId === planetId) {
      inventoryMap[slot.itemKey] = (inventoryMap[slot.itemKey] ?? 0) + slot.quantity;
    }
  }

  const planetResources: Record<string, number> = {
    BIOMASS: planet?.resources?.amounts?.BIOMASS ?? 0,
    SAP: planet?.resources?.amounts?.SAP ?? 0,
    MINERALS: planet?.resources?.amounts?.MINERALS ?? 0,
    SPORES: planet?.resources?.amounts?.SPORES ?? 0,
  };

  const craft = useMutation({
    mutationFn: ({ recipeId, qty }: { recipeId: string; qty: number }) =>
      api.startCrafting({ recipeId, planetId: planetId!, quantity: qty }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crafting'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['planet'] });
      setCraftError('');
    },
    onError: (e: Error) => setCraftError(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atelier d'Artisanat"
        subtitle="Transformez vos matières premières en objets de valeur."
      />

      {craftError && (
        <div className="rounded-xl bg-red-900/20 px-4 py-3 text-sm text-red-400">{craftError}</div>
      )}

      {/* Active jobs */}
      {(jobs?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/40">
            En cours de fabrication
          </h2>
          <div className="space-y-2">
            {jobs!.map((j) => {
              const item = ITEMS[j.outputKey as ItemKey];
              return (
                <div
                  key={j.id}
                  className="flex items-center gap-3 rounded-xl border border-canopy-700/15 bg-bark-900/60 px-4 py-3"
                >
                  <span className="text-xl">{item?.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-canopy-100">
                      {item?.name} ×{j.outputQty * j.quantity}
                    </p>
                    <p className="text-xs text-canopy-100/40">{j.planetName}</p>
                  </div>
                  <AnimatedCountdown
                    finishesAt={j.completesAt}
                    className="font-mono text-sm text-canopy-300"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recipes */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/40">
          Recettes disponibles
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CRAFTING_RECIPES.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              inventory={inventoryMap}
              planetResources={planetResources}
              onCraft={(recipeId, qty) => {
                if (!planetId) { setCraftError('Sélectionnez une planète.'); return; }
                craft.mutate({ recipeId, qty });
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
