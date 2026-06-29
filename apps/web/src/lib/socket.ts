'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { keys } from './queries';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_SOCKET_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

export type ServerEvent =
  | { name: 'chat:message'; payload: { scope: string; peerId?: string | null } }
  | { name: 'notification:new'; payload: Record<string, never> }
  | { name: 'planet:updated'; payload: { planetId: string } }
  | { name: 'market:updated'; payload: { itemKey: string } }
  | { name: 'research:completed'; payload: Record<string, never> }
  | { name: 'construction:completed'; payload: { planetId: string } }
  | { name: 'ship:produced'; payload: { planetId: string } }
  | { name: 'mission:updated'; payload: { kind: string } }
  | { name: 'transfer:completed'; payload: Record<string, never> }
  | { name: 'leaderboard:updated'; payload: Record<string, never> }
  | { name: 'reports:updated'; payload: Record<string, never> }
  | { name: 'activeEvent:updated'; payload: Record<string, never> }
  | { name: 'season:updated'; payload: Record<string, never> };

let globalSocket: Socket | null = null;

function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (globalSocket?.connected) return globalSocket;
  if (!SOCKET_URL) return null;

  globalSocket = io(`${SOCKET_URL}/events`, {
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 2_000,
  });
  return globalSocket;
}

export function emitSubscribePlanet(planetId: string): void {
  getSocket()?.emit('subscribe_planet', planetId);
}

export function emitUnsubscribePlanet(planetId: string): void {
  getSocket()?.emit('unsubscribe_planet', planetId);
}

export function useRealtime(): void {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    function invalidateAll(): void {
      void queryClient.invalidateQueries({ queryKey: keys.me });
      void queryClient.invalidateQueries({ queryKey: keys.notifications });
      void queryClient.invalidateQueries({ queryKey: keys.notificationUnreadCount });
      void queryClient.invalidateQueries({ queryKey: keys.leaderboard });
      void queryClient.invalidateQueries({ queryKey: keys.allianceLeaderboard });
      void queryClient.invalidateQueries({ queryKey: keys.seasons });
      void queryClient.invalidateQueries({ queryKey: keys.activeEvent });
      void queryClient.invalidateQueries({ queryKey: keys.expeditionReports });
      void queryClient.invalidateQueries({ queryKey: keys.pveReports });
      void queryClient.invalidateQueries({ queryKey: keys.pvpReports });
      void queryClient.invalidateQueries({ queryKey: keys.incomingAttacks });
    }

    function handleChatMessage(payload: { scope: string; peerId?: string | null }): void {
      const { scope, peerId } = payload;
      void queryClient.invalidateQueries({
        queryKey: keys.chatMessages(scope as never, peerId ?? undefined),
      });
      void queryClient.invalidateQueries({ queryKey: keys.chatContacts('') });
    }

    function handlePlanetUpdated(payload: { planetId: string }): void {
      const { planetId } = payload;
      void queryClient.invalidateQueries({ queryKey: keys.planet(planetId) });
      void queryClient.invalidateQueries({ queryKey: keys.fleet(planetId) });
      void queryClient.invalidateQueries({ queryKey: keys.research(planetId) });
      void queryClient.invalidateQueries({ queryKey: keys.inventory });
    }

    function handleMarketUpdated(payload: { itemKey: string }): void {
      void queryClient.invalidateQueries({ queryKey: keys.marketSummaries });
      void queryClient.invalidateQueries({ queryKey: keys.marketOrderBook(payload.itemKey) });
      void queryClient.invalidateQueries({ queryKey: keys.myMarketOrders });
      void queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'market' &&
          query.queryKey[1] === 'candles' &&
          query.queryKey[2] === payload.itemKey,
      });
    }

    function handleConstructionCompleted(payload: { planetId: string }): void {
      void queryClient.invalidateQueries({ queryKey: keys.planet(payload.planetId) });
    }

    function handleShipProduced(payload: { planetId: string }): void {
      void queryClient.invalidateQueries({ queryKey: keys.fleet(payload.planetId) });
    }

    socket.on('chat:message', handleChatMessage);

    socket.on('notification:new', () => {
      void queryClient.invalidateQueries({ queryKey: keys.notifications });
      void queryClient.invalidateQueries({ queryKey: keys.notificationUnreadCount });
    });

    socket.on('planet:updated', handlePlanetUpdated);

    socket.on('market:updated', handleMarketUpdated);

    socket.on('research:completed', () => {
      void queryClient.invalidateQueries({ queryKey: ['research'] });
    });

    socket.on('construction:completed', handleConstructionCompleted);

    socket.on('ship:produced', handleShipProduced);

    socket.on('mission:updated', () => {
      void queryClient.invalidateQueries({ queryKey: keys.expeditions });
      void queryClient.invalidateQueries({ queryKey: keys.pveMissions });
      void queryClient.invalidateQueries({ queryKey: keys.pvpMissions });
      void queryClient.invalidateQueries({ queryKey: keys.transfers });
      void queryClient.invalidateQueries({ queryKey: keys.incomingAttacks });
    });

    socket.on('transfer:completed', () => {
      void queryClient.invalidateQueries({ queryKey: keys.transfers });
    });

    socket.on('leaderboard:updated', () => {
      void queryClient.invalidateQueries({ queryKey: keys.leaderboard });
      void queryClient.invalidateQueries({ queryKey: keys.allianceLeaderboard });
    });

    socket.on('reports:updated', () => {
      void queryClient.invalidateQueries({ queryKey: keys.expeditionReports });
      void queryClient.invalidateQueries({ queryKey: keys.pveReports });
      void queryClient.invalidateQueries({ queryKey: keys.pvpReports });
    });

    socket.on('activeEvent:updated', () => {
      void queryClient.invalidateQueries({ queryKey: keys.activeEvent });
    });

    socket.on('season:updated', () => {
      void queryClient.invalidateQueries({ queryKey: keys.seasons });
    });

    socket.on('refresh_all', invalidateAll);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('notification:new');
      socket.off('planet:updated', handlePlanetUpdated);
      socket.off('market:updated', handleMarketUpdated);
      socket.off('research:completed');
      socket.off('construction:completed', handleConstructionCompleted);
      socket.off('ship:produced', handleShipProduced);
      socket.off('mission:updated');
      socket.off('transfer:completed');
      socket.off('leaderboard:updated');
      socket.off('reports:updated');
      socket.off('activeEvent:updated');
      socket.off('season:updated');
      socket.off('refresh_all', invalidateAll);
    };
  }, [queryClient]);
}
