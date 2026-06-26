'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { PwaEnhancer } from './PwaEnhancer';
import { ToastProvider } from './ToastProvider';
import { organicEase } from '@/lib/motion';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 5_000,
          },
        },
      }),
  );
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
