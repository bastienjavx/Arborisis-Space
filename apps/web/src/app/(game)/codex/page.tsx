'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiX } from 'react-icons/fi';
import {
  ACCENT_CLASSES,
  CODEX_CATEGORIES,
  CODEX_ENTRIES,
  getCodexEntry,
  searchCodex,
  type CodexCategoryKey,
  type CodexEntry,
} from '@/lib/codex';
import { PageHeader } from '@/components/PageHeader';
import { ResourceCost } from '@/components/ResourceCost';

type Filter = 'all' | CodexCategoryKey;

const COUNTS: Record<string, number> = CODEX_ENTRIES.reduce(
  (acc, entry) => ({ ...acc, [entry.category]: (acc[entry.category] ?? 0) + 1 }),
  {} as Record<string, number>,
);

/** Rail mycélien : navigation par catégories enfilées sur un filament vivant. */
function MyceliumRail({
  active,
  onSelect,
}: {
  active: Filter;
  onSelect: (filter: Filter) => void;
}) {
  const items: {
    key: Filter;
    label: string;
    Icon?: (typeof CODEX_CATEGORIES)[number]['Icon'];
    accent: 'canopy' | 'sap' | 'spore';
    count: number;
  }[] = [
    { key: 'all', label: 'Tout le savoir', accent: 'canopy', count: CODEX_ENTRIES.length },
    ...CODEX_CATEGORIES.map((category) => ({
      key: category.key as Filter,
      label: category.label,
      Icon: category.Icon,
      accent: category.accent,
      count: COUNTS[category.key] ?? 0,
    })),
  ];

  return (
    <nav className="relative" aria-label="Catégories du codex">
      {/* Filament vertical reliant les nœuds */}
      <span
        aria-hidden="true"
        className="absolute bottom-5 left-[1.4rem] top-5 w-px bg-gradient-to-b from-canopy-400/40 via-spore-500/25 to-transparent"
      />
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = active === item.key;
          const accent = ACCENT_CLASSES[item.accent];
          const Icon = item.Icon;
          return (
            <li key={item.key} className="relative">
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                aria-pressed={isActive}
                className={`group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                  isActive ? 'bg-canopy-500/[0.06]' : 'hover:bg-canopy-700/10'
                }`}
              >
                <span
                  className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${
                    isActive ? `${accent.node} ${accent.glow}` : 'border-canopy-700/30 bg-bark-950'
                  }`}
                >
                  {Icon ? (
                    <Icon
                      className={`h-3.5 w-3.5 ${isActive ? accent.text : 'text-canopy-100/40 group-hover:text-canopy-100/70'}`}
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${isActive ? accent.dot : 'bg-canopy-100/40'}`}
                    />
                  )}
                </span>
                <span
                  className={`flex-1 text-sm transition ${isActive ? 'text-canopy-50' : 'text-canopy-100/55 group-hover:text-canopy-100/85'}`}
                >
                  {item.label}
                </span>
                <span className="text-[11px] tabular-nums text-canopy-100/30">{item.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function EntryCard({ entry, onOpen }: { entry: CodexEntry; onOpen: () => void }) {
  const accent = ACCENT_CLASSES[entry.accent];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col rounded-xl border border-canopy-700/15 bg-bark-950/40 p-4 text-left transition hover:border-canopy-700/35 hover:bg-canopy-500/[0.03]"
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition ${accent.node} ${accent.glowHover}`}
        >
          <entry.Icon
            className={`h-5 w-5 ${entry.iconClassName ?? accent.text}`}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base leading-tight text-canopy-50/90">
            {entry.name}
          </h3>
          <span className="text-[10px] uppercase tracking-[0.16em] text-canopy-100/30">
            {entry.categoryLabel}
          </span>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-xs leading-5 text-canopy-100/45">
        {entry.summary}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        {entry.cost ? (
          <ResourceCost cost={entry.cost} />
        ) : entry.stats[0] ? (
          <span className="text-[11px] text-canopy-100/40">
            {entry.stats[0].label} ·{' '}
            <span className="text-canopy-100/65">{entry.stats[0].value}</span>
          </span>
        ) : (
          <span />
        )}
        {entry.badge && (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide ${accent.chip}`}
          >
            {entry.badge.split(' · ')[0]}
          </span>
        )}
      </div>
    </button>
  );
}

function EntryDetail({ entry, onClose }: { entry: CodexEntry; onClose: () => void }) {
  const accent = ACCENT_CLASSES[entry.accent];
  return (
    <motion.aside
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-canopy-700/25 bg-bark-950/95 shadow-[0_0_120px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-label={entry.name}
    >
      <div className="flex items-start gap-4 border-b border-canopy-700/15 px-6 py-5">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${accent.node} ${accent.glow}`}
        >
          <entry.Icon
            className={`h-6 w-6 ${entry.iconClassName ?? accent.text}`}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-canopy-100/35">
            {entry.categoryLabel}
          </span>
          <h2 className="font-display text-2xl leading-tight tracking-[-0.01em] text-canopy-50">
            {entry.name}
          </h2>
          {entry.badge && (
            <span
              className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wide ${accent.chip}`}
            >
              {entry.badge}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-canopy-700/20 text-canopy-100/50 transition hover:text-canopy-100"
        >
          <FiX className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <p className="text-sm leading-6 text-canopy-100/70">{entry.summary}</p>

        {entry.stats.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-canopy-700/15">
            <dl className="grid grid-cols-2 gap-px bg-canopy-700/10">
              {entry.stats.map((stat) => (
                <div key={stat.label} className="bg-bark-950/60 px-4 py-2.5">
                  <dt className="text-[10px] uppercase tracking-[0.1em] text-canopy-100/30">
                    {stat.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-canopy-100/85">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {entry.cost && (
          <div>
            <span className="mb-2 block text-[10px] uppercase tracking-[0.14em] text-canopy-100/35">
              {entry.costLabel ?? 'Coût'}
            </span>
            <ResourceCost cost={entry.cost} />
          </div>
        )}

        {entry.reward && (
          <div>
            <span className="mb-2 block text-[10px] uppercase tracking-[0.14em] text-canopy-100/35">
              Récompense
            </span>
            <ResourceCost cost={entry.reward} />
          </div>
        )}

        {entry.requirements && (
          <div>
            <span className="mb-2 block text-[10px] uppercase tracking-[0.14em] text-canopy-100/35">
              Prérequis
            </span>
            <p className="text-sm text-canopy-100/65">{entry.requirements}</p>
          </div>
        )}

        {entry.lore && (
          <div className="border-t border-canopy-700/15 pt-5">
            <span className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-spore-400/70">
              <span className="h-px w-5 bg-spore-500/40" /> Fragment de mémoire
            </span>
            <p className="whitespace-pre-line text-sm italic leading-7 text-canopy-100/55">
              {entry.lore}
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function CodexContent() {
  const searchParams = useSearchParams();
  const initialEntry = searchParams.get('entry');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(() => {
    const entry = initialEntry ? getCodexEntry(initialEntry) : undefined;
    return entry?.category ?? 'all';
  });
  const [selectedId, setSelectedId] = useState<string | undefined>(initialEntry ?? undefined);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const results = useMemo(() => {
    const base = searchCodex(query);
    return filter === 'all' ? base : base.filter((entry) => entry.category === filter);
  }, [query, filter]);

  const selected = selectedId ? getCodexEntry(selectedId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            Codex <span className="gradient-text">Mycélien</span>
          </>
        }
        subtitle="Chaque entrée est un fragment de la mémoire des Tisserands. Survolez n'importe quel nom dans le jeu, ou cherchez ici une structure, une recherche, un vaisseau ou un monde."
      />

      <div className="relative">
        <FiSearch
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-canopy-100/35"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher dans le savoir restauré…"
          aria-label="Chercher dans le codex"
          className="input min-h-12 w-full pl-11"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        {/* Rail (desktop) / chips (mobile) */}
        <div className="lg:sticky lg:top-[5.5rem] lg:self-start">
          <div className="hidden lg:block">
            <MyceliumRail active={filter} onSelect={setFilter} />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
            {(['all', ...CODEX_CATEGORIES.map((c) => c.key)] as Filter[]).map((key) => {
              const meta = CODEX_CATEGORIES.find((c) => c.key === key);
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition ${
                    isActive
                      ? 'border-canopy-300/35 bg-canopy-500/10 text-canopy-100'
                      : 'border-canopy-700/20 text-canopy-100/50'
                  }`}
                >
                  {meta?.label ?? 'Tout'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Entrées */}
        <div>
          {results.length > 0 ? (
            <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((entry) => (
                <EntryCard key={entry.id} entry={entry} onOpen={() => setSelectedId(entry.id)} />
              ))}
            </motion.div>
          ) : (
            <div className="rounded-xl border border-canopy-700/15 bg-bark-950/40 px-6 py-16 text-center">
              <p className="text-sm text-canopy-100/50">
                Aucun fragment ne correspond à « {query} ».
              </p>
              <p className="mt-1 text-xs text-canopy-100/30">
                Essayez un autre mot, ou explorez une catégorie du rail.
              </p>
            </div>
          )}
        </div>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {selected && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[65] bg-bark-950/70 backdrop-blur-sm"
                  onClick={() => setSelectedId(undefined)}
                />
                <EntryDetail entry={selected} onClose={() => setSelectedId(undefined)} />
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

export default function CodexPage() {
  return (
    <Suspense fallback={<p className="text-canopy-100/50">Restauration de la mémoire…</p>}>
      <CodexContent />
    </Suspense>
  );
}
