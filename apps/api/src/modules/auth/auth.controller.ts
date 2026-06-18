import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response, CookieOptions } from 'express';
import {
  loginSchema,
  registerSchema,
  type AuthUser,
  type LoginDto,
  type RegisterDto,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { Env } from '../../common/config/env';
import { AuthService, type TokenPair } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './strategies/jwt.strategy';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUser }> {
    const { user, tokens } = await this.authService.register(dto);
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUser }> {
    const { user, tokens } = await this.authService.login(dto);
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUser }> {
    const { user, tokens } = await this.authService.refresh(
      req.cookies?.[REFRESH_COOKIE] as string | undefined,
    );
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @HttpCode(200)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    await this.authService.logout(user.id, user.sessionId);
    this.clearAuthCookies(res);
    return { success: true };
  }

  @HttpCode(200)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    await this.authService.logoutAll(user.id);
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<{ user: AuthUser }> {
    return { user: await this.authService.me(user.id) };
  }

  // ── Cookies ──

  private baseCookieOptions(): CookieOptions {
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  private setAuthCookies(res: Response, tokens: TokenPair): void {
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...this.baseCookieOptions(),
      maxAge: accessTtl * 1000,
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.baseCookieOptions(),
      maxAge: refreshTtl * 1000,
      // Le refresh token n'est envoyé qu'à la route de rafraîchissement.
      path: '/api/auth/refresh',
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, this.baseCookieOptions());
    res.clearCookie(REFRESH_COOKIE, { ...this.baseCookieOptions(), path: '/api/auth/refresh' });
  }
}
