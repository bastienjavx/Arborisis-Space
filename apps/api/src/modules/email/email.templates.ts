type EmailAccent = 'canopy' | 'sap';

export interface TransactionalEmail {
  subject: string;
  html: string;
  text: string;
}

interface EmailTemplateOptions {
  title: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  introduction: string;
  actionLabel: string;
  actionUrl: string;
  expiry: string;
  notice: string;
  accent: EmailAccent;
}

const COLORS = {
  canopy: {
    accent: '#7eecae',
    button: '#55723f',
    buttonBorder: '#a7c577',
    soft: '#11251a',
  },
  sap: {
    accent: '#f5c96b',
    button: '#8a682d',
    buttonBorder: '#e0a93f',
    soft: '#211b0e',
  },
} as const;

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character]!,
  );
}

function buildTransactionalHtml(options: EmailTemplateOptions): string {
  const colors = COLORS[options.accent];
  const actionUrl = escapeHtml(options.actionUrl);

  return `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(options.title)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    table { border-collapse: collapse !important; }
    a { color: ${colors.accent}; }
    @media only screen and (max-width: 620px) {
      .email-shell { padding: 24px 12px !important; }
      .email-card { padding: 32px 24px !important; }
      .email-heading { font-size: 32px !important; line-height: 36px !important; }
      .email-button { display: block !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; width:100% !important; background:#060b09; color:#d8f9e6; font-family:Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">${escapeHtml(options.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background:#060b09;">
    <tr>
      <td class="email-shell" align="center" style="padding:48px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;">
          <tr>
            <td style="padding:0 4px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Georgia, 'Times New Roman', serif; font-size:31px; line-height:36px; letter-spacing:-1.2px; color:#effdf5;">Arborisis</td>
                  <td align="right" style="font-size:10px; line-height:16px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#668a71;">Transmission sécurisée</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-card" style="padding:44px 44px 40px; background:#0a120f; border:1px solid #263e30; border-radius:16px; box-shadow:0 24px 72px rgba(0,0,0,.36);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="width:42px; height:3px; background:${colors.accent}; font-size:0; line-height:0;">&nbsp;</td><td>&nbsp;</td></tr>
              </table>
              <p style="margin:28px 0 12px; font-size:10px; line-height:16px; font-weight:700; letter-spacing:2.2px; text-transform:uppercase; color:${colors.accent};">${escapeHtml(options.eyebrow)}</p>
              <h1 class="email-heading" style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:39px; line-height:43px; font-weight:400; letter-spacing:-1.2px; color:#effdf5;">${escapeHtml(options.heading)}</h1>
              <div style="margin:24px 0 0; font-size:15px; line-height:25px; color:#9db6a5;">${options.introduction}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 30px;">
                <tr>
                  <td align="center" bgcolor="${colors.button}" style="border:1px solid ${colors.buttonBorder}; border-radius:12px;">
                    <a class="email-button" href="${actionUrl}" style="display:inline-block; padding:14px 24px; border-radius:12px; color:#effdf5; font-size:14px; line-height:20px; font-weight:700; text-decoration:none;">${escapeHtml(options.actionLabel)} &nbsp;→</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background:${colors.soft}; border:1px solid #263e30; border-radius:12px;">
                <tr>
                  <td style="padding:17px 18px;">
                    <p style="margin:0 0 3px; font-size:10px; line-height:15px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#668a71;">Durée de validité</p>
                    <p style="margin:0; font-size:14px; line-height:21px; font-weight:600; color:#d8f9e6;">${escapeHtml(options.expiry)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0; padding-top:24px; border-top:1px solid #263e30; font-size:12px; line-height:20px; color:#718a79;">${escapeHtml(options.notice)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 8px 0; text-align:center;">
              <p style="margin:0 0 8px; font-size:11px; line-height:18px; color:#668a71;">Le bouton ne répond pas ? Copiez ce lien dans votre navigateur :</p>
              <p style="margin:0; font-size:11px; line-height:18px; word-break:break-all;"><a href="${actionUrl}" style="color:#7e9d84; text-decoration:underline;">${actionUrl}</a></p>
              <p style="margin:22px 0 0; font-size:10px; line-height:16px; letter-spacing:1.6px; text-transform:uppercase; color:#405648;">Arborisis · Civilisation organique persistante</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildVerificationEmail(username: string, verifyUrl: string): TransactionalEmail {
  const safeUsername = escapeHtml(username);

  return {
    subject: 'Votre monde attend — activez votre compte Arborisis',
    text: `Bonjour ${username},\n\nVotre premier monde attend. Confirmez votre adresse pour activer votre compte Arborisis :\n${verifyUrl}\n\nCe lien expire dans 24 heures.\n\nSi vous n'avez pas créé de compte, vous pouvez ignorer cet email.\n\n— L'équipe Arborisis`,
    html: buildTransactionalHtml({
      title: 'Activez votre compte — Arborisis',
      preheader: 'Votre premier monde attend. Activez votre compte Arborisis.',
      eyebrow: 'Éveil de la colonie',
      heading: 'Votre monde attend.',
      introduction: `<p style="margin:0 0 12px;">Bienvenue dans la Convergence, <strong style="color:#effdf5; font-weight:600;">${safeUsername}</strong>.</p><p style="margin:0;">Confirmez votre adresse e-mail pour faire germer votre premier monde et commencer votre expansion.</p>`,
      actionLabel: 'Activer mon compte',
      actionUrl: verifyUrl,
      expiry: '24 heures après réception',
      notice:
        "Vous n'avez pas créé de compte Arborisis ? Ignorez simplement ce message : aucune colonie ne sera activée.",
      accent: 'canopy',
    }),
  };
}

export function buildPasswordResetEmail(username: string, resetUrl: string): TransactionalEmail {
  const safeUsername = escapeHtml(username);

  return {
    subject: 'Sécurisez votre accès — Arborisis',
    text: `Bonjour ${username},\n\nNous avons reçu une demande de réinitialisation de votre mot de passe Arborisis. Choisissez-en un nouveau ici :\n${resetUrl}\n\nCe lien expire dans 1 heure.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre compte reste sécurisé.\n\n— L'équipe Arborisis`,
    html: buildTransactionalHtml({
      title: 'Réinitialisez votre mot de passe — Arborisis',
      preheader: "Un lien sécurisé pour restaurer l'accès à votre empire.",
      eyebrow: 'Accès sécurisé',
      heading: 'Restaurez votre accès.',
      introduction: `<p style="margin:0 0 12px;">Bonjour <strong style="color:#effdf5; font-weight:600;">${safeUsername}</strong>,</p><p style="margin:0;">Une demande de réinitialisation a été reçue. Choisissez un nouveau mot de passe pour reprendre le contrôle de votre empire.</p>`,
      actionLabel: 'Choisir un nouveau mot de passe',
      actionUrl: resetUrl,
      expiry: '1 heure après réception',
      notice:
        "Vous n'êtes pas à l'origine de cette demande ? Ignorez ce message : votre mot de passe actuel reste inchangé.",
      accent: 'sap',
    }),
  };
}
