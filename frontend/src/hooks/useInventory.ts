// React hook for inventory management
import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  checkStockAvailability,
  checkVariantStock,
  getUserReservations,
  validateCartItems,
  getStockStatusText,
  getStockStatusColor
} from '../services/inventoryService';
import type {
  StockCheckItem,
  StockAvailabilityResponse,
  UserReservationsResponse
} from '../types/inventory';

export interface UseInventoryReturn {
  // Stock checking
  checkStock: (items: StockCheckItem[]) => Promise<StockAvailabilityResponse | null>;
  checkSingleVariant: (variantId: number, quantity?: number) => Promise<boolean>;
  isCheckingStock: boolean;
  
  // Cart validation
  validateCart: () => Promise<{
    valid: boolean;
    unavailableItems: Array<{
      item: any;
      requestedQuantity: number;
      availableQuantity: number;
      reason: string;
    }>;
  }>;
  isValidatingCart: boolean;
  
  // User reservations
  reservations: UserReservationsResponse | null;
  loadReservations: () => Promise<void>;
  isLoadingReservations: boolean;
  
  // Utility functions
  getStockText: (availableQuantity: number, isLowStock: boolean) => string;
  getStockColor: (availableQuantity: number, isLowStock: boolean) => 'success' | 'warning' | 'error';
  
  // Real-time updates
  refreshInventoryData: () => Promise<void>;
}

export function useInventory(): UseInventoryReturn {
  const cartItems = useAppSelector(state => state.cart.items);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [isValidatingCart, setIsValidatingCart] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [reservations, setReservations] = useState<UserReservationsResponse | null>(null);

  // Check stock availability for multiple items
  const checkStock = useCallback(async (items: StockCheckItem[]): Promise<StockAvailabilityResponse | null> => {
    if (items.length === 0) return null;
    
    setIsCheckingStock(true);
    try {
      const result = await checkStockAvailability(items);
      return result;
    } finally {
      setIsCheckingStock(false);
    }
  }, []);

  // Check stock for a single variant
  const checkSingleVariant = useCallback(async (variantId: number, quantity: number = 1): Promise<boolean> => {
    const result = await checkStock([{
      type: 'variant',
      id: variantId,
      quantity
    }]);
    
    return result?.all_available || false;
  }, [checkStock]);

  // Validate current cart items
  const validateCart = useCallback(async () => {
    if (cartItems.length === 0) {
      return { valid: true, unavailableItems: [] };
    }
    
    setIsValidatingCart(true);
    try {
      const result = await validateCartItems(cartItems);
      return result;
    } finally {
      setIsValidatingCart(false);
    }
  }, [cartItems]);

  // Load user reservations
  const loadReservations = useCallback(async () => {
    if (!isAuthenticated) {
      setReservations(null);
      return;
    }
    
    setIsLoadingReservations(true);
    try {
      const result = await getUserReservations();
      setReservations(result);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      setReservations(null);
    } finally {
      setIsLoadingReservations(false);
    }
  }, [isAuthenticated]);

  // Refresh all inventory-related data
  const refreshInventoryData = useCallback(async () => {
    await Promise.all([
      loadReservations(),
      // Add other refresh operations as needed
    ]);
  }, [loadReservations]);

  // Load reservations when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadReservations();
    } else {
      setReservations(null);
    }
  }, [isAuthenticated, loadReservations]);

  // Auto-refresh reservations every 30 seconds if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      loadReservations();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, loadReservations]);

  return {
    // Stock checking
    checkStock,
    checkSingleVariant,
    isCheckingStock,
    
    // Cart validation
    validateCart,
    isValidatingCart,
    
    // User reservations
    reservations,
    loadReservations,
    isLoadingReservations,
    
    // Utility functions
    getStockText: getStockStatusText,
    getStockColor: getStockStatusColor,
    
    // Real-time updates
    refreshInventoryData
  };
}

// Hook specifically for product detail pages
export interface UseProductInventoryReturn {
  checkVariantAvailability: (variantId: number, quantity?: number) => Promise<boolean>;
  isCheckingStock: boolean;
  getVariantStockInfo: (variant: { 
    id: number; 
    available_quantity?: number; 
    is_low_stock?: boolean; 
    is_in_stock?: boolean; 
  }) => {
    text: string;
    color: 'success' | 'warning' | 'error';
    available: boolean;
  };
}

export function useProductInventory(): UseProductInventoryReturn {
  const [isCheckingStock, setIsCheckingStock] = useState(false);

  const checkVariantAvailability = useCallback(async (variantId: number, quantity: number = 1): Promise<boolean> => {
    setIsCheckingStock(true);
    try {
      const isAvailable = await checkVariantStock(variantId, quantity);
      return isAvailable;
    } finally {
      setIsCheckingStock(false);
    }
  }, []);

  const getVariantStockInfo = useCallback((variant: { 
    id: number; 
    available_quantity?: number; 
    is_low_stock?: boolean; 
    is_in_stock?: boolean; 
  }) => {
    const availableQuantity = variant.available_quantity ?? 0;
    const isLowStock = variant.is_low_stock ?? false;
    const isInStock = variant.is_in_stock ?? availableQuantity > 0;

    return {
      text: getStockStatusText(availableQuantity, isLowStock),
      color: getStockStatusColor(availableQuantity, isLowStock),
      available: isInStock
    };
  }, []);

  return {
    checkVariantAvailability,
    isCheckingStock,
    getVariantStockInfo
  };
}
