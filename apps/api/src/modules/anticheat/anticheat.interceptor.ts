import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { AntiCheatService } from './anticheat.service';
import { ACCESS_DEDUP_TTL_MS } from './anticheat.constants';

/**
 * Intercepteur global qui rattache (best-effort) l'IP de chaque requête
 * authentifiée à son compte, pour la détection de multi-comptes. Déduplique en
 * mémoire afin de n'écrire en base qu'une fois par couple (utilisateur, IP) et
 * par fenêtre, évitant toute charge sur le chemin chaud. N'altère jamais la
 * réponse et n'introduit aucune latence (traitement asynchrone détaché).
 */
@Injectable()
export class AntiCheatInterceptor implements NestInterceptor {
  private readonly seen = new Map<string, number>();

  constructor(private readonly antiCheat: AntiCheatService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request & { user?: { id?: string } }>();
    const userId = req.user?.id;
    const ip = req.ip;
    if (userId && ip && this.shouldRecord(userId, ip)) {
      void this.antiCheat.noteAccess(userId, ip);
    }
    return next.handle();
  }

  private shouldRecord(userId: string, ip: string): boolean {
    const key = `${userId}|${ip}`;
    const now = Date.now();
    const last = this.seen.get(key);
    if (last !== undefined && now - last < ACCESS_DEDUP_TTL_MS) return false;
    this.seen.set(key, now);
    if (this.seen.size > 10_000) this.prune(now);
    return true;
  }

  private prune(now: number): void {
    for (const [key, ts] of this.seen) {
      if (now - ts >= ACCESS_DEDUP_TTL_MS) this.seen.delete(key);
    }
  }
}
