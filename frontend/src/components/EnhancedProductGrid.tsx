"use client";

import React, { useState, useEffect } from 'react';
import EnhancedProductCard from './EnhancedProductCard';
import { Product } from '../types/product';
import LoadingCircle from './LoadingCircle';
import { useI18n } from '@/hooks/useI18n';
import { 
  getPrimaryImageUrl, 
  getProductVariantInfo, 
  extractAvailableColors, 
  extractAvailableSizes 
} from '../utils/imageUtils';

interface EnhancedProductGridProps {
  products: Product[];
  styles?: any;
  isLoading?: boolean;
}

const EnhancedProductGrid: React.FC<EnhancedProductGridProps> = ({ 
  products, 
  styles = {},
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
    <div className={styles.enhancedProductGrid || 'enhanced-product-grid'}>
      {products.map((product, index) => {
        const { color, colorName, size, sizeName } = getProductVariantInfo(product);
        const availableColors = extractAvailableColors(product);
        const availableSizes = extractAvailableSizes(product);
        
        return (          <EnhancedProductCard
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
            priority={index < 2} // Prioritize first 2 images for LCP
            index={index}
          />
        );
      })}
    </div>
  );
};

export default EnhancedProductGrid;
