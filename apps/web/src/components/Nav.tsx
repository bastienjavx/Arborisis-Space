'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { AuthUser } from '@arborisis/shared';
import { UserRole } from '@arborisis/shared';
import {
  FiAward,
  FiBookOpen,
  FiUsers,
  FiBarChart2,
  FiChevronDown,
  FiCpu,
  FiCrosshair,
  FiFileText,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiLogOut,
  FiMap,
  FiMenu,
  FiMessageCircle,
  FiMoreHorizontal,
  FiNavigation,
  FiShield,
  FiSliders,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { api } from '@/lib/api';
import { broadcastLogout } from '@/lib/session';
import { fadeUp, organicEase, staggerChildren } from '@/lib/motion';
import { usePlanetSelection } from './PlanetContext';

const LINKS = [
  { href: '/play', label: 'Planète', icon: FiGrid },
  { href: '/empire', label: 'Empire', icon: FiMap },
  { href: '/buildings', label: 'Structures', icon: FiLayers },
  { href: '/production', label: 'Production', icon: FiSliders },
  { href: '/research', label: 'Recherche', icon: FiCpu },
  { href: '/galaxy', label: 'Galaxie', icon: FiGlobe },
  { href: '/fleets', label: 'Flottes', icon: FiNavigation },
  { href: '/commanders', label: 'Commandants', icon: FiUser },
  { href: '/defenses', label: 'Défenses', icon: FiShield },
  { href: '/pve', label: 'PvE', icon: FiCrosshair },
  { href: '/pvp', label: 'PvP', icon: FiCrosshair },
  { href: '/diplomacy', label: 'Diplomatie', icon: FiUsers },
  { href: '/market', label: 'Marché', icon: FiBarChart2 },
  { href: '/inventory', label: 'Inventaire', icon: FiMoreHorizontal },
  { href: '/crafting', label: 'Artisanat', icon: FiSliders },
  { href: '/trade-routes', label: 'Routes', icon: FiNavigation },
  { href: '/alliance', label: 'Alliance', icon: FiUsers },
  { href: '/chat', label: 'Chat', icon: FiMessageCircle },
  { href: '/reports', label: 'Rapports', icon: FiFileText },
  { href: '/leaderboard', label: 'Classement', icon: FiBarChart2 },
  { href: '/achievements', label: 'Succès', icon: FiAward },
  { href: '/codex', label: 'Codex', icon: FiBookOpen },
  { href: '/profile', label: 'Profil', icon: FiUser },
] as const;

const PRIMARY_MOBILE_LINKS = LINKS.slice(0, 4);
const ADMIN_LINKS = [
  { href: '/admin', label: 'Modération', icon: FiShield },
  { href: '/admin/npc', label: 'IA Mycosynth', icon: FiCpu },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { planets, selectedId, select } = usePlanetSelection();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigationLinks =
    user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR
      ? [...LINKS, ...ADMIN_LINKS]
      : LINKS;

  useEffect(() => setMobileOpen(false), [pathname]);

  async function logout() {
    await api.logout().catch(() => undefined);
    broadcastLogout();
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
        transition={{ duration: 0.55, ease: organicEase }}
        className="fixed inset-y-0 left-0 z-40 hidden w-[15rem] flex-col overflow-hidden border-r border-canopy-700/20 bg-bark-950/95 px-3 py-5 backdrop-blur-2xl lg:flex"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
          <Image
            src="/images/arborisis/feature-empire.webp"
            alt=""
            fill
            sizes="15rem"
            className="object-cover"
          />
        </div>
        <Link
          href="/play"
          className="relative px-3 py-2 text-center"
          aria-label="Arborisis — Empire"
        >
          <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full border border-canopy-300/20 bg-canopy-500/[0.04] shadow-[inset_0_0_30px_rgba(126,236,174,0.05),0_0_24px_rgba(126,236,174,0.04)]">
            <FiGlobe className="h-7 w-7 text-canopy-100/70" aria-hidden="true" />
          </span>
          <span className="font-display text-3xl tracking-[-0.035em] text-canopy-50">
            Arborisis
          </span>
          <span className="mt-1 block text-[10px] uppercase tracking-[0.24em] text-canopy-100/30">
            Console mycélienne
          </span>
        </Link>

        <div className="mx-3 my-5 h-px bg-canopy-700/15" />
        <div className="px-2">{planetSelector()}</div>

        <nav
          className="relative mt-5 flex-1 space-y-1 overflow-y-auto pr-1"
          aria-label="Navigation du jeu"
        >
          {navigationLinks.map((link, index) => {
            const active = isActivePath(pathname, link.href);
            const Icon = link.icon;
            return (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + index * 0.015, ease: organicEase }}
              >
                <Link
                  href={link.href}
                  className={`group relative flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5 text-sm transition ${
                    active
                      ? 'border-canopy-300/25 bg-canopy-500/10 text-canopy-50 shadow-[inset_0_0_24px_rgba(126,236,174,0.04)]'
                      : 'border-transparent text-canopy-100/48 hover:border-canopy-700/15 hover:bg-canopy-700/10 hover:text-canopy-100/85'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="game-nav-indicator"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-canopy-400 shadow-[0_0_12px_rgba(63,217,137,0.7)]"
                    />
                  )}
                  <Icon
                    className={`h-[18px] w-[18px] ${active ? 'text-canopy-300' : 'text-canopy-100/35 group-hover:text-canopy-300/70'}`}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{link.label}</span>
                </Link>
              </motion.div>
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
              {user.displayName || user.username}
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

      <header className="sticky top-0 z-40 border-b border-canopy-700/20 bg-bark-950/95 px-4 py-3 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/play" className="gradient-text text-xl font-semibold tracking-[-0.04em]">
            Arborisis
          </Link>
          <div className="min-w-0 flex-1">{planetSelector(true)}</div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-canopy-700/20 text-canopy-100/50"
            aria-label="Ouvrir la navigation"
            aria-expanded={mobileOpen}
          >
            <FiMenu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-bark-950/90 p-4 backdrop-blur-xl lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.32, ease: organicEase }}
              onClick={(event) => event.stopPropagation()}
              className="mx-auto flex h-full max-w-lg flex-col overflow-hidden rounded-2xl border border-canopy-700/25 bg-bark-950"
            >
              <div className="flex items-center justify-between border-b border-canopy-700/15 px-5 py-4">
                <div>
                  <span className="font-display text-2xl text-canopy-50">Arborisis</span>
                  <span className="ml-3 text-xs text-canopy-100/35">Navigation impériale</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-canopy-700/20 text-canopy-100/55"
                  aria-label="Fermer la navigation"
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <nav
                className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto p-4"
                aria-label="Toutes les pages du jeu"
              >
                <motion.div
                  className="contents"
                  initial="hidden"
                  animate="visible"
                  variants={staggerChildren(0.025, 0.08)}
                >
                  {navigationLinks.map((link) => {
                    const Icon = link.icon;
                    const active = isActivePath(pathname, link.href);
                    return (
                      <motion.div key={link.href} variants={fadeUp}>
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                            active
                              ? 'border-canopy-300/30 bg-canopy-500/10 text-canopy-50'
                              : 'border-canopy-700/15 text-canopy-100/55 hover:bg-canopy-500/[0.035]'
                          }`}
                        >
                          <Icon className="h-5 w-5 text-canopy-300/65" aria-hidden="true" />
                          <span className="flex-1">{link.label}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </nav>
              <div className="border-t border-canopy-700/15 p-4">
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/15 px-4 py-3 text-sm text-red-300/70"
                >
                  <FiLogOut className="h-4 w-4" aria-hidden="true" />
                  Quitter la session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.38, ease: organicEase }}
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-canopy-700/20 bg-bark-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl lg:hidden"
        aria-label="Navigation mobile du jeu"
      >
        {PRIMARY_MOBILE_LINKS.map((link) => {
          const active = isActivePath(pathname, link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] transition ${active ? 'text-canopy-300' : 'text-canopy-100/35'}`}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span>{link.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] transition ${PRIMARY_MOBILE_LINKS.some((link) => isActivePath(pathname, link.href)) ? 'text-canopy-100/35' : 'text-canopy-300'}`}
          aria-label="Plus de pages"
        >
          <FiMoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
          <span>Plus</span>
        </button>
      </motion.nav>
    </>
  );
}
