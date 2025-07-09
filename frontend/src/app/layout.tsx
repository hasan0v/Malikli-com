// src/app/layout.tsx (for App Router)
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // This now imports the refactored globals.css
import LayoutBody from './LayoutBody';
import { Suspense } from 'react';
import CriticalImagePreloader from '../components/CriticalImagePreloader';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

// Performance monitoring script
const PerformanceScript = () => (
  <>
    <script
      dangerouslySetInnerHTML={{
        __html: `
          // Critical CSS for LCP optimization - inline styles
          const criticalCSS = document.createElement('style');
          criticalCSS.textContent = \`
            /* Priority image optimization for LCP */
            img[data-priority="true"] {
              opacity: 1 !important;
              visibility: visible !important;
              transition: none !important;
              transform: none !important;
              animation: none !important;
              display: block !important;
            }
            
            .productImage[data-priority="true"] {
              opacity: 1 !important;
              visibility: visible !important;
              transition: none !important;
              transform: none !important;
              animation: none !important;
              width: 100% !important;
              height: auto !important;
            }
            
            /* Disable all image transitions for first 4 images */
            .productImage {
              opacity: 1 !important;
              visibility: visible !important;
            }
            
            body {
              font-display: swap;
            }
          \`;
          document.head.appendChild(criticalCSS);
          
          // Block unwanted third-party scripts
          if (typeof window !== 'undefined') {
            // Aggressive image preloading
            const preloadImages = [
              'https://media.malikli1992.com/media/product_images/IMG_0691-min.webp',
              'https://media.malikli1992.com/media/product_images/IMG_0702-min.webp',
              'https://media.malikli1992.com/media/product_images/IMG_0703-min.webp',
              'https://media.malikli1992.com/media/product_images/IMG_0704-min.webp'
            ];
            
            preloadImages.forEach((src, index) => {
              const img = new Image();
              img.fetchPriority = index === 0 ? 'high' : 'low';
              img.src = src;
            });
            
            const originalSetTimeout = window.setTimeout;
            window.setTimeout = function(callback, delay, ...args) {
              // Block Rokt and other unwanted third-party callbacks
              const callbackStr = callback.toString();
              if (callbackStr.includes('rokt') || callbackStr.includes('apps.rokt.com')) {
                console.warn('⚠️ Blocked third-party script: Rokt');
                return 0;
              }
              return originalSetTimeout(callback, delay, ...args);
            };
            
            // Performance timing for LCP tracking
            if ('PerformanceObserver' in window) {
              new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                  if (entry.entryType === 'largest-contentful-paint') {
                    console.log('📊 LCP:', entry.startTime + 'ms', entry.element);
                  }
                }
              }).observe({entryTypes: ['largest-contentful-paint']});
            }
          }
        `,
      }}
    />
    <link
      rel="preconnect"
      href="https://media.malikli1992.com"
      crossOrigin="anonymous"
    />
    <link
      rel="dns-prefetch"
      href="//media.malikli1992.com"
    />
  </>
);

export const metadata: Metadata = {
  title: 'Malikli1992',
  description: 'Эксклюзивные ежемесячные дропы от Malikli1992',
  robots: 'index, follow',
  other: {
    // Resource hints for better performance
    'dns-prefetch': '//media.malikli1992.com',
    'preconnect': '//media.malikli1992.com',
    // Block unwanted third-party domains
    'referrer': 'strict-origin-when-cross-origin',
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

// Suppress hydration errors in development
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <CriticalImagePreloader />
        <PerformanceScript />
      </head>
      <body suppressHydrationWarning>
        <LayoutBody>{children}</LayoutBody>
      </body>
    </html>
  );
}
