import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import argon2 from 'argon2';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { Universe, User } from '@prisma/client';
import { RaceType, type AuthUser, type LoginDto, type RegisterDto } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Env } from '../../common/config/env';
import { UniverseService } from '../universe/universe.service';
import { WorldFactoryService } from '../game/world-factory.service';
import { PROVISION_UNIVERSE_JOB, PROVISIONING_QUEUE } from '../queue/queue.constants';
import type { JwtPayload } from './strategies/jwt.strategy';
import { EmailService } from '../email/email.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const TOTP_APP_NAME = 'Arborisis';
const TOTP_ENC_PREFIX = 'enc:v1:';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly universeService: UniverseService,
    private readonly worldFactory: WorldFactoryService,
    private readonly emailService: EmailService,
    @InjectQueue(PROVISIONING_QUEUE) private readonly provisioningQueue: Queue,
  ) {}

  async register(dto: RegisterDto): Promise<{ pending: true; email: string }> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) throw new ConflictException("Email ou nom d'utilisateur déjà pris.");

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    let user: User | undefined;
    let updatedUniverse: Universe | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        ({ user, updatedUniverse } = await this.prisma.serializable(async (tx) => {
          const universe = await this.universeService.pickAvailableUniverse(tx);
          if (!universe) {
            // Tous les univers actifs sont pleins : on signale 503 et on déclenche
            // le provisioning d'un nouveau node (le réconciliateur sert de filet).
            throw new ServiceUnavailableException(
              'Tous les univers sont pleins, un nouveau se prépare. Réessayez dans un instant.',
            );
          }
          const verificationToken = randomBytes(32).toString('base64url');
          const created = await tx.user.create({
            data: {
              email: dto.email,
              username: dto.username,
              passwordHash,
              race: dto.race as RaceType,
              bannerColor: undefined,
              universeId: universe.id,
              emailVerified: false,
              emailVerificationToken: verificationToken,
              emailVerificationSentAt: new Date(),
            },
          });
          await this.worldFactory.initNewPlayer(created.id, tx, dto.race as RaceType);
          const incrementedUniverse = await this.universeService.incrementPlayerCount(
            tx,
            universe.id,
          );
          return { user: created, updatedUniverse: incrementedUniverse };
        }));
        break;
      } catch (error) {
        if (error instanceof ServiceUnavailableException) {
          // Aucun emplacement libre : déclencher la création d'un nouvel univers.
          await this.enqueueProvisioning();
          throw error;
        }
        if (!this.isUniqueViolation(error)) throw error;
        const duplicate = await this.prisma.user.findFirst({
          where: { OR: [{ email: dto.email }, { username: dto.username }] },
        });
        if (duplicate) throw new ConflictException("Email ou nom d'utilisateur déjà pris.");
        if (attempt === 2) throw new ConflictException('Aucun emplacement libre disponible.');
      }
    }
    if (!user) throw new ConflictException('Création du joueur impossible.');

    // Pré-provisioning : dès que l'univers franchit le seuil (90 % par défaut), on
    // prépare un nouveau node pour qu'il soit chaud avant la saturation totale.
    if (updatedUniverse !== undefined && this.universeService.shouldProvision(updatedUniverse)) {
      await this.enqueueProvisioning();
    }

    await this.emailService
      .sendVerificationEmail(user.email, user.username, user.emailVerificationToken!)
      .catch((err) => {
        this.logger.error(err, "Impossible d'envoyer l'email de vérification.");
      });

    return { pending: true, email: user.email };
  }

  /**
   * Enfile un job de provisioning d'univers (idempotent côté ProvisioningService :
   * un seul univers en PROVISIONING à la fois). Ne propage jamais d'erreur de file.
   */
  private async enqueueProvisioning(): Promise<void> {
    await this.provisioningQueue
      .add(PROVISION_UNIVERSE_JOB, {}, { removeOnComplete: true, removeOnFail: 10 })
      .catch((error) => {
        this.logger.error(error, "Impossible de planifier le provisioning d'un nouvel univers.");
      });
  }

  async login(
    dto: LoginDto,
  ): Promise<
    | { user: AuthUser; tokens: TokenPair; twoFactorRequired?: false }
    | { twoFactorRequired: true; tempToken: string }
  > {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Veuillez vérifier votre adresse email avant de vous connecter.',
      );
    }

    if (user.totpEnabled && user.totpSecret) {
      const tempToken = await this.jwt.signAsync(
        { sub: user.id, type: '2fa_pending' as const },
        {
          secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
          expiresIn: '5m',
        },
      );
      return { twoFactorRequired: true as const, tempToken };
    }

    const authUser = this.toAuthUser(user);
    return { user: authUser, tokens: await this.createSession(authUser) };
  }

  async loginWith2fa(
    tempToken: string,
    code: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; type: string }>(tempToken, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Token temporaire invalide ou expiré.');
    }
    if (payload.type !== '2fa_pending') throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.totpEnabled || !user.totpSecret) throw new UnauthorizedException();

    const isValid = speakeasy.totp.verify({
      secret: this.decryptTotpSecret(user.totpSecret),
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!isValid) throw new UnauthorizedException('Code de double authentification invalide.');

    const authUser = this.toAuthUser(user);
    return { user: authUser, tokens: await this.createSession(authUser) };
  }

  async verifyEmail(token: string): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });
    if (!user) throw new NotFoundException('Lien de vérification invalide ou expiré.');

    const sentAt = user.emailVerificationSentAt;
    if (!sentAt || Date.now() - sentAt.getTime() > 24 * 60 * 60 * 1_000) {
      throw new ForbiddenException('Lien de vérification expiré. Demandez un nouveau lien.');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationSentAt: null,
      },
    });

    const authUser = this.toAuthUser(updated);
    return { user: authUser, tokens: await this.createSession(authUser) };
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return;

    if (
      user.emailVerificationSentAt &&
      Date.now() - user.emailVerificationSentAt.getTime() < 60_000
    ) {
      return;
    }

    const verificationToken = randomBytes(32).toString('base64url');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationSentAt: new Date(),
      },
    });

    await this.emailService
      .sendVerificationEmail(user.email, user.username, verificationToken)
      .catch((err) => {
        this.logger.error(err, "Impossible d'envoyer l'email de vérification.");
      });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.emailVerified) return; // on ne révèle pas si l'email existe

    // Anti-spam : 1 minute entre deux envois
    if (user.passwordResetSentAt && Date.now() - user.passwordResetSentAt.getTime() < 60_000) {
      return;
    }

    const resetToken = randomBytes(32).toString('base64url');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetSentAt: new Date(),
      },
    });

    await this.emailService
      .sendPasswordResetEmail(user.email, user.username, resetToken)
      .catch((err) => {
        this.logger.error(err, "Impossible d'envoyer l'email de réinitialisation.");
      });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { passwordResetToken: token } });
    if (!user || !user.passwordResetSentAt) {
      throw new NotFoundException('Lien de réinitialisation invalide ou expiré.');
    }

    if (Date.now() - user.passwordResetSentAt.getTime() > 60 * 60 * 1_000) {
      throw new ForbiddenException('Lien expiré. Demandez un nouveau lien de réinitialisation.');
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetSentAt: null,
          refreshTokenHash: null,
        },
      }),
      // Révoquer toutes les sessions actives
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ── 2FA TOTP ──

  async setup2fa(
    userId: string,
  ): Promise<{ secret: string; qrCodeDataUrl: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.totpEnabled)
      throw new BadRequestException('La double authentification est déjà activée.');

    const generated = speakeasy.generateSecret({
      length: 20,
      name: `${TOTP_APP_NAME} (${user.email})`,
    });
    const secret = generated.base32;
    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: user.email,
      issuer: TOTP_APP_NAME,
      encoding: 'base32',
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: this.encryptTotpSecret(secret) },
    });

    return { secret, qrCodeDataUrl, otpauthUrl };
  }

  async enable2fa(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpSecret)
      throw new BadRequestException("Initialisez d'abord la double authentification.");
    if (user.totpEnabled)
      throw new BadRequestException('La double authentification est déjà activée.');

    const isValid = speakeasy.totp.verify({
      secret: this.decryptTotpSecret(user.totpSecret),
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!isValid)
      throw new BadRequestException(
        "Code invalide. Vérifiez votre application d'authentification.",
      );

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true },
    });
  }

  async disable2fa(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new BadRequestException("La double authentification n'est pas activée.");
    }

    const isValid = speakeasy.totp.verify({
      secret: this.decryptTotpSecret(user.totpSecret),
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!isValid) throw new BadRequestException('Code invalide.');

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabled: false },
    });
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
    await this.prisma.serializable(async (tx) => {
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
    });
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
    const matchesCurrent = this.hashesEqual(session.refreshTokenHash, presentedHash);
    const matchesPrevious =
      session.previousRefreshTokenHash &&
      session.previousRefreshTokenExpiresAt &&
      session.previousRefreshTokenExpiresAt > now &&
      this.hashesEqual(session.previousRefreshTokenHash, presentedHash);

    if (!matchesCurrent && !matchesPrevious) {
      await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: now } });
      throw new UnauthorizedException();
    }

    const nextRefreshToken = this.newRefreshToken(session.id);
    const rotated = await this.prisma.session.updateMany({
      where: { id: session.id, refreshTokenHash: session.refreshTokenHash, revokedAt: null },
      data: {
        refreshTokenHash: this.hashToken(nextRefreshToken),
        previousRefreshTokenHash: session.refreshTokenHash,
        previousRefreshTokenExpiresAt: new Date(now.getTime() + this.refreshGracePeriodMs()),
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
      race: user.race,
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

  /** Clé AES-256 dérivée de TOTP_ENC_KEY, ou `null` si le chiffrement est désactivé. */
  private totpKey(): Buffer | null {
    const raw = this.config.get('TOTP_ENC_KEY', { infer: true });
    return raw ? createHash('sha256').update(raw).digest() : null;
  }

  /** Chiffre un secret TOTP (AES-256-GCM) si une clé est configurée, sinon le renvoie en clair. */
  private encryptTotpSecret(secret: string): string {
    const key = this.totpKey();
    if (!key) return secret;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return TOTP_ENC_PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
  }

  /** Déchiffre un secret TOTP stocké ; supporte les secrets en clair hérités (sans préfixe). */
  private decryptTotpSecret(stored: string): string {
    if (!stored.startsWith(TOTP_ENC_PREFIX)) return stored;
    const key = this.totpKey();
    if (!key) throw new UnauthorizedException('Déchiffrement TOTP indisponible.');
    const buf = Buffer.from(stored.slice(TOTP_ENC_PREFIX.length), 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  private hashesEqual(a: string, b: string): boolean {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.config.get('JWT_REFRESH_TTL', { infer: true }) * 1_000);
  }

  private refreshGracePeriodMs(): number {
    // Fenêtre pendant laquelle l'ancien refresh token reste valide après rotation.
    // Cela évite une déconnexion si le client ne reçoit pas la réponse du refresh
    // (réseau coupé, onglet fermé, proxy timeout, etc.).
    return 60_000;
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    username: string;
    role: string;
    race: string;
    universeId: string | null;
    displayName: string | null;
    bannerColor: string | null;
    avatarSeed: string | null;
    totpEnabled: boolean;
    title?: string | null;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as AuthUser['role'],
      race: user.race as AuthUser['race'],
      universeId: user.universeId,
      displayName: user.displayName,
      bannerColor: user.bannerColor,
      avatarSeed: user.avatarSeed,
      totpEnabled: user.totpEnabled,
      title: user.title ?? null,
    };
  }
}
