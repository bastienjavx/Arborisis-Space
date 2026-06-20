'use client';

import { ExpeditionOutcome } from '@arborisis/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useExpeditionReports } from '@/lib/queries';
import { ParticleField } from './ParticleField';
import { useToast } from './ToastProvider';

const STORAGE_KEY = 'arborisis-seen-jackpots';
const RARE_OUTCOMES = new Set<ExpeditionOutcome>([
  ExpeditionOutcome.ANCIENT_ARCHIVE,
  ExpeditionOutcome.VOID_ECHO,
  ExpeditionOutcome.CONVERGENCE_BLOOM,
]);

const LABELS: Partial<Record<ExpeditionOutcome, string>> = {
  [ExpeditionOutcome.ANCIENT_ARCHIVE]: 'Une Archive ancienne a répondu à votre flotte.',
  [ExpeditionOutcome.VOID_ECHO]: 'Votre flotte a capté un Écho du Vide.',
  [ExpeditionOutcome.CONVERGENCE_BLOOM]: 'Une Floraison de Convergence vient de se produire.',
};

export function EngagementFeedback() {
  const { data: reports } = useExpeditionReports();
  const toast = useToast();
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (!reports) return;
    let seen = new Set<string>();
    try {
      seen = new Set(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]);
    } catch {
      seen = new Set();
    }

    const jackpot = reports.find(
      (report) => !report.isRead && RARE_OUTCOMES.has(report.outcome) && !seen.has(report.id),
    );
    if (!jackpot) return;

    seen.add(jackpot.id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen].slice(-100)));
    toast({
      title: 'Signal exceptionnel détecté',
      description: LABELS[jackpot.outcome],
      tone: 'jackpot',
      duration: 8_000,
    });
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), 4_000);
    return () => window.clearTimeout(timer);
  }, [reports, toast]);

  return (
    <AnimatePresence>
      {celebrating ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ParticleField />
          <div className="absolute inset-0 bg-spore-500/[0.04]" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
