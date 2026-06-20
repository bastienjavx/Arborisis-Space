import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/verify-email',
        '/universes',
        '/play',
        '/buildings',
        '/research',
        '/production',
        '/fleets',
        '/galaxy',
        '/pve',
        '/pvp',
        '/reports',
        '/leaderboard',
        '/alliance',
        '/chat',
        '/profile',
        '/achievements',
        '/admin',
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
