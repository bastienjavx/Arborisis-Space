'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MarketOrderSide,
  RESOURCE_MARKET_CONFIG,
  RESOURCE_TYPES,
  ResourceType,
  type ExchangeResourcesDto,
  type PlaceResourceMarketOrderDto,
  type ResourceMarketTradable,
} from '@arborisis/shared';
import { FiArrowLeft, FiBarChart2, FiRepeat, FiX } from 'react-icons/fi';
import { api } from '@/lib/api';
import { formatNumber, resourceLabel } from '@/lib/format';
import {
  keys,
  usePlanetDetail,
  useResourceMarketCandles,
  useResourceMarketOrderBook,
  useResourceMarketSummaries,
  useMyResourceMarketOrders,
} from '@/lib/queries';
import { usePlanetSelection } from '@/components/PlanetContext';
import { RESOURCE_VISUALS } from '@/lib/resourceVisuals';
import { OrderBook } from '@/components/market/OrderBook';
import { TradingChart } from '@/components/market/TradingChart';

type Interval = '1h' | '4h' | '1d';

export default function ResourceMarketPage() {
  const qc = useQueryClient();
  const { selectedId: planetId } = usePlanetSelection();
  const { data: planet } = usePlanetDetail(planetId);
  const [resource, setResource] = useState<ResourceMarketTradable>(ResourceType.SAP);
  const [interval, setInterval] = useState<Interval>('1h');
  const [fromResource, setFromResource] = useState<ResourceType>(ResourceType.BIOMASS);
  const [toResource, setToResource] = useState<ResourceType>(ResourceType.SAP);
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [side, setSide] = useState<MarketOrderSide>(MarketOrderSide.BUY);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');

  const { data: summaries, isLoading: summariesLoading } = useResourceMarketSummaries();
  const { data: orderBook, isLoading: bookLoading } = useResourceMarketOrderBook(resource);
  const { data: candles } = useResourceMarketCandles(resource, interval);
  const { data: myOrders } = useMyResourceMarketOrders();

  const amount = Number.parseInt(exchangeAmount || '0', 10);
  const quoteQuery = useQuery({
    queryKey: ['market', 'resources', 'quote', fromResource, toResource, amount],
    queryFn: () => api.resourceQuote({ fromResource, toResource, amount }),
    enabled: amount > 0 && fromResource !== toResource,
    staleTime: 2_000,
  });

  const invalidateMarket = () => {
    void qc.invalidateQueries({ queryKey: keys.resourceMarketSummaries });
    void qc.invalidateQueries({ queryKey: keys.resourceMarketOrderBook(resource) });
    void qc.invalidateQueries({ queryKey: keys.myResourceMarketOrders });
    if (planetId) void qc.invalidateQueries({ queryKey: keys.planet(planetId) });
  };

  const exchange = useMutation({
    mutationFn: (body: ExchangeResourcesDto) => api.exchangeResources(body),
    onSuccess: () => {
      invalidateMarket();
      setExchangeAmount('');
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const placeOrder = useMutation({
    mutationFn: (body: PlaceResourceMarketOrderDto) => api.placeResourceMarketOrder(body),
    onSuccess: () => {
      invalidateMarket();
      setPrice('');
      setQuantity('');
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const cancelOrder = useMutation({
    mutationFn: (id: string) => api.cancelResourceMarketOrder(id),
    onSuccess: invalidateMarket,
    onError: (e: Error) => setError(e.message),
  });

  const selectedSummary = summaries?.find((summary) => summary.resource === resource);
  const activeOrders = useMemo(
    () =>
      myOrders?.filter(
        (order) =>
          order.resource === resource &&
          (order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED'),
      ) ?? [],
    [myOrders, resource],
  );

  function submitExchange(e: React.FormEvent) {
    e.preventDefault();
    if (!planetId) return setError('Sélectionnez une planète.');
    if (fromResource === toResource) return setError('Choisissez deux ressources différentes.');
    if (!amount || amount <= 0) return setError('Montant invalide.');
    exchange.mutate({ sourcePlanetId: planetId, fromResource, toResource, amount });
  }

  function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!planetId) return setError('Sélectionnez une planète.');
    const p = Number.parseInt(price, 10);
    const q = Number.parseInt(quantity, 10);
    if (!p || p <= 0) return setError('Prix invalide.');
    if (!q || q <= 0) return setError('Quantité invalide.');
    placeOrder.mutate({ sourcePlanetId: planetId, resource, side, pricePerUnit: p, quantity: q });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/market"
          className="rounded-lg p-1.5 text-canopy-100/40 hover:bg-bark-800/60 hover:text-canopy-100"
        >
          <FiArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-canopy-100">Marché des ressources</h1>
          <p className="text-xs text-canopy-100/50">
            Échanges instantanés NPC et carnet d’ordres coté en Biomasse.
          </p>
        </div>
        <Link
          href="/market/bonds"
          className="ml-auto rounded-lg border border-canopy-700/20 bg-bark-900/50 px-3 py-1.5 text-xs text-canopy-100/60 transition hover:border-canopy-500/40 hover:text-canopy-100"
        >
          Obligations
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {RESOURCE_MARKET_CONFIG.tradableResources.map((r) => {
          const Icon = RESOURCE_VISUALS[r].Icon;
          const summary = summaries?.find((s) => s.resource === r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => setResource(r)}
              className={`rounded-xl border p-4 text-left transition ${
                resource === r
                  ? 'border-canopy-400/45 bg-canopy-500/10'
                  : 'border-canopy-700/20 bg-bark-900/60 hover:border-canopy-500/35'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-canopy-100">{resourceLabel(r)}</span>
                <Icon className={`h-4 w-4 ${RESOURCE_VISUALS[r].className}`} aria-hidden />
              </div>
              <p className="mt-2 font-mono text-lg text-canopy-50">
                {summariesLoading ? '...' : `${formatNumber(summary?.fairPrice ?? 0)} B`}
              </p>
              <p className="text-xs text-canopy-100/40">
                Bid {summary?.bestBid ? formatNumber(summary.bestBid) : '—'} · Ask{' '}
                {summary?.bestAsk ? formatNumber(summary.bestAsk) : '—'}
              </p>
            </button>
          );
        })}
      </div>

      {error && <p className="rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-canopy-100/50">
                <FiBarChart2 className="h-4 w-4" aria-hidden />
                Cours {resourceLabel(resource)}
              </h2>
              <div className="flex gap-1">
                {(['1h', '4h', '1d'] as Interval[]).map((iv) => (
                  <button
                    key={iv}
                    type="button"
                    onClick={() => setInterval(iv)}
                    className={`rounded px-3 py-1 text-xs ${
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
            <TradingChart candles={candles ?? []} intervalLabel={interval} />
          </div>

          <div className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/50">
              Carnet d’ordres
            </h2>
            {bookLoading ? (
              <div className="h-48 animate-pulse rounded-lg bg-bark-800/50" />
            ) : orderBook ? (
              <OrderBook data={orderBook} onPriceClick={(p) => setPrice(String(p))} />
            ) : null}
          </div>

          {activeOrders.length > 0 && (
            <div className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/50">
                Mes ordres ouverts
              </h2>
              <div className="space-y-2">
                {activeOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border border-canopy-700/15 bg-bark-800/40 px-3 py-2 text-xs"
                  >
                    <span className={order.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>
                      {order.side === 'BUY' ? 'Achat' : 'Vente'}
                    </span>
                    <span className="font-mono text-canopy-100">
                      {formatNumber(order.filledQuantity)}/{formatNumber(order.quantity)} ×{' '}
                      {formatNumber(order.pricePerUnit)} B
                    </span>
                    <button
                      type="button"
                      onClick={() => cancelOrder.mutate(order.id)}
                      className="rounded p-0.5 text-canopy-100/30 hover:text-red-400"
                      aria-label="Annuler"
                    >
                      <FiX className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <form
            onSubmit={submitExchange}
            className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4"
          >
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-canopy-100/50">
              <FiRepeat className="h-4 w-4" aria-hidden />
              Échange NPC
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <ResourceSelect value={fromResource} onChange={setFromResource} label="Donner" />
              <ResourceSelect value={toResource} onChange={setToResource} label="Recevoir" />
            </div>
            <label className="mt-3 block text-[10px] uppercase tracking-widest text-canopy-100/40">
              Montant
            </label>
            <input
              type="number"
              min={1}
              value={exchangeAmount}
              onChange={(e) => setExchangeAmount(e.target.value)}
              className="input mt-1 w-full font-mono"
              placeholder="1000"
            />
            <div className="mt-3 rounded-lg bg-bark-800/50 p-2 text-xs text-canopy-100/60">
              Reçu estimé :{' '}
              <span className="font-mono text-canopy-100">
                {quoteQuery.data ? formatNumber(quoteQuery.data.amountOut) : '—'}
              </span>
              {quoteQuery.data && (
                <span className="ml-2 text-canopy-100/35">
                  spread {(quoteQuery.data.spread * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={exchange.isPending}
              className="mt-3 w-full rounded-lg bg-canopy-600/30 py-2.5 text-sm font-semibold text-canopy-200 transition hover:bg-canopy-600/50 disabled:opacity-50"
            >
              {exchange.isPending ? 'Échange...' : 'Échanger'}
            </button>
          </form>

          <form
            onSubmit={submitOrder}
            className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4"
          >
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/50">
              Ordre {resourceLabel(resource)}
            </h2>
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-bark-800/50 p-1">
              <button
                type="button"
                onClick={() => setSide(MarketOrderSide.BUY)}
                className={`rounded-md py-1.5 text-sm font-semibold ${
                  side === MarketOrderSide.BUY
                    ? 'bg-emerald-600/30 text-emerald-300'
                    : 'text-canopy-100/40 hover:text-canopy-100'
                }`}
              >
                Acheter
              </button>
              <button
                type="button"
                onClick={() => setSide(MarketOrderSide.SELL)}
                className={`rounded-md py-1.5 text-sm font-semibold ${
                  side === MarketOrderSide.SELL
                    ? 'bg-red-600/30 text-red-300'
                    : 'text-canopy-100/40 hover:text-canopy-100'
                }`}
              >
                Vendre
              </button>
            </div>
            <label className="block text-[10px] uppercase tracking-widest text-canopy-100/40">
              Prix par unité (Biomasse)
            </label>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={String(selectedSummary?.fairPrice ?? '')}
              className="input mt-1 w-full font-mono"
            />
            <label className="mt-3 block text-[10px] uppercase tracking-widest text-canopy-100/40">
              Quantité
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input mt-1 w-full font-mono"
              placeholder="500"
            />
            <div className="mt-3 rounded-lg bg-bark-800/50 p-2 text-xs">
              <span className="text-canopy-100/40">Stock planète : </span>
              <span className="font-mono text-canopy-100">
                {planet ? formatNumber(planet.resources.amounts[resource] ?? 0) : '—'}
              </span>
            </div>
            <button
              type="submit"
              disabled={placeOrder.isPending}
              className={`mt-3 w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                side === MarketOrderSide.BUY
                  ? 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50'
                  : 'bg-red-600/30 text-red-300 hover:bg-red-600/50'
              }`}
            >
              {placeOrder.isPending ? 'Envoi...' : 'Placer l’ordre'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ResourceSelect({
  value,
  onChange,
  label,
}: {
  value: ResourceType;
  onChange: (value: ResourceType) => void;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-canopy-100/40">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ResourceType)}
        className="input w-full"
      >
        {RESOURCE_TYPES.map((resource) => (
          <option key={resource} value={resource}>
            {resourceLabel(resource)}
          </option>
        ))}
      </select>
    </label>
  );
}
