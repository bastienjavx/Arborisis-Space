'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FiAlertTriangle, FiClock, FiPackage, FiX } from 'react-icons/fi';
import { keys, useAbsenceSummary } from '@/lib/queries';
import { ResourceCost } from './ResourceCost';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d} j ${h % 24} h`;
  }
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

/**
 * Modale « pendant votre absence » : affichée une fois au chargement du jeu si le
 * joueur a été absent assez longtemps. Récapitule production, jobs et missions.
 */
export function AbsenceSummaryModal() {
  const qc = useQueryClient();
  const { data } = useAbsenceSummary();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (data?.show) {
      setOpen(true);
      // Les ressources ont été créditées côté serveur : rafraîchir l'affichage.
      void qc.invalidateQueries({ queryKey: keys.planets });
    }
  }, [data?.show, qc]);

  if (!data || !data.show) return null;

  const jobsTotal =
    data.completedJobs.construction +
    data.completedJobs.research +
    data.completedJobs.ships +
    data.completedJobs.colonization;

  const lines: { label: string; value: number }[] = [
    { label: 'Constructions achevées', value: data.completedJobs.construction },
    { label: 'Recherches terminées', value: data.completedJobs.research },
    { label: 'Vaisseaux éclos', value: data.completedJobs.ships },
    { label: 'Colonies fondées', value: data.completedJobs.colonization },
    { label: 'Expéditions revenues', value: data.expeditionsReturned },
    { label: 'Raids PvE achevés', value: data.pveResolved },
  ].filter((l) => l.value > 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-bark-950/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
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
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-canopy-100/40 transition hover:text-canopy-100"
              aria-label="Fermer"
            >
              <FiX className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full border border-canopy-400/30 bg-canopy-500/10 text-canopy-300">
                <FiClock className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-3 font-display text-xl text-canopy-50">Pendant votre absence</h2>
              <p className="mt-1 text-xs text-canopy-100/45">
                Votre sylve a prospéré durant {formatDuration(data.awaySeconds)}.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-canopy-700/20 bg-bark-950/40 px-4 py-3">
              <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-canopy-100/35">
                <FiPackage className="h-3.5 w-3.5" aria-hidden="true" /> Ressources récoltées
              </p>
              <ResourceCost cost={data.producedResources} />
            </div>

            {lines.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {lines.map((line) => (
                  <li
                    key={line.label}
                    className="flex items-center justify-between text-sm text-canopy-100/65"
                  >
                    <span>{line.label}</span>
                    <span className="font-display text-canopy-300/85">{line.value}</span>
                  </li>
                ))}
              </ul>
            )}

            {data.attacksSuffered > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <FiAlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {data.attacksSuffered} attaque{data.attacksSuffered > 1 ? 's' : ''} subie
                {data.attacksSuffered > 1 ? 's' : ''} sur vos mondes — consultez vos rapports.
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl border border-canopy-400/40 bg-canopy-500/15 py-2.5 text-sm font-medium text-canopy-50 transition hover:bg-canopy-500/25"
            >
              {jobsTotal > 0 || data.expeditionsReturned > 0
                ? 'Reprendre le contrôle'
                : 'Continuer'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
