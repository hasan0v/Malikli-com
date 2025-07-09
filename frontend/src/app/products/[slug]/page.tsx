'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Product, ProductVariant, ProductImage } from '@/types/product';
import { getProductBySlug } from '@/services/productService';
import { addToCart, addToCartAPI } from '@/store/cartSlice';
import { RootState, AppDispatch } from '@/store/store';
import LoadingCircle from '@/components/LoadingCircle';
import ProductDescription from '@/components/ProductDescription';
import { useI18n } from '../../../hooks/useI18n';
import styles from './productDetail.module.css';

// Types for variants with extended information from our backend
interface VariantWithExtendedInfo extends ProductVariant {
  size_info?: { id: number; name: string; display_order: number };
  color_info?: { id: number; name: string; hex_code: string; display_order: number };
}

export default function ProductDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  // Get auth state to determine which add-to-cart strategy to use
  const isAuthenticated = useSelector((state: RootState) => !!state.auth.user);

  // Helper function to get translated content
  const getTranslatedName = (product: Product): string => {
    return product.translated_name || product.name;
  };

  const getTranslatedDescription = (product: Product): string => {
    return product.translated_description || product.description || '';
  };
  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VariantWithExtendedInfo | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imageLoading, setImageLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [processingBuyNow, setProcessingBuyNow] = useState(false);
  const [mounted, setMounted] = useState(false);
    // Enhanced zoom and swipe states
  const [isZoomed, setIsZoomed] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  // Mark component as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {      if (!slug || typeof slug !== 'string') {
        setError(t('product.error.invalidSlug'));
        setLoading(false);
        return;
      }

      try {
        const productData = await getProductBySlug(slug);
        if (!productData) {
          setError(t('product.error.notFound'));
          setLoading(false);
          return;
        }

        setProduct(productData);
        
        // Set default selected image
        if (productData.images && productData.images.length > 0) {
          const primaryImage = productData.images.find(img => img.is_primary);
          setSelectedImage(primaryImage ? primaryImage.image : productData.images[0].image);
        }

        // If there are variants, initialize the UI
        if (productData.variants && productData.variants.length > 0) {
          // Get available sizes and colors
          processVariants(productData.variants as VariantWithExtendedInfo[]);
        }        setLoading(false);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(t('common.error'));
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  // Process variants to extract sizes and colors
  const processVariants = (variants: VariantWithExtendedInfo[]) => {
    // Handle the case where there's only one variant by selecting it
    if (variants.length === 1) {
      setSelectedVariant(variants[0]);
      if (variants[0].size_info) {
        setSelectedSize(variants[0].size_info.id);
      }
      if (variants[0].color_info) {
        setSelectedColor(variants[0].color_info.id);
      }
      return;
    }

    // If multiple variants, check if we have a default
    const defaultVariant = variants.find(v => v.is_active);
    if (defaultVariant) {
      setSelectedVariant(defaultVariant);
      if (defaultVariant.size_info) {
        setSelectedSize(defaultVariant.size_info.id);
      }
      if (defaultVariant.color_info) {
        setSelectedColor(defaultVariant.color_info.id);
      }
    }
  };
  // Handle variant selection
  useEffect(() => {
    if (!product || !product.variants) return;
    
    // Find the variant that matches both the selected size and color
    const matchingVariant = (product.variants as VariantWithExtendedInfo[]).find(variant => {
      const sizeMatch = selectedSize === null || (variant.size_info && variant.size_info.id === selectedSize);
      const colorMatch = selectedColor === null || (variant.color_info && variant.color_info.id === selectedColor);
      return sizeMatch && colorMatch;
    });
    
    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
      
      // If the variant has its own image, use that
      if (matchingVariant.image) {
        setImageLoading(true);
        setSelectedImage(matchingVariant.image);
      } else if (matchingVariant.images && matchingVariant.images.length > 0) {
        setImageLoading(true);
        const primaryVariantImage = matchingVariant.images.find(img => img.is_primary);
        setSelectedImage(primaryVariantImage ? primaryVariantImage.image : matchingVariant.images[0].image);
      }
    }
  }, [selectedSize, selectedColor, product]);
  // Handle image selection with loading
  const handleImageSelect = (imageUrl: string) => {
    setImageLoading(true);
    setSelectedImage(imageUrl);
    
    // Update current image index
    if (product?.images) {
      const index = product.images.findIndex(img => img.image === imageUrl);
      if (index !== -1) {
        setCurrentImageIndex(index);
      }
    }
  };

  // Enhanced zoom functionality
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    
    const container = e.currentTarget;
    const { left, top, width, height } = container.getBoundingClientRect();
    
    // Calculate position in percentage
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setMousePosition({ x, y });
  };

  // Toggle zoom
  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  // Open fullscreen modal
  const openModal = () => {
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  // Close fullscreen modal
  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = 'unset';
  };

  // Navigate to previous image
  const goToPrevImage = () => {
    if (!product?.images || product.images.length <= 1) return;
    
    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : product.images.length - 1;
    setCurrentImageIndex(newIndex);
    setSelectedImage(product.images[newIndex].image);
    setImageLoading(true);
  };

  // Navigate to next image
  const goToNextImage = () => {
    if (!product?.images || product.images.length <= 1) return;
    
    const newIndex = currentImageIndex < product.images.length - 1 ? currentImageIndex + 1 : 0;
    setCurrentImageIndex(newIndex);
    setSelectedImage(product.images[newIndex].image);
    setImageLoading(true);
  };
  // Touch event handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd(null);
    setShowSwipeHint(false); // Hide hint after first interaction
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;
    
    // Determine if it's a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        goToNextImage(); // Swipe left - next image
      } else {
        goToPrevImage(); // Swipe right - previous image
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Hide swipe hint after 5 seconds
  useEffect(() => {
    if (showSwipeHint && product?.images && product.images.length > 1) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSwipeHint, product?.images]);
  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isModalOpen) return;
    
    switch (e.key) {
      case 'Escape':
        closeModal();
        break;
      case 'ArrowLeft':
        goToPrevImage();
        break;
      case 'ArrowRight':
        goToNextImage();
        break;
    }
  };

  // Add keyboard event listener
  useEffect(() => {
    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isModalOpen, currentImageIndex, product?.images]);

  // Update current image index when selected image changes
  useEffect(() => {
    if (product?.images && selectedImage) {
      const index = product.images.findIndex(img => img.image === selectedImage);
      if (index !== -1) {
        setCurrentImageIndex(index);
      }
    }
  }, [selectedImage, product?.images]);

  // Handle quantity changes
  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setQuantity(value);
    }
  };  // Add to cart functionality
  const handleAddToCart = async () => {
    if (!product) return;

    setAddingToCart(true);

    try {
      // Calculate the final price
      const finalPrice = selectedVariant 
        ? parseFloat(product.base_price) + parseFloat(selectedVariant.additional_price)
        : parseFloat(product.base_price);

      // Prepare cart item data
      const cartItem = {
        id: product.id,
        name: product.translated_name || product.name,
        price: finalPrice,
        quantity: quantity,
        image: selectedImage || product.images[0]?.image,
        ...(selectedVariant?.id && { variantId: selectedVariant.id }),
        ...(selectedVariant?.color_info && { 
          color: selectedVariant.color_info.name,
          colorCode: selectedVariant.color_info.hex_code 
        }),
        ...(selectedVariant?.size_info && { size: selectedVariant.size_info.name })
      };

      console.log('=== ADD TO CART DEBUG - PRODUCT PAGE ===');
      console.log('Adding to cart:', cartItem);

      // Dispatch to Redux store (same as ProductCard)
      dispatch(addToCart(cartItem));

      console.log('Item successfully added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  // New Buy Now functionality
  const handleBuyNow = async () => {
    if (!product) return;

    setProcessingBuyNow(true);

    try {
      // Calculate the final price
      const finalPrice = selectedVariant 
        ? parseFloat(product.base_price) + parseFloat(selectedVariant.additional_price)
        : parseFloat(product.base_price);      // Redirect to checkout with product information
      const params = new URLSearchParams({
        buyNow: 'true',
        productId: product.id.toString(),
        productName: product.translated_name || product.name,
        productSlug: product.slug,
        price: finalPrice.toString(),
        quantity: quantity.toString(),
        ...(selectedVariant?.id && { variantId: selectedVariant.id.toString() }),
        ...(selectedImage && { image: selectedImage }),
        ...(selectedVariant?.color_info && { 
          color: selectedVariant.color_info.name,
          colorCode: selectedVariant.color_info.hex_code 
        }),        ...(selectedVariant?.size_info && { size: selectedVariant.size_info.name })
      });

      console.log('=== BUY NOW DEBUG - PRODUCT PAGE ===');
      console.log('Redirecting to PayPro-integrated checkout');
      console.log('Final URL params:', params.toString());window.location.href = `/checkout?${params.toString()}`;
    } catch (error) {
      console.error('Error processing Buy Now:', error);
    } finally {
      setProcessingBuyNow(false);
    }
  };

  // No wishlist functionality needed

  // Generate size options from the variants
  const renderSizeOptions = () => {
    if (!product || !product.variants) return null;

    // Extract unique size options from variants
    const uniqueSizes = new Map();
    (product.variants as VariantWithExtendedInfo[]).forEach(variant => {
      if (variant.size_info) {
        uniqueSizes.set(variant.size_info.id, variant.size_info);
      }
    });

    const sizes = Array.from(uniqueSizes.values());
    
    // If there are no sizes, don't render this section
    if (sizes.length === 0) return null;    return (
      <div className={styles.variantSection}>
        {/* <div className={styles.variantTitle}>{t('product.variants.size')}</div> */}
        <div className={styles.variantOptions}>
          {sizes.sort((a, b) => a.display_order - b.display_order).map(size => (
            <div 
              key={size.id}
              className={`${styles.sizeOption} ${selectedSize === size.id ? styles.selected : ''}`}
              onClick={() => setSelectedSize(size.id)}
            >
              {size.name}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Generate color options from the variants
  const renderColorOptions = () => {
    if (!product || !product.variants) return null;

    // Extract unique color options from variants
    const uniqueColors = new Map();
    (product.variants as VariantWithExtendedInfo[]).forEach(variant => {
      if (variant.color_info) {
        uniqueColors.set(variant.color_info.id, variant.color_info);
      }
    });

    const colors = Array.from(uniqueColors.values());
    
    // If there are no colors, don't render this section
    if (colors.length === 0) return null;    return (
      <div className={styles.variantSection}>
        {/* <div className={styles.variantTitle}>{t('product.variants.color')}</div> */}
        <div className={styles.variantOptions}>
          {colors.sort((a, b) => a.display_order - b.display_order).map(color => (
            <div 
              key={color.id}
              className={`${styles.colorOption} ${selectedColor === color.id ? styles.selected : ''}`}
              style={{ backgroundColor: color.hex_code || '#000000' }}
              onClick={() => setSelectedColor(color.id)}
              title={color.name}
            />
          ))}
        </div>
      </div>
    );
  };

  // Render selected variant info
  const renderSelectedVariantInfo = () => {
    if (!selectedVariant) return null;

    return (      <div className={styles.selectedVariantInfo}>        {selectedVariant.size_info && (
          <div className={styles.variantInfoItem}>
            <span className={styles.variantInfoLabel}>{t('product.variants.selectedInfo.size')}</span>
            <span className={styles.variantInfoValue}>{selectedVariant.size_info.name}</span>
          </div>
        )}
        {selectedVariant.color_info && (
          <div className={styles.variantInfoItem}>
            <span className={styles.variantInfoLabel}>{t('product.variants.selectedInfo.color')}</span>
            <span className={styles.variantInfoValue}>
              {selectedVariant.color_info.hex_code && (
                <span 
                  className={styles.colorPreview} 
                  style={{ backgroundColor: selectedVariant.color_info.hex_code }}
                ></span>
              )}
              {selectedVariant.color_info.name}
            </span>
          </div>
        )}
        {selectedVariant.name_suffix && (
          <div className={styles.variantInfoItem}>
            <span className={styles.variantInfoLabel}>{t('product.variants.selectedInfo.variant')}</span>
            <span className={styles.variantInfoValue}>{selectedVariant.name_suffix}</span>
          </div>
        )}
      </div>
    );
  };

  // Predefined widths for skeleton elements to prevent hydration errors
  const skeletonWidths = [85, 92, 78, 88, 80]; // Fixed percentages instead of random values
    // Render loading state
  if (loading) {
    return (      <div className={styles.loadingContainer}>
        <LoadingCircle 
          size="large" 
          color="primary" 
          text={t('product.loading.text')} 
        />
        {/* Skeleton fallback for better UX */}
        {mounted && (
          <div className={styles.skeletonFallback}>
            <div className={styles.productContainer}>
              <div className={styles.galleryContainer}>
                <div className={`${styles.skeletonMainImage} ${styles.skeleton}`}></div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`${styles.skeletonThumbnail} ${styles.skeleton}`}></div>
                  ))}
                </div>
              </div>
              <div>
                <div className={`${styles.skeletonTitle} ${styles.skeleton}`}></div>
                <div className={`${styles.skeletonPrice} ${styles.skeleton}`}></div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`${styles.skeletonText} ${styles.skeleton}`} style={{ width: `${skeletonWidths[i-1]}%` }}></div>
                ))}
                <div className={`${styles.skeletonButton} ${styles.skeleton}`}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  // Render error state
  if (error) {
    return (      <div className={styles.errorContainer}>
        <h1 className={styles.errorTitle}>{t('product.error.somethingWrong')}</h1>
        <p className={styles.errorMessage}>{error}</p>
        <button className={styles.errorButton} onClick={() => router.push('/')}>
          {t('product.error.backToHome')}
        </button>
      </div>
    );
  }

  // Render product not found
  if (!product) {
    return (      <div className={styles.errorContainer}>
        <h1 className={styles.errorTitle}>{t('product.error.notFound')}</h1>
        <p className={styles.errorMessage}>{t('product.error.notFoundMessage')}</p>
        <button className={styles.errorButton} onClick={() => router.push('/')}>
          {t('product.error.backToHome')}
        </button>
      </div>
    );
  }

  // Calculate the effective price (base price + variant additional price)
  const effectivePrice = mounted && selectedVariant 
    ? (parseFloat(product.base_price) + parseFloat(selectedVariant.additional_price)).toFixed(2)
    : product?.base_price || '0.00';
  // Define availability status and classes to prevent hydration issues
  const productStatus = 'in-stock'; // Can be changed based on inventory logic
  const availabilityDotClass = styles.inStock; // Default to in-stock
  const availabilityTextClass = styles.inStockText; // Default to in-stock
  const availabilityLabel = 'In Stock'; // Default label
  const isOutOfStock = false; // Default to in-stock
  
  // Prevent hydration mismatches
  if (!mounted) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingCircle 
          size="large" 
          color="primary" 
          text={t('product.loading.text')} 
        />
      </div>
    );
  }
    return (
    <>
      <div className={styles.productContainer}>        {/* Left column: Gallery */}
        <div className={styles.galleryContainer}>
          <div 
            className={`${styles.mainImageContainer} ${isZoomed ? styles.zoomed : ''}`}
            onMouseMove={handleImageMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={isZoomed ? toggleZoom : undefined}
          >
            {mounted && imageLoading && (
              <div className={`${styles.imageLoadingOverlay} ${!imageLoading ? styles.hidden : ''}`}>
                <LoadingCircle size="medium" color="primary" />
              </div>
            )}
            <Image 
              src={selectedImage || product.images[0]?.image || '/placeholder-product.jpg'} 
              alt={getTranslatedName(product)}
              fill
              className={`${styles.mainImage} ${isZoomed ? styles.zoomed : styles.zoomable}`}
              style={{ 
                transformOrigin: isZoomed ? `${mousePosition.x}% ${mousePosition.y}%` : 'center center',
                opacity: imageLoading ? 0.3 : 1
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
              priority
            />
            <div className={styles.zoomOverlay}></div>
              {/* Swipe indicators for mobile */}
            {mounted && product.images.length > 1 && (
              <>
                <div className={`${styles.swipeIndicator} ${styles.left} ${showSwipeHint ? styles.hint : ''}`}>‹</div>
                <div className={`${styles.swipeIndicator} ${styles.right} ${showSwipeHint ? styles.hint : ''}`}>›</div>
              </>
            )}
              {/* Zoom controls */}
            <div className={styles.zoomControls}>
              <button 
                className={styles.zoomButton}
                onClick={toggleZoom}
                title={isZoomed ? "Zoom Out" : "Zoom In"}
                aria-label={isZoomed ? "Zoom Out" : "Zoom In"}
              >
                {isZoomed ? '−' : '+'}
              </button>
              <button 
                className={styles.zoomButton}
                onClick={openModal}
                title="View Fullscreen"
                aria-label="View image in fullscreen"
              >
                ⛶
              </button>
            </div>
            
            {/* Image counter */}
            {mounted && product.images.length > 1 && (
              <div className={styles.imageCounter}>
                {currentImageIndex + 1} / {product.images.length}
              </div>
            )}
          </div>          <div className={styles.thumbnailsContainer}>
            {product.images.map((image, index) => (
              <div 
                key={image.id}
                className={`${styles.thumbnailWrapper} ${selectedImage === image.image ? styles.active : ''}`}
                onClick={() => handleImageSelect(image.image)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleImageSelect(image.image);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View image ${index + 1} of ${product.images.length}`}
              >
                <Image 
                  src={image.image} 
                  alt={image.alt_text || `${getTranslatedName(product)} - Image ${index + 1}`}
                  width={80}
                  height={80}
                  className={styles.thumbnail}
                />
              </div>
            ))}
          </div>{/* Mobile Product Info - Name and Price */}
          <div className={styles.mobileProductInfo}>
            <h1 className={styles.mobileProductName}>{getTranslatedName(product)}</h1>
            <div className={styles.mobilePriceContainer}>
              <span className={styles.mobilePrice}>{effectivePrice} {t('product.price.currency')}</span>
            </div>
          </div>

          {/* Color Options */}
          {renderColorOptions()}

          {/* Size Options */}
          {renderSizeOptions()}

          {/* Selected Variant Info */}
          {/* {renderSelectedVariantInfo()} */}          {/* Action Buttons - Mobile Position */}
          <div className={styles.mobileBuyNowSection}>
            <div className={styles.mobileActionButtons}>
              <button 
                className={`${styles.mobileAddToCartButton} ${addingToCart ? styles.loading : ''}`}
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
              >
                {addingToCart ? (
                  <>
                    <LoadingCircle size="small" color="white" />
                    <span>{t('product.buttons.adding')}</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    {t('product.buttons.addToCart')}
                  </>
                )}
              </button>
              <button 
                className={`${styles.mobileBuyNowButton} ${processingBuyNow ? styles.loading : ''}`}
                onClick={handleBuyNow}
                disabled={isOutOfStock || processingBuyNow}
              >
                {processingBuyNow ? (
                  <>
                    <LoadingCircle size="small" color="white" />
                    <span>{t('product.buttons.processing')}</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3h2l.4 2m0 0L7 13h10l4-8H5.4z"></path>
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                    </svg>
                    {t('product.buttons.buyNow')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons - Desktop Position */}
          <div className={styles.desktopBuyNowSection}>
            <div className={styles.desktopActionButtons}>
              <button 
                className={`${styles.desktopAddToCartButton} ${addingToCart ? styles.loading : ''}`}
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
              >
                {addingToCart ? (
                  <>
                    <LoadingCircle size="small" color="white" />
                    <span>{t('product.buttons.adding')}</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    {t('product.buttons.addToCart')}
                  </>
                )}
              </button>
              <button 
                className={`${styles.desktopBuyNowButton} ${processingBuyNow ? styles.loading : ''}`}
                onClick={handleBuyNow}
                disabled={isOutOfStock || processingBuyNow}
              >
                {processingBuyNow ? (
                  <>
                    <LoadingCircle size="small" color="white" />
                    <span>{t('product.buttons.processing')}</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3h2l.4 2m0 0L7 13h10l4-8H5.4z"></path>
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                    </svg>
                    {t('product.buttons.buyNow')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Product Info */}
        <div className={styles.productInfo}>          
          {/* Breadcrumbs */}
          {/* <div className={styles.breadcrumbs}>
            <Link href="/" className={styles.breadcrumbItem}>{t('product.breadcrumbs.home')}</Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            {product.category_name && (
              <>
                <Link href={`/categories/${product.slug}`} className={styles.breadcrumbItem}>
                  {product.category_name}
                </Link>
                <span className={styles.breadcrumbSeparator}>/</span>
              </>
            )}
            <span className={styles.breadcrumbItem}>{getTranslatedName(product)}</span>
          </div> */}

          {/* Product Title */}
          <h1 className={styles.productName}>{getTranslatedName(product)}</h1>{/* Price */}
          <div className={styles.priceContainer}>
            <span className={styles.price}>{effectivePrice} {t('product.price.currency')}</span>
          </div>

          {/* Availability */}
          <div className={styles.availabilitySection}>
            <div className={`${styles.availabilityDot} ${availabilityDotClass}`}></div>            <span className={`${styles.availabilityText} ${availabilityTextClass}`}>
              {t('product.availability.inStock')}
            </span>
          </div>          
          {/* Description */}
          <div className={styles.description}>
            <ProductDescription description={getTranslatedDescription(product) || t('product.description.noDescription')} />
          </div>        </div>
      </div>
        {/* Fullscreen Image Modal */}
      {mounted && isModalOpen && (
        <div 
          className={`${styles.imageModal} ${isModalOpen ? styles.active : ''}`} 
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.modalClose} 
              onClick={closeModal}
              aria-label="Close fullscreen view"
            >
              ×
            </button>
            
            {mounted && product.images.length > 1 && (
              <>
                <button 
                  className={`${styles.modalNavigation} ${styles.prev}`}
                  onClick={goToPrevImage}
                  disabled={currentImageIndex === 0}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button 
                  className={`${styles.modalNavigation} ${styles.next}`}
                  onClick={goToNextImage}
                  disabled={currentImageIndex === product.images.length - 1}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
            
            <Image
              src={selectedImage || product.images[0]?.image || '/placeholder-product.jpg'}
              alt={`${getTranslatedName(product)} - Full size view`}
              width={1200}
              height={800}
              className={styles.modalImage}
              style={{ objectFit: 'contain' }}
              priority
            />
              <div id="modal-title" className={styles.srOnly}>
              {getTranslatedName(product)} - Image {mounted ? currentImageIndex + 1 : 1} of {product.images.length}
            </div>
            <div id="modal-description" className={styles.srOnly}>
              Use arrow keys to navigate between images, or press Escape to close.
            </div>
          </div>
        </div>
      )}
      
      {/* Related Products Section - commented out for now */}
      {/* 
      <div className={styles.relatedProductsSection}>
        <h2 className={styles.sectionTitle}>{t('product.relatedProducts.title')}</h2>
        <div className={styles.productGrid}>
          Related products would be rendered here
        </div>
      </div> 
      */}
    </>
  );
}
