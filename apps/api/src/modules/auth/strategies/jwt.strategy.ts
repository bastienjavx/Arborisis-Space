import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { RaceType, UserRole, type AuthUser } from '@arborisis/shared';
import type { Env } from '../../../common/config/env';
import { PrismaService } from '../../../common/prisma/prisma.service';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const AUTH_EXPIRES_COOKIE = 'auth_expires_at';

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
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) throw new UnauthorizedException();

    // Si le token porte un identifiant de session (`sid`), on vérifie que la session
    // est toujours active : un logout / logout-all la révoque et invalide donc
    // immédiatement le token d'accès (sans attendre son expiration).
    if (payload.sid) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sid },
        select: { revokedAt: true, expiresAt: true, userId: true },
      });
      if (
        !session ||
        session.revokedAt !== null ||
        session.expiresAt <= new Date() ||
        session.userId !== payload.sub
      ) {
        throw new UnauthorizedException();
      }
    }

    // On relit l'utilisateur en base afin que rôle, univers et profil reflètent
    // l'état courant (révocation de rôle, etc.), et non un instantané figé dans le JWT.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        race: true,
        universeId: true,
        displayName: true,
        bannerColor: true,
        avatarSeed: true,
        totpEnabled: true,
        title: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    return {
      id: user.id,
      username: user.username,
      role: user.role as AuthUser['role'],
      race: (user.race as AuthUser['race']) ?? RaceType.MYCELIANS,
      email: user.email,
      universeId: user.universeId,
      displayName: user.displayName,
      bannerColor: user.bannerColor,
      avatarSeed: user.avatarSeed,
      totpEnabled: user.totpEnabled,
      title: user.title ?? null,
      sessionId: payload.sid,
    };
  }
}
