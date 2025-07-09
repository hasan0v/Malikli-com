"use client";

import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { Product } from '../types/product';
import LoadingCircle from './LoadingCircle';
import { useI18n } from '@/hooks/useI18n';
import { 
  getPrimaryImageUrl, 
  getProductVariantInfo, 
  extractAvailableColors, 
  extractAvailableSizes 
} from '../utils/imageUtils';

interface ProductGridProps {
  products: Product[];
  styles?: any; // Make styles optional
  isLoading?: boolean;
}

const ProductGrid: React.FC<ProductGridProps> = ({ 
  products, 
  styles = {},  // Default empty object for styles
  isLoading = false
}) => {
  const { t } = useI18n();
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    if (products && products.length > 0) {
      // Simulate image loading delay
      const timer = setTimeout(() => {
        setIsImageLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [products]);
  if (isLoading || isImageLoading) {
    return (
      <div className={styles.sectionLoading || 'sectionLoading'}>
        <LoadingCircle 
          size="medium" 
          color="primary" 
          text={t('home.loading.products')} 
        />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return <p>{t('home.noProducts')}</p>;
  }
  return (
    <div className={styles.productGrid || ''}>
      {products.map((product, index) => {
        const { color, colorName, size, sizeName } = getProductVariantInfo(product);
        const availableColors = extractAvailableColors(product);
        const availableSizes = extractAvailableSizes(product);
          return (          <ProductCard
            key={product.id}
            id={product.id}
            name={product.translated_name || product.name}
            slug={product.slug}
            price={product.base_price}
            imageUrl={getPrimaryImageUrl(product)}
            color={color}
            colorName={colorName}
            size={size}
            sizeName={sizeName}
            availableColors={availableColors}
            availableSizes={availableSizes}
            product={product}
            priority={index < 4} // Prioritize first 4 images for LCP
            index={index}
          />
        );
      })}
    </div>
  );
};

export default ProductGrid;
