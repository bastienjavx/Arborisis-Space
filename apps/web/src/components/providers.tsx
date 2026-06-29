'use client';

import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { PwaEnhancer } from './PwaEnhancer';
import { ToastProvider } from './ToastProvider';
import { organicEase } from '@/lib/motion';
import { initSessionManager, teardownSessionManager } from '@/lib/session';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
            refetchOnWindowFocus: false,
            // 30 s : on revient sur une page déjà vue → données du cache servies
            // instantanément, plus de skeleton « rechargement » à chaque navigation.
            // Le socket temps réel invalide les queries quand l'état change vraiment.
            staleTime: 30_000,
            // Garde l'ancienne donnée affichée pendant un refetch au lieu de la
            // vider (sinon flash vide ↔ effet « la page recharge »).
            placeholderData: keepPreviousData,
            networkMode: 'always',
          },
          mutations: {
            retry: 0,
            networkMode: 'always',
          },
        },
      }),
  );

  useEffect(() => {
    initSessionManager();
    return () => teardownSessionManager();
  }, []);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.4, ease: organicEase }}>
      <QueryClientProvider client={client}>
        <ToastProvider>
          {children}
          <PwaEnhancer />
        </ToastProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
