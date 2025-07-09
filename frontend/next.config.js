/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config (if any)
  experimental: {
    // Enable optimizations
    optimizePackageImports: ['@heroicons/react', '@headlessui/react'],
  },
  
  // Configure allowed image domains for next/image
  images: {
    // Use remotePatterns instead of deprecated domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.malikli1992.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year cache
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Bundle optimization
  output: 'standalone',
  
  // Reduce bundle size
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
  },
  
  // Configure headers for better caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },      // Fix for CSS MIME type issues - CSS files in chunks directory
      {
        source: '/_next/static/chunks/(.*)\\.css$',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // CSS files in css directory
      {
        source: '/_next/static/css/(.*)',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Fix for JS MIME type issues - only JS files in chunks directory
      {
        source: '/_next/static/chunks/(.*)\\.js$',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Explicitly tell Next.js to use PostCSS
  // This can sometimes help with Turbopack and Tailwind CSS v4
  webpack: (config, { dev, isServer }) => {
    // Aggressive bundle splitting for better performance
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 80000, // Reduced max size for better splitting
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
            maxSize: 80000,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            maxSize: 40000, // Smaller chunks
            priority: -5,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 15,
            maxSize: 60000,
          },
          nextjs: {
            test: /[\\/]node_modules[\\/]next[\\/]/,
            name: 'nextjs',
            chunks: 'all',
            priority: 10,
            maxSize: 60000,
          },
          redux: {
            test: /[\\/]node_modules[\\/](@reduxjs|react-redux)[\\/]/,
            name: 'redux',
            chunks: 'all',
            priority: 8,
            maxSize: 40000,
          },
          ui: {
            test: /[\\/]node_modules[\\/](@headlessui|@heroicons)[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 6,
            maxSize: 30000,
          },
        },
      },
    };
    
    // Tree shaking optimization
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    config.module.rules.forEach((rule) => {
      if (rule.oneOf) {
        rule.oneOf.forEach((oneOfRule) => {
          if (
            oneOfRule.use &&
            oneOfRule.use.loader &&
            oneOfRule.use.loader.includes('postcss-loader')
          ) {
            // Ensure our postcss.config.js is being used
            oneOfRule.use.options = {
              ...oneOfRule.use.options,
              postcssOptions: {
                config: './postcss.config.js',
              },
            };
          }
        });
      }
    });
    return config;
  },
};

module.exports = nextConfig;
