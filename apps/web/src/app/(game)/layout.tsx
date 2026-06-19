'use client';

export const dynamic = 'force-dynamic';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { PlanetProvider } from '@/components/PlanetContext';
import { EventBanner } from '@/components/EventBanner';
import { useMe } from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();
  const pathname = usePathname();

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
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <Image
          src="/images/arborisis/hero-living-planet.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-[0.13] saturate-75"
        />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,#060b09_0%,rgba(6,11,9,0.96)_34%,rgba(6,11,9,0.82)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_16%,rgba(22,191,108,0.08),transparent_34%)]" />
        <div className="absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.7)]" />
      </div>
      <Nav username={user.username} />
      <div className="relative z-10 min-h-screen pb-24 lg:pl-[17rem] lg:pb-0">
        <main className="mx-auto max-w-[92rem] px-4 py-5 sm:px-6 sm:py-7 xl:px-10">
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
