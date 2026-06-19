import { FiMinus, FiPlus } from 'react-icons/fi';

export function QuantityControl({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const clamp = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <div className="flex h-9 overflow-hidden rounded-lg border border-canopy-700/25 bg-bark-950/55">
      <button
        type="button"
        onClick={() => clamp(value - 1)}
        disabled={value <= min}
        className="grid w-9 place-items-center border-r border-canopy-700/20 text-canopy-100/45 transition hover:bg-canopy-500/10 hover:text-canopy-100 disabled:opacity-25"
        aria-label={`Réduire ${label}`}
      >
        <FiMinus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => clamp(Number(event.target.value))}
        className="w-12 bg-transparent text-center text-xs text-canopy-100 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => clamp(value + 1)}
        disabled={value >= max}
        className="grid w-9 place-items-center border-l border-canopy-700/20 text-canopy-100/45 transition hover:bg-canopy-500/10 hover:text-canopy-100 disabled:opacity-25"
        aria-label={`Augmenter ${label}`}
      >
        <FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
