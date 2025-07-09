// Product Service for handling API calls to the products endpoints
import { Product, ProductCategory } from '../types/product';
import apiClient from './api';

// Interface for paginated responses from Django REST Framework
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Cache for products and categories
const cache = new Map<string, { data: any; timestamp: number; locale: string }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get current locale from localStorage
function getCurrentLocale(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('locale') || 'en';
  }
  return 'en';
}

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  const currentLocale = getCurrentLocale();
  
  if (cached && 
      Date.now() - cached.timestamp < CACHE_DURATION && 
      cached.locale === currentLocale) {
    return cached.data;
  }
  
  // Remove stale or language-mismatched cache entry
  cache.delete(key);
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  const currentLocale = getCurrentLocale();  cache.set(key, { 
    data, 
    timestamp: Date.now(),
    locale: currentLocale 
  });
}

// Clear all cache - used when language changes
export function clearProductCache(): void {
  console.log('Clearing product cache due to language change');
  cache.clear();
}

export const categoryToSliderItem = (category: ProductCategory, index: number) => {
  // Use category image if available, otherwise use a placeholder
  const imageSrc = category.image || '/placeholder-slider.jpg';
  return {
    id: category.id || index + 1,
    type: 'image' as const,
    src: imageSrc,
    alt: category.name || `Category ${index + 1}`,
    slug: category.slug,
    title: category.name,
    description: category.description || 'Explore our collection'
  };
};

/**
 * Fetch all products from the API with caching and pagination support
 */
export async function getProducts(page: number = 1, pageSize: number = 20): Promise<Product[]> {
  const cacheKey = `products_${page}_${pageSize}`;
  
  // Check cache first
  const cachedData = getCachedData<Product[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  try {
    const response = await apiClient.get<PaginatedResponse<Product>>(`/products/?page=${page}&page_size=${pageSize}`);
    const products = response.data.results || [];
    
    // Cache the results
    setCachedData(cacheKey, products);
    
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return []; // Return empty array on error
  }
}

/**
 * Fetch first page of products immediately for LCP optimization
 */
export async function getProductsForLCP(): Promise<Product[]> {
  const cacheKey = 'products_lcp_first_page';
  
  // Check cache first
  const cachedData = getCachedData<Product[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  try {
    // Get first 8 products only for immediate display
    const response = await apiClient.get<PaginatedResponse<Product>>(`/products/?page=1&page_size=8`);
    const products = response.data.results || [];
    
    // Cache the results
    setCachedData(cacheKey, products);
    
    return products;
  } catch (error) {
    console.error("Error fetching LCP products:", error);
    return []; // Return empty array on error
  }
}

/**
 * Fetch all products at once (for homepage)
 */
export async function getAllProducts(): Promise<Product[]> {
  const cacheKey = 'all_products';
  
  // Check cache first
  const cachedData = getCachedData<Product[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {    let allProducts: Product[] = [];
    let page = 1;
    let hasNext = true;
    
    while (hasNext) {
      const response = await apiClient.get<PaginatedResponse<Product>>(`/products/?page=${page}&page_size=50`);
      allProducts = [...allProducts, ...(response.data.results || [])];
      hasNext = !!response.data.next;
      page++;
    }
    
    // Cache the results
    setCachedData(cacheKey, allProducts);
    
    return allProducts;
  } catch (error) {
    console.error("Error fetching all products:", error);
    return []; // Return empty array on error
  }
}

/**
 * Fetch a single product by slug
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const cacheKey = `product_${slug}`;
  
  // Check cache first
  const cachedData = getCachedData<Product>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  try {
    const response = await apiClient.get(`/products/${slug}/`);
    const product = response.data;
    
    // Cache the result
    setCachedData(cacheKey, product);
    
    return product;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error(`Error fetching product with slug ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch all categories
 * @param featured Optional flag to fetch only featured categories
 */
export async function getCategories(featured?: boolean): Promise<ProductCategory[]> {
  const cacheKey = `categories_${featured ? 'featured' : 'all'}`;
  
  // Check cache first
  const cachedData = getCachedData<ProductCategory[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  try {
    let url = '/categories/';
    if (featured) {
      url += '?is_featured=true';
    }
    
    const response = await apiClient.get<PaginatedResponse<ProductCategory>>(url);
    const categories = response.data.results || [];
    
    // Cache the results
    setCachedData(cacheKey, categories);
    
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return []; // Return empty array on error
  }
}

/**
 * Fetch products by category slug with caching
 */
export async function getProductsByCategory(categorySlug: string, page: number = 1): Promise<Product[]> {
  const cacheKey = `products_category_${categorySlug}_${page}`;
  
  // Check cache first
  const cachedData = getCachedData<Product[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  try {
    const response = await apiClient.get<PaginatedResponse<Product>>(`/products/?category__slug=${categorySlug}&page=${page}`);
    const products = response.data.results || [];
    
    // Cache the results
    setCachedData(cacheKey, products);
      return products;
  } catch (error) {
    console.error(`Error fetching products for category ${categorySlug}:`, error);
    return []; // Return empty array on error
  }
}
