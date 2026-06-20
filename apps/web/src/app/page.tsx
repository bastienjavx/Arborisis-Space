import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: siteConfig.title },
  description: siteConfig.description,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: 'fr-FR',
    },
    {
      '@type': 'VideoGame',
      '@id': `${siteConfig.url}/#game`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      image: `${siteConfig.url}/opengraph-image`,
      genre: ['Stratégie', 'MMO', 'Gestion', 'Science-fiction'],
      gamePlatform: 'Navigateur web',
      applicationCategory: 'Game',
      operatingSystem: 'Tout système avec un navigateur moderne',
      inLanguage: 'fr-FR',
      isAccessibleForFree: true,
      publisher: {
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
