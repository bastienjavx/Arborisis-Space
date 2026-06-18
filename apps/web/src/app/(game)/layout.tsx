'use client';

export const dynamic = 'force-dynamic';

import dynamicNext from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { PlanetProvider } from '@/components/PlanetContext';
import { useMe } from '@/lib/queries';
import { motion, AnimatePresence } from 'framer-motion';

const OrganicBackground = dynamicNext(() => import('@/components/OrganicBackground'), {
  ssr: false,
});

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
      <OrganicBackground />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-bark-950/80 via-transparent to-bark-950/80" />
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.5)]" />
      </div>
      <Nav username={user.username} />
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </PlanetProvider>
  );
}
