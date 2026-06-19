'use client';

import { useLeaderboard } from '@/lib/queries';
import { AnimatedCard } from '@/components/AnimatedCard';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';
import { FiAward } from 'react-icons/fi';

const RANK_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];

export default function LeaderboardPage() {
  const { data: entries, isLoading } = useLeaderboard();

  if (isLoading || !entries) return <p className="text-canopy-100/50">Croissance du classement…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classement galactique"
        subtitle="Les civilisations les plus florissantes de la Convergence."
      />

      <AnimatedCard className="overflow-x-auto p-0">
        <table className="min-w-[42rem] w-full text-sm">
          <thead>
            <tr className="border-b border-canopy-700/30 text-canopy-100/50 uppercase text-xs tracking-wider">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Civilisation</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Colonies</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Vaisseaux</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">Dernière activité</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <motion.tr
                key={entry.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-canopy-700/10 hover:bg-canopy-700/10 transition-colors"
              >
                <td className={`px-4 py-3 font-bold ${RANK_COLORS[i] ?? 'text-canopy-100/40'}`}>
                  {entry.rank <= 3 ? (
                    <span className="flex items-center gap-1.5">
                      <FiAward className="h-4 w-4" aria-hidden="true" />
                      {entry.rank}
                    </span>
                  ) : (
                    entry.rank
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-canopy-100">{entry.username}</td>
                <td className="px-4 py-3 text-right text-spore-400 font-mono">
                  {entry.score.toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-right text-canopy-100/60 hidden sm:table-cell">
                  {entry.colonies}
                </td>
                <td className="px-4 py-3 text-right text-canopy-100/60 hidden md:table-cell">
                  {entry.ships.toLocaleString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-right text-canopy-100/40 text-xs hidden lg:table-cell">
                  {new Date(entry.lastActive).toLocaleDateString('fr-FR')}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="px-4 py-8 text-center text-canopy-100/40 text-sm">
            Aucune civilisation répertoriée pour l'instant.
          </p>
        )}
      </AnimatedCard>
    </div>
  );
}
