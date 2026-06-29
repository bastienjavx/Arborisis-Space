'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { OhlcvCandleView } from '@arborisis/shared';
import { FiActivity, FiRadio } from 'react-icons/fi';

interface TradingChartProps {
  candles: OhlcvCandleView[];
  height?: number;
  isLive?: boolean;
  intervalLabel?: string;
}

const biomassFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function formatBiomass(value: number) {
  return `${biomassFormatter.format(value)} B`;
}

function toTimestamp(openTime: string): UTCTimestamp {
  return Math.floor(new Date(openTime).getTime() / 1000) as UTCTimestamp;
}

export function TradingChart({
  candles,
  height = 380,
  isLive = true,
  intervalLabel = '1h',
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const last = candles.at(-1);
    const previous = candles.at(-2);
    const high = candles.reduce((max, c) => Math.max(max, c.high), 0);
    const low = candles.reduce((min, c) => Math.min(min, c.low), Number.POSITIVE_INFINITY);
    const volume = candles.reduce((sum, c) => sum + c.volume, 0);
    const change = last && previous ? ((last.close - previous.close) / previous.close) * 100 : 0;

    return {
      last,
      change,
      high,
      low: Number.isFinite(low) ? low : 0,
      volume,
      positive: change >= 0,
    };
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(214,255,223,0.68)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(120,255,174,0.035)' },
        horzLines: { color: 'rgba(120,255,174,0.035)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(74,222,128,0.36)', labelBackgroundColor: '#162915' },
        horzLine: { color: 'rgba(74,222,128,0.36)', labelBackgroundColor: '#162915' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        scaleMargins: { top: 0.12, bottom: 0.24 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 10,
      },
      localization: {
        priceFormatter: (price: number) => formatBiomass(price),
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#34d399',
      downColor: '#fb7185',
      borderUpColor: '#86efac',
      borderDownColor: '#fda4af',
      wickUpColor: '#86efac',
      wickDownColor: '#fda4af',
      priceLineColor: '#a7f3d0',
      priceLineWidth: 2,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: 'rgba(74,222,128,0.18)',
      bottomColor: 'rgba(74,222,128,0)',
      lineColor: 'rgba(134,239,172,0.28)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      borderVisible: false,
    });

    const data = candles.map((c) => ({
      time: toTimestamp(c.openTime),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const areaData = candles.map((c) => ({
      time: toTimestamp(c.openTime),
      value: c.close,
    }));

    const volData = candles.map((c) => ({
      time: toTimestamp(c.openTime),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(52,211,153,0.28)' : 'rgba(251,113,133,0.28)',
    }));

    areaSeries.setData(areaData);
    candleSeries.setData(data);
    volumeSeries.setData(volData);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [candles, height]);

  if (candles.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-canopy-700/20 bg-gradient-to-br from-bark-900/80 to-bark-800/40 text-sm text-canopy-100/40"
        style={{ height }}
      >
        <FiActivity className="h-8 w-8 text-canopy-400/40" aria-hidden />
        <div className="text-center">
          <p className="font-semibold text-canopy-100/70">Aucune bougie disponible</p>
          <p className="mt-1 text-xs">Soyez le premier à créer un prix de référence.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-canopy-700/20 bg-[radial-gradient(circle_at_top_left,rgba(74,222,128,0.16),transparent_34%),linear-gradient(135deg,rgba(16,29,18,0.96),rgba(6,13,8,0.9))] shadow-2xl shadow-black/25">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-canopy-700/15 px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-canopy-100/40">
            <FiRadio
              className={isLive ? 'h-3.5 w-3.5 animate-pulse text-emerald-300' : 'h-3.5 w-3.5'}
              aria-hidden
            />
            TradingView Lightweight • {intervalLabel}
          </div>
          <p className="mt-1 font-mono text-2xl font-bold text-canopy-100">
            {stats.last ? formatBiomass(stats.last.close) : '—'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-4">
          <Metric
            label="Variation"
            value={`${stats.positive ? '+' : ''}${stats.change.toFixed(2)}%`}
            tone={stats.positive ? 'up' : 'down'}
          />
          <Metric label="Haut" value={formatBiomass(stats.high)} />
          <Metric label="Bas" value={formatBiomass(stats.low)} />
          <Metric label="Volume" value={biomassFormatter.format(stats.volume)} />
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-xl border border-canopy-700/10 bg-bark-950/30 px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest text-canopy-100/35">{label}</p>
      <p
        className={`mt-0.5 font-mono text-xs font-semibold ${
          tone === 'up'
            ? 'text-emerald-300'
            : tone === 'down'
              ? 'text-red-300'
              : 'text-canopy-100/80'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
