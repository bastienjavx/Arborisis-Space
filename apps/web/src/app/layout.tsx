import type { Metadata, Viewport } from 'next';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';
import { Providers } from '@/components/providers';
import { ParticleField } from '@/components/ParticleField';
import { siteConfig } from '@/lib/site';
import './globals.css';

/**
 * Identité typographique « organique littéraire » : Fraunces (serif optique aux
 * courbes douces, axes opsz/SOFT/WONK) pour le display, Hanken Grotesk (humaniste
 * chaleureux) pour le corps. Auto-hébergées via next/font (aucun layout-shift).
 */
const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz', 'SOFT', 'WONK'],
  variable: '--font-display',
});

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

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
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-FR" className={`${sans.variable} ${display.variable}`}>
      <body className="relative min-h-screen overflow-x-hidden">
        <Providers>
          <ParticleField />
          {children}
        </Providers>
      </body>
    </html>
  );
}
