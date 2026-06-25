'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FiCheck, FiGift, FiX } from 'react-icons/fi';
import { DAILY_REWARDS } from '@arborisis/shared';
import { useClaimDailyReward, useDailyReward } from '@/lib/queries';
import { ResourceCost } from './ResourceCost';
import { useToast } from './ToastProvider';

/**
 * Modale de récompense quotidienne : s'ouvre automatiquement au chargement du jeu
 * si une récompense est disponible. Affiche le cycle de 7 jours et la série courante.
 */
export function DailyRewardModal() {
  const { data } = useDailyReward();
  const claim = useClaimDailyReward();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (data?.canClaim && !dismissed) setOpen(true);
  }, [data?.canClaim, dismissed]);

  useEffect(() => {
    const openModal = () => setOpen(true);
    window.addEventListener('arborisis:open-daily-reward', openModal);
    return () => window.removeEventListener('arborisis:open-daily-reward', openModal);
  }, []);

  if (!data) return null;

  const cycle = data.cycle.length > 0 ? data.cycle : DAILY_REWARDS;
  const claimed = !data.canClaim;

  function close() {
    setOpen(false);
    setDismissed(true);
  }

  async function onClaim() {
    const claimedView = await claim.mutateAsync();
    toast({
      title: `Série de ${claimedView.streak} jour${claimedView.streak > 1 ? 's' : ''}`,
      description: 'La récolte quotidienne a rejoint votre Noyau-Monde.',
      tone: 'success',
    });
    // Laisse le joueur voir l'état « réclamé » un court instant.
    setTimeout(close, 1_400);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-bark-950/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="mycelium-panel relative w-full max-w-md overflow-hidden p-6"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 text-canopy-100/40 transition hover:text-canopy-100"
              aria-label="Fermer"
            >
              <FiX className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <motion.span
                className="grid h-14 w-14 place-items-center rounded-full border border-canopy-400/30 bg-canopy-500/10 text-canopy-300"
                animate={{ scale: claimed ? [1, 1.2, 1] : [1, 1.06, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                <FiGift className="h-6 w-6" aria-hidden="true" />
              </motion.span>
              <h2 className="mt-3 font-display text-xl text-canopy-50">Récolte quotidienne</h2>
              <p className="mt-1 text-xs text-canopy-100/45">
                Série de {data.streak} jour{data.streak > 1 ? 's' : ''} · revenez chaque jour pour
                des récompenses croissantes.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {cycle.map((_, i) => {
                const isToday = i === data.dayIndex;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center rounded-lg border px-1 py-2 text-center transition ${
                      isToday
                        ? 'border-canopy-400/50 bg-canopy-500/15'
                        : i < data.dayIndex
                          ? 'border-canopy-700/15 bg-canopy-500/[0.04] opacity-60'
                          : 'border-canopy-700/15 opacity-45'
                    }`}
                    title={`Jour ${i + 1}`}
                  >
                    <span className="text-[9px] uppercase tracking-wide text-canopy-100/40">
                      J{i + 1}
                    </span>
                    <FiGift
                      className={`mt-1 h-3.5 w-3.5 ${isToday ? 'text-canopy-200' : 'text-canopy-100/35'}`}
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-canopy-700/20 bg-bark-950/40 px-4 py-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-canopy-100/35">
                Récompense du jour {data.dayIndex + 1}
              </p>
              <ResourceCost cost={data.todayReward} />
            </div>

            <button
              type="button"
              disabled={claimed || claim.isPending}
              onClick={onClaim}
              className="mt-5 w-full rounded-xl border border-canopy-400/40 bg-canopy-500/15 py-2.5 text-sm font-medium text-canopy-50 transition hover:bg-canopy-500/25 disabled:cursor-default disabled:opacity-60"
            >
              {claimed ? <span className="inline-flex items-center gap-1">Récolte effectuée <FiCheck className="h-4 w-4 text-emerald-400" /></span> : claim.isPending ? 'Récolte…' : 'Récolter'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
