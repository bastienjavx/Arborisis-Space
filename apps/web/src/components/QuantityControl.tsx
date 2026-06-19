'use client';

import { type ReactNode } from 'react';

interface QuantityControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  children?: ReactNode;
}

export function QuantityControl({ value, onChange, min = 0, max, children }: QuantityControlProps) {
  function decrement() {
    onChange(Math.max(min, value - 1));
  }

  function increment() {
    onChange(max === undefined ? value + 1 : Math.min(max, value + 1));
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={decrement} className="btn-ghost h-8 w-8 p-0">
        −
      </button>
      <span className="w-8 text-center text-sm tabular-nums">{value}</span>
      <button type="button" onClick={increment} className="btn-ghost h-8 w-8 p-0">
        +
      </button>
      {children}
    </div>
  );
}
