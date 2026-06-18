'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/queries';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

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
      router.replace('/play');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-canopy-300">🌿 Arborisis</h1>
          <p className="mt-1 text-sm text-canopy-100/50">
            {isRegister
              ? 'Faites germer votre civilisation.'
              : 'Reprenez le contrôle de votre empire.'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {isRegister && (
            <div>
              <label className="label" htmlFor="username">
                Nom d’explorateur
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isRegister && (
              <p className="mt-1 text-[11px] text-canopy-100/40">Au moins 10 caractères.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '…' : isRegister ? 'Faire germer' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-canopy-100/50">
          {isRegister ? (
            <>
              Déjà une colonie ?{' '}
              <Link href="/login" className="text-canopy-300 hover:underline">
                Se connecter
              </Link>
            </>
          ) : (
            <>
              Pas encore de colonie ?{' '}
              <Link href="/register" className="text-canopy-300 hover:underline">
                Créer un compte
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
