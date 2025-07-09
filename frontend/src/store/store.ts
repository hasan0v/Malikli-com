// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
// Import your reducers (slices) here
import uiReducer from './slices/uiSlice'; 
import cartReducer from './cartSlice' // Adjust the path as necessary
import authReducer from './authSlice';
// import productReducer from './slices/productSlice';
// ... etc.

// Create a temporary store to infer types
const tempStore = configureStore({
  reducer: {
    ui: uiReducer,
    cart: cartReducer, 
    auth: authReducer,
  },
});

// Export types first
export type RootState = ReturnType<typeof tempStore.getState>;
export type AppDispatch = typeof tempStore.dispatch;

export const makeStore = () => {
  return configureStore({
    reducer: {
        ui: uiReducer, // <--- ADD THE REDUCER HERE
        cart: cartReducer, 
        auth: authReducer,
      // product: productReducer,
      // ... your other reducers
    },
    // middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger), // example
    devTools: process.env.NODE_ENV !== 'production',
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;