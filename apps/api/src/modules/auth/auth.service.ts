import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
    if (existing) {
      throw new ConflictException('Email ou nom d’utilisateur déjà pris.');
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: { email: dto.email, username: dto.username, passwordHash },
    });

    await this.worldFactory.initNewPlayer(user.id);

    const authUser = this.toAuthUser(user);
    const tokens = await this.issueTokens(authUser);
    return { user: authUser, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Identifiants invalides.');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Identifiants invalides.');

    const authUser = this.toAuthUser(user);
    const tokens = await this.issueTokens(authUser);
    return { user: authUser, tokens };
  }

  /** Rotation du refresh token (appelée après validation par le guard refresh). */
  async refresh(user: AuthUser): Promise<TokenPair> {
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toAuthUser(user);
  }

  private async issueTokens(user: AuthUser): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_REFRESH_TTL', { infer: true }),
    });

    const refreshTokenHash = await argon2.hash(refreshToken, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash } });

    return { accessToken, refreshToken };
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
