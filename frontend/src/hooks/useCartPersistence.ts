// hooks/useCartPersistence.ts
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { loadCart } from '@/store/cartSlice';

/**
 * Hook to handle cart persistence with localStorage
 * This ensures cart data is loaded from localStorage on app initialization
 */
export const useCartPersistence = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Load cart from localStorage when the app initializes
    dispatch(loadCart());
  }, [dispatch]);

  // Optional: Listen for storage events to sync cart across tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'cart' || event.key === 'cartId') {
        dispatch(loadCart());
      }
    };

    // Listen for changes in other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch]);
};
