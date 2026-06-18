import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { ParticleField } from '@/components/ParticleField';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Arborisis',
  description: 'Cultivez une civilisation organique à travers une galaxie vivante.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="relative min-h-screen overflow-x-hidden">
        <Providers>
          <ParticleField />
          {children}
        </Providers>
      </body>
    </html>
  );
}
