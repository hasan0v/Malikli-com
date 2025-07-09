// types/backendCart.ts
// Backend cart item structure from Django API
export interface BackendCartItem {
  id: number;
  cart: string;
  drop_product: number | null;
  product_variant: number | null;
  quantity: number;
  color: string | null;
  color_code: string | null;
  size: string | null;  drop_product_details?: {
    id: number;
    product: {
      id: number;
      name: string;
      base_price: number;
    };
    drop_price: number;
    current_stock_quantity: number;
    image?: string;
    // Add other fields as needed
  };  product_variant_details?: {
    id: number;
    product: number;
    product_details: {
      id: number;
      name: string;
      slug: string;
      base_price: string;
      category_name?: string;
      images?: Array<{
        id: number;
        image: string;
        alt_text?: string;
        display_order: number;
        is_primary: boolean;
      }>;
    };
    additional_price: string;
    size_info?: {
      id: number;
      name: string;
    };
    color_info?: {
      id: number;
      name: string;
      hex_code?: string;
    };
    image?: string;
    images?: Array<{
      id: number;
      image: string;
      alt_text?: string;
      display_order: number;
      is_primary: boolean;
    }>;
    // Add other fields as needed
  };
  unit_price: number;
  total_price: number;
  added_at: string;
}

export interface BackendCart {
  cart_id: string;
  user?: number;
  user_username?: string;
  items: BackendCartItem[];
  total_items: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
}

// Helper function to convert backend cart item to frontend cart item
export function convertBackendItemToFrontend(backendItem: BackendCartItem) {
  // Extract product details - for drop products it's direct, for variants it's nested in product_details
  let productInfo;
  if (backendItem.drop_product_details) {
    productInfo = {
      name: backendItem.drop_product_details.product.name,
      basePrice: backendItem.drop_product_details.product.base_price,
    };
  } else if (backendItem.product_variant_details?.product_details) {
    productInfo = {
      name: backendItem.product_variant_details.product_details.name,
      basePrice: parseFloat(backendItem.product_variant_details.product_details.base_price),
    };
  }
  
  // Extract image from variant or product details
  let image: string | undefined;
  if (backendItem.product_variant_details?.image) {
    image = backendItem.product_variant_details.image;
  } else if (backendItem.product_variant_details?.images && backendItem.product_variant_details.images.length > 0) {
    // Use the primary image or first image if available
    const primaryImage = backendItem.product_variant_details.images.find(img => img.is_primary);
    image = primaryImage ? primaryImage.image : backendItem.product_variant_details.images[0].image;
  } else if (backendItem.product_variant_details?.product_details?.images && backendItem.product_variant_details.product_details.images.length > 0) {
    // Use product images if variant doesn't have images
    const primaryImage = backendItem.product_variant_details.product_details.images.find(img => img.is_primary);
    image = primaryImage ? primaryImage.image : backendItem.product_variant_details.product_details.images[0].image;
  } else if (backendItem.drop_product_details?.image) {
    image = backendItem.drop_product_details.image;
  }
  
  // Extract color and size information - prioritize direct fields, fallback to nested variant info
  let color: string | undefined;
  let colorCode: string | undefined;
  let size: string | undefined;
  
  // Use direct cart item fields if available
  if (backendItem.color) {
    color = backendItem.color;
  } else if (backendItem.product_variant_details?.color_info?.name) {
    // Fallback to variant color info
    color = backendItem.product_variant_details.color_info.name;
  }
  
  if (backendItem.color_code) {
    colorCode = backendItem.color_code;
  } else if (backendItem.product_variant_details?.color_info?.hex_code) {
    // Fallback to variant color info
    colorCode = backendItem.product_variant_details.color_info.hex_code;
  }
  
  if (backendItem.size) {
    size = backendItem.size;
  } else if (backendItem.product_variant_details?.size_info?.name) {
    // Fallback to variant size info
    size = backendItem.product_variant_details.size_info.name;
  }
  
  const convertedItem = {
    id: backendItem.drop_product || backendItem.product_variant_details?.product_details?.id || backendItem.id,
    variantId: backendItem.product_variant || undefined,
    dropProductId: backendItem.drop_product || undefined,
    isDropProduct: !!backendItem.drop_product,
    name: productInfo?.name || 'Unknown Product',
    price: backendItem.unit_price,
    quantity: backendItem.quantity,
    image: image,
    color: color,
    colorCode: colorCode,
    size: size,
  };
  
  return convertedItem;
}

// Helper function to convert frontend cart item to backend sync format
export function convertFrontendItemToBackend(frontendItem: import('../store/cartSlice').CartItem) {
  // Check if this is a drop product or regular product
  if (frontendItem.isDropProduct || frontendItem.dropProductId) {
    return {
      drop_product_id: frontendItem.dropProductId || frontendItem.id,
      quantity: frontendItem.quantity,
      color: frontendItem.color || undefined,
      color_code: frontendItem.colorCode || undefined,
      size: frontendItem.size || undefined,
      product_image: frontendItem.image || undefined, // Include image
    };
  } else {
    // This is a regular product with variants
    // Only send product_variant_id if we have a valid variantId
    if (frontendItem.variantId) {
      return {
        product_variant_id: frontendItem.variantId,
        quantity: frontendItem.quantity,
        color: frontendItem.color || undefined,
        color_code: frontendItem.colorCode || undefined,
        size: frontendItem.size || undefined,
        product_image: frontendItem.image || undefined, // Include image
      };
    } else {
      // For products without variants, log a warning and return an invalid item
      // This will be filtered out in convertCartItemsToSyncFormat
      console.warn('Product without variant ID found in cart:', frontendItem);
      return {
        // Don't set either ID - this will be filtered out
        quantity: frontendItem.quantity,
        color: frontendItem.color || undefined,
        color_code: frontendItem.colorCode || undefined,
        size: frontendItem.size || undefined,
        product_image: frontendItem.image || undefined, // Include image
      };
    }
  }
}
