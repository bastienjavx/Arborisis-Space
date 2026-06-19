'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/lib/queries';
import { joinUniverseAction } from '@/app/universes/actions';

interface JoinUniverseButtonProps {
  universeId: string;
}

export function JoinUniverseButton({ universeId }: JoinUniverseButtonProps) {
  const router = useRouter();
  const { data: user, isLoading } = useMe();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isPending) return;
    setError(null);

    if (user) {
      setIsPending(true);
      try {
        await joinUniverseAction(universeId);
        router.push('/play');
      } catch {
        setError("Impossible de rejoindre l'univers. Veuillez réessayer.");
      } finally {
        setIsPending(false);
      }
    } else {
      router.push(`/register?universeId=${encodeURIComponent(universeId)}`);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || isPending}
        className="btn-primary w-full"
      >
        Rejoindre
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
