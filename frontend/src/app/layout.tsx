import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { CookieConsent } from '@/components/common/cookie-consent';
import { WebVitalsTracker } from '@/components/analytics/web-vitals-tracker';
import { OrganizationStructuredData, WebsiteStructuredData, LocalBusinessStructuredData } from '@/components/seo/structured-data';
import { SkipToContent } from '@/components/accessibility/SkipToContent';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'OpenTable Clone - Restaurant Reservations',
    template: '%s | OpenTable Clone',
  },
  description: 'Find and book restaurant reservations instantly with our OpenTable clone app',
  keywords: ['restaurant', 'reservation', 'booking', 'dining', 'food'],
  authors: [{ name: 'OpenTable Clone Team' }],
  creator: 'OpenTable Clone',
  publisher: 'OpenTable Clone',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://opentable-clone.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://opentable-clone.vercel.app',
    siteName: 'OpenTable Clone',
    title: 'OpenTable Clone - Restaurant Reservations',
    description: 'Find and book restaurant reservations instantly',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OpenTable Clone',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenTable Clone - Restaurant Reservations',
    description: 'Find and book restaurant reservations instantly',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/safari-pinned-tab.svg',
        color: '#dc2626',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OpenTable Clone',
    startupImage: [
      {
        url: '/splash/apple-splash-2048-2732.jpg',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1668-2224.jpg',
        media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1536-2048.jpg',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1125-2436.jpg',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1242-2688.jpg',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-828-1792.jpg',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-1242-2208.jpg',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-750-1334.jpg',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/apple-splash-640-1136.jpg',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'OpenTable Clone',
    'application-name': 'OpenTable Clone',
    'msapplication-TileColor': '#dc2626',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#dc2626',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#dc2626' },
    { media: '(prefers-color-scheme: dark)', color: '#991b1b' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OpenTable Clone" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <AuthSessionProvider>
            <Providers>
              {/* Accessibility: Skip to Content Link */}
              <SkipToContent />

              {/* SEO Structured Data */}
              <OrganizationStructuredData />
              <WebsiteStructuredData />
              <LocalBusinessStructuredData />

              <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <main id="main-content" className="flex-1" role="main">
                  {children}
                </main>
                <Footer />
              </div>
              <CookieConsent />
              <WebVitalsTracker />
            </Providers>
          </AuthSessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}