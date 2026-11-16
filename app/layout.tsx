import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MeloVox — Atelier Audio Professionnel | E-FLEX',
  description:
    'Tous vos formats. Un son maîtrisé. Convertissez, analysez, optimisez et organisez vos fichiers audio avec Smart Stream Copy et Audio Intelligence Lab.',
  openGraph: {
    title: 'MeloVox — Atelier Audio Professionnel | E-FLEX',
    description:
      'Tous vos formats. Un son maîtrisé. Convertissez, analysez, optimisez et organisez vos fichiers audio en local.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MeloVox — Atelier Audio Professionnel | E-FLEX',
    description:
      'Convertissez, analysez, optimisez et organisez vos fichiers audio en local.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100 antialiased selection:bg-blue-600/20 selection:text-blue-600 dark:selection:text-blue-400"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
