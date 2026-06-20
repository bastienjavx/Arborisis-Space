export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { GameShell } from '@/components/GameShell';

export const metadata: Metadata = {
  title: 'Espace de jeu',
  robots: { index: false, follow: false, nocache: true },
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <GameShell>{children}</GameShell>;
}
