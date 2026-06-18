'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePlanetSelection } from './PlanetContext';

const LINKS = [
  { href: '/play', label: 'Empire' },
  { href: '/buildings', label: 'Structures' },
  { href: '/research', label: 'Recherche' },
  { href: '/galaxy', label: 'Galaxie' },
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
    <header className="sticky top-0 z-10 border-b border-canopy-700/20 bg-bark-950/80 backdrop-blur">
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
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active
                    ? 'bg-canopy-700/25 text-canopy-100'
                    : 'text-canopy-100/60 hover:text-canopy-100'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {planets.length > 0 && (
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
        )}

        <div className="flex items-center gap-3 text-sm">
          <span className="text-canopy-100/60">{username}</span>
          <button onClick={logout} className="btn-ghost px-3 py-1.5">
            Quitter
          </button>
        </div>
      </div>
    </header>
  );
}
