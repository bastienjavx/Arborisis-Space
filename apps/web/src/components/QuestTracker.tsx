'use client';

import { motion } from 'framer-motion';
import { FiCheckCircle, FiGift, FiTarget } from 'react-icons/fi';
import type { QuestView } from '@arborisis/shared';
import { useClaimQuest, useQuests } from '@/lib/queries';
import { ResourceCost } from './ResourceCost';
import { useToast } from './ToastProvider';

function QuestRow({ quest }: { quest: QuestView }) {
  const claim = useClaimQuest();
  const toast = useToast();
  const pct =
    quest.target > 0 ? Math.min(100, Math.round((quest.progress / quest.target) * 100)) : 0;
  const claimable = quest.completed && !quest.claimedAt;

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-canopy-50">
            <FiTarget className="h-4 w-4 shrink-0 text-canopy-300" aria-hidden="true" />
            {quest.name}
          </p>
          <p className="mt-1 text-xs text-canopy-100/45">{quest.description}</p>
        </div>
        {claimable ? (
          <button
            type="button"
            disabled={claim.isPending}
            onClick={() =>
              claim.mutate(
                { questId: quest.id },
                {
                  onSuccess: () =>
                    toast({
                      title: 'Récompense de quête récoltée',
                      description: quest.name,
                      tone: 'success',
                    }),
                },
              )
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-canopy-400/40 bg-canopy-500/15 px-3 py-1.5 text-xs font-medium text-canopy-100 transition hover:bg-canopy-500/25 disabled:opacity-50"
          >
            <FiGift className="h-3.5 w-3.5" aria-hidden="true" />
            Réclamer
          </button>
        ) : null}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bark-950/60">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-canopy-500 to-canopy-300"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[11px] tabular-nums text-canopy-100/40">
          {quest.progress} / {quest.target}
        </span>
        <ResourceCost cost={quest.reward} />
      </div>
    </div>
  );
}

/**
 * Widget « Objectif en cours » : met en avant la prochaine quête à accomplir/réclamer.
 * Affiché sur le tableau de bord pour donner une « prochaine action évidente ».
 */
export function QuestTracker() {
  const { data } = useQuests();
  if (!data || !data.active) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="mycelium-panel overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-canopy-700/15 px-5 py-4">
        <h2 className="section-title">Objectif en cours</h2>
        {data.claimableCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-canopy-500/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-canopy-200">
            <FiCheckCircle className="h-3 w-3" aria-hidden="true" />
            {data.claimableCount} à réclamer
          </span>
        ) : null}
      </div>
      <QuestRow quest={data.active} />
    </motion.section>
  );
}
