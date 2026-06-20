'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Réessayez.');
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
          <Link href="/" className="section-kicker">
            Arborisis
          </Link>
          <h1 className="mt-4 text-3xl text-canopy-50">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-canopy-100/50">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <div className="mycelium-panel p-8">
          <div className="mb-6 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent rounded-full" />

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 text-center py-4"
              >
                <FiMail className="h-14 w-14 text-amber-400" />
                <p className="text-lg font-medium text-canopy-300">Email envoyé !</p>
                <p className="text-sm text-canopy-100/55 max-w-xs">
                  Si un compte existe pour{' '}
                  <span className="text-canopy-300 font-medium">{email}</span>, vous recevrez un
                  lien de réinitialisation dans quelques instants.
                </p>
                <p className="text-xs text-canopy-100/35 mt-2">Le lien expire dans 1 heure.</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={onSubmit}
                className="space-y-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div>
                  <label className="label" htmlFor="email">
                    Adresse email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
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

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 h-0.5 bg-gradient-to-r from-transparent via-canopy-900 to-transparent rounded-full" />
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-canopy-400 hover:text-canopy-300 transition-colors"
          >
            <FiArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
