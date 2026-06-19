'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModerationActionType, UserRole, type AdminUserView } from '@arborisis/shared';
import { FiClock, FiSearch, FiShield, FiShieldOff, FiUserCheck, FiUsers } from 'react-icons/fi';
import { PageHeader } from '@/components/PageHeader';
import {
  useAdminUsers,
  useChangeUserRole,
  useMe,
  useModerateUser,
  useModerationActions,
} from '@/lib/queries';

const ACTION_LABELS: Record<ModerationActionType, string> = {
  [ModerationActionType.DELETE_MESSAGE]: 'Message supprimé',
  [ModerationActionType.MUTE]: 'Joueur rendu muet',
  [ModerationActionType.UNMUTE]: 'Sanction levée',
  [ModerationActionType.ROLE_CHANGE]: 'Rôle modifié',
};

function UserRow({ user, currentRole }: { user: AdminUserView; currentRole: UserRole }) {
  const changeRole = useChangeUserRole();
  const moderate = useModerateUser();
  const isMuted = !!user.mutedUntil && new Date(user.mutedUntil) > new Date();
  const canModerate =
    user.role !== UserRole.ADMIN &&
    (currentRole === UserRole.ADMIN || user.role === UserRole.PLAYER);

  function toggleMute() {
    const until = isMuted ? null : new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString();
    moderate.mutate({
      id: user.id,
      body: {
        mutedUntil: until,
        reason: isMuted ? 'Levée depuis la console' : 'Sanction de 24 heures depuis la console',
      },
    });
  }

  return (
    <tr className="border-b border-canopy-700/10 last:border-0">
      <td className="px-4 py-4">
        <p className="text-sm text-canopy-100/80">{user.displayName || user.username}</p>
        <p className="text-[11px] text-canopy-100/35">
          @{user.username} · {user.email}
        </p>
      </td>
      <td className="px-4 py-4">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${
            user.role === UserRole.ADMIN
              ? 'border-amber-400/25 text-amber-200/70'
              : user.role === UserRole.MODERATOR
                ? 'border-violet-400/25 text-violet-200/70'
                : 'border-canopy-700/20 text-canopy-100/40'
          }`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-4 py-4 text-xs text-canopy-100/45">
        {isMuted ? `Muet jusqu’au ${new Date(user.mutedUntil!).toLocaleString('fr-FR')}` : 'Actif'}
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap justify-end gap-2">
          {currentRole === UserRole.ADMIN && user.role !== UserRole.ADMIN && (
            <button
              type="button"
              onClick={() =>
                changeRole.mutate({
                  id: user.id,
                  body: {
                    role: user.role === UserRole.MODERATOR ? UserRole.PLAYER : UserRole.MODERATOR,
                  },
                })
              }
              disabled={changeRole.isPending}
              className="rounded-lg border border-violet-400/20 px-3 py-2 text-xs text-violet-200/65 transition hover:bg-violet-400/10 disabled:opacity-40"
            >
              {user.role === UserRole.MODERATOR ? 'Retirer modo' : 'Nommer modo'}
            </button>
          )}
          {canModerate && (
            <button
              type="button"
              onClick={toggleMute}
              disabled={moderate.isPending}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition disabled:opacity-40 ${
                isMuted
                  ? 'border-canopy-400/20 text-canopy-200/65 hover:bg-canopy-400/10'
                  : 'border-red-400/20 text-red-200/65 hover:bg-red-400/10'
              }`}
            >
              {isMuted ? <FiShieldOff aria-hidden="true" /> : <FiShield aria-hidden="true" />}
              {isMuted ? 'Lever' : 'Rendre muet 24 h'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();
  const [search, setSearch] = useState('');
  const authorized = me?.role === UserRole.ADMIN || me?.role === UserRole.MODERATOR;
  const { data: users = [], isLoading } = useAdminUsers(search, authorized);
  const { data: actions = [] } = useModerationActions(authorized);
  useEffect(() => {
    if (!meLoading && !authorized) router.replace('/play');
  }, [authorized, meLoading, router]);

  if (meLoading) return <p className="text-canopy-100/40">Vérification des permissions…</p>;
  if (!me || !authorized) return null;

  const moderators = users.filter(
    (user) => user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR,
  ).length;
  const muted = users.filter(
    (user) => user.mutedUntil && new Date(user.mutedUntil) > new Date(),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Console de modération"
        subtitle="Gestion des joueurs, des modérateurs et traçabilité des interventions."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Joueurs visibles', value: users.length, icon: FiUsers },
          { label: 'Équipe de modération', value: moderators, icon: FiUserCheck },
          { label: 'Sanctions actives', value: muted, icon: FiShield },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-canopy-700/20 bg-bark-900/65 p-4">
            <Icon className="mb-3 h-5 w-5 text-canopy-300/60" aria-hidden="true" />
            <p className="font-display text-2xl text-canopy-50">{value}</p>
            <p className="text-xs text-canopy-100/40">{label}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-canopy-700/20 bg-bark-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-canopy-700/15 p-4">
          <div>
            <h2 className="font-display text-xl text-canopy-50">Utilisateurs</h2>
            <p className="text-xs text-canopy-100/35">
              {me.role === UserRole.ADMIN
                ? 'Vous pouvez nommer des modérateurs et appliquer des sanctions.'
                : 'Vous pouvez modérer les joueurs standards.'}
            </p>
          </div>
          <label className="relative block w-full sm:w-72">
            <FiSearch className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-canopy-100/30" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-9"
              placeholder="Nom, pseudo ou email"
              aria-label="Rechercher un utilisateur"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left">
            <thead className="border-b border-canopy-700/15 text-[10px] uppercase tracking-[0.14em] text-canopy-100/30">
              <tr>
                <th className="px-4 py-3 font-medium">Joueur</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">État</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} currentRole={me.role} />
              ))}
            </tbody>
          </table>
          {isLoading && <p className="p-5 text-sm text-canopy-100/35">Chargement…</p>}
          {!isLoading && !users.length && (
            <p className="p-5 text-sm text-canopy-100/35">Aucun utilisateur.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-canopy-700/20 bg-bark-900/70 p-5">
        <div className="mb-4 flex items-center gap-3">
          <FiClock className="h-5 w-5 text-canopy-300/60" aria-hidden="true" />
          <div>
            <h2 className="font-display text-xl text-canopy-50">Journal d’audit</h2>
            <p className="text-xs text-canopy-100/35">Les 100 dernières interventions.</p>
          </div>
        </div>
        <div className="space-y-2">
          {actions.map((action) => (
            <div
              key={action.id}
              className="grid gap-2 rounded-xl border border-canopy-700/10 bg-bark-950/35 px-4 py-3 text-xs sm:grid-cols-[11rem_1fr_auto] sm:items-center"
            >
              <span className="text-canopy-200/65">{ACTION_LABELS[action.action]}</span>
              <span className="text-canopy-100/45">
                {action.moderator.displayName || action.moderator.username}
                {action.target && ` → ${action.target.displayName || action.target.username}`}
                {action.reason && ` · ${action.reason}`}
              </span>
              <time className="text-canopy-100/25" dateTime={action.createdAt}>
                {new Date(action.createdAt).toLocaleString('fr-FR')}
              </time>
            </div>
          ))}
          {!actions.length && (
            <p className="py-5 text-sm text-canopy-100/35">Aucune intervention enregistrée.</p>
          )}
        </div>
      </section>
    </div>
  );
}
