'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { keys } from './queries';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_SOCKET_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

export type ServerEvent =
  | { type: 'chat:message'; payload: { scope: string; peerId?: string | null } }
  | { type: 'notification:new'; payload: Record<string, never> }
  | { type: 'planet:updated'; payload: { planetId: string } }
  | { type: 'research:completed'; payload: Record<string, never> }
  | { type: 'construction:completed'; payload: { planetId: string } }
  | { type: 'ship:produced'; payload: { planetId: string } }
  | { type: 'mission:updated'; payload: { kind: string } }
  | { type: 'transfer:completed'; payload: Record<string, never> }
  | { type: 'leaderboard:updated'; payload: Record<string, never> }
  | { type: 'reports:updated'; payload: Record<string, never> }
  | { type: 'activeEvent:updated'; payload: Record<string, never> }
  | { type: 'season:updated'; payload: Record<string, never> };

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

    function handleChatMessage(event: ServerEvent): void {
      if (event.type !== 'chat:message') return;
      const { scope, peerId } = event.payload;
      void queryClient.invalidateQueries({
        queryKey: keys.chatMessages(scope as never, peerId ?? undefined),
      });
      void queryClient.invalidateQueries({ queryKey: keys.chatContacts('') });
    }

    function handlePlanetUpdated(event: ServerEvent): void {
      if (event.type !== 'planet:updated') return;
      const { planetId } = event.payload;
      void queryClient.invalidateQueries({ queryKey: keys.planet(planetId) });
      void queryClient.invalidateQueries({ queryKey: keys.fleet(planetId) });
      void queryClient.invalidateQueries({ queryKey: keys.research(planetId) });
    }

    function handleConstructionCompleted(event: ServerEvent): void {
      if (event.type !== 'construction:completed') return;
      void queryClient.invalidateQueries({ queryKey: keys.planet(event.payload.planetId) });
    }

    function handleShipProduced(event: ServerEvent): void {
      if (event.type !== 'ship:produced') return;
      void queryClient.invalidateQueries({ queryKey: keys.fleet(event.payload.planetId) });
    }

    socket.on('chat:message', handleChatMessage);

    socket.on('notification:new', () => {
      void queryClient.invalidateQueries({ queryKey: keys.notifications });
      void queryClient.invalidateQueries({ queryKey: keys.notificationUnreadCount });
    });

    socket.on('planet:updated', handlePlanetUpdated);

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
