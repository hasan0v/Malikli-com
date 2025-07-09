// store/middleware/cartPersistenceMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../store';

/**
 * Redux middleware to automatically persist cart to localStorage
 * This runs after every cart action and saves the current cart state
 */
export const cartPersistenceMiddleware: Middleware<{}, RootState> = 
  (store) => (next) => (action) => {
    // Let the action process first
    const result = next(action);
    
    // Check if this was a cart action
    if (typeof action === 'object' && action !== null && 'type' in action) {
      const actionType = (action as { type: string }).type;
      
      if (actionType?.startsWith('cart/')) {
        const state = store.getState();
        
        // Save cart to localStorage after any cart action
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('cart', JSON.stringify(state.cart.items));
          } catch (error) {
            console.error('Failed to persist cart to localStorage:', error);
          }
        }
      }
    }
    
    return result;
  };
