'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Nav } from '@/components/Nav';
import { PlanetProvider } from '@/components/PlanetContext';
import { useMe } from '@/lib/queries';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();

  useEffect(() => {
    if (!isLoading && (isError || !user)) router.replace('/login');
  }, [isLoading, isError, user, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-canopy-100/50">Germination…</div>
    );
  }
  if (!user) return null;

  return (
    <PlanetProvider>
      <Nav username={user.username} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </PlanetProvider>
  );
}
