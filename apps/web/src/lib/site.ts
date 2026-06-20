const configuredSiteUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

function normalizeSiteUrl(value: string | undefined): string {
  const fallback =
    process.env.NODE_ENV === 'production' ? 'https://arborisis.com' : 'http://localhost:3000';

  try {
    const url = new URL(value || fallback);
    return url.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

export const siteConfig = {
  name: 'Arborisis',
  title: 'Arborisis — Jeu de stratégie spatiale organique',
  description:
    'Cultivez un empire vivant dans Arborisis, un jeu de stratégie spatiale multijoueur sur navigateur. Développez vos mondes, recherchez des symbioses et explorez la galaxie.',
  url: normalizeSiteUrl(configuredSiteUrl),
} as const;
