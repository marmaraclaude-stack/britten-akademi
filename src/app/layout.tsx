import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Britten Akademi',
    template: '%s | Britten Akademi',
  },
  description:
    'Britten Akademi; birebir İngilizce eğitimi için öğretmen ve öğrenci paneli.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={geist.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
