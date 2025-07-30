"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { addToCart } from '@/store/cartSlice';
import { RootState } from '@/store/store';
import { findMatchingVariant, calculateVariantPrice, getVariantDisplayName } from '@/utils/variantUtils';
import { useI18n } from '@/hooks/useI18n';
import { useCheckoutOptions } from '@/hooks/useCheckoutOptions';
import CheckoutOptionsModal from './Auth/CheckoutOptionsModal';
import ProductDescription from './ProductDescription';
import styles from './EnhancedProductCard.module.css';

interface EnhancedProductCardProps {
  id: number;
  name: string;
  slug: string;
  price: string;
  imageUrl: string;
  color?: string;
  colorName?: string;
  size?: string;
  sizeName?: string;
  availableColors?: Array<{id?: number, code: string, name: string, display_order?: number, image?: string}>;
  availableSizes?: Array<{id?: number, code: string, name: string, display_order?: number}>;
  product?: any;
  priority?: boolean;
  index?: number;
}

const EnhancedProductCard: React.FC<EnhancedProductCardProps> = ({
  id,
  name,
  slug,
  price,
  imageUrl,
  color,
  colorName,
  size,
  sizeName,
  availableColors = [],
  availableSizes = [],
  product,
  priority = false,
  index = 0
}) => {  const { t, locale } = useI18n();
  const dispatch = useDispatch();
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isModalOpen, redirectUrl, showCheckoutOptions, hideCheckoutOptions } = useCheckoutOptions();
  const [selectedColor, setSelectedColor] = useState<string | undefined>(color);
  const [selectedColorName, setSelectedColorName] = useState<string | undefined>(colorName);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(size);
  const [selectedSizeName, setSelectedSizeName] = useState<string | undefined>(sizeName);
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(undefined);
  const [currentPrice, setCurrentPrice] = useState<number>(parseFloat(price.replace(/[^0-9.-]+/g, "")));
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isClient, setIsClient] = useState(false);
  // Initialize component state
  useEffect(() => {
    setIsClient(true);
    
    // Initialize with default selections if provided
    if (color && colorName) {
      setSelectedColor(color);
      setSelectedColorName(colorName);
    }
    
    if (size && sizeName) {
      setSelectedSize(size);
      setSelectedSizeName(sizeName);
    }
    
    // Set initial variant and price
    if (product) {
      updateVariant(color, size);
    }
  }, [product]);

  // Function to update variant based on current selections
  const updateVariant = (newColor?: string, newSize?: string) => {
    if (product) {
      const matchingVariant = findMatchingVariant(product, newColor || selectedColor, newSize || selectedSize);
      if (matchingVariant) {
        setSelectedVariantId(matchingVariant.id);
        const newPrice = calculateVariantPrice(product, matchingVariant);
        setCurrentPrice(newPrice);
        
        // Update image if variant has a specific image
        if (matchingVariant.image && matchingVariant.image !== currentImageUrl) {
          setCurrentImageUrl(matchingVariant.image);
        }
      }
    }
  };  // Get first 3 additional images for sequential display (excluding primary image)
  const displayImages = product?.images?.filter((img: any) => 
    img.image && img.image !== currentImageUrl
  ).slice(0, 3) || [];

  // State for fade animation and current image order
  const [currentOrder, setCurrentOrder] = useState([0, 1, 2]);
  const [isAnimating, setIsAnimating] = useState(false);  // Auto-rotate images in sequence with fade animation
  useEffect(() => {
    if (displayImages.length >= 2) {
      const interval = setInterval(() => {
        setIsAnimating(true);
          // Fade out, then change order, then fade in
        setTimeout(() => {
          setCurrentOrder(prev => {
            // Rotate array: move first element to end
            const newOrder = [...prev];
            const first = newOrder.shift();
            if (first !== undefined) {
              newOrder.push(first);
            }
            return newOrder;
          });
          
          // Fade back in with increased delay
          setTimeout(() => setIsAnimating(false), 600); // Increased from 300ms to 600ms
        }, 400); // Increased fade-out duration from 300ms to 400ms
      }, 4000); // 4-second intervals

      return () => clearInterval(interval);
    }
  }, [displayImages.length]);
  // Get first paragraph of description with enhanced formatting
  const getFirstParagraph = (description: string) => {
    if (!description) return '';
    
    // Split by double newlines or sentence endings to get first meaningful paragraph
    const paragraphs = description.split(/\n\n+|\. [A-Z]/).filter(p => p.trim());
    if (paragraphs.length > 0) {
      let firstParagraph = paragraphs[0].trim();
      // If it doesn't end with punctuation, add period
      if (!/[.!?]$/.test(firstParagraph)) {
        firstParagraph += '.';
      }
      return firstParagraph.length > 200 ? firstParagraph.substring(0, 200) + '...' : firstParagraph;
    }
    return '';
  };  // Get truncated description for card display
  const getTruncatedDescription = (description: string) => {
    if (!description) return '';
    
    // Clean the description by removing feature markers and bullet points for card display
    const cleanDescription = description
      .replace(/\*[^:]*:\s*/g, '') // Remove *Feature: markers
      .replace(/^[-•✓]\s*/gm, '') // Remove bullet points
      .replace(/\n\n+/g, ' ') // Replace multiple newlines with single space
      .replace(/\n/g, ' ') // Replace single newlines with space
      .trim();
    
    // Check if current language is Chinese
    const isChinese = locale === 'zh';
    
    if (isChinese) {
      // For Chinese text, use different splitting logic
      // Split by Chinese punctuation marks: 。！？
      const chineseSentences = cleanDescription.split(/[。！？]+/).filter(s => s.trim().length > 0);
      
      if (chineseSentences.length === 0) return '';
      
      // For Chinese, get first 2-3 sentences and limit character count
      let result = '';
      let sentenceCount = 0;
      const maxChineseChars = 120; // Shorter limit for Chinese characters
      
      for (let i = 0; i < chineseSentences.length && sentenceCount < 3; i++) {
        const sentence = chineseSentences[i].trim();
        if (!sentence) continue;
        
        // Add Chinese sentence with appropriate punctuation
        const punctuation = i < chineseSentences.length - 1 ? '。' : '';
        const potentialResult = result + sentence + punctuation;
        
        if (potentialResult.length <= maxChineseChars || sentenceCount === 0) {
          result = potentialResult;
          sentenceCount++;
        } else {
          break;
        }
        
        // Stop if we have at least 2 sentences
        if (sentenceCount >= 2) {
          break;
        }
      }
      
      // If result is still too long, truncate with Chinese ellipsis
      if (result.length > maxChineseChars) {
        result = result.substring(0, maxChineseChars - 3) + '...';
      }
      
      return result;
    } else {
      // Original logic for non-Chinese languages
      // Split into sentences and get first 2-3 sentences
      const sentences = cleanDescription.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      if (sentences.length === 0) return '';
      
      // Get first 2-3 sentences based on length
      let result = '';
      let sentenceCount = 0;
      const maxLength = 280; // Increased from 150 to allow for more content
      
      for (let i = 0; i < sentences.length && sentenceCount < 3; i++) {
        const sentence = sentences[i].trim();
        if (!sentence) continue;
        
        // Add sentence if it doesn't make the result too long
        const potentialResult = result + (result ? '. ' : '') + sentence + '.';
        
        if (potentialResult.length <= maxLength || sentenceCount === 0) {
          result = potentialResult;
          sentenceCount++;
        } else {
          break;
        }
        
        // Stop if we have at least 2 sentences and decent length
        if (sentenceCount >= 2 && result.length >= 120) {
          break;
        }
      }
      
      // If result is still too long, truncate with ellipsis
      if (result.length > maxLength) {
        result = result.substring(0, maxLength - 3) + '...';
      }
      
      return result;
    }
  };// Helper function to get translated description
  const getTranslatedDescription = (product: any): string => {
    return product?.translated_description || product?.description || '';
  };

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    
    setIsAddingToCart(true);
    
    try {
      // Use the calculated current price which includes variant pricing
      const finalPrice = currentPrice;
      
      const cartItemName = getVariantDisplayName(product || { name, base_price: price }, 
        product?.variants?.find((v: any) => v.id === selectedVariantId));

      // Add to cart using Redux
      dispatch(addToCart({
        id,
        variantId: selectedVariantId,
        name: cartItemName,
        price: finalPrice,
        quantity: 1,
        image: currentImageUrl,
        color: selectedColorName,
        colorCode: selectedColor,
        size: selectedSizeName
      }));

      // Optional: Show success message or notification here
      
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (isAddingToCart) return;
    
    setIsAddingToCart(true);
    
    try {
      // Use the calculated current price which includes variant pricing
      const finalPrice = currentPrice;

      // Prepare checkout parameters
      const checkoutParams = new URLSearchParams({
        buyNow: 'true',
        productId: id.toString(),
        productName: name,
        productSlug: slug,
        price: finalPrice.toString(),
        quantity: '1',
        image: currentImageUrl,
        ...(product?.buy_now_link && { buyNowLink: product.buy_now_link }),
        ...(selectedVariantId && { variantId: selectedVariantId.toString() }),
        ...(selectedColorName && { colorName: selectedColorName }),
        ...(selectedColor && { color: selectedColor }),
        ...(selectedSizeName && { sizeName: selectedSizeName }),
        ...(selectedSize && { size: selectedSize })
      });

      const checkoutUrl = `/checkout?${checkoutParams.toString()}`;

      // Check authentication
      if (!isAuthenticated) {
        // Show checkout options modal for unauthenticated users
        showCheckoutOptions(checkoutUrl);
        return;
      }

      // User is authenticated, proceed directly to checkout
      console.log('=== BUY NOW - ENHANCED PRODUCT CARD ===');
      console.log('Final URL params:', checkoutParams.toString());
      
      router.push(checkoutUrl);
    } catch (error) {
      console.error('Error processing Buy Now:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleColorSelect = (colorCode: string, colorName: string, colorImage?: string, variantId?: number) => {
    setSelectedColor(colorCode);
    setSelectedColorName(colorName);
    
    // Update the displayed image if this color has an image
    if (colorImage) {
      setCurrentImageUrl(colorImage);
    }
    
    // Update variant based on new color selection
    updateVariant(colorCode, selectedSize);
  };

  const handleSizeSelect = (sizeCode: string, sizeName: string, variantId?: number) => {
    setSelectedSize(sizeCode);
    setSelectedSizeName(sizeName);
    
    // Update variant based on new size selection
    updateVariant(selectedColor, sizeCode);
  };

  // Use effective values for current selections
  const effectiveColor = selectedColor || color;
  const effectiveColorName = selectedColorName || colorName;
  const effectiveSize = selectedSize || size;
  const effectiveSizeName = selectedSizeName || sizeName;

  // Check if all required selections are made
  const isSelectionComplete = 
    (availableColors.length === 0 || effectiveColor) && 
    (availableSizes.length === 0 || effectiveSize);

  return (
    <div className={styles.enhancedCard}>
      {/* Left side - Product Card */}
      <div className={styles.productCardSection}>        <div className={styles.imageContainer}>
          <Link href={`/products/${slug}`}>
            <Image
              src={currentImageUrl}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className={styles.productImage}
              priority={priority}
              style={{ 
                objectFit: 'cover',
                objectPosition: 'center top' // Focus on top of vertical images
              }}
            />
          </Link>
        </div>
        
        <div className={styles.productInfo}>
          <h3 className={styles.productName}>
            <Link href={`/products/${slug}`}>{name}</Link>
          </h3>
            <div className={styles.priceContainer}>
            <span className={styles.currentPrice}>{currentPrice.toFixed(2)} {t('product.price.currency')}</span>
            {parseFloat(price.replace(/[^0-9.-]+/g, "")) !== currentPrice && (
              <span className={styles.originalPrice}>{parseFloat(price.replace(/[^0-9.-]+/g, "")).toFixed(2)} {t('product.price.currency')}</span>
            )}
          </div>        {isClient && (
          <>
            {/* Color Selection */}
            {availableColors.length > 0 && (
              <div className={styles.colorSelection}>
                <div className={styles.colorOptions}>
                  {availableColors.map((colorOption, index) => (
                    <button
                      key={colorOption.id || index}
                      className={`${styles.colorSwatch} ${
                        colorOption.code === effectiveColor ? styles.selectedSwatch : ''
                      }`}
                      style={{ backgroundColor: colorOption.code }}
                      onClick={() => handleColorSelect(colorOption.code, colorOption.name, colorOption.image, colorOption.id)}
                      aria-label={colorOption.name}
                      title={colorOption.name}
                    >
                      {colorOption.code === effectiveColor && (
                        <svg className={styles.checkmark} width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {availableSizes.length > 0 && (
              <div className={styles.sizeSelection}>
                <div className={styles.sizeOptions}>
                  {availableSizes.map((sizeOption, index) => (
                    <button
                      key={sizeOption.id || index}
                      className={`${styles.sizeButton} ${
                        sizeOption.code === effectiveSize ? styles.selectedSize : ''
                      }`}
                      onClick={() => handleSizeSelect(sizeOption.code, sizeOption.name, sizeOption.id)}
                    >
                      {sizeOption.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className={styles.buttonContainer}>
          {/* Add to Cart Button */}
          <button
            className={`${styles.addToCartButton} ${
              !isSelectionComplete ? styles.addToCartDisabled : ''
            }`}
            onClick={handleAddToCart}
            disabled={isAddingToCart || !isSelectionComplete}
          >
            {!isSelectionComplete ? t('common.selectOptions') : 
             isAddingToCart ? t('product.buttons.processing') : t('common.addToCart')}
          </button>
          
          {/* Buy Now Button */}
          <button
            className={`${styles.buyNowButton} ${
              !isSelectionComplete ? styles.buyNowDisabled : ''
            }`}
            onClick={handleBuyNow}
            disabled={isAddingToCart || !isSelectionComplete}
          >
            {!isSelectionComplete ? t('common.selectOptions') : 
             isAddingToCart ? t('product.buttons.processing') : t('common.buyNow')}
          </button>
        </div>
        </div>
      </div>      {/* Right side - Dynamic Images + Story Section */}
      <div className={styles.rightSection}>        {/* Sequential Image Gallery - 3 images next to each other with fade animation */}
        {displayImages.length > 0 && (
          <div className={styles.imageGalleryRow}>
            {currentOrder.map((orderIndex: number, position: number) => {
              const img = displayImages[orderIndex];
              if (!img) return null;
              
              return (
                <div
                  key={`${img.image}-${position}`}
                  className={`${styles.galleryImageItem} ${
                    isAnimating ? styles.fading : ''
                  }`}
                  style={{
                    transitionDelay: `${position * 0.1}s`
                  }}
                >
                  <Image
                    src={img.image}
                    alt={`${name} - Gallery view ${orderIndex + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className={styles.galleryImg}
                    style={{ 
                      objectFit: 'cover',
                      objectPosition: 'center top'
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Product Story Section */}
        <div className={styles.storySection}>
          <div className={styles.storyContent}>
            <div className={styles.storyHeader}>
              <h4 className={styles.storyTitle}>{t('product.story.title')}</h4>
              <div className={styles.storyAccent}></div>
            </div>              <div className={styles.storyText}>
              <div className={styles.storyParagraph}>
                <ProductDescription description={getTruncatedDescription(getTranslatedDescription(product))} />
              </div>
              
              <div className={styles.storyDetails}>
                <div className={styles.craftedBadge}>
                  <span className={styles.badgeIcon}>✨</span>
                  <span>{t('product.story.crafted')}</span>
                </div>
                
                <Link href={`/products/${slug}`} className={styles.exploreLink}>
                  {t('product.story.explore')} 
                  <svg className={styles.arrowIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className={styles.storyBackground}></div>
          </div>
        </div>        {/* Mobile Description (shown only on mobile) */}
        <div className={styles.mobileDescriptionSection}>
          <div className={styles.descriptionText}>
            <ProductDescription description={getTruncatedDescription(getTranslatedDescription(product))} />
          </div>
        </div>
      </div>

      {/* Checkout Options Modal */}
      <CheckoutOptionsModal
        isOpen={isModalOpen}
        onClose={hideCheckoutOptions}
        redirectUrl={redirectUrl}
      />
    </div>
  );
};

export default EnhancedProductCard;
