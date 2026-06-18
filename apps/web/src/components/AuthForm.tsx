'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/queries';

type Mode = 'login' | 'register';

function OrganicBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Floating organic shapes */}
      <motion.div
        className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-canopy-500/10 blur-3xl"
        animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-20 bottom-1/4 h-48 w-48 rounded-full bg-spore-500/10 blur-3xl"
        animate={{ y: [0, 20, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/3 top-1/2 h-32 w-32 rounded-full bg-sap-400/10 blur-2xl"
        animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Decorative 3D floating spore */}
      <motion.div
        className="absolute right-8 top-20"
        animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-canopy-400/30 to-spore-500/30 backdrop-blur-sm" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-canopy-300/20 to-spore-400/20" />
          <div className="absolute inset-0 rounded-full shadow-[0_0_30px_rgba(22,191,108,0.3)]" />
          {/* Spore tendrils */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 h-8 w-px origin-bottom bg-gradient-to-t from-canopy-400/40 to-transparent"
              style={{ rotate: `${i * 60}deg` }}
              animate={{ scaleY: [0.6, 1, 0.6] }}
              transition={{ duration: 3, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </motion.div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(22, 191, 108, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(22, 191, 108, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

function CheckmarkIcon() {
  return (
    <motion.svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <motion.circle
        cx="32"
        cy="32"
        r="30"
        stroke="#16bf6c"
        strokeWidth="2"
        fill="rgba(22, 191, 108, 0.1)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
      <motion.path
        d="M20 32 L28 40 L44 24"
        stroke="#16bf6c"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.3, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => { clearTimeout(redirectTimer.current); }, []);

  const isRegister = mode === 'register';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const res = isRegister
        ? await api.register({ email, username, password })
        : await api.login({ email, password });
      qc.setQueryData(keys.me, res.user);
      setSuccess(true);
      redirectTimer.current = setTimeout(() => router.replace('/play'), 800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <OrganicBackground />

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Title */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold gradient-text text-glow">Arborisis</h1>
          <p className="mt-2 text-sm text-canopy-100/50">
            {isRegister
              ? 'Faites germer votre civilisation.'
              : 'Reprenez le contrôle de votre empire.'}
          </p>
        </motion.div>

        {/* Glass card form */}
        <motion.form
          onSubmit={onSubmit}
          className="glass-card space-y-5"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                className="flex flex-col items-center justify-center py-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <CheckmarkIcon />
                <p className="mt-4 text-lg font-medium text-canopy-300">
                  {isRegister ? 'Colonie créée !' : 'Connexion réussie !'}
                </p>
                <p className="mt-1 text-sm text-canopy-100/50">Redirection...</p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                className="space-y-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Email field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <label className="label" htmlFor="email">
                    Email
                  </label>
                  <motion.div whileFocus={{ scale: 1.02 }} className="relative">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="input relative z-10 transition-all duration-300 focus:shadow-[0_0_20px_rgba(22,191,108,0.3)] focus:ring-2 focus:ring-canopy-500/50"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </motion.div>
                </motion.div>

                {/* Username field (register only) */}
                <AnimatePresence>
                  {isRegister && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="label" htmlFor="username">
                        Nom d'explorateur
                      </label>
                      <input
                        id="username"
                        type="text"
                        autoComplete="username"
                        required
                        className="input transition-all duration-300 focus:shadow-[0_0_20px_rgba(22,191,108,0.3)] focus:ring-2 focus:ring-canopy-500/50"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="label" htmlFor="password">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    required
                    className="input transition-all duration-300 focus:shadow-[0_0_20px_rgba(22,191,108,0.3)] focus:ring-2 focus:ring-canopy-500/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {isRegister && (
                    <p className="mt-1 text-[11px] text-canopy-100/40">Au moins 10 caractères.</p>
                  )}
                </motion.div>

                {/* Error message with shake */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      className="text-sm text-red-400"
                      initial={{ opacity: 0, x: 0 }}
                      animate={{ opacity: 1, x: [0, -5, 5, -5, 5, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ x: { duration: 0.4 } }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <motion.button
                  type="submit"
                  className="btn-primary relative w-full overflow-hidden"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 animate-pulse-glow rounded-xl opacity-0 transition-opacity group-hover:opacity-100" />

                  {loading ? (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className="h-4 w-4 rounded-full border-2 border-bark-950 border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      <span>Chargement...</span>
                    </motion.div>
                  ) : (
                    <span>{isRegister ? 'Faire germer' : 'Se connecter'}</span>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        {/* Link to other mode */}
        <motion.p
          className="mt-6 text-center text-sm text-canopy-100/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {isRegister ? (
            <>
              Déjà une colonie ?{' '}
              <Link
                href="/login"
                className="text-canopy-300 transition-colors hover:text-canopy-200 hover:underline"
              >
                Se connecter
              </Link>
            </>
          ) : (
            <>
              Pas encore de colonie ?{' '}
              <Link
                href="/register"
                className="text-canopy-300 transition-colors hover:text-canopy-200 hover:underline"
              >
                Créer un compte
              </Link>
            </>
          )}
        </motion.p>
      </motion.div>
    </div>
  );
}
