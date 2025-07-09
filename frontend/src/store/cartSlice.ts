// store/cartSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  syncCart, 
  mergeGuestCart, 
  getMyCart, 
  convertCartItemsToSyncFormat,
  CartResponse,
  CartSyncRequest,
  CartMergeRequest 
} from '../services/cartService';
import { convertBackendItemToFrontend, convertFrontendItemToBackend } from '../types/backendCart';

// Define the cart item type
export interface CartItem {
  id: number;           // Product ID
  variantId?: number;   // Product Variant ID (if applicable)
  dropProductId?: number; // Drop Product ID (if this is a drop product)
  name: string;
  price: number;
  quantity: number;
  image?: string;
  color?: string;       // Color name (e.g., "Red", "Blue")
  colorCode?: string;   // Color code (e.g., "#FF0000", "#0000FF")
  size?: string;        // Size name (e.g., "S", "M", "L")
  isDropProduct?: boolean; // Flag to distinguish between regular and drop products
}

// Define the cart state type
interface CartState {
  items: CartItem[];
  cartId?: string;      // Backend cart ID
  isLoading: boolean;   // Loading state for async operations
  error?: string;       // Error message
  lastSyncTime?: number; // Timestamp of last sync
  needsSync: boolean;   // Flag to indicate if cart needs syncing
}

// LocalStorage functions
const loadCartFromStorage = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    return [];
  }
};

const saveCartToStorage = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('cart', JSON.stringify(items));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
};

const loadCartIdFromStorage = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  
  try {
    return localStorage.getItem('cartId') || undefined;
  } catch (error) {
    console.error('Error loading cart ID from localStorage:', error);
    return undefined;
  }
};

const saveCartIdToStorage = (cartId?: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    if (cartId) {
      localStorage.setItem('cartId', cartId);
    } else {
      localStorage.removeItem('cartId');
    }
  } catch (error) {
    console.error('Error saving cart ID to localStorage:', error);
  }
};

// Async thunks for backend integration
export const syncCartWithBackend = createAsyncThunk(
  'cart/syncWithBackend',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { cart: CartState };
      const items = convertCartItemsToSyncFormat(state.cart.items);
      const guestCartId = state.cart.cartId;

      const syncData: CartSyncRequest = {
        items,
        guest_cart_id: guestCartId,
      };

      const result = await syncCart(syncData);
      if (!result) {
        throw new Error('Failed to sync cart with backend');
      }

      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sync cart');
    }
  }
);

export const mergeGuestCartWithUser = createAsyncThunk(
  'cart/mergeGuestCart',
  async (
    { guestCartId, strategy }: { guestCartId: string; strategy: 'replace' | 'merge' | 'keep_user' },
    { rejectWithValue }
  ) => {
    try {
      const mergeData: CartMergeRequest = {
        guest_cart_id: guestCartId,
        merge_strategy: strategy,
      };

      console.log('Attempting to merge guest cart:', mergeData);
      const result = await mergeGuestCart(mergeData);
      
      if (!result) {
        console.error('Merge cart returned null result');
        throw new Error('Backend returned null result for cart merge');
      }

      console.log('Cart merge successful:', result);
      return result;
    } catch (error: any) {
      console.error('Cart merge error details:', error);
      return rejectWithValue(error.message || 'Failed to merge cart');
    }
  }
);

export const loadCartFromBackend = createAsyncThunk(
  'cart/loadFromBackend',
  async (params: { guestCartId?: string } = {}, { rejectWithValue }) => {
    try {
      const result = await getMyCart(params.guestCartId);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load cart from backend');
    }
  }
);

export const bulkAddToUserCart = createAsyncThunk(
  'cart/bulkAddToUserCart',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { cart: CartState };
      const { bulkAddToCart } = await import('../services/cartService');
      
      // Convert cart items to sync format
      const syncItems = convertCartItemsToSyncFormat(state.cart.items);
      
      if (syncItems.length === 0) {
        // No valid items to sync, just mark as synced
        return null;
      }

      const result = await bulkAddToCart(syncItems);
      if (!result) {
        throw new Error('Failed to bulk add items to cart');
      }

      return result;    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to bulk add items to cart');
    }
  }
);

export const addToCartAPI = createAsyncThunk(
  'cart/addToCartAPI',
  async (item: CartItem, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { cart: CartState };
      const { bulkAddToCart } = await import('../services/cartService');
      
      // Convert single item to sync format
      const syncItems = [convertFrontendItemToBackend(item)].filter(item => 
        item.drop_product_id || item.product_variant_id
      );
      
      if (syncItems.length === 0) {
        throw new Error('Invalid item to add to cart');
      }

      const result = await bulkAddToCart(syncItems, state.cart.cartId);
      if (!result) {
        throw new Error('Failed to add item to cart');
      }

      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add item to cart');
    }
  }
);

export const updateCartItemQuantityAPI = createAsyncThunk(
  'cart/updateCartItemQuantityAPI',
  async (params: {id: number, variantId?: number, color?: string, size?: string, quantity: number}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { cart: CartState };
      
      // Update the local item quantity first
      const updatedItems = state.cart.items.map(item => {
        if (item.id === params.id && 
            item.variantId === params.variantId &&
            item.color === params.color &&
            item.size === params.size) {
          return { ...item, quantity: params.quantity };
        }
        return item;
      });
      
      // Use sync to update backend with the new item list
      const { syncCart } = await import('../services/cartService');
      const { convertCartItemsToSyncFormat } = await import('../services/cartService');
      
      const syncItems = convertCartItemsToSyncFormat(updatedItems);
      const syncData = {
        items: syncItems,
        guest_cart_id: state.cart.cartId,
      };
      
      const result = await syncCart(syncData);
      if (!result) {
        throw new Error('Failed to update cart item quantity');
      }

      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update cart item quantity');
    }
  }
);

export const removeFromCartAPI = createAsyncThunk(
  'cart/removeFromCartAPI',
  async (params: {id: number, variantId?: number, color?: string, size?: string}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { cart: CartState };
      
      // First update local state, then sync with backend
      // For now, we'll use the sync mechanism since the backend uses bulk operations
      const currentItems = state.cart.items.filter(item => 
        !(item.id === params.id && 
          item.variantId === params.variantId &&
          item.color === params.color &&
          item.size === params.size)
      );
      
      // Use sync to update backend with the new item list
      const { syncCart } = await import('../services/cartService');
      const { convertCartItemsToSyncFormat } = await import('../services/cartService');
      
      const syncItems = convertCartItemsToSyncFormat(currentItems);
      const syncData = {
        items: syncItems,
        guest_cart_id: state.cart.cartId,
      };
      
      const result = await syncCart(syncData);
      if (!result) {
        throw new Error('Failed to remove cart item');
      }

      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to remove cart item');
    }
  }
);

const initialState: CartState = {
  items: loadCartFromStorage(),
  cartId: loadCartIdFromStorage(),
  isLoading: false,
  needsSync: false,
  lastSyncTime: undefined,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      // Find existing item based on product ID and variant characteristics
      const existingItem = state.items.find(item => 
        item.id === action.payload.id && 
        item.variantId === action.payload.variantId &&
        item.color === action.payload.color &&
        item.size === action.payload.size
      );
      
      if (existingItem) {
        existingItem.quantity += action.payload.quantity || 1;
      } else {
        state.items.push(action.payload);
      }
      
      // Save to localStorage and mark for sync
      saveCartToStorage(state.items);
      state.needsSync = true;
    },
    removeFromCart: (state, action: PayloadAction<{id: number, variantId?: number, color?: string, size?: string}>) => {
      state.items = state.items.filter(item => 
        !(item.id === action.payload.id && 
          item.variantId === action.payload.variantId &&
          item.color === action.payload.color &&
          item.size === action.payload.size)
      );
      
      // Save to localStorage and mark for sync
      saveCartToStorage(state.items);
      state.needsSync = true;
    },    updateQuantity: (state, action: PayloadAction<{id: number, variantId?: number, color?: string, size?: string, quantity: number}>) => {
      const existingItem = state.items.find(item => 
        item.id === action.payload.id && 
        item.variantId === action.payload.variantId &&
        item.color === action.payload.color &&
        item.size === action.payload.size
      );
      if (existingItem) {
        // Ensure quantity is a positive integer
        const newQuantity = Math.max(1, Math.floor(action.payload.quantity));
        existingItem.quantity = newQuantity;
      }
      
      // Save to localStorage and mark for sync
      saveCartToStorage(state.items);
      state.needsSync = true;
    },
    clearCart: (state) => {
      state.items = [];
      state.needsSync = false;
      // Clear from localStorage
      saveCartToStorage([]);
    },
    // Action to manually load cart from localStorage (useful for hydration)
    loadCart: (state) => {
      state.items = loadCartFromStorage();
      state.cartId = loadCartIdFromStorage();
    },
    // Action to set cart ID
    setCartId: (state, action: PayloadAction<string | undefined>) => {
      state.cartId = action.payload;
      saveCartIdToStorage(action.payload);
    },
    // Action to mark cart as synced
    markAsSynced: (state) => {
      state.needsSync = false;
      state.lastSyncTime = Date.now();
    },    // Action to convert backend cart items to frontend format
    setCartFromBackend: (state, action: PayloadAction<CartResponse>) => {
      // Convert backend items to frontend format
      state.items = action.payload.items.map(backendItem => convertBackendItemToFrontend(backendItem));
      
      state.cartId = action.payload.cart_id;
      state.needsSync = false;
      state.lastSyncTime = Date.now();
      
      // Save to localStorage
      saveCartToStorage(state.items);
      saveCartIdToStorage(action.payload.cart_id);
    },
  },
  extraReducers: (builder) => {
    // Handle syncCartWithBackend
    builder
      .addCase(syncCartWithBackend.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })
      .addCase(syncCartWithBackend.fulfilled, (state, action) => {
        state.isLoading = false;
        state.needsSync = false;
        state.lastSyncTime = Date.now();
        
        if (action.payload.cart_id) {
          state.cartId = action.payload.cart_id;
          saveCartIdToStorage(action.payload.cart_id);
        }
      })
      .addCase(syncCartWithBackend.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle mergeGuestCartWithUser
    builder
      .addCase(mergeGuestCartWithUser.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })      .addCase(mergeGuestCartWithUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.needsSync = false;
        state.lastSyncTime = Date.now();
        
        // Update cart with merged data
        state.items = action.payload.items.map(backendItem => convertBackendItemToFrontend(backendItem));
        
        state.cartId = action.payload.cart_id;
        
        // Save to localStorage
        saveCartToStorage(state.items);
        saveCartIdToStorage(action.payload.cart_id);
      })
      .addCase(mergeGuestCartWithUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle loadCartFromBackend
    builder
      .addCase(loadCartFromBackend.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })      .addCase(loadCartFromBackend.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (action.payload) {
          state.items = action.payload.items.map(backendItem => convertBackendItemToFrontend(backendItem));
          
          if (action.payload.cart_id) {
            state.cartId = action.payload.cart_id;
            saveCartIdToStorage(action.payload.cart_id);
          }
          
          state.needsSync = false;
          state.lastSyncTime = Date.now();
          
          // Save to localStorage
          saveCartToStorage(state.items);
        }
      })      .addCase(loadCartFromBackend.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle bulkAddToUserCart
    builder
      .addCase(bulkAddToUserCart.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })      .addCase(bulkAddToUserCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.needsSync = false;
        state.lastSyncTime = Date.now();
        
        if (action.payload) {
          // Update cart with backend data
          state.items = action.payload.items.map(backendItem => convertBackendItemToFrontend(backendItem));
          
          if (action.payload.cart_id) {
            state.cartId = action.payload.cart_id;
            saveCartIdToStorage(action.payload.cart_id);
          }
          
          // Save to localStorage
          saveCartToStorage(state.items);
        } else {
          // No items were synced (all items were invalid), just mark as synced
          // Keep the current items but mark as synced
        }
      })      .addCase(bulkAddToUserCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle addToCartAPI
    builder
      .addCase(addToCartAPI.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })
      .addCase(addToCartAPI.fulfilled, (state, action) => {
        state.isLoading = false;
        state.needsSync = false;
        state.lastSyncTime = Date.now();
        
        if (action.payload) {
          // Update cart with backend data
          state.items = action.payload.items.map(backendItem => convertBackendItemToFrontend(backendItem));
          
          if (action.payload.cart_id) {
            state.cartId = action.payload.cart_id;
            saveCartIdToStorage(action.payload.cart_id);
          }
          
          // Save to localStorage
          saveCartToStorage(state.items);
        }
      })      .addCase(addToCartAPI.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateCartItemQuantityAPI.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })
      .addCase(updateCartItemQuantityAPI.fulfilled, (state, action) => {
        state.isLoading = false;
        state.needsSync = false;
        state.lastSyncTime = Date.now();
        
        if (action.payload) {
          // Update cart with backend data
          state.items = action.payload.items.map((backendItem: any) => convertBackendItemToFrontend(backendItem));
          
          if (action.payload.cart_id) {
            state.cartId = action.payload.cart_id;
            saveCartIdToStorage(action.payload.cart_id);
          }
          
          // Save to localStorage
          saveCartToStorage(state.items);
        }
      })
      .addCase(updateCartItemQuantityAPI.rejected, (state, action) => {        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Handle removeFromCartAPI
      .addCase(removeFromCartAPI.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })
      .addCase(removeFromCartAPI.fulfilled, (state, action) => {
        state.isLoading = false;
        state.needsSync = false;
        state.lastSyncTime = Date.now();
        
        if (action.payload) {
          // Update cart with backend data
          state.items = action.payload.items.map((backendItem: any) => convertBackendItemToFrontend(backendItem));
          
          if (action.payload.cart_id) {
            state.cartId = action.payload.cart_id;
            saveCartIdToStorage(action.payload.cart_id);
          }
          
          // Save to localStorage
          saveCartToStorage(state.items);
        }
      })
      .addCase(removeFromCartAPI.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  addToCart, 
  removeFromCart, 
  updateQuantity, 
  clearCart, 
  loadCart, 
  setCartId, 
  markAsSynced, 
  setCartFromBackend 
} = cartSlice.actions;

export default cartSlice.reducer;