import type { Metadata } from 'next';
import { Nunito, Nunito_Sans } from 'next/font/google';
import './globals.css';
import ChildHeader from '@/components/ChildHeader';

// Nunito for headings — rounded, friendly, clear
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-nunito',
});

// Nunito Sans for body text — cleaner reading
const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-nunito-sans',
});

export const metadata: Metadata = {
  title: 'Vocab Star — English Vocabulary Practice',
  description: 'AI-powered English vocabulary practice for primary school students',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${nunitoSans.variable}`}>
      <body className="min-h-screen bg-slate-50 font-[family-name:var(--font-nunito-sans)] text-gray-800 antialiased">
        <ChildHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
