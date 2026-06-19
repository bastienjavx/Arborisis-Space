export const dynamic = 'force-dynamic';

import { GameShell } from '@/components/GameShell';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <GameShell>{children}</GameShell>;
}
