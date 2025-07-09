"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import styles from '../app/home.module.css';
import Link from 'next/link';
import { getAllProducts, getProductsForLCP, getCategories, categoryToSliderItem } from '../services/productService';
import { Product, GroupedProducts } from '../types/product';
import ProductGrid from '../components/ProductGrid';
import EnhancedProductGrid from '../components/EnhancedProductGrid';
import LoadingCircle from '../components/LoadingCircle';
import { useI18n } from '../hooks/useI18n';
import { getPrimaryImageUrl } from '../utils/imageUtils';

// Dynamic imports for non-critical components to reduce initial bundle size
const ImageSlider = dynamic(() => import('../components/ImageSlider'), {
  loading: () => <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />,
  ssr: false,
});

const ImagePreloader = dynamic(() => import('../components/ImagePreloader'), {
  ssr: false,
});

const HomePageClient = () => {
  const { t } = useI18n();
  
  // Fallback slider items in case we don't get any categories with images
  const fallbackSliderItems = [
    { id: 1, type: 'image' as const, src: '/placeholder-slider-1.jpg', alt: t('home.slider.promo1Alt'), slug: 'promo-1', title: t('home.slider.promo1Title'), description: t('home.slider.promo1Description') },
    { id: 2, type: 'image' as const, src: '/placeholder-slider-2.jpg', alt: t('home.slider.promo2Alt'), slug: 'promo-2', title: t('home.slider.promo2Title'), description: t('home.slider.promo2Description') },
    { id: 3, type: 'image' as const, src: '/placeholder-slider-3.jpg', alt: t('home.slider.newCollectionAlt'), slug: 'new-collection', title: t('home.slider.newCollectionTitle'), description: t('home.slider.newCollectionDescription') },
  ];
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sliderItems, setSliderItems] = useState<any[]>([]);
  const [isLoadingSlider, setIsLoadingSlider] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {    const loadData = async () => {
      try {
        // Load critical products immediately for LCP
        setIsLoadingProducts(true);
        const criticalProducts = await getProductsForLCP();
        setProducts(criticalProducts);
        setIsLoadingProducts(false);
        
        // Load remaining products in background
        setTimeout(async () => {
          try {
            const allProducts = await getAllProducts();
            if (allProducts.length > criticalProducts.length) {
              setProducts(allProducts);
            }
          } catch (error) {
            console.warn('Failed to load additional products:', error);
          }
        }, 100);
        
        // Load slider data after critical content (lower priority for LCP)
        setIsLoadingSlider(true);
        const categories = await getCategories(true);
        
        // Create slider items from categories with images
        let items = categories
          .filter(category => category.image)
          .map((category, index) => categoryToSliderItem(category, index));
        
        // If no categories with images were found, use fallback images
        if (items.length === 0) {
          items = fallbackSliderItems;
        }
        
        setSliderItems(items);
        setIsLoadingSlider(false);
        
      } catch (err) {
        console.error('Error loading homepage data:', err);
        setError(t('common.error'));
        setIsLoadingSlider(false);
        setIsLoadingProducts(false);
      }
    };

    loadData();
  }, []);  const groupedProducts = useMemo(() => {
    return products.reduce<GroupedProducts>((acc, product) => {
      const categoryName = product.category_name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    }, {});
  }, [products]);

  // Get critical images for preloading (first 4 products)
  const criticalImages = useMemo(() => {
    return products.slice(0, 4).map(product => getPrimaryImageUrl(product)).filter(Boolean);
  }, [products]);
  if (error) {
    return (
      <div className={styles["page-container"]}>
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold mb-6 text-red-600">
            {t('home.error.title')}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary text-lg py-3 px-8"
          >
            {t('home.error.button')}
          </button>
        </div>
      </div>
    );
  }  return (
    <div className={styles["page-container"]}>
      {/* Preload critical images for LCP */}
      <ImagePreloader images={criticalImages} />
      
      {/* Featured categories slider at the top */}
      {/* <div className={styles.sliderContainer}>{isLoadingSlider ? (
          <div className={styles.sliderLoading}>
            <LoadingCircle 
              size="large" 
              color="white" 
              text={t('home.loading.slider')} 
              className={styles.sliderLoadingContent}
            />
          </div>
        ) : (
          <ImageSlider items={sliderItems} />
        )}
      </div> */}
      
      {/* Product categories below the slider */}
      <div className={styles.productsContainer}>        {isLoadingProducts ? (
          <div className={styles.productsLoading}>
            <LoadingCircle 
              size="large" 
              color="primary" 
              text={t('home.loading.products')} 
            />
            
            {/* Loading skeleton for products */}
            <div className={styles.productGridLoading}>
              {[...Array(8)].map((_, index) => (
                <div key={index} className={styles.productCardSkeleton}></div>
              ))}
            </div>
          </div>
        ) : (          <>
            {Object.entries(groupedProducts).map(([categoryName, productsInCategory]) => (
              <section key={categoryName} className={`${styles["collection-section"]} ${styles.enhanced || 'enhanced'}`}>
                <h2 className={styles["collection-title"]}>{categoryName}</h2>
                <EnhancedProductGrid 
                  products={productsInCategory} 
                  styles={styles} 
                />
              </section>
            ))}{products.length === 0 && (
              <div className="text-center py-20">
                <h1 className="text-3xl font-bold mb-6 text-brand-navy">
                  {t('home.welcome.title')}<span className="text-brand-malikli-blue">1992</span>!
                </h1>
                <p className="text-xl text-brand-charcoal mb-8">
                  {t('home.welcome.subtitle')}
                </p>
                <Link href="/drops">
                  <button className="btn-primary text-lg py-3 px-8">
                    {t('home.welcome.viewDrops')}
                  </button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePageClient;
