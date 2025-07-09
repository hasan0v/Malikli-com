// components/Cart/CartSyncProvider.tsx
"use client";

import React from 'react';
import { useCartSync } from '@/hooks/useCartSync';

/**
 * Provider component that handles cart synchronization with backend
 * Should be placed inside the Redux store provider
 */
export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  // This hook handles all the cart synchronization logic
  useCartSync();
  
  return <>{children}</>;
}
