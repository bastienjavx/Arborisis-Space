'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
            staleTime: 5_000,
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
