import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { UniverseStatus } from '@prisma/client';
import { UNIVERSE_ID_HEADER } from './universe-context';
import { UniverseService } from './universe.service';

/**
 * Guard exigeant un univers valide et actif.
 * Les guards NestJS s’exécutent avant les intercepteurs : le contexte
 * AsyncLocalStorage n’est pas encore disponible, on relit donc directement le
 * header X-Universe-Id et on valide l’existence/statut de l’univers en base.
 */
@Injectable()
export class UniverseGuard implements CanActivate {
  constructor(private readonly universeService: UniverseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const universeId = this.extractUniverseId(request);

    if (!universeId) {
      throw new ForbiddenException('Un header X-Universe-Id est requis.');
    }

    const universe = await this.universeService.findById(universeId);
    if (!universe || universe.status !== UniverseStatus.ACTIVE) {
      throw new ForbiddenException('Univers invalide ou inactif.');
    }

    // Liaison à l'utilisateur : un compte ne peut opérer que dans son propre univers,
    // jamais dans celui qu'il déclarerait via le header.
    const user = (request as Request & { user?: { universeId?: string | null } }).user;
    if (user?.universeId && user.universeId !== universeId) {
      throw new ForbiddenException('Cet univers ne correspond pas à votre compte.');
    }

    return true;
  }

  private extractUniverseId(request: Request): string | undefined {
    const raw = request.headers[UNIVERSE_ID_HEADER];
    if (Array.isArray(raw)) return raw[0]?.trim();
    if (typeof raw === 'string') return raw.trim();
    return undefined;
  }
}
