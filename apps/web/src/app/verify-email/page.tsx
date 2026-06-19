'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/queries';
import { setUniverseCookieAction } from '@/app/universes/actions';
import { Suspense } from 'react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('Lien de vérification invalide.');
      return;
    }

    api
      .verifyEmail(token)
      .then(async (res) => {
        qc.setQueryData(keys.me, res.user);
        if (res.user.universeId) {
          await setUniverseCookieAction(res.user.universeId);
        }
        setStatus('success');
        setTimeout(() => router.replace('/play'), 2000);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err instanceof ApiError ? err.message : 'Lien invalide ou expiré.');
      });
  }, [searchParams, qc, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bark-950 px-4">
      <motion.div
        className="mycelium-panel w-full max-w-md p-10 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Organic accent line */}
        <div className="mb-8 h-0.5 bg-gradient-to-r from-transparent via-canopy-500 to-transparent rounded-full" />

        {status === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              className="h-16 w-16 rounded-full border-4 border-canopy-700 border-t-canopy-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-canopy-300 font-medium">Activation en cours…</p>
            <p className="text-canopy-100/40 text-sm">Votre colonie se prépare à germer.</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <FiCheckCircle className="h-16 w-16 text-canopy-400" />
            <p className="text-canopy-300 text-lg font-medium">Colonie activée !</p>
            <p className="text-canopy-100/50 text-sm">
              Votre compte est vérifié. Redirection vers votre empire…
            </p>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <FiXCircle className="h-16 w-16 text-red-500/80" />
            <p className="text-red-400 text-lg font-medium">Lien invalide</p>
            <p className="text-canopy-100/50 text-sm">{errorMsg}</p>
            <Link
              href="/register"
              className="mt-2 text-sm text-canopy-400 hover:text-canopy-300 underline transition-colors"
            >
              Créer un nouveau compte
            </Link>
          </motion.div>
        )}

        <div className="mt-8 h-0.5 bg-gradient-to-r from-transparent via-canopy-900 to-transparent rounded-full" />
        <p className="mt-6 text-xs text-canopy-100/20 tracking-widest uppercase">Arborisis</p>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
