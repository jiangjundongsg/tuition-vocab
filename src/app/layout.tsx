import type { Metadata } from 'next';
import { DM_Sans, DM_Serif_Display, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import ChildHeader from '@/components/ChildHeader';
import ErrorBoundary from '@/components/ErrorBoundary';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-serif',
  display: 'swap',
});

// Text serif for reading passages and lead paragraphs — the "article" face
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vocab Star — English Vocabulary Practice',
  description: 'Vocabulary practice for primary school students',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable} ${sourceSerif.variable}`}>
      <body className="min-h-screen font-sans text-stone-700 antialiased">
        <ChildHeader />
        <main className="max-w-5xl mx-auto px-6 py-10">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </body>
    </html>
  );
}
