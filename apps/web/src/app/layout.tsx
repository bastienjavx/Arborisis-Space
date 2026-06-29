import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { ParticleField } from '@/components/ParticleField';
import { siteConfig } from '@/lib/site';
import './globals.css';

/**
 * La production Railway ne doit pas dépendre d'un fetch Google Fonts pendant le
 * build Next.js : les variables CSS sont définies dans globals.css avec des
 * piles système robustes.
 */

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: 'game',
  keywords: [
    'jeu de stratégie spatiale',
    'jeu multijoueur en ligne',
    'jeu de gestion',
    'MMO spatial',
    'civilisation organique',
    'jeu par navigateur',
    'Arborisis',
  ],
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
  },
  appleWebApp: {
    title: siteConfig.name,
    capable: true,
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
  themeColor: '#07110b',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-FR">
      <body className="relative min-h-screen overflow-x-hidden">
        <Providers>
          <ParticleField />
          {children}
        </Providers>
      </body>
    </html>
  );
}
