'use client';

import { useAchievements } from '@/lib/queries';
import { AnimatedCard } from '@/components/AnimatedCard';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';
import { FiAward, FiGift, FiLock } from 'react-icons/fi';

export default function AchievementsPage() {
  const { data: achievements, isLoading } = useAchievements();

  if (isLoading || !achievements)
    return <p className="text-canopy-100/50">Consultation des archives…</p>;

  const unlocked = achievements.filter((a) => a.unlockedAt);
  const locked = achievements.filter((a) => !a.unlockedAt);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Succès arborisiens"
        subtitle={`${unlocked.length} / ${achievements.length} déverrouillés`}
      />

      {unlocked.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Déverrouillés</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unlocked.map((a, i) => (
              <motion.div
                key={a.type}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <AnimatedCard glow="green" className="h-full">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-canopy-500/20 bg-canopy-500/10 text-canopy-300">
                      <FiAward className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-canopy-100">{a.name}</h3>
                      <p className="mt-0.5 text-xs leading-5 text-canopy-100/50">{a.description}</p>
                      {a.rewardText && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-spore-400">
                          <FiGift className="h-3.5 w-3.5" aria-hidden="true" />
                          {a.rewardText}
                        </p>
                      )}
                      {a.unlockedAt && (
                        <p className="text-[10px] text-canopy-100/30 mt-1.5">
                          {new Date(a.unlockedAt).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <h2 className="section-title mb-3 text-canopy-100/30">Verrouillés</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map((a, i) => (
              <motion.div
                key={a.type}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <AnimatedCard className="h-full opacity-40">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-canopy-700/15 bg-bark-950/30 text-canopy-100/30">
                      <FiLock className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-medium text-canopy-100 truncate">{a.name}</h3>
                      <p className="text-xs text-canopy-100/50 mt-0.5">{a.description}</p>
                    </div>
                  </div>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
