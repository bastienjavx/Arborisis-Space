'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChatScope, UserRole, type ChatContactView } from '@arborisis/shared';
import {
  FiGlobe,
  FiLock,
  FiMessageCircle,
  FiSearch,
  FiSend,
  FiShield,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi';
import { PageHeader } from '@/components/PageHeader';
import {
  useChatContacts,
  useChatMessages,
  useDeleteChatMessage,
  useMe,
  useMyAlliance,
  useSendChatMessage,
} from '@/lib/queries';

const TABS = [
  { scope: ChatScope.GLOBAL, label: 'Global', icon: FiGlobe },
  { scope: ChatScope.ALLIANCE, label: 'Alliance', icon: FiUsers },
  { scope: ChatScope.PRIVATE, label: 'Privé', icon: FiLock },
] as const;

function ContactButton({
  contact,
  active,
  onClick,
}: {
  contact: ChatContactView;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
        active
          ? 'border-canopy-300/30 bg-canopy-500/10'
          : 'border-transparent hover:border-canopy-700/20 hover:bg-canopy-700/10'
      }`}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-semibold"
        style={{ borderColor: `${contact.bannerColor ?? '#22c55e'}66` }}
      >
        {(contact.displayName || contact.username).slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-canopy-100/80">
          {contact.displayName || contact.username}
        </span>
        <span className="block truncate text-[10px] text-canopy-100/35">@{contact.username}</span>
      </span>
    </button>
  );
}

export default function ChatPage() {
  const { data: me } = useMe();
  const { data: alliance } = useMyAlliance();
  const [scope, setScope] = useState<ChatScope>(ChatScope.GLOBAL);
  const [peer, setPeer] = useState<ChatContactView | null>(null);
  const [search, setSearch] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data: contacts = [] } = useChatContacts(search);
  const { data: messages = [], isLoading } = useChatMessages(scope, peer?.id);
  const send = useSendChatMessage(scope, peer?.id);
  const remove = useDeleteChatMessage(scope, peer?.id);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, scope, peer?.id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value || (scope === ChatScope.PRIVATE && !peer)) return;
    setError(null);
    try {
      await send.mutateAsync({
        scope,
        content: value,
        recipientId: scope === ChatScope.PRIVATE ? peer?.id : undefined,
      });
      setContent('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Envoi impossible.');
    }
  }

  const canModerate = me?.role === UserRole.ADMIN || me?.role === UserRole.MODERATOR;
  const allianceUnavailable = scope === ChatScope.ALLIANCE && !alliance;
  const privateUnavailable = scope === ChatScope.PRIVATE && !peer;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canaux mycéliens"
        subtitle="Conversations globales, communications d’alliance et transmissions privées."
      />

      <section className="overflow-hidden rounded-2xl border border-canopy-700/20 bg-bark-900/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-canopy-700/15 p-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                type="button"
                key={tab.scope}
                onClick={() => setScope(tab.scope)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                  scope === tab.scope
                    ? 'border-canopy-300/30 bg-canopy-500/10 text-canopy-50'
                    : 'border-transparent text-canopy-100/45 hover:bg-canopy-700/10 hover:text-canopy-100/75'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
          {canModerate && (
            <Link
              href="/admin"
              className="ml-auto flex items-center gap-2 rounded-xl border border-amber-400/20 px-4 py-2.5 text-sm text-amber-200/70 transition hover:bg-amber-400/10"
            >
              <FiShield className="h-4 w-4" aria-hidden="true" />
              Modération
            </Link>
          )}
        </div>

        <div className="grid min-h-[34rem] md:grid-cols-[15rem_minmax(0,1fr)]">
          <aside
            className={`border-b border-canopy-700/15 p-3 md:border-b-0 md:border-r ${scope === ChatScope.PRIVATE ? 'block' : 'hidden md:block'}`}
          >
            {scope === ChatScope.PRIVATE ? (
              <>
                <label className="relative block">
                  <FiSearch className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-canopy-100/30" />
                  <input
                    className="input pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Chercher un joueur"
                    aria-label="Chercher un joueur"
                  />
                </label>
                <div className="mt-3 max-h-52 space-y-1 overflow-y-auto md:max-h-[29rem]">
                  {contacts.map((contact) => (
                    <ContactButton
                      key={contact.id}
                      contact={contact}
                      active={peer?.id === contact.id}
                      onClick={() => setPeer(contact)}
                    />
                  ))}
                  {!contacts.length && (
                    <p className="px-3 py-6 text-center text-xs text-canopy-100/35">
                      Aucun joueur trouvé.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="p-3 text-sm leading-6 text-canopy-100/40">
                <FiMessageCircle className="mb-4 h-6 w-6 text-canopy-300/55" aria-hidden="true" />
                {scope === ChatScope.GLOBAL
                  ? 'Le canal global rassemble tous les stratèges de cet univers.'
                  : 'Ce canal est visible uniquement par les membres de votre alliance.'}
              </div>
            )}
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="border-b border-canopy-700/10 px-5 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-canopy-100/35">
                {scope === ChatScope.GLOBAL && 'Canal de l’univers'}
                {scope === ChatScope.ALLIANCE &&
                  (alliance ? `[${alliance.tag}] ${alliance.name}` : 'Alliance requise')}
                {scope === ChatScope.PRIVATE &&
                  (peer
                    ? `Transmission avec ${peer.displayName || peer.username}`
                    : 'Choisissez un joueur')}
              </p>
            </div>

            <div className="h-[27rem] flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
              {isLoading && <p className="text-sm text-canopy-100/35">Synchronisation…</p>}
              {allianceUnavailable && (
                <p className="rounded-xl border border-canopy-700/20 p-5 text-sm text-canopy-100/50">
                  Rejoignez une{' '}
                  <Link href="/alliance" className="text-canopy-300">
                    alliance
                  </Link>{' '}
                  pour accéder à ce canal.
                </p>
              )}
              {privateUnavailable && (
                <p className="py-16 text-center text-sm text-canopy-100/35">
                  Sélectionnez un joueur dans la liste pour ouvrir une conversation.
                </p>
              )}
              {!isLoading && !allianceUnavailable && !privateUnavailable && !messages.length && (
                <p className="py-16 text-center text-sm text-canopy-100/35">
                  Aucun message. Initiez la conversation.
                </p>
              )}
              {messages.map((message) => {
                const mine = message.author.id === me?.id;
                return (
                  <article
                    key={message.id}
                    className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[70%] ${mine ? 'text-right' : ''}`}>
                      <div className="mb-1 flex items-center gap-2 text-[11px] text-canopy-100/35">
                        <span
                          className={
                            message.author.role !== UserRole.PLAYER ? 'text-amber-200/70' : ''
                          }
                        >
                          {message.author.displayName || message.author.username}
                        </span>
                        <time dateTime={message.createdAt}>
                          {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                      <div
                        className={`rounded-2xl border px-4 py-3 text-left text-sm leading-6 ${
                          message.deletedAt
                            ? 'border-canopy-700/10 text-canopy-100/25 italic'
                            : mine
                              ? 'border-canopy-300/25 bg-canopy-500/10 text-canopy-50/90'
                              : 'border-canopy-700/20 bg-bark-950/55 text-canopy-100/75'
                        }`}
                      >
                        {message.content}
                      </div>
                      {!message.deletedAt && (mine || canModerate) && (
                        <button
                          type="button"
                          onClick={() => remove.mutate({ id: message.id })}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-red-300/0 transition group-hover:text-red-300/55 focus:text-red-300/70"
                          aria-label="Supprimer le message"
                        >
                          <FiTrash2 className="h-3 w-3" aria-hidden="true" />
                          Supprimer
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              <div ref={endRef} />
            </div>

            <form onSubmit={submit} className="border-t border-canopy-700/15 p-3 sm:p-4">
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={1000}
                  disabled={allianceUnavailable || privateUnavailable || send.isPending}
                  placeholder="Transmettre un message…"
                  aria-label="Message"
                />
                <button
                  type="submit"
                  disabled={
                    !content.trim() || allianceUnavailable || privateUnavailable || send.isPending
                  }
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-canopy-300/30 bg-canopy-500/10 text-canopy-200 transition hover:bg-canopy-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Envoyer"
                >
                  <FiSend className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
