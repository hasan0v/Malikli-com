// hooks/useCartSync.ts
import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { 
  syncCartWithBackend, 
  mergeGuestCartWithUser, 
  loadCartFromBackend,
  bulkAddToUserCart,
  markAsSynced,
  clearCart 
} from '@/store/cartSlice';
import { useAuth } from './useAuth';

export const useCartSync = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    items, 
    cartId, 
    needsSync, 
    isLoading: cartLoading, 
    lastSyncTime 
  } = useSelector((state: RootState) => state.cart);
  // Auto-sync cart when user authentication state changes
  useEffect(() => {
    if (authLoading) return; // Wait for auth to be determined

    const handleCartSync = async () => {
      if (user && !cartLoading) {
        // User is logged in
        if (cartId && items.length > 0) {
          // User has a guest cart with items - merge it
          try {
            console.log('Attempting to merge guest cart:', { cartId, itemCount: items.length });
            
            // Validate cart ID format (should be a UUID)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(cartId)) {
              console.warn('Invalid cart ID format, using fallback method');
              throw new Error('Invalid cart ID format');
            }
            
            // Add a small delay to ensure token is properly set after login
            await new Promise(resolve => setTimeout(resolve, 100));
            await dispatch(mergeGuestCartWithUser({
              guestCartId: cartId,
              strategy: 'merge'
            })).unwrap();
            console.log('Guest cart merge successful');
          } catch (error) {
            console.error('Failed to merge guest cart:', error);
            
            // Check if the error is due to guest cart not found
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('Guest cart not found')) {
              console.log('Guest cart not found in backend, using bulk add fallback');
            } else if (errorMessage.includes('not authenticated')) {
              console.log('Authentication issue during merge, retrying after delay');
              // Wait a bit longer and try again
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Fallback: try to sync current items with user cart using bulk add
            try {
              console.log('Attempting fallback: bulk add items to user cart');
              await dispatch(bulkAddToUserCart()).unwrap();
              console.log('Fallback bulk add successful');
            } catch (fallbackError) {
              console.error('Fallback bulk add failed:', fallbackError);
              // Final fallback: just load user's existing cart
              console.log('Loading user cart from backend as final fallback');
              await dispatch(loadCartFromBackend({}));
            }
          }
        } else {
          // Load user's existing cart from backend
          await dispatch(loadCartFromBackend({}));
        }
      } else if (!user && items.length > 0 && needsSync) {
        // Guest user with items that need syncing
        try {
          await dispatch(syncCartWithBackend()).unwrap();
        } catch (error) {
          console.error('Failed to sync guest cart:', error);
        }
      }
    };

    handleCartSync();
  }, [user, authLoading, dispatch]);  // Auto-sync cart periodically when needed (for both guest and logged-in users)
  useEffect(() => {
    if (needsSync && !cartLoading) {
      const syncTimeout = setTimeout(() => {
        // Always use the sync endpoint for both guest and authenticated users
        // This ensures quantities are set correctly rather than accumulated
        dispatch(syncCartWithBackend());
      }, 2000); // Debounce syncing by 2 seconds

      return () => clearTimeout(syncTimeout);
    }
  }, [needsSync, user, cartLoading, dispatch]);

  // Manual sync function
  const syncCart = useCallback(async () => {
    if (cartLoading) return;

    try {
      if (user) {
        await dispatch(loadCartFromBackend({})).unwrap();
      } else {
        await dispatch(syncCartWithBackend()).unwrap();
      }
    } catch (error) {
      console.error('Manual cart sync failed:', error);
      throw error;
    }
  }, [user, cartLoading, dispatch]);

  // Merge guest cart when logging in
  const mergeGuestCart = useCallback(async (strategy: 'replace' | 'merge' | 'keep_user' = 'merge') => {
    if (!cartId || cartLoading) return;

    try {
      await dispatch(mergeGuestCartWithUser({
        guestCartId: cartId,
        strategy
      })).unwrap();
    } catch (error) {
      console.error('Failed to merge guest cart:', error);
      throw error;
    }
  }, [cartId, cartLoading, dispatch]);

  // Clear cart on logout
  const clearCartOnLogout = useCallback(() => {
    dispatch(clearCart());
  }, [dispatch]);

  // Force sync cart
  const forceSyncCart = useCallback(async () => {
    if (cartLoading) return;

    try {
      await dispatch(syncCartWithBackend()).unwrap();
      dispatch(markAsSynced());
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }, [cartLoading, dispatch]);

  return {
    syncCart,
    mergeGuestCart,
    clearCartOnLogout,
    forceSyncCart,
    isLoading: cartLoading,
    needsSync,
    lastSyncTime,
    cartId,
    isAuthenticated: !!user,
  };
};
