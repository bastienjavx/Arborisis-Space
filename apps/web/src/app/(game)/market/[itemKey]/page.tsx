'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CRAFTING_RECIPES,
  ITEMS,
  MarketOrderSide,
  PRODUCTION_LINE_RECIPES,
  type ItemKey,
  type PlaceMarketOrderDto,
} from '@arborisis/shared';
import { api } from '@/lib/api';
import { GameAssetImage } from '@/components/GameAssetImage';
import {
  keys,
  useInventory,
  useMarketCandles,
  useMarketOrderBook,
  useMyMarketOrders,
} from '@/lib/queries';
import { TradingChart } from '@/components/market/TradingChart';
import { OrderBook } from '@/components/market/OrderBook';
import { usePlanetSelection } from '@/components/PlanetContext';
import { ITEM_VISUALS } from '@/lib/gameVisualAssets';
import { FiArrowLeft, FiClock, FiRepeat, FiTool, FiWifi, FiX, FiZap } from 'react-icons/fi';

type Interval = '1h' | '4h' | '1d';

export default function ItemMarketPage() {
  const { itemKey } = useParams<{ itemKey: string }>();
  const qc = useQueryClient();
  const { selectedId: planetId } = usePlanetSelection();

  const [interval, setInterval] = useState<Interval>('1h');
  const [side, setSide] = useState<MarketOrderSide>(MarketOrderSide.BUY);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');

  const item = ITEMS[itemKey as ItemKey];
  if (!item) return <div className="p-8 text-red-400">Objet inconnu.</div>;

  const { data: orderBook, isLoading: obLoading } = useMarketOrderBook(itemKey);
  const {
    data: candles,
    dataUpdatedAt,
    isFetching: candlesRefreshing,
  } = useMarketCandles(itemKey, interval);
  const { data: myOrders } = useMyMarketOrders();
  const { data: inventory } = useInventory();

  const itemInventory =
    inventory?.filter((s) => s.itemKey === itemKey && s.planetId === planetId) ?? [];
  const totalInInventory = itemInventory.reduce((sum, s) => sum + s.quantity, 0);

  const place = useMutation({
    mutationFn: (dto: PlaceMarketOrderDto) => api.placeMarketOrder(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.marketSummaries });
      qc.invalidateQueries({ queryKey: keys.marketOrderBook(itemKey) });
      qc.invalidateQueries({ queryKey: keys.myMarketOrders });
      qc.invalidateQueries({ queryKey: keys.inventory });
      setPrice('');
      setQuantity('');
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelMarketOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.marketSummaries });
      qc.invalidateQueries({ queryKey: keys.marketOrderBook(itemKey) });
      qc.invalidateQueries({ queryKey: keys.myMarketOrders });
      qc.invalidateQueries({ queryKey: keys.inventory });
    },
  });

  const myItemOrders =
    myOrders?.filter(
      (o) => o.itemKey === itemKey && (o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'),
    ) ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planetId) {
      setError('Sélectionnez une planète.');
      return;
    }
    const p = parseInt(price);
    const q = parseInt(quantity);
    if (isNaN(p) || p <= 0) {
      setError('Prix invalide.');
      return;
    }
    if (isNaN(q) || q <= 0) {
      setError('Quantité invalide.');
      return;
    }
    place.mutate({
      itemKey: itemKey as ItemKey,
      side,
      pricePerUnit: p,
      quantity: q,
      sourcePlanetId: planetId,
    });
  }

  const lineRecipe = PRODUCTION_LINE_RECIPES.find((r) => r.outputKey === (itemKey as ItemKey));
  const craftRecipe = CRAFTING_RECIPES.find((r) => r.outputKey === (itemKey as ItemKey));
  const bestBid = orderBook?.bids.at(0)?.price ?? null;
  const bestAsk = orderBook?.asks.at(0)?.price ?? null;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  const parsedPrice = Number.parseInt(price, 10);
  const hasValidPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const activeOwnOrders = myItemOrders.map((order) => ({
    ...order,
    remainingQuantity: order.quantity - order.filledQuantity,
  }));
  const crossedBookQuantity =
    orderBook && hasValidPrice
      ? side === MarketOrderSide.BUY
        ? orderBook.asks
            .filter((ask) => ask.price <= parsedPrice)
            .reduce((sum, ask) => sum + ask.quantity, 0)
        : orderBook.bids
            .filter((bid) => bid.price >= parsedPrice)
            .reduce((sum, bid) => sum + bid.quantity, 0)
      : 0;
  const crossedOwnQuantity = hasValidPrice
    ? activeOwnOrders
        .filter((order) =>
          side === MarketOrderSide.BUY
            ? order.side === MarketOrderSide.SELL && order.pricePerUnit <= parsedPrice
            : order.side === MarketOrderSide.BUY && order.pricePerUnit >= parsedPrice,
        )
        .reduce((sum, order) => sum + order.remainingQuantity, 0)
    : 0;
  const onlyCrossesOwnOrders =
    crossedBookQuantity > 0 && Math.max(0, crossedBookQuantity - crossedOwnQuantity) === 0;
  const lastUpdatedLabel = dataUpdatedAt
    ? new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(dataUpdatedAt))
    : '—';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/market"
          className="rounded-lg p-1.5 text-canopy-100/40 hover:bg-bark-800/60 hover:text-canopy-100"
        >
          <FiArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <GameAssetImage
          asset={ITEM_VISUALS[item.key]}
          className="h-14 w-14 rounded-xl"
          fallbackIcon={item.icon}
        />
        <div>
          <h1 className="text-xl font-bold text-canopy-100">{item.name}</h1>
          <p className="text-xs text-canopy-100/50">{item.description}</p>
        </div>
        <span
          className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
          style={{
            color: item.rarityColor,
            borderColor: item.rarityColor,
            border: `1px solid ${item.rarityColor}30`,
            background: `${item.rarityColor}10`,
          }}
        >
          {item.rarity}
        </span>
      </div>

      {/* Sources d'obtention */}
      {(lineRecipe || craftRecipe) && (
        <div className="flex flex-wrap gap-2">
          {lineRecipe && (
            <Link
              href="/production"
              className="flex items-center gap-1.5 rounded-lg border border-canopy-700/20 bg-bark-900/50 px-3 py-1.5 text-xs text-canopy-100/60 hover:border-canopy-500/40 hover:text-canopy-300"
            >
              <FiRepeat className="h-3.5 w-3.5" aria-hidden />
              Ligne de production disponible
            </Link>
          )}
          {craftRecipe && (
            <Link
              href="/crafting"
              className="flex items-center gap-1.5 rounded-lg border border-canopy-700/20 bg-bark-900/50 px-3 py-1.5 text-xs text-canopy-100/60 hover:border-canopy-500/40 hover:text-canopy-300"
            >
              <FiTool className="h-3.5 w-3.5" aria-hidden />
              Recette artisanale disponible
            </Link>
          )}
          {!lineRecipe && !craftRecipe && (
            <span className="flex items-center gap-1.5 rounded-lg border border-canopy-700/15 bg-bark-900/40 px-3 py-1.5 text-xs text-canopy-100/35">
              <FiZap className="h-3.5 w-3.5" aria-hidden />
              Obtention PvE uniquement
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MarketStat
          label="Meilleur achat"
          value={bestBid != null ? `${bestBid.toLocaleString()} B` : '—'}
          tone="buy"
        />
        <MarketStat
          label="Meilleure vente"
          value={bestAsk != null ? `${bestAsk.toLocaleString()} B` : '—'}
          tone="sell"
        />
        <MarketStat label="Spread" value={spread != null ? `${spread.toLocaleString()} B` : '—'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: Chart */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-canopy-700/20 bg-bark-900/50 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-canopy-100/50">
              <FiWifi
                className={`h-4 w-4 ${candlesRefreshing ? 'animate-pulse text-emerald-300' : 'text-canopy-400/60'}`}
                aria-hidden
              />
              Prix temps réel · dernière synchro {lastUpdatedLabel}
            </div>
            {/* Interval selector */}
            <div className="flex gap-1">
              {(['1h', '4h', '1d'] as Interval[]).map((iv) => (
                <button
                  key={iv}
                  onClick={() => setInterval(iv)}
                  className={`rounded px-3 py-1 text-xs font-medium transition ${
                    interval === iv
                      ? 'bg-canopy-600/30 text-canopy-300'
                      : 'text-canopy-100/40 hover:text-canopy-100/70'
                  }`}
                >
                  {iv}
                </button>
              ))}
            </div>
          </div>

          <TradingChart
            candles={candles ?? []}
            intervalLabel={interval}
            isLive={candlesRefreshing}
          />

          {/* My open orders */}
          {myItemOrders.length > 0 && (
            <div className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/50">
                Mes ordres ouverts
              </h3>
              <div className="space-y-2">
                {myItemOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-lg border border-canopy-700/15 bg-bark-800/40 px-3 py-2 text-xs"
                  >
                    <span
                      className={`font-bold uppercase ${o.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {o.side === 'BUY' ? 'Achat' : 'Vente'}
                    </span>
                    <span className="font-mono text-canopy-100">
                      {o.filledQuantity}/{o.quantity} × {o.pricePerUnit.toLocaleString()} B
                    </span>
                    <span className="text-canopy-100/40">{o.status}</span>
                    <button
                      onClick={() => cancel.mutate(o.id)}
                      className="ml-2 rounded p-0.5 text-canopy-100/30 hover:text-red-400"
                      aria-label="Annuler"
                    >
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: OrderBook + PlaceOrder */}
        <div className="space-y-4">
          {/* Order book */}
          <div className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/50">
              Carnet d'ordres
            </h3>
            {obLoading ? (
              <div className="h-48 animate-pulse rounded-lg bg-bark-800/50" />
            ) : orderBook ? (
              <OrderBook data={orderBook} onPriceClick={(p) => setPrice(String(p))} />
            ) : null}
          </div>

          {/* Place order */}
          <div className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/50">
              Passer un ordre
            </h3>

            {/* Side selector */}
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-bark-800/50 p-1">
              <button
                onClick={() => setSide(MarketOrderSide.BUY)}
                className={`rounded-md py-1.5 text-sm font-semibold transition ${
                  side === MarketOrderSide.BUY
                    ? 'bg-emerald-600/30 text-emerald-300'
                    : 'text-canopy-100/40 hover:text-canopy-100'
                }`}
              >
                Acheter
              </button>
              <button
                onClick={() => setSide(MarketOrderSide.SELL)}
                className={`rounded-md py-1.5 text-sm font-semibold transition ${
                  side === MarketOrderSide.SELL
                    ? 'bg-red-600/30 text-red-300'
                    : 'text-canopy-100/40 hover:text-canopy-100'
                }`}
              >
                Vendre
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-canopy-100/40">
                  Prix par unité (Biomasse)
                </label>
                <input
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={`~${item.baseValue.toLocaleString()}`}
                  className="input w-full font-mono"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-canopy-100/40">
                  Quantité
                  {side === MarketOrderSide.SELL && totalInInventory > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuantity(String(totalInInventory))}
                      className="ml-2 text-canopy-400 hover:underline"
                    >
                      (max : {totalInInventory})
                    </button>
                  )}
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  className="input w-full font-mono"
                  required
                />
              </div>

              {price && quantity && (
                <div className="rounded-lg bg-bark-800/50 p-2 text-xs">
                  <span className="text-canopy-100/40">Total : </span>
                  <span className="font-mono font-semibold text-canopy-100">
                    {(parseInt(price) * parseInt(quantity)).toLocaleString()} B
                  </span>
                  {side === MarketOrderSide.BUY && (
                    <span className="ml-2 text-[10px] text-canopy-100/30">
                      prélevé sur votre planète
                    </span>
                  )}
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400">{error}</p>
              )}

              {onlyCrossesOwnOrders && (
                <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/80">
                  Ce prix croise uniquement vos propres ordres ouverts. L'ordre sera placé au
                  carnet, sans auto-exécution.
                </p>
              )}

              <button
                type="submit"
                disabled={place.isPending}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                  side === MarketOrderSide.BUY
                    ? 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50'
                    : 'bg-red-600/30 text-red-300 hover:bg-red-600/50'
                }`}
              >
                {place.isPending
                  ? 'Envoi…'
                  : side === MarketOrderSide.BUY
                    ? "Placer ordre d'achat"
                    : 'Placer ordre de vente'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'buy' | 'sell';
}) {
  return (
    <div className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-canopy-100/40">
        <FiClock className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p
        className={`mt-2 font-mono text-lg font-semibold ${
          tone === 'buy' ? 'text-emerald-300' : tone === 'sell' ? 'text-red-300' : 'text-canopy-100'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
