import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { ParticleField } from '@/components/ParticleField';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arborisis',
  description: 'Cultivez une civilisation organique à travers une galaxie vivante.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="relative min-h-screen overflow-x-hidden">
        <Providers>
          <ParticleField />
          {children}
        </Providers>
      </body>
    </html>
  );
}
