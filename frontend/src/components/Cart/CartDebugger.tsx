// components/Cart/CartDebugger.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import CartRecoveryService from '@/services/cartRecoveryService';

interface CartDebuggerProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Development-only component for debugging cart localStorage issues
 * Only renders in development mode and when enabled
 */
const CartDebugger: React.FC<CartDebuggerProps> = ({ 
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recoveryStats, setRecoveryStats] = useState<any>(null);
  const [cartData, setCartData] = useState<any>(null);
  
  const cartItems = useSelector((state: RootState) => {
    const items = state?.cart?.items;
    return Array.isArray(items) ? items : [];
  });
  const cartId = useSelector((state: RootState) => state?.cart?.cartId);
  const needsSync = useSelector((state: RootState) => state?.cart?.needsSync);
  const isLoading = useSelector((state: RootState) => state?.cart?.isLoading);

  const cartRecovery = CartRecoveryService.getInstance();

  useEffect(() => {
    if (isOpen) {
      setRecoveryStats(cartRecovery.getRecoveryStats());
      setCartData({
        localStorage: {
          cart: localStorage.getItem('cart'),
          cartId: localStorage.getItem('cartId'),
          cartBackup: localStorage.getItem('cart_backup'),
          needsSync: localStorage.getItem('cart_needs_sync'),
        },
        redux: {
          items: cartItems,
          cartId,
          needsSync,
          isLoading,
          itemCount: cartItems.length,
        }
      });
    }
  }, [isOpen, cartItems, cartId, needsSync, isLoading]);

  if (!enabled) {
    return null;
  }

  const positionStyles = {
    'top-left': { top: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
  };

  const handleClearCart = () => {
    if (confirm('Clear all cart data? This cannot be undone.')) {
      cartRecovery.clearAllCartData();
      window.location.reload();
    }
  };

  const handleForceSync = () => {
    cartRecovery.setSyncFlag(true);
    alert('Sync flag set. Cart will sync on next operation.');
  };

  const handleTestRecovery = () => {
    const testItems = cartRecovery.loadCartSafely();
    // console.log('Cart recovery test:', testItems); // Commented out for production
    alert(`Recovery test complete. Check console for results. Found ${testItems.length} items.`);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: '#ff6b6b',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          🛒 Cart Debug
        </button>
      ) : (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#00ff00',
            padding: '15px',
            borderRadius: '8px',
            maxWidth: '400px',
            maxHeight: '500px',
            overflow: 'auto',
            border: '1px solid #333',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#ff6b6b' }}>Cart Debugger</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                color: '#ff6b6b',
                border: '1px solid #ff6b6b',
                padding: '2px 6px',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '10px',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>State Summary:</strong>
            <div>Items: {cartItems.length}</div>
            <div>Cart ID: {cartId || 'None'}</div>
            <div>Needs Sync: {needsSync ? 'Yes' : 'No'}</div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>Actions:</strong>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
              <button
                onClick={handleClearCart}
                style={{
                  background: '#ff4757',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Clear All
              </button>
              <button
                onClick={handleForceSync}
                style={{
                  background: '#3742fa',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Force Sync
              </button>
              <button
                onClick={handleTestRecovery}
                style={{
                  background: '#2ed573',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Test Recovery
              </button>
            </div>
          </div>

          {recoveryStats && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Recovery Stats:</strong>
              <div>Total Recoveries: {recoveryStats.totalRecoveries}</div>
              <div>Recent Logs: {recoveryStats.logs?.length || 0}</div>
            </div>
          )}

          {cartData && (
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', color: '#ffa502' }}>
                Raw Data
              </summary>
              <pre style={{ 
                background: '#1a1a1a', 
                padding: '8px', 
                marginTop: '5px', 
                borderRadius: '4px',
                fontSize: '10px',
                overflow: 'auto',
                maxHeight: '200px',
              }}>
                {JSON.stringify(cartData, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default CartDebugger;
