'use client';

import { useAchievements } from '@/lib/queries';
import { PageHeader } from '@/components/PageHeader';
import { ResourceCost } from '@/components/ResourceCost';
import { motion } from 'framer-motion';
import { FiAward, FiCheckCircle, FiGift, FiLock } from 'react-icons/fi';

export default function AchievementsPage() {
  const { data: achievements, isLoading } = useAchievements();

  if (isLoading || !achievements)
    return <p className="text-canopy-100/50">Consultation des archives…</p>;

  const unlocked = achievements.filter((a) => a.unlockedAt);
  const locked = achievements
    .filter((a) => !a.unlockedAt)
    .sort((a, b) => b.progress / b.target - a.progress / a.target);
  const completion = achievements.length
    ? Math.round((unlocked.length / achievements.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Succès arborisiens"
        subtitle="Vos exploits façonnent la sylve et sa mémoire."
      >
        <div className="min-w-[18rem] sm:min-w-[24rem]">
          <div className="mb-2 flex items-end justify-between gap-4">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-canopy-100/35">
                Progression globale
              </span>
              <span className="mt-1 block font-display text-2xl text-canopy-300/80">
                {unlocked.length} / {achievements.length} déverrouillés
              </span>
            </div>
            <span className="text-xs text-canopy-100/42">{completion}%</span>
          </div>
          <progress
            className="h-1.5 w-full overflow-hidden rounded-full accent-canopy-300 [&::-webkit-progress-bar]:bg-canopy-700/20 [&::-webkit-progress-value]:bg-canopy-300"
            value={unlocked.length}
            max={Math.max(achievements.length, 1)}
            aria-label={`${completion}% des succès déverrouillés`}
          />
        </div>
      </PageHeader>

      {unlocked.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title mb-3">Déverrouillés</h2>
          <div className="space-y-2">
            {unlocked.map((a, i) => (
              <motion.article
                key={a.type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="mycelium-panel grid gap-4 px-4 py-3 sm:grid-cols-[4rem_minmax(14rem,1.4fr)_minmax(10rem,0.8fr)_8rem] sm:items-center sm:px-5"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full border border-canopy-500/25 bg-canopy-500/[0.045] text-canopy-300/75">
                  <FiAward className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg text-canopy-100/88">{a.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-canopy-100/42">{a.description}</p>
                </div>
                <div className="space-y-1.5">
                  {a.rewardText ? (
                    <p className="flex items-center gap-2 text-xs text-canopy-300/68">
                      <FiGift className="h-4 w-4" aria-hidden="true" />
                      {a.rewardText}
                    </p>
                  ) : (
                    <p className="text-xs text-canopy-100/30">Honneur impérial</p>
                  )}
                  <ResourceCost cost={a.reward} />
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-canopy-300/55">
                    <FiCheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Déverrouillé
                  </span>
                  {a.unlockedAt && (
                    <p className="mt-1 text-xs text-canopy-100/38">
                      {new Date(a.unlockedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title mb-3 text-canopy-100/45">Verrouillés</h2>
          <div className="space-y-2">
            {locked.map((a, i) => (
              <motion.article
                key={a.type}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="mycelium-panel grid gap-4 px-4 py-3 opacity-45 sm:grid-cols-[4rem_minmax(14rem,1.4fr)_minmax(10rem,0.8fr)_8rem] sm:items-center sm:px-5"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full border border-canopy-700/20 bg-bark-950/45 text-canopy-100/35">
                  <FiAward className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg text-canopy-100/75">{a.name}</h3>
                  <p className="mt-1 text-xs italic leading-5 text-canopy-100/42">
                    {a.description}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {a.rewardText && (
                    <p className="flex items-center gap-2 text-xs text-canopy-100/45">
                      <FiGift className="h-4 w-4" aria-hidden="true" />
                      {a.rewardText}
                    </p>
                  )}
                  <ResourceCost cost={a.reward} />
                </div>
                <div className="min-w-0 sm:text-right">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-canopy-100/50 sm:justify-end">
                    <span>
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(a.progress)} /{' '}
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(a.target)}{' '}
                      {a.progressLabel}
                    </span>
                    <FiLock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </div>
                  <progress
                    className="h-1.5 w-full overflow-hidden rounded-full accent-canopy-500 [&::-webkit-progress-bar]:bg-canopy-700/25 [&::-webkit-progress-value]:bg-canopy-500"
                    value={a.progress}
                    max={a.target}
                    aria-label={`Progression de ${a.name} : ${a.progress} sur ${a.target}`}
                  />
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
