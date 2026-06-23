'use client';

import type { OrderBookView } from '@arborisis/shared';

interface OrderBookProps {
  data: OrderBookView;
  onPriceClick?: (price: number) => void;
}

export function OrderBook({ data, onPriceClick }: OrderBookProps) {
  const maxAskTotal = data.asks[data.asks.length - 1]?.total ?? 1;
  const maxBidTotal = data.bids[data.bids.length - 1]?.total ?? 1;

  return (
    <div className="flex flex-col gap-1 font-mono text-xs">
      <div className="grid grid-cols-3 gap-2 px-2 pb-1 text-[10px] uppercase tracking-widest text-canopy-100/30">
        <span>Prix (B)</span>
        <span className="text-right">Quantité</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (SELL orders) - affichées inversées, rouge */}
      <div className="flex flex-col-reverse gap-0.5">
        {data.asks.slice(0, 10).map((ask, i) => (
          <button
            key={i}
            onClick={() => onPriceClick?.(ask.price)}
            className="group relative grid grid-cols-3 gap-2 rounded px-2 py-0.5 text-right transition hover:bg-red-900/20"
          >
            <div
              className="absolute inset-0 rounded bg-red-500/8"
              style={{ width: `${(ask.total / maxAskTotal) * 100}%` }}
            />
            <span className="relative text-left text-red-400">{ask.price.toLocaleString()}</span>
            <span className="relative text-canopy-100/70">{ask.quantity.toLocaleString()}</span>
            <span className="relative text-canopy-100/40">{ask.total.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {/* Spread / last price */}
      <div className="my-1 flex items-center gap-3 rounded-lg border border-canopy-700/20 bg-bark-800/50 px-3 py-2">
        <span className="text-base font-bold text-canopy-100">
          {data.lastPrice != null ? data.lastPrice.toLocaleString() : '—'} <span className="text-xs text-canopy-100/40">B</span>
        </span>
        {data.change24h != null && (
          <span
            className={`text-xs ${data.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {data.change24h >= 0 ? '+' : ''}
            {data.change24h.toFixed(2)}%
          </span>
        )}
        {data.high24h != null && (
          <span className="ml-auto text-[10px] text-canopy-100/30">
            H: {data.high24h.toLocaleString()} L: {data.low24h?.toLocaleString()}
          </span>
        )}
      </div>

      {/* Bids (BUY orders) - vert */}
      <div className="flex flex-col gap-0.5">
        {data.bids.slice(0, 10).map((bid, i) => (
          <button
            key={i}
            onClick={() => onPriceClick?.(bid.price)}
            className="group relative grid grid-cols-3 gap-2 rounded px-2 py-0.5 text-right transition hover:bg-emerald-900/20"
          >
            <div
              className="absolute inset-0 rounded bg-emerald-500/8"
              style={{ width: `${(bid.total / maxBidTotal) * 100}%` }}
            />
            <span className="relative text-left text-emerald-400">{bid.price.toLocaleString()}</span>
            <span className="relative text-canopy-100/70">{bid.quantity.toLocaleString()}</span>
            <span className="relative text-canopy-100/40">{bid.total.toLocaleString()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
