'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiArrowUpRight } from 'react-icons/fi';
import { ACCENT_CLASSES, getCodexEntry } from '@/lib/codex';
import { ResourceCost } from './ResourceCost';

interface Coords {
  left: number;
  /** Ancré soit par le haut (placement bas) soit par le bas (placement haut). */
  top?: number;
  bottom?: number;
  placement: 'top' | 'bottom';
}

const WIDTH = 300;
const GAP = 10;

function computeCoords(rect: DOMRect): Coords {
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - WIDTH / 2),
    window.innerWidth - WIDTH - 12,
  );
  const placeAbove = rect.bottom > window.innerHeight * 0.62;
  return placeAbove
    ? { left, bottom: window.innerHeight - rect.top + GAP, placement: 'top' }
    : { left, top: rect.bottom + GAP, placement: 'bottom' };
}

/**
 * Fenêtre de wiki au survol/focus. Enveloppe n'importe quel libellé d'entité de
 * jeu et affiche, dans un portail flottant, la fiche correspondante du Codex
 * (résumé complet, statistiques, coût) — de sorte que l'information tronquée
 * dans l'UI reste accessible d'un simple survol. Lien direct vers `/codex`.
 */
export function WikiPopover({
  entryId,
  children,
  className = '',
  underline = true,
}: {
  entryId: string;
  children: ReactNode;
  className?: string;
  underline?: boolean;
}) {
  const entry = getCodexEntry(entryId);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [coords, setCoords] = useState<Coords>();
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const popoverId = useId();

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    if (triggerRef.current) setCoords(computeCoords(triggerRef.current.getBoundingClientRect()));
  }, []);

  const open = useCallback(() => {
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(reposition, 90);
  }, [reposition]);

  const close = useCallback(() => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setCoords(undefined), 80);
  }, []);

  useEffect(() => {
    if (!coords) return;
    const handle = () => reposition();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setCoords(undefined);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
      window.removeEventListener('keydown', onKey);
    };
  }, [coords, reposition]);

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  // Si l'entrée n'existe pas, on rend simplement le contenu sans interaction.
  if (!entry) return <>{children}</>;

  const accent = ACCENT_CLASSES[entry.accent];

  return (
    <span
      ref={triggerRef}
      tabIndex={0}
      aria-describedby={coords ? popoverId : undefined}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
      className={`cursor-help rounded-sm outline-none transition-colors hover:text-canopy-50 focus-visible:ring-2 focus-visible:ring-canopy-400/50 ${
        underline ? 'decoration-canopy-400/40 decoration-dotted underline-offset-[3px] hover:underline' : ''
      } ${className}`}
    >
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {coords && (
              <motion.div
                id={popoverId}
                role="tooltip"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: coords.placement === 'top' ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                onMouseEnter={() => clearTimeout(closeTimer.current)}
                onMouseLeave={close}
                style={{
                  position: 'fixed',
                  left: coords.left,
                  top: coords.top,
                  bottom: coords.bottom,
                  width: WIDTH,
                  zIndex: 80,
                }}
                className="pointer-events-auto overflow-hidden rounded-xl border border-canopy-700/30 bg-bark-950/95 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-px ${accent.dot} opacity-40`}
                />
                <div className="flex items-start gap-3 px-4 pt-4">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${accent.node}`}
                  >
                    <entry.Icon
                      className={`h-4 w-4 ${entry.iconClassName ?? accent.text}`}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base leading-tight text-canopy-50">
                      {entry.name}
                    </p>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-canopy-100/35">
                      {entry.categoryLabel}
                    </span>
                  </div>
                </div>

                <p className="px-4 pt-2.5 text-xs leading-5 text-canopy-100/60">{entry.summary}</p>

                {entry.stats.length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-px bg-canopy-700/10">
                    {entry.stats.slice(0, 4).map((stat) => (
                      <div key={stat.label} className="bg-bark-950/60 px-4 py-2">
                        <dt className="text-[10px] uppercase tracking-[0.1em] text-canopy-100/30">
                          {stat.label}
                        </dt>
                        <dd className="mt-0.5 truncate text-xs text-canopy-100/80">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {entry.cost && (
                  <div className="border-t border-canopy-700/15 px-4 py-2.5">
                    <span className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-canopy-100/30">
                      {entry.costLabel ?? 'Coût'}
                    </span>
                    <ResourceCost cost={entry.cost} />
                  </div>
                )}

                <Link
                  href={`/codex?entry=${encodeURIComponent(entry.id)}`}
                  className="flex items-center justify-between border-t border-canopy-700/15 px-4 py-2.5 text-[11px] font-medium text-canopy-300/80 transition hover:bg-canopy-500/[0.06] hover:text-canopy-200"
                >
                  Ouvrir dans le Codex
                  <FiArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </span>
  );
}
