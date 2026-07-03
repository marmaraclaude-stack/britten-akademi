import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Britten Akademi',
    template: '%s | Britten Akademi',
  },
  description:
    'Britten Akademi — birebir İngilizce eğitimi için öğretmen ve öğrenci paneli.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
