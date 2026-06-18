import { ConflictException, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import { UserRole } from '@arborisis/shared';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let prisma: any;
  let jwt: any;
  let config: any;
  let worldFactory: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      session: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    prisma.serializable = jest.fn((work) => work(prisma));
    prisma.$transaction = jest.fn((operations) => Promise.all(operations));
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-access-token'),
      verifyAsync: jest.fn(),
    };
    config = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          JWT_ACCESS_SECRET: 'a'.repeat(32),
          JWT_REFRESH_SECRET: 'b'.repeat(32),
          JWT_ACCESS_TTL: 900,
          JWT_REFRESH_TTL: 1209600,
        };
        return values[key];
      }),
    };
    worldFactory = { initNewPlayer: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(prisma as any, jwt as any, config as any, worldFactory as any);
  });

  describe('register', () => {
    it('refuse un email ou username déjà pris', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      await expect(
        service.register({ email: 'a@b.co', username: 'sylv', password: 'motdepasse12' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crée le joueur, initialise son monde et émet des tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.co',
        username: 'sylv',
        role: UserRole.PLAYER,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.register({
        email: 'a@b.co',
        username: 'sylv',
        password: 'motdepasse12',
      });

      expect(worldFactory.initNewPlayer).toHaveBeenCalledWith('u1', prisma);
      expect(result.user).toEqual({
        id: 'u1',
        email: 'a@b.co',
        username: 'sylv',
        role: UserRole.PLAYER,
      });
      expect(result.tokens.accessToken).toBe('signed-access-token');
      expect(result.tokens.refreshToken).toMatch(/^[^.]+\.[A-Za-z0-9_-]+$/);
      expect(prisma.session.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejette des identifiants invalides', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@y.co', password: 'whatever123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('accepte un mot de passe correct', async () => {
      const passwordHash = await argon2.hash('motdepasse12', { type: argon2.argon2id });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.co',
        username: 'sylv',
        role: UserRole.PLAYER,
        passwordHash,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.login({ email: 'a@b.co', password: 'motdepasse12' });
      expect(result.user.id).toBe('u1');
      expect(result.tokens.accessToken).toBe('signed-access-token');
      expect(prisma.session.create).toHaveBeenCalled();
    });
  });

  it('révoque une session si un ancien refresh token est réutilisé', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-id',
      userId: 'u1',
      refreshTokenHash: '0'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: { id: 'u1', email: 'a@b.co', username: 'sylv', role: UserRole.PLAYER },
    });
    prisma.session.update.mockResolvedValue({});

    await expect(service.refresh('session-id.secret')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: 'session-id' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('convertit un refresh JWT historique en session opaque', async () => {
    const legacyToken = 'legacy.jwt.token';
    const refreshTokenHash = await argon2.hash(legacyToken, { type: argon2.argon2id });
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.co',
      username: 'sylv',
      role: UserRole.PLAYER,
      refreshTokenHash,
    });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.refresh(legacyToken);

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', refreshTokenHash },
      data: { refreshTokenHash: null },
    });
    expect(prisma.session.create).toHaveBeenCalled();
    expect(result.tokens.refreshToken).toMatch(/^[^.]+\.[A-Za-z0-9_-]+$/);
  });
});
