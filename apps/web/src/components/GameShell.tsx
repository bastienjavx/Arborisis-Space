'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EventBanner } from '@/components/EventBanner';
import { GameTopBar } from '@/components/GameTopBar';
import { Nav } from '@/components/Nav';
import { OrganicBackgroundInner } from '@/components/OrganicBackgroundInner';
import { PlanetProvider } from '@/components/PlanetContext';
import { useMe } from '@/lib/queries';

export function GameShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isError } = useMe();

  useEffect(() => {
    if (!isLoading && (isError || !user)) router.replace('/login');
  }, [isLoading, isError, user, router]);

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
  if (!user) return null;

  return (
    <PlanetProvider>
      <OrganicBackgroundInner />
      <div className="pointer-events-none fixed inset-0 z-0 bg-bark-950/80 shadow-[inset_0_0_180px_rgba(0,0,0,0.7)]" />
      <Nav username={user.username} />
      <GameTopBar />
      <div className="relative z-10 min-h-screen pb-24 lg:pl-[15rem] lg:pt-[5rem] lg:pb-0">
        <main className="mx-auto max-w-[96rem] px-4 py-5 sm:px-6 sm:py-7 xl:px-9">
          <div className="mb-5">
            <EventBanner />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </PlanetProvider>
  );
}
