'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FiAward,
  FiBarChart2,
  FiChevronDown,
  FiCpu,
  FiCrosshair,
  FiFileText,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiLogOut,
  FiNavigation,
  FiUser,
} from 'react-icons/fi';
import { api } from '@/lib/api';
import { useMe } from '@/lib/queries';
import { usePlanetSelection } from './PlanetContext';

const LINKS = [
  { href: '/play', label: 'Empire', icon: FiGrid },
  { href: '/buildings', label: 'Structures', icon: FiLayers },
  { href: '/research', label: 'Recherche', icon: FiCpu },
  { href: '/galaxy', label: 'Galaxie', icon: FiGlobe },
  { href: '/fleets', label: 'Flottes', icon: FiNavigation },
  { href: '/pve', label: 'PvE', icon: FiCrosshair },
  { href: '/pvp', label: 'PvP', icon: FiCrosshair },
  { href: '/reports', label: 'Rapports', icon: FiFileText },
  { href: '/leaderboard', label: 'Classement', icon: FiBarChart2 },
  { href: '/achievements', label: 'Succès', icon: FiAward },
  { href: '/profile', label: 'Profil', icon: FiUser },
] as const;

export function Nav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user } = useMe();
  const { planets, selectedId, select } = usePlanetSelection();

  async function logout() {
    await api.logout().catch(() => undefined);
    qc.clear();
    router.replace('/login');
  }

  const planetSelector = (compact = false) =>
    planets.length > 0 && (
      <div className="relative">
        {!compact && (
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-canopy-100/35">
            Monde actif
          </span>
        )}
        <select
          value={selectedId}
          onChange={(event) => select(event.target.value)}
          className={`w-full appearance-none rounded-xl border border-canopy-700/25 bg-bark-950/70 py-2.5 pl-3 pr-9 text-xs text-canopy-100 outline-none transition focus:border-canopy-500/60 ${compact ? 'max-w-[12rem]' : ''}`}
          aria-label="Planète active"
        >
          {planets.map((planet) => (
            <option key={planet.id} value={planet.id}>
              {planet.name} · {planet.coordinates.galaxy}:{planet.coordinates.system}:
              {planet.coordinates.position}
            </option>
          ))}
        </select>
        <FiChevronDown
          className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 text-canopy-100/35"
          aria-hidden="true"
        />
      </div>
    );

  return (
    <>
      <motion.aside
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-canopy-700/15 bg-bark-950/90 px-4 py-5 backdrop-blur-2xl lg:flex"
      >
        <Link href="/play" className="px-3 py-2" aria-label="Arborisis — Empire">
          <span className="gradient-text text-2xl font-semibold tracking-[-0.045em]">
            Arborisis
          </span>
          <span className="mt-1 block text-[10px] uppercase tracking-[0.24em] text-canopy-100/30">
            Console mycélienne
          </span>
        </Link>

        <div className="mx-3 my-5 h-px bg-canopy-700/15" />
        <div className="px-2">{planetSelector()}</div>

        <nav className="mt-6 flex-1 space-y-1" aria-label="Navigation du jeu">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-canopy-500/10 text-canopy-100'
                    : 'text-canopy-100/48 hover:bg-canopy-700/10 hover:text-canopy-100/85'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="game-nav-indicator"
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-canopy-400 shadow-[0_0_12px_rgba(63,217,137,0.7)]"
                  />
                )}
                <Icon
                  className={`h-[18px] w-[18px] ${active ? 'text-canopy-300' : 'text-canopy-100/35 group-hover:text-canopy-300/70'}`}
                  aria-hidden="true"
                />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-canopy-700/15 px-2 pt-4">
          <Link
            href="/profile"
            className="mb-3 block rounded-xl px-2 py-2 transition hover:bg-canopy-700/10"
          >
            <span className="block text-[10px] uppercase tracking-[0.18em] text-canopy-100/30">
              Stratège
            </span>
            <span className="mt-1 block truncate text-sm text-canopy-100/75">
              {user?.displayName || username}
            </span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-canopy-100/40 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <FiLogOut className="h-4 w-4" aria-hidden="true" />
            Quitter la session
          </button>
        </div>
      </motion.aside>

      <header className="sticky top-0 z-40 border-b border-canopy-700/15 bg-bark-950/90 px-4 py-3 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/play" className="gradient-text text-xl font-semibold tracking-[-0.04em]">
            Arborisis
          </Link>
          <div className="min-w-0 flex-1">{planetSelector(true)}</div>
          <button
            type="button"
            onClick={logout}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-canopy-700/20 text-canopy-100/50"
            aria-label="Quitter la session"
          >
            <FiLogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex overflow-x-auto border-t border-canopy-700/20 bg-bark-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl lg:hidden"
        aria-label="Navigation mobile du jeu"
      >
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] transition ${active ? 'text-canopy-300' : 'text-canopy-100/35'}`}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
