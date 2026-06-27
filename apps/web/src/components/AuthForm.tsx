'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/queries';
import { fadeUp, organicEase, softScale, staggerChildren } from '@/lib/motion';
import { setUniverseCookieAction } from '@/app/universes/actions';
import { RaceType, RACES, UniverseStatus, type UniverseSummaryView } from '@arborisis/shared';
import { FiCheck, FiCheckCircle, FiMail, FiShield } from 'react-icons/fi';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [race, setRace] = useState<RaceType>(RaceType.MYCELIANS);
  const [universeId, setUniverseId] = useState('');
  const [universes, setUniverses] = useState<UniverseSummaryView[]>([]);
  const [universesLoading, setUniversesLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(false);
  // 2FA
  const [totpPending, setTotpPending] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isRegister = mode === 'register';

  useEffect(
    () => () => {
      clearTimeout(redirectTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!isRegister) return;
    setUniversesLoading(true);
    api
      .universes()
      .then((list) => {
        const active = list.filter((u) => u.status === UniverseStatus.ACTIVE);
        setUniverses(active);
        const urlUniverseId = searchParams.get('universeId');
        if (urlUniverseId && active.some((u) => u.id === urlUniverseId)) {
          setUniverseId(urlUniverseId);
        } else if (active.length > 0) {
          setUniverseId(active[0]!.id);
        }
      })
      .catch(() => setUniverses([]))
      .finally(() => setUniversesLoading(false));
  }, [isRegister, searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      if (isRegister) {
        const res = await api.register({ email, username, password, race, universeId });
        if (res.pending) {
          setPendingEmail(res.email);
        }
      } else {
        const res = await api.login({ email, password });
        if ('twoFactorRequired' in res && res.twoFactorRequired) {
          setTotpPending(res.tempToken);
        } else {
          const r = res as { user: import('@arborisis/shared').AuthUser };
          qc.setQueryData(keys.me, r.user);
          if (r.user.universeId) {
            await setUniverseCookieAction(r.user.universeId);
          }
          setSuccess(true);
          redirectTimer.current = setTimeout(() => router.replace('/play'), 800);
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit2fa(e: FormEvent) {
    e.preventDefault();
    if (!totpPending) return;
    setError(undefined);
    setLoading(true);
    try {
      const res = await api.loginWith2fa(totpPending, totpCode);
      qc.setQueryData(keys.me, res.user);
      if (res.user.universeId) {
        await setUniverseCookieAction(res.user.universeId);
      }
      setSuccess(true);
      redirectTimer.current = setTimeout(() => router.replace('/play'), 800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code invalide.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!pendingEmail || resendCooldown) return;
    setResendCooldown(true);
    await api.resendVerification(pendingEmail).catch(() => {});
    setTimeout(() => setResendCooldown(false), 60_000);
  }

  return (
    <div className="relative grid min-h-screen bg-bark-950 lg:grid-cols-2">
      <motion.div
        className="relative hidden min-h-screen overflow-hidden border-r border-canopy-700/20 lg:block"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: organicEase }}
      >
        <Image
          src="/images/arborisis/hero-living-planet.webp"
          alt="Planète arborisienne parcourue par un réseau vivant"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center opacity-75"
        />
        <div className="absolute inset-0 bg-bark-950/30" />
        <motion.div
          className="absolute inset-x-12 bottom-14 mycelium-panel p-8 backdrop-blur-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55, ease: organicEase }}
        >
          <div className="mycelium-rule mb-6 w-24" aria-hidden="true" />
          <p className="section-kicker">Civilisation organique persistante</p>
          <h2 className="display mt-3 text-5xl text-canopy-50">Arborisis</h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-canopy-100/60">
            Reliez vos mondes, cultivez leurs ressources et faites évoluer un empire{' '}
            <span className="italic text-canopy-300">vivant</span> à travers la Convergence.
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-xl flex-col justify-center px-5 py-12 sm:px-12 lg:px-16"
        initial="hidden"
        animate="visible"
        variants={staggerChildren(0.08)}
      >
        {/* Title */}
        <motion.div className="mb-8 text-left" variants={fadeUp}>
          <Link href="/" className="section-kicker">
            Arborisis
          </Link>
          <h1 className="mt-4 text-4xl text-canopy-50 sm:text-5xl">
            {isRegister ? (
              <>
                Créer votre <span className="italic text-canopy-300">civilisation</span>
              </>
            ) : (
              'Connexion'
            )}
          </h1>
          <p className="mt-3 text-sm text-canopy-100/50">
            {isRegister
              ? 'Faites germer votre premier monde.'
              : 'Reprenez le contrôle de votre empire.'}
          </p>
        </motion.div>

        {/* Glass card form */}
        <motion.div className="mycelium-panel space-y-5 p-6 sm:p-8" variants={softScale}>
          <AnimatePresence mode="wait">
            {totpPending ? (
              <motion.form
                key="totp"
                onSubmit={onSubmit2fa}
                className="space-y-5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.28, ease: organicEase }}
              >
                <div className="flex flex-col items-center gap-3 pb-2">
                  <FiShield className="h-12 w-12 text-canopy-400" aria-hidden="true" />
                  <p className="text-base font-medium text-canopy-300">Double authentification</p>
                  <p className="text-sm text-canopy-100/55 text-center max-w-xs">
                    Entrez le code à 6 chiffres de votre application d'authentification.
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="totp">
                    Code de vérification
                  </label>
                  <input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    className="input text-center text-xl tracking-[0.5em] font-mono"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoFocus
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
                  disabled={loading || totpCode.length !== 6}
                >
                  {loading ? 'Vérification…' : 'Vérifier'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTotpPending(null);
                    setTotpCode('');
                    setError(undefined);
                  }}
                  className="w-full text-xs text-canopy-100/40 hover:text-canopy-100/70 transition-colors"
                >
                  Retour
                </button>
              </motion.form>
            ) : pendingEmail ? (
              <motion.div
                key="pending-email"
                className="flex flex-col items-center justify-center py-8 text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.32, ease: organicEase }}
              >
                <FiMail className="h-16 w-16 text-canopy-400" aria-hidden="true" />
                <p className="mt-4 text-lg font-medium text-canopy-300">Vérifiez votre email</p>
                <p className="mt-2 text-sm text-canopy-100/60 max-w-xs">
                  Un lien d'activation a été envoyé à{' '}
                  <span className="text-canopy-300 font-medium">{pendingEmail}</span>.<br />
                  Cliquez-le pour activer votre colonie.
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown}
                  className="mt-5 text-xs text-canopy-500 hover:text-canopy-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {resendCooldown ? (
                    <span className="inline-flex items-center gap-1">
                      Email renvoyé <FiCheck className="h-3 w-3 text-emerald-400" />
                    </span>
                  ) : (
                    "Renvoyer l'email"
                  )}
                </button>
              </motion.div>
            ) : success ? (
              <motion.div
                key="success"
                className="flex flex-col items-center justify-center py-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.32, ease: organicEase }}
              >
                <FiCheckCircle className="h-16 w-16 text-canopy-400" aria-hidden="true" />
                <p className="mt-4 text-lg font-medium text-canopy-300">Connexion réussie !</p>
                <p className="mt-1 text-sm text-canopy-100/50">Redirection...</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={onSubmit}
                className="space-y-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {/* Email field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12, ease: organicEase }}
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

                {/* Race selector (register only) */}
                <AnimatePresence>
                  {isRegister && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="label">Race</label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {Object.values(RACES).filter((cfg) => cfg.playable).map((cfg) => (
                          <button
                            key={cfg.type}
                            type="button"
                            onClick={() => setRace(cfg.type)}
                            className={`rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                              race === cfg.type
                                ? 'border-canopy-500 bg-canopy-500/20 text-canopy-100'
                                : 'border-canopy-700/20 bg-bark-900/50 text-canopy-100/70 hover:border-canopy-500/50'
                            }`}
                          >
                            <span className="block font-semibold">{cfg.name}</span>
                            <span className="block text-[10px] leading-tight opacity-80">
                              {cfg.description.slice(0, 48)}…
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Universe selector (register only) */}
                <AnimatePresence>
                  {isRegister && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="label" htmlFor="universe">
                        Univers
                      </label>
                      <select
                        id="universe"
                        required
                        disabled={universesLoading || universes.length === 0}
                        className="input transition-all duration-300 focus:shadow-[0_0_20px_rgba(22,191,108,0.3)] focus:ring-2 focus:ring-canopy-500/50"
                        value={universeId}
                        onChange={(e) => setUniverseId(e.target.value)}
                      >
                        {universes.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18, ease: organicEase }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0" htmlFor="password">
                      Mot de passe
                    </label>
                    {!isRegister && (
                      <Link
                        href="/forgot-password"
                        className="text-[11px] text-canopy-400/70 hover:text-canopy-300 transition-colors"
                        tabIndex={-1}
                      >
                        Mot de passe oublié ?
                      </Link>
                    )}
                  </div>
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
                  transition={{ delay: 0.24, ease: organicEase }}
                >
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
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Link to other mode */}
        <motion.p className="mt-6 text-center text-sm text-canopy-100/50" variants={fadeUp}>
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
