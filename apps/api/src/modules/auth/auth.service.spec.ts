import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { createHash } from 'node:crypto';
import speakeasy from 'speakeasy';
import { RaceType, UserRole } from '@arborisis/shared';
import { AuthService } from './auth.service';

function totpCode(secret: string): string {
  return speakeasy.totp({ secret, encoding: 'base32' });
}

describe('AuthService', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let prisma: any;
  let jwt: any;
  let config: any;
  let universeService: any;
  let worldFactory: any;
  let emailService: any;
  let provisioningQueue: any;
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
      universe: {
        findUnique: jest.fn(),
        update: jest.fn(),
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
          TOTP_ENC_KEY: 'totp-encryption-key-min-32-chars!',
        };
        return values[key];
      }),
    };
    universeService = {
      pickAvailableUniverse: jest.fn().mockResolvedValue({
        id: 'univ1',
        slug: 'default',
        playerCount: 0,
        maxPlayers: 100,
      }),
      incrementPlayerCount: jest.fn().mockResolvedValue({
        id: 'univ1',
        slug: 'default',
        playerCount: 1,
        maxPlayers: 100,
      }),
      shouldProvision: jest.fn().mockReturnValue(false),
    };
    worldFactory = { initNewPlayer: jest.fn().mockResolvedValue(undefined) };
    emailService = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };
    provisioningQueue = { add: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      prisma as any,
      jwt as any,
      config as any,
      universeService as any,
      worldFactory as any,
      emailService as any,
      provisioningQueue as any,
    );
  });

  describe('register', () => {
    it('refuse un email ou username déjà pris', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      await expect(
        service.register({
          email: 'a@b.co',
          username: 'sylv',
          password: 'motdepasse12',
          race: RaceType.MYCELIANS,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crée le joueur, envoie un email de vérification et retourne pending', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.co',
        username: 'sylv',
        role: UserRole.PLAYER,
        race: RaceType.MYCELIANS,
        displayName: null,
        bannerColor: null,
        avatarSeed: null,
        universeId: 'univ1',
        emailVerificationToken: 'tok123',
        emailVerificationSentAt: new Date(),
        emailVerified: false,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.register({
        email: 'a@b.co',
        username: 'sylv',
        password: 'motdepasse12',
        race: RaceType.MYCELIANS,
      });

      expect(universeService.pickAvailableUniverse).toHaveBeenCalledWith(prisma);
      expect(universeService.shouldProvision).toHaveBeenCalledWith({
        id: 'univ1',
        slug: 'default',
        playerCount: 1,
        maxPlayers: 100,
      });
      expect(worldFactory.initNewPlayer).toHaveBeenCalledWith('u1', prisma, RaceType.MYCELIANS);
      expect(universeService.incrementPlayerCount).toHaveBeenCalledWith(prisma, 'univ1');
      expect(provisioningQueue.add).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith('a@b.co', 'sylv', 'tok123');
      expect(result.pending).toBe(true);
      expect(result.email).toBe('a@b.co');
    });

    it('planifie le provisioning quand le seuil est franchi après inscription', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      universeService.shouldProvision.mockReturnValue(true);
      universeService.incrementPlayerCount.mockResolvedValue({
        id: 'univ1',
        slug: 'default',
        playerCount: 90,
        maxPlayers: 100,
      });
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.co',
        username: 'sylv',
        role: UserRole.PLAYER,
        race: RaceType.MYCELIANS,
        displayName: null,
        bannerColor: null,
        avatarSeed: null,
        universeId: 'univ1',
        emailVerificationToken: 'tok123',
        emailVerificationSentAt: new Date(),
        emailVerified: false,
      });
      prisma.user.update.mockResolvedValue({});

      await service.register({
        email: 'a@b.co',
        username: 'sylv',
        password: 'motdepasse12',
        race: RaceType.MYCELIANS,
      });

      expect(provisioningQueue.add).toHaveBeenCalledWith(
        'provisioning.universe',
        {},
        expect.objectContaining({ removeOnComplete: true, removeOnFail: 10 }),
      );
    });

    it('renvoie 503 et déclenche le provisioning si tous les univers sont pleins', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      universeService.pickAvailableUniverse.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'a@b.co',
          username: 'sylv',
          password: 'motdepasse12',
          race: RaceType.MYCELIANS,
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(universeService.pickAvailableUniverse).toHaveBeenCalledWith(prisma);
      expect(worldFactory.initNewPlayer).not.toHaveBeenCalled();
      expect(universeService.incrementPlayerCount).not.toHaveBeenCalled();
      expect(provisioningQueue.add).toHaveBeenCalledWith(
        'provisioning.universe',
        {},
        expect.objectContaining({ removeOnComplete: true, removeOnFail: 10 }),
      );
    });
  });

  describe('login', () => {
    it('rejette des identifiants invalides', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@y.co', password: 'whatever123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejette si email non vérifié', async () => {
      const passwordHash = await argon2.hash('motdepasse12', { type: argon2.argon2id });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.co',
        username: 'sylv',
        role: UserRole.PLAYER,
        race: RaceType.MYCELIANS,
        displayName: null,
        bannerColor: null,
        avatarSeed: null,
        passwordHash,
        emailVerified: false,
      });

      await expect(
        service.login({ email: 'a@b.co', password: 'motdepasse12' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('accepte un mot de passe correct et email vérifié', async () => {
      const passwordHash = await argon2.hash('motdepasse12', { type: argon2.argon2id });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.co',
        username: 'sylv',
        role: UserRole.PLAYER,
        race: RaceType.MYCELIANS,
        displayName: null,
        bannerColor: null,
        avatarSeed: null,
        universeId: 'univ1',
        passwordHash,
        emailVerified: true,
        totpEnabled: false,
        totpSecret: null,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.login({ email: 'a@b.co', password: 'motdepasse12' });
      if ('twoFactorRequired' in result) throw new Error('Unexpected 2FA required');
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
      user: {
        id: 'u1',
        email: 'a@b.co',
        username: 'sylv',
        role: UserRole.PLAYER,
        race: RaceType.MYCELIANS,
        displayName: null,
        bannerColor: null,
        avatarSeed: null,
        totpEnabled: false,
        universeId: 'univ1',
      },
    });
    prisma.session.updateMany.mockResolvedValue({ count: 1 });

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
      race: RaceType.MYCELIANS,
      displayName: null,
      bannerColor: null,
      avatarSeed: null,
      universeId: 'univ1',
      totpEnabled: false,
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

  it('accepte le previous refresh token pendant la période de grâce', async () => {
    const currentHash = '0'.repeat(64);
    const previousToken = 'session-id.previoussecret';
    const previousHash = createHash('sha256').update(previousToken).digest('hex');
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-id',
      userId: 'u1',
      refreshTokenHash: currentHash,
      previousRefreshTokenHash: previousHash,
      previousRefreshTokenExpiresAt: new Date(Date.now() + 60_000),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 'u1',
        email: 'a@b.co',
        username: 'sylv',
        role: UserRole.PLAYER,
        race: RaceType.MYCELIANS,
        displayName: null,
        bannerColor: null,
        avatarSeed: null,
        totpEnabled: false,
        universeId: 'univ1',
      },
    });
    prisma.session.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.refresh(previousToken);

    expect(result.tokens.accessToken).toBe('signed-access-token');
    expect(result.tokens.refreshToken).toMatch(/^[^.]+\.[A-Za-z0-9_-]+$/);
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousRefreshTokenHash: currentHash,
        }),
      }),
    );
  });

  describe('2FA TOTP', () => {
    function userWith2fa(secret: string | null, enabled: boolean) {
      return {
        id: 'u1',
        email: 'a@b.co',
        username: 'sylv',
        role: UserRole.PLAYER,
        race: RaceType.MYCELIANS,
        displayName: null,
        bannerColor: null,
        avatarSeed: null,
        universeId: 'univ1',
        passwordHash: '',
        emailVerified: true,
        totpEnabled: enabled,
        totpSecret: secret,
      };
    }

    it('login renvoie un tempToken quand la 2FA est activée', async () => {
      const passwordHash = await argon2.hash('motdepasse12', { type: argon2.argon2id });
      const secret = speakeasy.generateSecret({ length: 20 }).base32;
      prisma.user.findUnique.mockResolvedValue({ ...userWith2fa(secret, true), passwordHash });
      prisma.user.update.mockResolvedValue({});
      prisma.session.create.mockResolvedValue({});

      const result = await service.login({ email: 'a@b.co', password: 'motdepasse12' });

      expect('twoFactorRequired' in result && result.twoFactorRequired).toBe(true);
      if ('twoFactorRequired' in result && result.twoFactorRequired) {
        expect(result.tempToken).toBe('signed-access-token');
      }
      expect(prisma.session.create).not.toHaveBeenCalled();
      expect(jwt.signAsync).toHaveBeenCalledWith(
        { sub: 'u1', type: '2fa_pending' },
        expect.objectContaining({ expiresIn: '5m' }),
      );
    });

    it('loginWith2fa crée une session avec un code valide', async () => {
      const secret = speakeasy.generateSecret({ length: 20 }).base32;
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', type: '2fa_pending' });
      prisma.user.findUnique.mockResolvedValue(userWith2fa(secret, true));
      prisma.user.update.mockResolvedValue({});
      prisma.session.create.mockResolvedValue({});

      const result = await service.loginWith2fa('temp-token', totpCode(secret));

      expect(result.user.id).toBe('u1');
      expect(result.tokens.accessToken).toBe('signed-access-token');
      expect(prisma.session.create).toHaveBeenCalled();
    });

    it('loginWith2fa rejette un code invalide', async () => {
      const secret = speakeasy.generateSecret({ length: 20 }).base32;
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', type: '2fa_pending' });
      prisma.user.findUnique.mockResolvedValue(userWith2fa(secret, true));

      await expect(service.loginWith2fa('temp-token', '000000')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('loginWith2fa rejette un token temporaire invalide', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(service.loginWith2fa('bad-token', totpCode('JBSWY3DPEHPK3PXP'))).rejects.toThrow(
        'Token temporaire invalide ou expiré.',
      );
    });

    it('setup2fa génère un secret chiffré et un QR code', async () => {
      prisma.user.findUnique.mockResolvedValue(userWith2fa(null, false));
      prisma.user.update.mockResolvedValue({});

      const result = await service.setup2fa('u1');

      expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({
            totpSecret: expect.stringMatching(/^enc:v1:/),
          }),
        }),
      );
    });

    it('enable2fa active la 2FA avec un code valide', async () => {
      const secret = speakeasy.generateSecret({ length: 20 }).base32;
      const encrypted = (service as any).encryptTotpSecret(secret);
      prisma.user.findUnique.mockResolvedValue(userWith2fa(encrypted, false));
      prisma.user.update.mockResolvedValue({});

      await service.enable2fa('u1', totpCode(secret));

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: { totpEnabled: true },
        }),
      );
    });

    it('enable2fa rejette un code invalide', async () => {
      const secret = speakeasy.generateSecret({ length: 20 }).base32;
      const encrypted = (service as any).encryptTotpSecret(secret);
      prisma.user.findUnique.mockResolvedValue(userWith2fa(encrypted, false));

      await expect(service.enable2fa('u1', '000000')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('disable2fa désactive la 2FA avec un code valide', async () => {
      const secret = speakeasy.generateSecret({ length: 20 }).base32;
      const encrypted = (service as any).encryptTotpSecret(secret);
      prisma.user.findUnique.mockResolvedValue(userWith2fa(encrypted, true));
      prisma.user.update.mockResolvedValue({});

      await service.disable2fa('u1', totpCode(secret));

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: { totpSecret: null, totpEnabled: false },
        }),
      );
    });

    it('rejette la vérification si la clé de chiffrement est absente', async () => {
      const secret = speakeasy.generateSecret({ length: 20 }).base32;
      const encrypted = (service as any).encryptTotpSecret(secret);
      config.get.mockImplementation((key: string) => {
        if (key === 'TOTP_ENC_KEY') return undefined;
        const values: Record<string, unknown> = {
          JWT_ACCESS_SECRET: 'a'.repeat(32),
          JWT_REFRESH_SECRET: 'b'.repeat(32),
          JWT_ACCESS_TTL: 900,
          JWT_REFRESH_TTL: 1209600,
        };
        return values[key];
      });
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', type: '2fa_pending' });
      prisma.user.findUnique.mockResolvedValue(userWith2fa(encrypted, true));

      await expect(service.loginWith2fa('temp-token', totpCode(secret))).rejects.toThrow(
        'Déchiffrement TOTP indisponible. Vérifiez la variable TOTP_ENC_KEY.',
      );
    });
  });
});
