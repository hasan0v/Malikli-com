import { Product, ProductVariant } from '../types/product';

/**
 * Gets the primary image URL for a product or returns a placeholder
 */
export const getPrimaryImageUrl = (product: Product): string => {
  try {
    // First try to get the primary image
    const primaryImage = product.images?.find(img => img.is_primary && img.image);
    if (primaryImage?.image) return primaryImage.image;
    
    // Fallback to the first image if no primary is set
    if (product.images?.length > 0 && product.images[0].image) return product.images[0].image;
    
    // Fallback for variant image if product has variants and the first variant has an image
    if (product.variants?.length > 0 && product.variants[0].image) return product.variants[0].image;
    
    // If no image is found, use a placeholder
    return '/placeholder-product.png'; // Generic placeholder
  } catch (error) {
    console.error('Error getting product image URL:', error);
    return '/placeholder-product.png'; // Return placeholder on error
  }
};

/**
 * Gets the image URL for a specific color variant
 */
export const getColorImageUrl = (product: Product, colorCode: string): string | undefined => {
  try {
    // Look for a variant with matching color code
    const matchingVariant = product.variants?.find(variant => {
      const attributes = variant.attributes || {};
      return attributes.color === colorCode || 
             attributes.colour === colorCode || 
             attributes.color_code === colorCode;
    });
    
    // If we found a matching variant with an image, return it
    if (matchingVariant?.image) {
      return matchingVariant.image;
    }
    
    // Check if this variant has associated images
    if (matchingVariant?.images && matchingVariant.images.length > 0) {
      const primaryVariantImage = matchingVariant.images.find(img => img.is_primary);
      if (primaryVariantImage?.image) return primaryVariantImage.image;
      return matchingVariant.images[0].image;
    }
    
    // If we can't find a variant-specific image, fall back to the product's primary image
    return getPrimaryImageUrl(product);
  } catch (error) {
    console.error('Error getting color variant image URL:', error);
    return undefined;
  }
};

/**
 * Extract color and size information from a product variant
 */
export const extractVariantInfo = (variant: ProductVariant) => {
  // Use the structured size_info and color_info from the backend
  const sizeInfo = variant.size_info;
  const colorInfo = variant.color_info;
  
  // Fallback to attributes for legacy support
  const attributes = variant.attributes || {};
  
  // For color: prioritize color_info, then fallback to attributes
  let color: string | undefined;
  let colorName: string | undefined;
  
  if (colorInfo) {
    color = colorInfo.hex_code || `#${colorInfo.name.toLowerCase()}`;
    colorName = colorInfo.name;
  } else {
    // Fallback to attributes-based extraction
    color = attributes.color || attributes.colour || attributes.color_code;
    const isHexColor = typeof color === 'string' && 
      (color.startsWith('#') || /^[0-9A-F]{6}$/i.test(color));
    colorName = attributes.color_name || 
                attributes.colour_name || 
                (!isHexColor && typeof color === 'string' ? color : undefined);
  }
  
  // For size: prioritize size_info, then fallback to attributes
  let size: string | undefined;
  let sizeName: string | undefined;
  
  if (sizeInfo) {
    size = sizeInfo.name;
    sizeName = sizeInfo.name;
  } else {
    // Fallback to attributes-based extraction
    size = attributes.size;
    sizeName = attributes.size_name || attributes.size;
  }
  
  return {
    color,
    colorName,
    size,
    sizeName,
    image: variant.image, // Include variant image
    variantId: variant.id // Include variant ID for cart operations
  };
};

/**
 * Get variant info for a product, returning the first available variant with color/size
 */
export const getProductVariantInfo = (product: Product) => {
  if (!product.variants || product.variants.length === 0) {
    return {
      color: undefined,
      colorName: undefined,
      size: undefined,
      sizeName: undefined,
      image: undefined,
      variantId: undefined
    };
  }
  
  // Try to find a variant with color or size information
  for (const variant of product.variants) {
    const info = extractVariantInfo(variant);
    if (info.color || info.size) {
      return info;
    }
  }
  
  // Default to first variant if none have color/size
  return extractVariantInfo(product.variants[0]);
};

/**
 * Extract all available colors from product variants
 */
export const extractAvailableColors = (product: Product) => {
  if (!product.variants || product.variants.length === 0) {
    return [];
  }
  
  const colorMap = new Map(); // Use Map to ensure uniqueness
  
  product.variants.forEach(variant => {
    const { color, colorName, image, variantId } = extractVariantInfo(variant);
    
    if (color && !colorMap.has(color)) {
      colorMap.set(color, {
        id: variantId,
        code: color,
        name: colorName || color,
        image: image || getColorImageUrl(product, color)
      });
    }
  });
  
  return Array.from(colorMap.values());
};

/**
 * Extract all available sizes from product variants
 */
export const extractAvailableSizes = (product: Product) => {
  if (!product.variants || product.variants.length === 0) {
    return [];
  }
  
  const sizeMap = new Map(); // Use Map to ensure uniqueness
  
  product.variants.forEach(variant => {
    const { size, sizeName, variantId } = extractVariantInfo(variant);
    
    if (size && !sizeMap.has(size)) {
      sizeMap.set(size, {
        id: variantId,
        code: size,
        name: sizeName || size
      });
    }
  });
  
  return Array.from(sizeMap.values());
};
