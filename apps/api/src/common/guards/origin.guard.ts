import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../config/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Bloque les mutations cross-site utilisant les cookies d'authentification. */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const fetchSite = request.header('sec-fetch-site');
    if (fetchSite === 'cross-site') throw new ForbiddenException('Origine non autorisée.');

    const expected = new URL(this.config.get('WEB_ORIGIN', { infer: true })).origin;
    const origin = request.header('origin');
    if (origin === expected) return true;

    // Les tests d'intégration ne passent pas par un navigateur. En production,
    // l'absence d'Origin est refusée par défaut.
    if (!origin && this.config.get('NODE_ENV', { infer: true }) === 'test') return true;
    throw new ForbiddenException('Origine non autorisée.');
  }
}
