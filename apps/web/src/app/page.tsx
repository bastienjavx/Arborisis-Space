import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';
import { siteConfig } from '@/lib/site';
import { LANDING_FAQ } from '@/lib/landing-content';

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

const screenshots = [
  `${siteConfig.url}/images/arborisis/hero-living-planet.png`,
  `${siteConfig.url}/images/arborisis/feature-empire.png`,
  `${siteConfig.url}/images/arborisis/feature-research.png`,
  `${siteConfig.url}/images/arborisis/feature-galaxy.png`,
];

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/icon.png`,
        width: 512,
        height: 512,
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: 'fr-FR',
      publisher: { '@id': `${siteConfig.url}/#organization` },
    },
    {
      '@type': 'VideoGame',
      '@id': `${siteConfig.url}/#game`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      image: `${siteConfig.url}/opengraph-image`,
      screenshot: screenshots,
      genre: ['Stratégie', 'MMO', 'Gestion', 'Science-fiction'],
      gamePlatform: ['Navigateur web', 'PC', 'Mobile'],
      playMode: 'MultiPlayer',
      numberOfPlayers: {
        '@type': 'QuantitativeValue',
        minValue: 1,
      },
      applicationCategory: 'GameApplication',
      operatingSystem: 'Tout système avec un navigateur moderne',
      inLanguage: 'fr-FR',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      },
      publisher: { '@id': `${siteConfig.url}/#organization` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${siteConfig.url}/#faq`,
      mainEntity: LANDING_FAQ.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
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
