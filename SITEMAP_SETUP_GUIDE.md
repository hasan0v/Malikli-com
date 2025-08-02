# Sitemap Setup Guide

This guide explains how to set up and use the sitemap configuration for the Malikli e-commerce website.

## Files Created

1. **`next-sitemap.config.js`** - Main sitemap configuration
2. **`src/pages/api/server-sitemap.xml.ts`** - Dynamic sitemap for products
3. **`.env.example`** - Environment variables template

## Installation

1. Install the required package:
```bash
cd frontend
npm install next-sitemap@^4.2.3
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your actual domain:
```env
SITE_URL=https://malikli1992.com
API_URL=https://malikli1992.com/api/v1
```

## Usage

### Generate sitemap after build:
```bash
npm run build
```
The `postbuild` script will automatically generate the sitemap.

### Generate sitemap manually:
```bash
npm run sitemap
```

## Generated Files

After running the sitemap generation, these files will be created in the `public` folder:

- `public/sitemap.xml` - Main sitemap index
- `public/sitemap-0.xml` - Static pages sitemap
- `public/server-sitemap.xml` - Dynamic products sitemap
- `public/robots.txt` - Search engine directives

## Configuration Details

### Static Pages Included:
- Homepage (priority: 1.0)
- Product listing page (priority: 0.8)
- About, Contact, Delivery pages (priority: 0.6)
- Terms, Privacy, FAQ pages (priority: 0.6)

### Dynamic Pages:
- Individual product pages (priority: 0.8)
- Category/collection pages (priority: 0.7)
- Multi-language versions (priority: 0.6-0.9)

### Excluded Pages:
- Admin panel (`/admin/*`)
- Authentication pages (`/auth/*`)
- Private profile pages (`/profile/*`)
- Development pages (`/dev/*`)
- API routes (`/api/*`)

## Multilingual Support

The sitemap includes language-specific versions for:
- English (default)
- Russian (`/ru/*`)
- Arabic (`/ar/*`)
- Turkish (`/tr/*`)
- Chinese (`/zh/*`)

## SEO Features

- **Robots.txt generation** - Automatically created with proper directives
- **Change frequency** - Optimized for different page types
- **Priority weights** - Higher priority for important pages
- **Last modified dates** - Uses product update timestamps
- **Split sitemaps** - Large sites split into multiple files

## Deployment

The sitemap will be automatically generated during the build process and deployed with your site. Search engines will find it at:

- https://malikli1992.com/sitemap.xml
- https://malikli1992.com/robots.txt

## Monitoring

Check Google Search Console to monitor:
- Sitemap submission status
- Indexing coverage
- Any crawling errors

Submit your sitemap URL in Google Search Console:
`https://malikli1992.com/sitemap.xml`
