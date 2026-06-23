'use client';

import { useEffect, useRef, useState } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiX } from 'react-icons/fi';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationUnreadCount,
  useNotifications,
} from '@/lib/queries';
import type { NotificationView } from '@arborisis/shared';

const NOTIF_ICONS: Record<string, string> = {
  CONSTRUCTION_COMPLETE: '🏗️',
  RESEARCH_COMPLETE: '🔬',
  EXPEDITION_RETURNED: '🚀',
  COLONIZATION_COMPLETE: '🌱',
  ATTACK_INCOMING: '⚠️',
  ATTACK_REPORT: '⚔️',
  SHIP_PRODUCED: '🛸',
  TRADE_ROUTE_RUN: '💱',
  ACHIEVEMENT_UNLOCKED: '🏆',
  DAILY_REWARD_AVAILABLE: '🎁',
  MARKET_ORDER_FILLED: '📈',
  PVE_COMPLETE: '👾',
};

function NotifItem({ notif }: { notif: NotificationView }) {
  const markRead = useMarkNotificationRead();
  return (
    <li
      className={`flex gap-3 border-b border-canopy-700/15 px-4 py-3 transition-colors ${notif.read ? 'opacity-60' : 'bg-canopy-500/5'}`}
    >
      <span className="mt-0.5 text-lg leading-none">{NOTIF_ICONS[notif.type] ?? '🔔'}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-canopy-100">{notif.title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-canopy-300/80">{notif.message}</p>
        <time className="mt-1 text-[10px] text-canopy-400/60">
          {new Date(notif.createdAt).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
      {!notif.read && (
        <button
          type="button"
          aria-label="Marquer comme lu"
          onClick={() => markRead.mutate(notif.id)}
          className="shrink-0 rounded p-1 text-canopy-400 transition hover:text-canopy-200"
        >
          <FiCheck className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const { data: unread } = useNotificationUnreadCount();
  const { data: notifications } = useNotifications();
  const markAll = useMarkAllNotificationsRead();

  const count = unread?.count ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications (${count} non lues)`}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-canopy-700/30 bg-bark-900/60 text-canopy-300 transition hover:bg-bark-800/80 hover:text-canopy-100"
      >
        <FiBell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-canopy-700/30 bg-bark-950/98 shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-canopy-700/20 px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-canopy-300">
              Notifications
            </span>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  className="flex items-center gap-1 text-[11px] text-canopy-400 transition hover:text-canopy-200"
                >
                  <FiCheckCircle className="h-3 w-3" />
                  Tout lire
                </button>
              )}
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                className="text-canopy-500 transition hover:text-canopy-200"
              >
                <FiX className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <ul className="max-h-[26rem] overflow-y-auto">
            {!notifications?.length ? (
              <li className="px-4 py-8 text-center text-xs text-canopy-500">Aucune notification</li>
            ) : (
              notifications.map((n) => <NotifItem key={n.id} notif={n} />)
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
