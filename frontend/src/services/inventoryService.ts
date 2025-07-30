// Frontend inventory service
import apiClient from './api';
import type {
  StockCheckItem,
  StockAvailabilityResponse,
  UserReservationsResponse,
  LowStockAlertsResponse,
  BulkStockUpdate,
  BulkStockUpdateResponse,
  InventoryDashboardResponse,
  ProductInventoryStatus
} from '../types/inventory';

const INVENTORY_BASE_URL = '/inventory';
const PRODUCTS_BASE_URL = '/products';

/**
 * Check stock availability for multiple items before adding to cart
 */
export async function checkStockAvailability(items: StockCheckItem[]): Promise<StockAvailabilityResponse | null> {
  try {
    const response = await apiClient.post(`${INVENTORY_BASE_URL}/check-stock/`, {
      items
    });
    return response.data;
  } catch (error) {
    console.error('Error checking stock availability:', error);
    return null;
  }
}

/**
 * Check stock availability for a single variant
 */
export async function checkVariantStock(variantId: number, quantity: number = 1): Promise<boolean> {
  const result = await checkStockAvailability([{
    type: 'variant',
    id: variantId,
    quantity
  }]);
  
  return result?.all_available || false;
}

/**
 * Check stock availability for a single drop product
 */
export async function checkDropProductStock(dropProductId: number, quantity: number = 1): Promise<boolean> {
  const result = await checkStockAvailability([{
    type: 'drop_product',
    id: dropProductId,
    quantity
  }]);
  
  return result?.all_available || false;
}

/**
 * Get current user's reservations (requires authentication)
 */
export async function getUserReservations(): Promise<UserReservationsResponse | null> {
  try {
    const response = await apiClient.get(`${INVENTORY_BASE_URL}/reservations/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    return null;
  }
}

/**
 * Get inventory status for a specific product (all variants)
 */
export async function getProductInventoryStatus(productSlug: string): Promise<ProductInventoryStatus | null> {
  try {
    const response = await apiClient.get(`${PRODUCTS_BASE_URL}/${productSlug}/check-stock/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product inventory status:', error);
    return null;
  }
}

/**
 * Get low stock alerts (admin only)
 */
export async function getLowStockAlerts(): Promise<LowStockAlertsResponse | null> {
  try {
    const response = await apiClient.get(`${PRODUCTS_BASE_URL}/low-stock-alerts/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    return null;
  }
}

/**
 * Bulk update stock quantities (admin only)
 */
export async function bulkUpdateStock(updates: BulkStockUpdate[]): Promise<BulkStockUpdateResponse | null> {
  try {
    const response = await apiClient.post(`${INVENTORY_BASE_URL}/bulk-update/`, {
      updates
    });
    return response.data;
  } catch (error) {
    console.error('Error performing bulk stock update:', error);
    return null;
  }
}

/**
 * Get inventory dashboard data (admin only)
 */
export async function getInventoryDashboardData(): Promise<InventoryDashboardResponse | null> {
  try {
    const response = await apiClient.get(`${INVENTORY_BASE_URL}/dashboard/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory dashboard data:', error);
    return null;
  }
}

/**
 * Validate cart items before checkout
 * Returns items that are not available and need to be removed/reduced
 */
export async function validateCartItems(cartItems: Array<{
  id: number;
  variantId?: number;
  dropProductId?: number;
  quantity: number;
  name: string;
}>): Promise<{
  valid: boolean;
  unavailableItems: Array<{
    item: any;
    requestedQuantity: number;
    availableQuantity: number;
    reason: string;
  }>;
}> {
  const stockCheckItems: StockCheckItem[] = cartItems.map(item => ({
    type: item.variantId ? 'variant' : 'drop_product',
    id: item.variantId || item.dropProductId || item.id,
    quantity: item.quantity
  }));

  const stockResult = await checkStockAvailability(stockCheckItems);
  
  if (!stockResult) {
    return {
      valid: false,
      unavailableItems: cartItems.map(item => ({
        item,
        requestedQuantity: item.quantity,
        availableQuantity: 0,
        reason: 'Unable to check stock availability'
      }))
    };
  }

  const unavailableItems = [];
  
  for (let i = 0; i < cartItems.length; i++) {
    const cartItem = cartItems[i];
    const stockItem = stockResult.items[i];
    
    if (!stockItem.available) {
      unavailableItems.push({
        item: cartItem,
        requestedQuantity: cartItem.quantity,
        availableQuantity: stockItem.available_quantity,
        reason: stockItem.available_quantity === 0 ? 'Out of stock' : 'Insufficient stock'
      });
    }
  }

  return {
    valid: unavailableItems.length === 0,
    unavailableItems
  };
}

/**
 * Get stock status text for display
 */
export function getStockStatusText(availableQuantity: number, isLowStock: boolean): string {
  if (availableQuantity === 0) {
    return 'Out of Stock';
  } else if (isLowStock) {
    return `Low Stock (${availableQuantity} left)`;
  } else if (availableQuantity <= 5) {
    return `${availableQuantity} in stock`;
  } else {
    return 'In Stock';
  }
}

/**
 * Get stock status color for UI
 */
export function getStockStatusColor(availableQuantity: number, isLowStock: boolean): 'success' | 'warning' | 'error' {
  if (availableQuantity === 0) {
    return 'error';
  } else if (isLowStock) {
    return 'warning';
  } else {
    return 'success';
  }
}

/**
 * Format time remaining for reservations
 */
export function formatTimeRemaining(minutesRemaining: number): string {
  if (minutesRemaining <= 0) {
    return 'Expired';
  } else if (minutesRemaining < 1) {
    return 'Less than 1 minute';
  } else if (minutesRemaining === 1) {
    return '1 minute';
  } else {
    return `${Math.floor(minutesRemaining)} minutes`;
  }
}
