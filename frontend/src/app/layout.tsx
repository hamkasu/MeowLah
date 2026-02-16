import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/components/layout/Providers';
import { BottomNav } from '@/components/layout/BottomNav';
import { InstallPrompt } from '@/components/install/InstallPrompt';
import { ServiceWorkerRegistrar } from '@/components/layout/ServiceWorkerRegistrar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'MeowLah — Catstagram + CatFinder Malaysia',
    template: '%s | MeowLah',
  },
  description:
    'Share cat moments, find missing cats, and honor beloved companions in Malaysia\'s cat community.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MeowLah',
  },
  openGraph: {
    type: 'website',
    siteName: 'MeowLah',
    title: 'MeowLah — Catstagram + CatFinder Malaysia',
    description: 'Malaysia\'s cat community platform',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.className} bg-black text-white`}>
        <Providers>
          <ServiceWorkerRegistrar />
          <InstallPrompt />
          <main>{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
