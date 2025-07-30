"use client";

import React from 'react';
import StoreProvider from './StoreProvider';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { useCartPersistence } from '@/hooks/useCartPersistence';
import { CartSyncProvider } from '@/components/Cart/CartSyncProvider';
import { I18nProvider } from '@/hooks/useI18n';

// Cart persistence wrapper component
function CartPersistenceWrapper({ children }: { children: React.ReactNode }) {
  useCartPersistence();
  return <>{children}</>;
}

// Client component wrapper for the layout body content
export default function LayoutBody({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <I18nProvider>
        <CartPersistenceWrapper>
          <CartSyncProvider>
            <div className="root-layout-container">
              <Navbar />
              <main className="main-content">
                {children}
              </main>
              {/* <Footer /> */}
            </div>
          </CartSyncProvider>
        </CartPersistenceWrapper>
      </I18nProvider>
    </StoreProvider>
  );
}
