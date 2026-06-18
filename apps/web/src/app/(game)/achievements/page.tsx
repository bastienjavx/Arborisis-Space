'use client';

import { useAchievements } from '@/lib/queries';
import { AnimatedCard } from '@/components/AnimatedCard';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';

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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-canopy-300/70">
            Déverrouillés
          </h2>
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
                    <span className="text-2xl">🌿</span>
                    <div className="min-w-0">
                      <h3 className="font-medium text-canopy-100 truncate">{a.name}</h3>
                      <p className="text-xs text-canopy-100/50 mt-0.5">{a.description}</p>
                      {a.rewardText && (
                        <p className="text-xs text-spore-400 mt-1">✦ {a.rewardText}</p>
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-canopy-100/30">
            Verrouillés
          </h2>
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
                    <span className="text-2xl grayscale">🌿</span>
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
