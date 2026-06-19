import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Env } from '../../common/config/env';

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
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    if (!this.transporter) {
      this.logger.warn(`[EMAIL DEV] Vérification pour ${to} → ${verifyUrl}`);
      return;
    }

    const from = this.config.get('MAILTRAP_FROM', { infer: true });
    await this.transporter.sendMail({
      from: `"Arborisis" <${from}>`,
      to,
      subject: 'Activez votre colonie — Arborisis',
      html: this.buildVerificationHtml(username, verifyUrl),
      text: `Bonjour ${username},\n\nActivez votre compte en visitant ce lien :\n${verifyUrl}\n\nCe lien expire dans 24 heures.\n\n— L'équipe Arborisis`,
    });
    this.logger.log(`Email de vérification envoyé à ${to}`);
  }

  async sendPasswordResetEmail(to: string, username: string, token: string): Promise<void> {
    const appUrl = this.config.get('APP_URL', { infer: true });
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    if (!this.transporter) {
      this.logger.warn(`[EMAIL DEV] Reset MDP pour ${to} → ${resetUrl}`);
      return;
    }

    const from = this.config.get('MAILTRAP_FROM', { infer: true });
    await this.transporter.sendMail({
      from: `"Arborisis" <${from}>`,
      to,
      subject: 'Réinitialisation de votre mot de passe — Arborisis',
      html: this.buildPasswordResetHtml(username, resetUrl),
      text: `Bonjour ${username},\n\nRéinitialisez votre mot de passe en visitant ce lien :\n${resetUrl}\n\nCe lien expire dans 1 heure.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\n— L'équipe Arborisis`,
    });
    this.logger.log(`Email de réinitialisation de mot de passe envoyé à ${to}`);
  }

  private buildVerificationHtml(username: string, verifyUrl: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Activez votre colonie — Arborisis</title>
</head>
<body style="margin:0;padding:0;background-color:#0a1008;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a1008;min-height:100vh;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <!-- Header -->
      <tr><td style="padding-bottom:32px;text-align:center;">
        <div style="display:inline-block;background:linear-gradient(135deg,#16bf6c22,#16bf6c0a);border:1px solid #16bf6c33;border-radius:12px;padding:16px 28px;">
          <span style="font-size:28px;font-weight:700;letter-spacing:.08em;color:#16bf6c;text-transform:uppercase;">Arborisis</span>
        </div>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:linear-gradient(135deg,#111e0f,#0d1a0b);border:1px solid #16bf6c22;border-radius:16px;padding:40px 36px;">

        <!-- Organic accent line -->
        <div style="height:3px;background:linear-gradient(90deg,transparent,#16bf6c,#4ade80,transparent);border-radius:2px;margin-bottom:36px;"></div>

        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:#e8f5e3;letter-spacing:.02em;">
          Activez votre colonie
        </h1>
        <p style="margin:0 0 28px;font-size:15px;color:#a3c99a;line-height:1.6;">
          Bienvenue dans la Convergence, <strong style="color:#e8f5e3;">${username}</strong>.<br>
          Votre premier monde attend. Confirmez votre adresse pour commencer à germer.
        </p>

        <!-- CTA Button -->
        <div style="text-align:center;margin:0 0 32px;">
          <a href="${verifyUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#16bf6c,#0da355);color:#0a1008;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.04em;padding:14px 36px;border-radius:8px;text-transform:uppercase;">
            ✦ Activer mon compte
          </a>
        </div>

        <!-- Fallback link -->
        <p style="margin:0 0 24px;font-size:12px;color:#5a8a52;text-align:center;line-height:1.7;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <a href="${verifyUrl}" style="color:#16bf6c;word-break:break-all;text-decoration:underline;">${verifyUrl}</a>
        </p>

        <!-- Divider -->
        <div style="height:1px;background:linear-gradient(90deg,transparent,#16bf6c22,transparent);margin:0 0 24px;"></div>

        <p style="margin:0;font-size:12px;color:#3d6338;text-align:center;line-height:1.7;">
          Ce lien expire dans <strong style="color:#5a8a52;">24 heures</strong>.<br>
          Si vous n'avez pas créé de compte, ignorez cet email.
        </p>

      </td></tr>

      <!-- Footer -->
      <tr><td style="padding-top:24px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#2d4a28;letter-spacing:.05em;text-transform:uppercase;">
          Arborisis — Civilisation organique persistante
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
  }

  private buildPasswordResetHtml(username: string, resetUrl: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Réinitialisation de mot de passe — Arborisis</title>
</head>
<body style="margin:0;padding:0;background-color:#0a1008;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a1008;min-height:100vh;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <!-- Header -->
      <tr><td style="padding-bottom:32px;text-align:center;">
        <div style="display:inline-block;background:linear-gradient(135deg,#16bf6c22,#16bf6c0a);border:1px solid #16bf6c33;border-radius:12px;padding:16px 28px;">
          <span style="font-size:28px;font-weight:700;letter-spacing:.08em;color:#16bf6c;text-transform:uppercase;">Arborisis</span>
        </div>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:linear-gradient(135deg,#111e0f,#0d1a0b);border:1px solid #16bf6c22;border-radius:16px;padding:40px 36px;">

        <!-- Amber accent line -->
        <div style="height:3px;background:linear-gradient(90deg,transparent,#f59e0b,#fbbf24,transparent);border-radius:2px;margin-bottom:36px;"></div>

        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:#e8f5e3;letter-spacing:.02em;">
          Réinitialisation du mot de passe
        </h1>
        <p style="margin:0 0 28px;font-size:15px;color:#a3c99a;line-height:1.6;">
          Bonjour <strong style="color:#e8f5e3;">${username}</strong>,<br>
          Une demande de réinitialisation de mot de passe a été reçue pour votre compte.
          Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
        </p>

        <!-- CTA Button -->
        <div style="text-align:center;margin:0 0 32px;">
          <a href="${resetUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0a1008;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.04em;padding:14px 36px;border-radius:8px;text-transform:uppercase;">
            ⟳ Réinitialiser le mot de passe
          </a>
        </div>

        <!-- Fallback link -->
        <p style="margin:0 0 24px;font-size:12px;color:#5a8a52;text-align:center;line-height:1.7;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <a href="${resetUrl}" style="color:#f59e0b;word-break:break-all;text-decoration:underline;">${resetUrl}</a>
        </p>

        <!-- Divider -->
        <div style="height:1px;background:linear-gradient(90deg,transparent,#f59e0b22,transparent);margin:0 0 24px;"></div>

        <p style="margin:0;font-size:12px;color:#3d6338;text-align:center;line-height:1.7;">
          Ce lien expire dans <strong style="color:#5a8a52;">1 heure</strong>.<br>
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre compte reste sécurisé.
        </p>

      </td></tr>

      <!-- Footer -->
      <tr><td style="padding-top:24px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#2d4a28;letter-spacing:.05em;text-transform:uppercase;">
          Arborisis — Civilisation organique persistante
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
  }
}
