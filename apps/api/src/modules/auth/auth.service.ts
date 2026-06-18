import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import type { AuthUser, LoginDto, RegisterDto } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Env } from '../../common/config/env';
import { WorldFactoryService } from '../game/world-factory.service';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly worldFactory: WorldFactoryService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) throw new ConflictException('Email ou nom d’utilisateur déjà pris.');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    let user;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        user = await this.prisma.serializable(async (tx) => {
          const created = await tx.user.create({
            data: { email: dto.email, username: dto.username, passwordHash },
          });
          await this.worldFactory.initNewPlayer(created.id, tx);
          return created;
        });
        break;
      } catch (error) {
        if (!this.isUniqueViolation(error)) throw error;
        const duplicate = await this.prisma.user.findFirst({
          where: { OR: [{ email: dto.email }, { username: dto.username }] },
        });
        if (duplicate) throw new ConflictException('Email ou nom d’utilisateur déjà pris.');
        if (attempt === 2) throw new ConflictException('Aucun emplacement libre disponible.');
      }
    }
    if (!user) throw new ConflictException('Création du joueur impossible.');
    const authUser = this.toAuthUser(user);
    return { user: authUser, tokens: await this.createSession(authUser) };
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    const authUser = this.toAuthUser(user);
    return { user: authUser, tokens: await this.createSession(authUser) };
  }

  async refresh(rawToken: string | undefined): Promise<{ user: AuthUser; tokens: TokenPair }> {
    if (!rawToken) throw new UnauthorizedException();
    if (rawToken.split('.').length === 2) return this.rotateSession(rawToken);
    return this.migrateLegacySession(rawToken);
  }

  async logout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
  }

  async logoutAll(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } }),
    ]);
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toAuthUser(user);
  }

  private async createSession(user: AuthUser): Promise<TokenPair> {
    const sessionId = randomUUID();
    const refreshToken = this.newRefreshToken(sessionId);
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: this.refreshExpiry(),
      },
    });
    return { accessToken: await this.signAccessToken(user, sessionId), refreshToken };
  }

  private async rotateSession(rawToken: string): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const [sessionId, secret, extra] = rawToken.split('.');
    if (!sessionId || !secret || extra) throw new UnauthorizedException();

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt <= now)
      throw new UnauthorizedException();

    const presentedHash = this.hashToken(rawToken);
    if (!this.hashesEqual(session.refreshTokenHash, presentedHash)) {
      await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: now } });
      throw new UnauthorizedException();
    }

    const nextRefreshToken = this.newRefreshToken(session.id);
    const rotated = await this.prisma.session.updateMany({
      where: { id: session.id, refreshTokenHash: presentedHash, revokedAt: null },
      data: {
        refreshTokenHash: this.hashToken(nextRefreshToken),
        expiresAt: this.refreshExpiry(),
        lastUsedAt: now,
      },
    });
    if (rotated.count !== 1) {
      await this.prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException();
    }

    const user = this.toAuthUser(session.user);
    return {
      user,
      tokens: {
        accessToken: await this.signAccessToken(user, session.id),
        refreshToken: nextRefreshToken,
      },
    };
  }

  /** Convertit sans déconnexion un refresh JWT émis avant la migration Session. */
  private async migrateLegacySession(
    rawToken: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(rawToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.refreshTokenHash || !(await argon2.verify(user.refreshTokenHash, rawToken))) {
      throw new UnauthorizedException();
    }
    const claimed = await this.prisma.user.updateMany({
      where: { id: user.id, refreshTokenHash: user.refreshTokenHash },
      data: { refreshTokenHash: null },
    });
    if (claimed.count !== 1) throw new UnauthorizedException();
    const authUser = this.toAuthUser(user);
    return { user: authUser, tokens: await this.createSession(authUser) };
  }

  private async signAccessToken(user: AuthUser, sessionId: string): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      sid: sessionId,
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    });
  }

  private newRefreshToken(sessionId: string): string {
    return `${sessionId}.${randomBytes(32).toString('base64url')}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashesEqual(a: string, b: string): boolean {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.config.get('JWT_REFRESH_TTL', { infer: true }) * 1_000);
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    username: string;
    role: string;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as AuthUser['role'],
    };
  }
}
