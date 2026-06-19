'use client';

import { useEffect, useState } from 'react';
import { useMe, useUpdateProfile } from '@/lib/queries';
import { PageHeader } from '@/components/PageHeader';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedButton } from '@/components/AnimatedButton';
import { RACES } from '@arborisis/shared';

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function AvatarPreview({ seed, color }: { seed: string; color: string }) {
  const h = hashString(seed || 'arborisis');
  const cells = Array.from({ length: 25 }, (_, i) => ((h >> i) & 1) === 1);
  return (
    <div
      className="grid h-24 w-24 grid-cols-5 overflow-hidden rounded-xl border-2"
      style={{ borderColor: color }}
    >
      {cells.map((on, i) => (
        <div
          key={i}
          className="aspect-square"
          style={{ backgroundColor: on ? color : 'transparent' }}
        />
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { data: user } = useMe();
  const update = useUpdateProfile();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [bannerColor, setBannerColor] = useState('#22c55e');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '');
      setBio(''); // bio n'est pas dans AuthUser, on la laisse vide par défaut
      setBannerColor(user.bannerColor ?? RACES[user.race].defaultColor);
      setAvatarSeed(user.avatarSeed ?? user.username);
    }
  }, [user]);

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
    <div className="space-y-6">
      <PageHeader title="Profil" subtitle="Personnalisez votre identité galactique." />

      <AnimatedCard className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <AvatarPreview seed={avatarSeed || user.username} color={bannerColor} />
          <div>
            <h2 className="text-xl font-bold text-canopy-100">{displayName || user.username}</h2>
            <p className="text-sm text-canopy-100/60">
              {raceConfig.name} • {user.email}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="label" htmlFor="displayName">
              Nom affiché
            </label>
            <input
              id="displayName"
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={user.username}
              maxLength={30}
            />
          </div>

          <div>
            <label className="label" htmlFor="bio">
              Biographie
            </label>
            <textarea
              id="bio"
              className="input min-h-[100px] resize-none"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Racontez l'histoire de votre empire..."
              maxLength={500}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="bannerColor">
                Couleur de bannière
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="bannerColor"
                  type="color"
                  className="h-10 w-16 cursor-pointer rounded bg-transparent"
                  value={bannerColor}
                  onChange={(e) => setBannerColor(e.target.value)}
                />
                <input
                  type="text"
                  className="input flex-1"
                  value={bannerColor}
                  onChange={(e) => setBannerColor(e.target.value)}
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="avatarSeed">
                Graine d'avatar
              </label>
              <input
                id="avatarSeed"
                type="text"
                className="input"
                value={avatarSeed}
                onChange={(e) => setAvatarSeed(e.target.value)}
                placeholder={user.username}
                maxLength={64}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <AnimatedButton type="submit" disabled={update.isPending}>
              {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </AnimatedButton>
            {saved && <span className="text-sm text-canopy-400">Profil mis à jour.</span>}
          </div>
        </form>
      </AnimatedCard>
    </div>
  );
}
