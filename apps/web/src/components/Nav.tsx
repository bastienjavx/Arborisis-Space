'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { usePlanetSelection } from './PlanetContext';
import GlowText from './GlowText';

const LINKS = [
  { href: '/play', label: 'Empire' },
  { href: '/buildings', label: 'Structures' },
  { href: '/research', label: 'Recherche' },
  { href: '/galaxy', label: 'Galaxie' },
  { href: '/fleets', label: 'Flottes' },
  { href: '/reports', label: 'Rapports' },
  { href: '/leaderboard', label: 'Classement' },
  { href: '/achievements', label: 'Succès' },
];

export function Nav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { planets, selectedId, select } = usePlanetSelection();

  async function logout() {
    await api.logout().catch(() => undefined);
    qc.clear();
    router.replace('/login');
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="sticky top-0 z-50 border-b border-canopy-700/20 bg-bark-950/80 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/play" className="text-lg font-semibold tracking-tight text-canopy-300">
          🌿 Arborisis
        </Link>

        <nav className="flex flex-1 flex-wrap gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative rounded-lg px-3 py-1.5 text-sm transition"
              >
                <span
                  className={
                    active ? 'text-canopy-100' : 'text-canopy-100/60 hover:text-canopy-100'
                  }
                >
                  {l.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg bg-canopy-700/25"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {planets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <select
              value={selectedId}
              onChange={(e) => select(e.target.value)}
              className="input max-w-[14rem]"
              aria-label="Planète active"
            >
              {planets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.coordinates.galaxy}:{p.coordinates.system}:{p.coordinates.position}
                </option>
              ))}
            </select>
            <motion.div
              className="pointer-events-none absolute inset-y-0 right-2 flex items-center"
              animate={{ rotate: [0, 180, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            >
              <svg
                className="h-4 w-4 text-canopy-100/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </motion.div>
          </motion.div>
        )}

        <div className="flex items-center gap-3 text-sm">
          <GlowText color="green" animate className="text-canopy-100/60">
            {username}
          </GlowText>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="btn-ghost px-3 py-1.5"
          >
            Quitter
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
