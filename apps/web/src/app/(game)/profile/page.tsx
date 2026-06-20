'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useMe, usePublicProfile, useUpdateProfile } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AnimatedButton } from '@/components/AnimatedButton';
import { ProceduralAvatar } from '@/components/ProceduralAvatar';
import { RACES } from '@arborisis/shared';
import {
  FiCheck,
  FiEye,
  FiGlobe,
  FiInfo,
  FiRefreshCw,
  FiShield,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/queries';

function AvatarPreview({ seed, color }: { seed: string; color: string }) {
  return (
    <span
      className="relative block h-28 w-28 overflow-hidden rounded-full border-2 bg-bark-950 shadow-2xl"
      style={{ borderColor: color }}
    >
      <ProceduralAvatar seed={seed} color={color} />
    </span>
  );
}

const BANNER_COLORS = ['#315d32', '#4d365f', '#603d47', '#7a5626', '#40524c', '#1f6659', '#61733c'];

type TotpSetupState = null | { secret: string; qrCodeDataUrl: string };

function TwoFactorSection({ totpEnabled }: { totpEnabled: boolean }) {
  const qc = useQueryClient();
  const [setupState, setSetupState] = useState<TotpSetupState>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  async function startSetup() {
    setLoading(true);
    setError(undefined);
    try {
      const res = await api.setup2fa();
      setSetupState({ secret: res.secret, qrCodeDataUrl: res.qrCodeDataUrl });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmEnable() {
    if (!setupState || code.length !== 6) return;
    setLoading(true);
    setError(undefined);
    try {
      await api.enable2fa(code);
      await qc.invalidateQueries({ queryKey: keys.me });
      setSetupState(null);
      setCode('');
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code invalide.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    if (code.length !== 6) return;
    setLoading(true);
    setError(undefined);
    try {
      await api.disable2fa(code);
      await qc.invalidateQueries({ queryKey: keys.me });
      setCode('');
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code invalide.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mycelium-panel p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3 border-b border-canopy-700/15 pb-4">
        <FiShield className="h-5 w-5 text-canopy-400" aria-hidden="true" />
        <h2 className="section-title">Double authentification (2FA)</h2>
        {totpEnabled && (
          <span className="ml-auto text-xs bg-canopy-500/20 text-canopy-300 px-2 py-0.5 rounded-full border border-canopy-500/30">
            Activée
          </span>
        )}
      </div>

      {done && (
        <p className="text-sm text-canopy-300 flex items-center gap-2">
          <FiCheck className="h-4 w-4" /> Modification enregistrée.
        </p>
      )}

      {!totpEnabled && !setupState && (
        <div className="space-y-3">
          <p className="text-sm text-canopy-100/55">
            Protégez votre compte en ajoutant une vérification TOTP (Google Authenticator, Aegis,
            etc.).
          </p>
          <AnimatedButton onClick={startSetup} loading={loading} disabled={loading}>
            Activer la 2FA
          </AnimatedButton>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {!totpEnabled && setupState && (
        <div className="space-y-4">
          <p className="text-sm text-canopy-100/55">
            Scannez ce QR code avec votre application d'authentification, puis entrez le code
            généré.
          </p>
          <div className="flex justify-center">
            <div className="rounded-xl border border-canopy-700/20 bg-white p-3 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setupState.qrCodeDataUrl} alt="QR Code 2FA" className="h-44 w-44" />
            </div>
          </div>
          <div className="rounded-lg bg-bark-900/60 border border-canopy-700/15 p-3">
            <p className="text-[11px] text-canopy-100/40 mb-1">Clé manuelle</p>
            <code className="text-xs text-canopy-300 break-all font-mono">{setupState.secret}</code>
          </div>
          <div>
            <label className="label" htmlFor="totp-enable">
              Code de vérification
            </label>
            <input
              id="totp-enable"
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="input text-center text-xl tracking-[0.5em] font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <AnimatedButton
              onClick={confirmEnable}
              loading={loading}
              disabled={loading || code.length !== 6}
            >
              Confirmer
            </AnimatedButton>
            <button
              type="button"
              onClick={() => {
                setSetupState(null);
                setCode('');
                setError(undefined);
              }}
              className="text-sm text-canopy-100/40 hover:text-canopy-100/70 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {totpEnabled && (
        <div className="space-y-4">
          <p className="text-sm text-canopy-100/55">
            La double authentification est activée sur votre compte. Pour la désactiver, entrez un
            code de votre application.
          </p>
          <div>
            <label className="label" htmlFor="totp-disable">
              Code de vérification
            </label>
            <input
              id="totp-disable"
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="input text-center text-xl tracking-[0.5em] font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleDisable}
            disabled={loading || code.length !== 6}
            className="flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            <FiX className="h-4 w-4" /> Désactiver la 2FA
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { data: user } = useMe();
  const { data: publicProfile } = usePublicProfile(user?.id);
  const update = useUpdateProfile();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [bannerColor, setBannerColor] = useState('#22c55e');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '');
      setBio(publicProfile?.bio ?? '');
      setBannerColor(user.bannerColor ?? RACES[user.race].defaultColor);
      setAvatarSeed(user.avatarSeed ?? user.username);
    }
  }, [user, publicProfile?.bio]);

  if (!user) return null;
  const raceConfig = RACES[user.race];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    await update.mutateAsync({
      displayName: displayName || undefined,
      bio: bio || undefined,
      bannerColor: bannerColor || undefined,
      avatarSeed: avatarSeed || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Profil" subtitle="Personnalisez l’identité publique de votre empire." />

      <TwoFactorSection totpEnabled={user.totpEnabled ?? false} />

      <div className="grid gap-5 xl:grid-cols-[minmax(28rem,0.85fr)_minmax(30rem,1.1fr)]">
        <form onSubmit={onSubmit} className="mycelium-panel space-y-5 p-5 sm:p-6">
          <h2 className="section-title border-b border-canopy-700/15 pb-4">
            Informations publiques
          </h2>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label mb-0" htmlFor="displayName">
                Nom d’affichage
              </label>
              <span className="text-[10px] text-canopy-100/30">{displayName.length}/30</span>
            </div>
            <input
              id="displayName"
              type="text"
              className="input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={user.username}
              maxLength={30}
            />
          </div>

          <div>
            <label className="label" htmlFor="username">
              Nom d’utilisateur
            </label>
            <input id="username" className="input opacity-55" value={user.username} disabled />
            <p className="mt-1.5 text-[10px] text-canopy-100/30">Ne peut pas être modifié.</p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label mb-0" htmlFor="bio">
                Biographie
              </label>
              <span className="text-[10px] text-canopy-100/30">{bio.length}/500</span>
            </div>
            <textarea
              id="bio"
              className="input min-h-[110px] resize-none"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Racontez l’histoire de votre empire..."
              maxLength={500}
            />
          </div>

          <fieldset>
            <legend className="label">Couleur de bannière</legend>
            <div className="flex flex-wrap gap-3">
              {BANNER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setBannerColor(color)}
                  className="grid h-10 w-10 place-items-center rounded-full border-2 transition hover:scale-105"
                  style={{
                    backgroundColor: color,
                    borderColor: bannerColor === color ? '#d8f9e6' : `${color}88`,
                  }}
                  aria-label={`Utiliser la couleur ${color}`}
                  aria-pressed={bannerColor === color}
                >
                  {bannerColor === color && (
                    <FiCheck className="h-4 w-4 text-canopy-50" aria-hidden="true" />
                  )}
                </button>
              ))}
              <label
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-canopy-700/25 text-canopy-100/45"
                title="Couleur personnalisée"
              >
                <input
                  id="bannerColor"
                  type="color"
                  className="sr-only"
                  value={bannerColor}
                  onChange={(event) => setBannerColor(event.target.value)}
                />
                <FiEye className="h-4 w-4" aria-hidden="true" />
              </label>
            </div>
          </fieldset>

          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <label className="label mb-0" htmlFor="avatarSeed">
                Graine d’avatar
              </label>
              <FiInfo className="h-3.5 w-3.5 text-canopy-100/30" aria-hidden="true" />
            </div>
            <div className="flex gap-2">
              <input
                id="avatarSeed"
                type="text"
                className="input"
                value={avatarSeed}
                onChange={(event) => setAvatarSeed(event.target.value)}
                placeholder={user.username}
                maxLength={64}
              />
              <button
                type="button"
                onClick={() => setAvatarSeed(`mycelium-${Math.floor(Math.random() * 10000)}`)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-canopy-700/25 text-canopy-100/50 transition hover:bg-canopy-500/10 hover:text-canopy-100"
                aria-label="Générer une nouvelle graine"
              >
                <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-canopy-100/30">
              Modifie l’apparence de votre avatar à partir d’une graine unique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-canopy-700/15 pt-5">
            <AnimatedButton type="submit" disabled={update.isPending} loading={update.isPending}>
              Enregistrer
            </AnimatedButton>
            {saved && (
              <span className="inline-flex items-center gap-2 text-sm text-canopy-300/75">
                <FiCheck className="h-4 w-4" aria-hidden="true" /> Modifications enregistrées
              </span>
            )}
          </div>
        </form>

        <aside className="mycelium-panel h-fit overflow-hidden">
          <div className="border-b border-canopy-700/15 px-5 py-4">
            <h2 className="section-title">Aperçu en direct</h2>
          </div>
          <div className="p-5">
            <div className="overflow-hidden rounded-xl border border-canopy-700/20 bg-bark-950/55">
              <div className="relative h-36 overflow-hidden">
                <Image
                  src="/images/arborisis/feature-galaxy.webp"
                  alt=""
                  fill
                  sizes="40rem"
                  className="object-cover opacity-65"
                />
                <div
                  className="absolute inset-0 opacity-35"
                  style={{ backgroundColor: bannerColor }}
                />
              </div>
              <div className="relative flex gap-5 px-5 pb-6 pt-5 sm:px-7">
                <div className="-mt-16 shrink-0">
                  <AvatarPreview seed={avatarSeed || user.username} color={bannerColor} />
                </div>
                <div className="min-w-0 pt-1">
                  <h3 className="truncate font-display text-3xl text-canopy-50/92">
                    {displayName || user.username}
                  </h3>
                  <p className="mt-1 text-sm text-canopy-300/65">@{user.username}</p>
                  {user.title ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-spore-300/70">
                      {user.title}
                    </p>
                  ) : null}
                  <p className="mt-4 text-sm leading-6 text-canopy-100/58">
                    {bio ||
                      `Une civilisation ${raceConfig.name.toLowerCase()} en pleine croissance.`}
                  </p>
                </div>
              </div>
            </div>

            <section className="mt-7">
              <h3 className="section-title">Où votre profil apparaît</h3>
              <p className="mt-1 text-xs text-canopy-100/35">
                Votre identité publique sera visible par les autres empires dans :
              </p>
              <ul className="mt-4 space-y-3 text-sm text-canopy-100/55">
                <li className="flex items-center gap-3">
                  <FiGlobe className="h-4 w-4 text-canopy-300/55" aria-hidden="true" /> Le
                  classement galactique
                </li>
                <li className="flex items-center gap-3">
                  <FiUser className="h-4 w-4 text-canopy-300/55" aria-hidden="true" /> Les alliances
                  et candidatures
                </li>
                <li className="flex items-center gap-3">
                  <FiEye className="h-4 w-4 text-canopy-300/55" aria-hidden="true" /> Les
                  interactions diplomatiques
                </li>
              </ul>
            </section>

            <div className="mt-7 flex gap-3 rounded-xl border border-canopy-700/15 bg-canopy-500/[0.025] p-4">
              <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-canopy-300/55" aria-hidden="true" />
              <p className="text-xs leading-5 text-canopy-100/40">
                Choisissez une graine qui vous représente. Vous pouvez en générer une aléatoire ou
                en saisir une personnalisée.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
