import { Product, ProductVariant } from '../types/product';

/**
 * Find a product variant that matches the selected color and size
 */
export const findMatchingVariant = (
  product: Product, 
  selectedColor?: string, 
  selectedSize?: string
): ProductVariant | undefined => {
  if (!product.variants || product.variants.length === 0) {
    return undefined;
  }

  // Try to find an exact match first (both color and size)
  if (selectedColor && selectedSize) {
    const exactMatch = product.variants.find(variant => {
      const colorMatch = variant.color_info?.hex_code === selectedColor || 
                        variant.color_info?.name === selectedColor ||
                        variant.attributes?.color === selectedColor;
      const sizeMatch = variant.size_info?.name === selectedSize ||
                       variant.attributes?.size === selectedSize;
      return colorMatch && sizeMatch;
    });
    if (exactMatch) return exactMatch;
  }

  // Try to find a color match
  if (selectedColor) {
    const colorMatch = product.variants.find(variant => {
      return variant.color_info?.hex_code === selectedColor || 
             variant.color_info?.name === selectedColor ||
             variant.attributes?.color === selectedColor;
    });
    if (colorMatch) return colorMatch;
  }

  // Try to find a size match
  if (selectedSize) {
    const sizeMatch = product.variants.find(variant => {
      return variant.size_info?.name === selectedSize ||
             variant.attributes?.size === selectedSize;
    });
    if (sizeMatch) return sizeMatch;
  }

  // Return the first active variant as fallback
  return product.variants.find(variant => variant.is_active) || product.variants[0];
};

/**
 * Calculate the total price for a product variant
 */
export const calculateVariantPrice = (product: Product, variant?: ProductVariant): number => {
  const basePrice = parseFloat(product.base_price);
  const additionalPrice = variant ? parseFloat(variant.additional_price) : 0;
  return basePrice + additionalPrice;
};

/**
 * Get the display name for a variant
 */
export const getVariantDisplayName = (product: Product, variant?: ProductVariant): string => {
  const productName = product.translated_name || product.name;
  if (!variant) return productName;

  const parts = [productName];
  
  if (variant.size_info?.name) {
    parts.push(variant.size_info.name);
  }
  
  if (variant.color_info?.name) {
    parts.push(variant.color_info.name);
  }
  
  if (variant.name_suffix) {
    parts.push(variant.name_suffix);
  }

  return parts.join(' - ');
};
