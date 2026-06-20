import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Env } from '../../common/config/env';
import { buildPasswordResetEmail, buildVerificationEmail } from './email.templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {
    const user = this.config.get('MAILTRAP_USER', { infer: true });
    const pass = this.config.get('MAILTRAP_PASS', { infer: true });
    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get('MAILTRAP_HOST', { infer: true }),
        port: this.config.get('MAILTRAP_PORT', { infer: true }),
        auth: { user, pass },
      });
    }
  }

  async sendVerificationEmail(to: string, username: string, token: string): Promise<void> {
    const appUrl = this.config.get('APP_URL', { infer: true });
    const verifyUrl = `${appUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;

    if (!this.transporter) {
      this.logger.warn(`[EMAIL DEV] Vérification pour ${to} → ${verifyUrl}`);
      return;
    }

    const from = this.config.get('MAILTRAP_FROM', { infer: true });
    const email = buildVerificationEmail(username, verifyUrl);
    await this.transporter.sendMail({
      from: `"Arborisis" <${from}>`,
      to,
      ...email,
    });
    this.logger.log(`Email de vérification envoyé à ${to}`);
  }

  async sendPasswordResetEmail(to: string, username: string, token: string): Promise<void> {
    const appUrl = this.config.get('APP_URL', { infer: true });
    const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    if (!this.transporter) {
      this.logger.warn(`[EMAIL DEV] Reset MDP pour ${to} → ${resetUrl}`);
      return;
    }

    const from = this.config.get('MAILTRAP_FROM', { infer: true });
    const email = buildPasswordResetEmail(username, resetUrl);
    await this.transporter.sendMail({
      from: `"Arborisis" <${from}>`,
      to,
      ...email,
    });
    this.logger.log(`Email de réinitialisation de mot de passe envoyé à ${to}`);
  }
}
