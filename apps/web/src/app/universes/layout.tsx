import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Choisir un univers',
  robots: { index: false, follow: false },
};

export default function UniversesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
