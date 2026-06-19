import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { RaceType, UserRole, type AuthUser } from '@arborisis/shared';
import type { Env } from '../../../common/config/env';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  race: RaceType;
  sid?: string;
}

export interface AuthenticatedUser extends AuthUser {
  sessionId?: string;
}

/** Extrait le token d'accès du cookie httpOnly. */
function cookieExtractor(req: Request): string | null {
  return (req?.cookies?.[ACCESS_COOKIE] as string | undefined) ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub) throw new UnauthorizedException();
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      race: payload.race ?? RaceType.MYCELIANS,
      email: '',
      universeId: null,
      displayName: null,
      bannerColor: null,
      avatarSeed: null,
      totpEnabled: false,
      sessionId: payload.sid,
    };
  }
}
