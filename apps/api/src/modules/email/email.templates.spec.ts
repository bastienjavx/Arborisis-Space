import { buildPasswordResetEmail, buildVerificationEmail, escapeHtml } from './email.templates';

describe('email templates', () => {
  it('builds an accessible verification email with matching plain text', () => {
    const url = 'https://arborisis.test/verify-email?token=abc123';
    const email = buildVerificationEmail('Sylve', url);

    expect(email.subject).toContain('Arborisis');
    expect(email.html).toContain('lang="fr"');
    expect(email.html).toContain('Votre monde attend.');
    expect(email.html).toContain(`href="${url}"`);
    expect(email.html).toContain('24 heures après réception');
    expect(email.text).toContain(url);
    expect(email.text).toContain('24 heures');
  });

  it('builds a password-reset email with the security guidance', () => {
    const url = 'https://arborisis.test/reset-password?token=def456';
    const email = buildPasswordResetEmail('Mycélium', url);

    expect(email.html).toContain('Restaurez votre accès.');
    expect(email.html).toContain('1 heure après réception');
    expect(email.html).toContain(`href="${url}"`);
    expect(email.text).toContain('votre compte reste sécurisé');
  });

  it('escapes user-controlled copy and URLs in HTML', () => {
    const email = buildVerificationEmail(
      '<img src=x onerror=alert(1)>',
      'https://arborisis.test/verify?token=a&next="bad"',
    );

    expect(email.html).not.toContain('<img src=x');
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(email.html).toContain('token=a&amp;next=&quot;bad&quot;');
    expect(escapeHtml("L'arbre & la <sève>")).toBe('L&#39;arbre &amp; la &lt;sève&gt;');
  });
});
