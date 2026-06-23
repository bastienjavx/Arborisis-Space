'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import type { OhlcvCandleView } from '@arborisis/shared';

interface TradingChartProps {
  candles: OhlcvCandleView[];
  height?: number;
}

export function TradingChart({ candles, height = 320 }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(200,230,200,0.6)',
        fontFamily: 'ui-monospace, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(74,222,128,0.3)', labelBackgroundColor: '#1a2e1a' },
        horzLine: { color: 'rgba(74,222,128,0.3)', labelBackgroundColor: '#1a2e1a' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#4ade80',
      downColor: '#f87171',
      borderUpColor: '#4ade80',
      borderDownColor: '#f87171',
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(74,222,128,0.15)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    const data = candles.map((c) => ({
      time: (new Date(c.openTime).getTime() / 1000) as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volData = candles.map((c) => ({
      time: (new Date(c.openTime).getTime() / 1000) as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)',
    }));

    candleSeries.setData(data);
    volumeSeries.setData(volData);
    chart.timeScale().fitContent();

    const resize = () => {
      if (containerRef.current) chart.resize(containerRef.current.clientWidth, height);
    };
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.remove();
    };
  }, [candles, height]);

  if (candles.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-canopy-700/20 bg-bark-900/40 text-sm text-canopy-100/30"
        style={{ height }}
      >
        Aucune transaction encore — soyez le premier à trader !
      </div>
    );
  }

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
