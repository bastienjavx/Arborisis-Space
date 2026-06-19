'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { api, ApiError } from '@/lib/api';
import { Suspense } from 'react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Lien de réinitialisation invalide.');
    }
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (password.length < 10) {
      setError('Le mot de passe doit faire au moins 10 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setStatus('success');
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
        setStatus('error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bark-950 px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-8 text-center">
          <Link href="/" className="section-kicker">Arborisis</Link>
          <h1 className="mt-4 text-3xl text-canopy-50">Nouveau mot de passe</h1>
        </div>

        <div className="mycelium-panel p-8">
          <div className="mb-6 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent rounded-full" />

          <AnimatePresence mode="wait">
            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 text-center py-4"
              >
                <FiCheckCircle className="h-14 w-14 text-canopy-400" />
                <p className="text-lg font-medium text-canopy-300">Mot de passe modifié !</p>
                <p className="text-sm text-canopy-100/55">
                  Votre mot de passe a été mis à jour. Redirection vers la connexion…
                </p>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 text-center py-4"
              >
                <FiXCircle className="h-14 w-14 text-red-500/80" />
                <p className="text-lg font-medium text-red-400">Lien invalide</p>
                <p className="text-sm text-canopy-100/55">{error}</p>
                <Link
                  href="/forgot-password"
                  className="mt-2 text-sm text-canopy-400 hover:text-canopy-300 underline transition-colors"
                >
                  Demander un nouveau lien
                </Link>
              </motion.div>
            )}

            {status === 'form' && (
              <motion.form
                key="form"
                onSubmit={onSubmit}
                className="space-y-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div>
                  <label className="label" htmlFor="password">Nouveau mot de passe</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={10}
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-canopy-100/40">Au moins 10 caractères.</p>
                </div>

                <div>
                  <label className="label" htmlFor="confirm">Confirmer le mot de passe</label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="input"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      className="text-sm text-red-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? 'Modification…' : 'Changer le mot de passe'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 h-0.5 bg-gradient-to-r from-transparent via-canopy-900 to-transparent rounded-full" />
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-canopy-400 hover:text-canopy-300 transition-colors"
          >
            Retour à la connexion
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
