// src/app/StoreProvider.tsx
"use client"; // This component uses Redux Provider, which needs to be client-side

import { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '../store/store'; // Adjust path to your store config
import { loadTokensFromStorage, fetchUserProfile } from '../store/authSlice';

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();
  }

  // Initialize auth state from localStorage
  useEffect(() => {
    if (storeRef.current) {
      const store = storeRef.current;
      
      // Load tokens from localStorage
      store.dispatch(loadTokensFromStorage());
      
      // If tokens exist, fetch user profile
      const state = store.getState();
      if (state.auth.isAuthenticated && state.auth.token) {
        store.dispatch(fetchUserProfile());
      }
    }
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}