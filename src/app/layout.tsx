import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { ServiceWorker } from '@/components/ServiceWorker';

const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'The Narrow Path',
  description: 'A private space for two, walking toward Christ together.',
  applicationName: 'The Narrow Path',
  appleWebApp: { capable: true, title: 'Narrow Path', statusBarStyle: 'default' },
  robots: { index: false, follow: false }, // private app: keep out of search engines
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#FAF6EF',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={`${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
