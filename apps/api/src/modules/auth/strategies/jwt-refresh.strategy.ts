import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import argon2 from 'argon2';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { Env } from '../../../common/config/env';
import type { JwtPayload } from './jwt.strategy';

export const REFRESH_COOKIE = 'refresh_token';

function refreshCookieExtractor(req: Request): string | null {
  return (req?.cookies?.[REFRESH_COOKIE] as string | undefined) ?? null;
}

/**
 * Stratégie de rafraîchissement : valide le refresh token ET vérifie qu'il
 * correspond au hash stocké en base (rotation / révocation).
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshCookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_REFRESH_SECRET', { infer: true }),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const token = refreshCookieExtractor(req);
    if (!token || !payload?.sub) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.refreshTokenHash) throw new UnauthorizedException();

    const matches = await argon2.verify(user.refreshTokenHash, token);
    if (!matches) throw new UnauthorizedException();

    return { id: user.id, username: user.username, role: user.role, email: user.email };
  }
}
