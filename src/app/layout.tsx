import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import ChildHeader from '@/components/ChildHeader';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'Vocab Star — English Vocabulary Practice',
  description: 'Fun English vocabulary practice for primary school students',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-yellow-50 font-[family-name:var(--font-nunito)]">
        <ChildHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
