import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { Env } from '../../common/config/env';
import { ACCESS_COOKIE } from '../auth/strategies/jwt.strategy';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    universeId: string;
  };
}

@WebSocketGateway({
  namespace: '/events',
  cors: { origin: process.env.WEB_ORIGIN ?? true, credentials: true },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) throw new UnauthorizedException();
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      const userId = payload.sub as string;
      const universeId = payload.universeId as string;
      if (!userId) throw new UnauthorizedException();
      (client as AuthenticatedSocket).data = { userId, universeId };
      await client.join(`user:${userId}`);
      if (universeId) await client.join(`universe:${universeId}`);
      client.emit('connected', { userId });
    } catch (error) {
      this.logger.warn(`WebSocket auth failed: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`WebSocket disconnected: ${client.id}`);
  }

  private extractToken(client: Socket): string | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;
    const match = cookieHeader.match(new RegExp(`${ACCESS_COOKIE}=([^;]+)`));
    return match?.[1] ?? null;
  }

  /** Émet un événement personnel à un utilisateur. */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  /** Émet un événement à tous les utilisateurs d'un univers. */
  emitToUniverse(universeId: string, event: string, payload: unknown): void {
    if (!universeId) return;
    this.server.to(`universe:${universeId}`).emit(event, payload);
  }

  /** Émet un événement global (tous les clients connectés). */
  emitBroadcast(event: string, payload: unknown): void {
    this.server.emit(event, payload);
  }

  @SubscribeMessage('subscribe_planet')
  async handleSubscribePlanet(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() planetId: string,
  ): Promise<void> {
    if (!planetId || typeof planetId !== 'string') return;
    await client.join(`planet:${planetId}`);
  }

  @SubscribeMessage('unsubscribe_planet')
  async handleUnsubscribePlanet(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() planetId: string,
  ): Promise<void> {
    if (!planetId || typeof planetId !== 'string') return;
    await client.leave(`planet:${planetId}`);
  }
}
