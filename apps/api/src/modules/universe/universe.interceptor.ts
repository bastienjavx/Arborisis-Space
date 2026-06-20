import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';
import type { NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { universeContext, UNIVERSE_ID_HEADER } from './universe-context';

/**
 * Intercepteur global de contexte d'univers.
 * Détermine l'univers actif et le place dans un AsyncLocalStorage accessible aux
 * services en aval via getCurrentUniverseId().
 *
 * Autorité serveur : pour une requête authentifiée, l'univers est TOUJOURS celui de
 * l'utilisateur (`request.user.universeId`), jamais le header X-Universe-Id qui est
 * contrôlable par le client. Le header ne sert que de repli pour les rares contextes
 * sans utilisateur authentifié (il n'expose alors aucune donnée d'autrui : les modèles
 * scopés sont tous derrière l'authentification).
 */
@Injectable()
export class UniverseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): ReturnType<CallHandler['handle']> | Promise<ReturnType<CallHandler['handle']>> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { universeId?: string | null } }>();
    const universeId = request.user?.universeId ?? this.extractUniverseId(request);

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
