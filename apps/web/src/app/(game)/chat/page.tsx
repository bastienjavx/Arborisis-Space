'use client';

import { useMemo, useRef, useState } from 'react';
import { FiGlobe, FiMessageSquare, FiSend, FiUser, FiUsers } from 'react-icons/fi';
import { ChatScope } from '@arborisis/shared';
import { PageHeader } from '@/components/PageHeader';
import { VirtualList } from '@/components/VirtualList';
import { useChatContacts, useChatMessages, useMe, useSendChatMessage } from '@/lib/queries';

export default function ChatPage() {
  const { data: me } = useMe();
  const [scope, setScope] = useState<ChatScope>(ChatScope.GLOBAL);
  const [peerId, setPeerId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const { data: contacts } = useChatContacts(search);
  const { data: messages, isLoading: loadingMessages } = useChatMessages(scope, peerId);
  const send = useSendChatMessage(scope, peerId);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleMessages = useMemo(() => {
    if (!messages) return [];
    return scope === ChatScope.PRIVATE && peerId
      ? messages.filter((m) => m.recipientId === peerId || m.author.id === peerId)
      : messages;
  }, [messages, scope, peerId]);

  const activeScopeLabel =
    scope === ChatScope.GLOBAL ? 'Global' : scope === ChatScope.ALLIANCE ? 'Alliance' : 'Privé';

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = message.trim();
    if (!body) return;
    send.mutate(
      {
        scope,
        content: body,
        recipientId: scope === ChatScope.PRIVATE ? peerId : undefined,
      },
      {
        onSuccess: () => {
          setMessage('');
          inputRef.current?.focus();
        },
      },
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-5 md:flex-row">
      <aside className="mycelium-panel flex w-full flex-col md:w-72">
        <div className="border-b border-canopy-700/15 p-4">
          <PageHeader title="Canaux" subtitle="Discussions" />
        </div>
        <div className="flex gap-1 border-b border-canopy-700/15 p-2">
          {[
            { scope: ChatScope.GLOBAL, icon: FiGlobe, label: 'Global' },
            { scope: ChatScope.ALLIANCE, icon: FiUsers, label: 'Alliance' },
            { scope: ChatScope.PRIVATE, icon: FiMessageSquare, label: 'Privé' },
          ].map(({ scope: s, icon: Icon, label }) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setScope(s);
                if (s !== ChatScope.PRIVATE) setPeerId(undefined);
              }}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs transition ${
                scope === s
                  ? 'bg-canopy-500/15 text-canopy-100'
                  : 'text-canopy-100/40 hover:bg-canopy-500/[0.06] hover:text-canopy-100/70'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {scope === ChatScope.PRIVATE && (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un contact…"
              className="m-3 rounded-lg border border-canopy-700/20 bg-bark-950/50 px-3 py-2 text-xs text-canopy-100 placeholder:text-canopy-100/30"
            />
            <VirtualList
              items={contacts ?? []}
              estimateSize={56}
              className="flex-1"
              keyExtractor={(c) => c.id}
              renderItem={(contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setPeerId(contact.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    peerId === contact.id ? 'bg-canopy-500/[0.08]' : 'hover:bg-canopy-500/[0.04]'
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-canopy-700/20 bg-bark-950/50 text-canopy-300/60">
                    <FiUser className="h-4 w-4" />
                  </span>
                  <span className="truncate text-sm text-canopy-100/75">{contact.username}</span>
                </button>
              )}
              empty={
                <p className="px-4 py-6 text-center text-xs text-canopy-100/40">
                  Aucun contact trouvé.
                </p>
              }
            />
          </>
        )}
      </aside>

      <div className="mycelium-panel flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-canopy-700/15 px-5 py-4">
          <h2 className="font-display text-lg text-canopy-100/90">{activeScopeLabel}</h2>
          <p className="text-[10px] text-canopy-100/35">
            {scope === ChatScope.PRIVATE && peerId
              ? `Conversation avec ${contacts?.find((c) => c.id === peerId)?.username ?? 'un joueur'}`
              : 'Messages temps réel via le mycélium'}
          </p>
        </div>

        <VirtualList
          items={visibleMessages}
          estimateSize={72}
          loading={loadingMessages}
          className="flex-1"
          keyExtractor={(m) => m.id}
          renderItem={(m) => {
            const isMe = m.author.id === me?.id;
            return (
              <div className={`px-5 py-3 ${isMe ? 'bg-canopy-500/[0.03]' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-canopy-700/20 bg-bark-950/50 text-[10px] font-bold text-canopy-300/70">
                    {m.author.username.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-canopy-100/85">
                        {m.author.username}
                      </span>
                      <span className="text-[10px] text-canopy-100/30">
                        {new Date(m.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm text-canopy-100/70">{m.content}</p>
                  </div>
                </div>
              </div>
            );
          }}
          empty={
            <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
              <FiMessageSquare
                className="mx-auto h-10 w-10 text-canopy-300/35"
                aria-hidden="true"
              />
              <p className="mt-4 text-sm text-canopy-100/45">Aucun message dans ce canal.</p>
            </div>
          }
        />

        <form onSubmit={handleSend} className="flex gap-2 border-t border-canopy-700/15 p-3">
          <input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Écrire un message…"
            disabled={scope === ChatScope.PRIVATE && !peerId}
            className="flex-1 rounded-lg border border-canopy-700/20 bg-bark-950/50 px-3 py-2 text-sm text-canopy-100 placeholder:text-canopy-100/30 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!message.trim() || send.isPending || (scope === ChatScope.PRIVATE && !peerId)}
            className="btn-primary px-4 disabled:opacity-40"
          >
            <FiSend className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
