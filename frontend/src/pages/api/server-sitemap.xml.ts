import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSideSitemap, ISitemapField } from 'next-sitemap'

export default async function serverSitemap(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Base URL for the site
    const baseUrl = process.env.SITE_URL || 'https://malikli1992.com'
    const apiUrl = process.env.API_URL || 'https://malikli1992.com/api/v1'
    
    const fields: ISitemapField[] = []

    // Fetch products from API
    try {
      const response = await fetch(`${apiUrl}/products/`)
      if (response.ok) {
        const products = await response.json()
        
        // Add product pages to sitemap
        if (Array.isArray(products.results)) {
          products.results.forEach((product: any) => {
            if (product.id) {
              fields.push({
                loc: `${baseUrl}/products/${product.id}`,
                lastmod: product.updated_at || new Date().toISOString(),
                changefreq: 'daily',
                priority: 0.8,
              })
            }
          })
        }
      }
    } catch (error) {
      console.warn('Could not fetch products for sitemap:', error)
    }

    // Fetch categories/collections if available
    try {
      const response = await fetch(`${apiUrl}/categories/`)
      if (response.ok) {
        const categories = await response.json()
        
        if (Array.isArray(categories.results)) {
          categories.results.forEach((category: any) => {
            if (category.id || category.slug) {
              const categoryPath = category.slug || category.id
              fields.push({
                loc: `${baseUrl}/products?category=${categoryPath}`,
                lastmod: category.updated_at || new Date().toISOString(),
                changefreq: 'weekly',
                priority: 0.7,
              })
            }
          })
        }
      }
    } catch (error) {
      console.warn('Could not fetch categories for sitemap:', error)
    }

    // Add language-specific pages
    const languages = ['en', 'ru', 'ar', 'tr', 'zh']
    const importantPaths = [
      '/',
      '/products',
      '/about',
      '/contact',
      '/delivery',
      '/terms',
      '/privacy',
      '/faq'
    ]

    languages.forEach(lang => {
      importantPaths.forEach(path => {
        if (lang !== 'en') { // Assuming English is default
          fields.push({
            loc: `${baseUrl}/${lang}${path}`,
            lastmod: new Date().toISOString(),
            changefreq: path === '/' ? 'daily' : 'weekly',
            priority: path === '/' ? 0.9 : 0.6,
          })
        }
      })
    })

    return getServerSideSitemap(fields)
    
  } catch (error) {
    console.error('Error generating server-side sitemap:', error)
    
    // Return minimal sitemap on error
    return getServerSideSitemap([
      {
        loc: process.env.SITE_URL || 'https://malikli1992.com',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: 1.0,
      }
    ])
  }
}

export const getServerSideProps = () => {
  return { props: {} }
}
