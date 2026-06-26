'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AbsenceSummaryModal } from '@/components/AbsenceSummaryModal';
import { AttackWarningBanner } from '@/components/AttackWarningBanner';
import { DailyRewardModal } from '@/components/DailyRewardModal';
import { EngagementFeedback } from '@/components/EngagementFeedback';
import { EventBanner } from '@/components/EventBanner';
import { GameTopBar } from '@/components/GameTopBar';
import { Nav } from '@/components/Nav';
import { NearMissBanner } from '@/components/NearMissBanner';
import { OrganicBackgroundInner } from '@/components/OrganicBackgroundInner';
import { PlanetProvider } from '@/components/PlanetContext';
import { TickerProvider } from '@/components/TickerContext';
import { useMe } from '@/lib/queries';
import { ApiError } from '@/lib/api';
import { onSessionEvent } from '@/lib/session';
import { fadeUp, organicEase } from '@/lib/motion';

export function GameShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError, error } = useMe();
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    const unsubscribe = onSessionEvent((event) => {
      if (event === 'logout') router.replace('/login');
      if (event === 'login') setNetworkError(false);
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      setNetworkError(false);
      return;
    }
    // Une erreur 401/403 signifie une déconnexion réelle ; les autres erreurs
    // (réseau, 502, 503) doivent être tolérées pour éviter d'expulser l'utilisateur
    // lors d'une micro-coupure ou d'un ralentissement serveur.
    const isAuthError = error instanceof ApiError && (error.status === 401 || error.status === 403);
    if (isError && !isAuthError) {
      setNetworkError(true);
      return;
    }
    if (isAuthError) {
      router.replace('/login');
    }
  }, [isLoading, isError, user, error, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-canopy-100/50">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Germination…
        </motion.div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center text-canopy-100/70">
        <div className="max-w-md space-y-3">
          <p className="text-lg font-medium">
            {networkError ? 'Connexion au serveur interrompue.' : 'Session invalide.'}
          </p>
          <p className="text-sm text-canopy-100/50">
            {networkError
              ? 'Vérifiez votre connexion réseau. La session sera restaurée automatiquement.'
              : 'Veuillez vous reconnecter.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <TickerProvider>
      <PlanetProvider>
        <OrganicBackgroundInner />
        <div className="pointer-events-none fixed inset-0 z-0 bg-bark-950/80 shadow-[inset_0_0_180px_rgba(0,0,0,0.7)]" />
        <Nav user={user} />
        <GameTopBar />
        <DailyRewardModal />
        <AbsenceSummaryModal />
        <EngagementFeedback />
        <div className="relative z-10 min-h-screen pb-24 lg:pl-[15rem] lg:pt-[5rem] lg:pb-0">
          <motion.main
            className="mx-auto max-w-[96rem] px-4 py-5 sm:px-6 sm:py-7 xl:px-9"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.45, ease: organicEase }}
          >
            <motion.div
              className="mb-5"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35, ease: organicEase }}
            >
              <AttackWarningBanner />
              <EventBanner />
              <NearMissBanner />
            </motion.div>
            {children}
          </motion.main>
        </div>
      </PlanetProvider>
    </TickerProvider>
  );
}
