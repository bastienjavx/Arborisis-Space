'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useMe, usePublicProfile, useUpdateProfile } from '@/lib/queries';
import { PageHeader } from '@/components/PageHeader';
import { AnimatedButton } from '@/components/AnimatedButton';
import { ProceduralAvatar } from '@/components/ProceduralAvatar';
import { RACES } from '@arborisis/shared';
import { FiCheck, FiEye, FiGlobe, FiInfo, FiRefreshCw, FiUser } from 'react-icons/fi';

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
