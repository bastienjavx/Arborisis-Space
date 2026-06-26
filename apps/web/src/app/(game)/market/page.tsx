'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ITEMS, type MarketSummaryView, type ItemKey } from '@arborisis/shared';
import { api } from '@/lib/api';
import { GameIcon } from '@/components/GameIcon';
import { PageHeader } from '@/components/PageHeader';
import { FiTrendingUp, FiTrendingDown, FiMinus, FiArrowRight } from 'react-icons/fi';

function PriceChange({ change }: { change: number | null }) {
  if (change === null) return <span className="text-canopy-100/40">—</span>;
  if (change > 0)
    return (
      <span className="flex items-center gap-1 text-emerald-400">
        <FiTrendingUp className="h-3 w-3" aria-hidden />+{change.toFixed(2)}%
      </span>
    );
  if (change < 0)
    return (
      <span className="flex items-center gap-1 text-red-400">
        <FiTrendingDown className="h-3 w-3" aria-hidden />
        {change.toFixed(2)}%
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-canopy-100/60">
      <FiMinus className="h-3 w-3" aria-hidden />
      0%
    </span>
  );
}

const RARITY_ORDER = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

export default function MarketPage() {
  const { data: summaries, isLoading } = useQuery({
    queryKey: ['market', 'summaries'],
    queryFn: () => api.marketSummaries(),
    refetchInterval: 15_000,
  });

  const grouped = summaries
    ? Object.values(ITEMS).reduce(
        (acc, item) => {
          const summary = summaries.find((s) => s.itemKey === item.key);
          if (!acc[item.rarity]) acc[item.rarity] = [];
          acc[item.rarity].push({ item, summary });
          return acc;
        },
        {} as Record<
          string,
          { item: (typeof ITEMS)[ItemKey]; summary: MarketSummaryView | undefined }[]
        >,
      )
    : {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salle des Marchés"
        subtitle="Échangez des objets à des prix fixés par les joueurs. Liquidités 100% organiques."
      />

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-bark-800/50" />
          ))}
        </div>
      )}

      {RARITY_ORDER.map((rarity) => {
        const items = grouped[rarity];
        if (!items?.length) return null;
        return (
          <section key={rarity}>
            <h2
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: ITEMS[items[0].item.key].rarityColor }}
            >
              {rarity === 'COMMON'
                ? 'Commun'
                : rarity === 'UNCOMMON'
                  ? 'Peu commun'
                  : rarity === 'RARE'
                    ? 'Rare'
                    : rarity === 'EPIC'
                      ? 'Épique'
                      : 'Légendaire'}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map(({ item, summary }) => (
                <Link
                  key={item.key}
                  href={`/market/${item.key}`}
                  className="group flex flex-col gap-2 rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4 transition hover:border-canopy-500/40 hover:bg-bark-800/60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl leading-none">
                        <GameIcon name={item.icon} className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-canopy-100">{item.name}</p>
                        <p className="text-[10px] text-canopy-100/40">
                          {item.category === 'RAW_MATERIAL' ? 'Matière première' : 'Traité'}
                        </p>
                      </div>
                    </div>
                    <FiArrowRight
                      className="h-4 w-4 text-canopy-100/20 transition group-hover:text-canopy-400"
                      aria-hidden
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <p className="text-canopy-100/40">Dernier</p>
                      <p className="font-mono font-semibold text-canopy-100">
                        {summary?.lastPrice != null
                          ? `${summary.lastPrice.toLocaleString()} B`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-canopy-100/40">24h</p>
                      <PriceChange change={summary?.change24h ?? null} />
                    </div>
                    <div>
                      <p className="text-canopy-100/40">Meilleur achat</p>
                      <p className="font-mono text-emerald-400">
                        {summary?.bestBid != null ? `${summary.bestBid.toLocaleString()}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-canopy-100/40">Meilleure vente</p>
                      <p className="font-mono text-red-400">
                        {summary?.bestAsk != null ? `${summary.bestAsk.toLocaleString()}` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-1 text-[10px] text-canopy-100/30">
                    Volume 24h : {summary?.volume24h.toLocaleString() ?? 0} unités
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
