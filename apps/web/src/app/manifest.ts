import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/play',
    name: siteConfig.title,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/play',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#07110b',
    theme_color: '#07110b',
    lang: 'fr-FR',
    categories: ['games', 'strategy'],
    shortcuts: [
      { name: 'Jouer', short_name: 'Jouer', url: '/play' },
      { name: 'Galaxie', short_name: 'Galaxie', url: '/galaxy' },
      { name: 'Marché', short_name: 'Marché', url: '/market' },
    ],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
