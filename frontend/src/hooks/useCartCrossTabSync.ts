// hooks/useCartCrossTabSync.ts
import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { syncCartFromAnotherTab } from '@/store/cartSlice';

/**
 * Hook to handle cross-tab cart synchronization
 * This hook listens for cart updates from other tabs and syncs the current tab's cart state
 */
export const useCartCrossTabSync = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleCartUpdateInAnotherTab = (event: CustomEvent) => {
      // console.log('Cart updated in another tab, syncing...'); // Commented out for production
      dispatch(syncCartFromAnotherTab());
    };

    // Listen for the custom event dispatched by CartRecoveryService
    window.addEventListener('cartUpdatedInAnotherTab', handleCartUpdateInAnotherTab as EventListener);

    return () => {
      window.removeEventListener('cartUpdatedInAnotherTab', handleCartUpdateInAnotherTab as EventListener);
    };
  }, [dispatch]);
};

export default useCartCrossTabSync;
