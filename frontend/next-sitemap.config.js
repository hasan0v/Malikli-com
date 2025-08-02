/** @type {import('next-sitemap').IConfig} */

const config = {
  siteUrl: process.env.SITE_URL || 'https://malikli1992.com',
  generateRobotsTxt: true, // Generate robots.txt file
  generateIndexSitemap: true, // Generate index sitemap for large sites
  exclude: [
    '/admin/*', // Exclude admin panel
    '/auth/*', // Exclude authentication pages
    '/profile/*', // Exclude private profile pages
    '/dev/*', // Exclude development pages
    '/language-test', // Exclude test pages
    '/api/*', // Exclude API routes
    '*/sitemap.xml', // Exclude nested sitemaps
    '*/robots.txt', // Exclude nested robots
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/auth',
          '/profile',
          '/dev',
          '/language-test',
          '/api',
          '/*?*utm_*', // Exclude URLs with UTM parameters
          '/*?*fbclid*', // Exclude Facebook click IDs
          '/*?*gclid*', // Exclude Google click IDs
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin',
          '/auth', 
          '/profile',
          '/dev',
        ],
      },
    ],
    additionalSitemaps: [
      'https://malikli1992.com/sitemap.xml',
      'https://malikli1992.com/server-sitemap.xml', // For dynamic content
    ],
  },
  changefreq: 'daily',
  priority: 0.7,
  sitemapSize: 5000, // Split into multiple files if needed
  
  // Custom transformation for different page types
  transform: async (config, path) => {
    // Default transformation
    const defaultTransform = {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    }

    // High priority pages
    if (path === '/') {
      return {
        ...defaultTransform,
        changefreq: 'hourly',
        priority: 1.0,
      }
    }

    // Product pages - high priority with frequent updates
    if (path.startsWith('/products/')) {
      return {
        ...defaultTransform,
        changefreq: 'daily',
        priority: 0.9,
      }
    }

    // Category/collection pages
    if (path.startsWith('/products') && path === '/products') {
      return {
        ...defaultTransform,
        changefreq: 'daily', 
        priority: 0.8,
      }
    }

    // Important static pages
    if (['/about', '/contact', '/delivery', '/terms', '/privacy', '/returns', '/faq'].includes(path)) {
      return {
        ...defaultTransform,
        changefreq: 'monthly',
        priority: 0.6,
      }
    }

    // Shopping flow pages
    if (['/cart', '/checkout'].includes(path)) {
      return {
        ...defaultTransform,
        changefreq: 'weekly',
        priority: 0.5,
      }
    }

    // Utility pages
    if (['/shipping-calculator', '/ems-shipping'].includes(path)) {
      return {
        ...defaultTransform,
        changefreq: 'monthly',
        priority: 0.4,
      }
    }

    return defaultTransform
  },
  
  // Additional paths to include (for dynamic routes)
  additionalPaths: async (config) => {
    const result = []
    
    // Add language-specific versions if you have internationalization
    const languages = ['en', 'ru', 'ar', 'tr', 'zh']
    const importantPaths = ['/', '/products', '/about', '/contact', '/delivery']
    
    for (const lang of languages) {
      for (const path of importantPaths) {
        if (lang !== 'en') { // Assuming English is default
          result.push({
            loc: `/${lang}${path}`,
            changefreq: 'daily',
            priority: path === '/' ? 0.9 : 0.7,
            lastmod: new Date().toISOString(),
          })
        }
      }
    }

    return result
  },
}

module.exports = config
