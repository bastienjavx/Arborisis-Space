'use client';

import Link from 'next/link';
import { ITEMS, ItemRarity, type MarketSummaryView } from '@arborisis/shared';
import { useMarketSummaries } from '@/lib/queries';
import { GameAssetImage } from '@/components/GameAssetImage';
import { PageHeader } from '@/components/PageHeader';
import { ITEM_VISUALS } from '@/lib/gameVisualAssets';
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

const RARITY_ORDER = [
  ItemRarity.COMMON,
  ItemRarity.UNCOMMON,
  ItemRarity.RARE,
  ItemRarity.EPIC,
  ItemRarity.LEGENDARY,
];

const RARITY_LABELS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: 'Commun',
  [ItemRarity.UNCOMMON]: 'Peu commun',
  [ItemRarity.RARE]: 'Rare',
  [ItemRarity.EPIC]: 'Épique',
  [ItemRarity.LEGENDARY]: 'Légendaire',
};

export default function MarketPage() {
  const { data: summaries, isError, isLoading } = useMarketSummaries();

  const grouped = Object.values(ITEMS).reduce(
    (acc, item) => {
      const summary = summaries?.find((s) => s.itemKey === item.key);
      if (!acc[item.rarity]) acc[item.rarity] = [];
      acc[item.rarity].push({ item, summary });
      return acc;
    },
    {} as Record<
      ItemRarity,
      { item: (typeof ITEMS)[keyof typeof ITEMS]; summary: MarketSummaryView | undefined }[]
    >,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salle des Marchés"
        subtitle="Échangez des objets à des prix fixés par les joueurs. Liquidités 100% organiques."
      />

      {isError && (
        <p className="rounded-lg border border-sap-400/20 bg-bark-900/60 px-4 py-3 text-sm text-sap-400/80">
          Les cours du marché sont momentanément indisponibles. Le catalogue reste accessible.
        </p>
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
              {RARITY_LABELS[rarity]}
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
                      <GameAssetImage
                        asset={ITEM_VISUALS[item.key]}
                        className="h-10 w-10 rounded-lg"
                        fallbackIcon={item.icon}
                      />
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
                        {isLoading
                          ? '...'
                          : summary?.lastPrice != null
                            ? `${summary.lastPrice.toLocaleString()} B`
                            : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-canopy-100/40">24h</p>
                      {isLoading ? (
                        <span className="text-canopy-100/40">...</span>
                      ) : (
                        <PriceChange change={summary?.change24h ?? null} />
                      )}
                    </div>
                    <div>
                      <p className="text-canopy-100/40">Meilleur achat</p>
                      <p className="font-mono text-emerald-400">
                        {isLoading
                          ? '...'
                          : summary?.bestBid != null
                            ? `${summary.bestBid.toLocaleString()}`
                            : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-canopy-100/40">Meilleure vente</p>
                      <p className="font-mono text-red-400">
                        {isLoading
                          ? '...'
                          : summary?.bestAsk != null
                            ? `${summary.bestAsk.toLocaleString()}`
                            : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-1 text-[10px] text-canopy-100/30">
                    Volume 24h : {isLoading ? '...' : (summary?.volume24h.toLocaleString() ?? 0)}{' '}
                    unités
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
