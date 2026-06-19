import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';
import type { NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { universeContext, UNIVERSE_ID_HEADER } from './universe-context';

/**
 * Intercepteur global de contexte d'univers.
 * Se contente de lire le header X-Universe-Id et de le placer dans un
 * AsyncLocalStorage accessible aux services en aval via getCurrentUniverseId().
 * La validation de l'univers (existence + statut actif) est volontairement
 * déléguée au UniverseGuard, qui s'exécute avant les intercepteurs.
 * Les routes publiques (absence de header) continuent de fonctionner normalement.
 */
@Injectable()
export class UniverseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): ReturnType<CallHandler['handle']> | Promise<ReturnType<CallHandler['handle']>> {
    const request = context.switchToHttp().getRequest<Request>();
    const universeId = this.extractUniverseId(request);

    if (!universeId) {
      return next.handle();
    }

    return universeContext.run({ universeId }, () => next.handle());
  }

  private extractUniverseId(request: Request): string | undefined {
    const raw = request.headers[UNIVERSE_ID_HEADER];
    if (Array.isArray(raw)) return raw[0]?.trim();
    if (typeof raw === 'string') return raw.trim();
    return undefined;
  }
}
