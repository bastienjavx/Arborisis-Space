import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hors ligne',
  robots: { index: false, follow: false },
};

/**
 * Écran servi par le service worker quand une navigation échoue sans réseau ni
 * cache. Volontairement statique et autonome (aucune dépendance jeu/API) pour
 * rester affichable hors ligne.
 */
export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div className="max-w-sm">
        <div
          className="mx-auto mb-6 h-16 w-16 rounded-full border border-canopy-700/40 bg-[radial-gradient(circle_at_50%_35%,rgba(22,191,108,0.35),transparent_70%)]"
          aria-hidden="true"
        />
        <h1 className="text-xl font-semibold text-canopy-50">Hors connexion</h1>
        <p className="mt-2 text-sm text-canopy-100/70">
          Le mycélium ne capte plus le réseau. Reconnecte-toi pour reprendre la partie — tes
          dernières données restent en cache.
        </p>
        <Link href="/play" className="btn btn-primary mt-6 inline-flex px-4 py-2 text-sm">
          Réessayer
        </Link>
      </div>
    </main>
  );
}
