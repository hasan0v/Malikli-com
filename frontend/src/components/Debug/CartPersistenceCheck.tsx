'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

/**
 * A simple component to test cart persistence
 * This component checks localStorage on mount and compares it with the Redux state
 */
export default function CartPersistenceCheck() {
  const [persistenceStatus, setPersistenceStatus] = useState<'loading' | 'working' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  useEffect(() => {
    // Wait a moment to ensure everything is loaded
    const checkTimer = setTimeout(() => {
      try {
        // Check localStorage
        const savedCart = localStorage.getItem('cart');
        const parsedSavedCart = savedCart ? JSON.parse(savedCart) : [];
        
        // Compare with Redux state
        const reduxCartJson = JSON.stringify(cartItems);
        const localStorageCartJson = JSON.stringify(parsedSavedCart);
        
        if (reduxCartJson === localStorageCartJson) {
          setPersistenceStatus('working');
        } else {
          setPersistenceStatus('error');
          setErrorDetails(`Redux cart (${reduxCartJson}) doesn't match localStorage cart (${localStorageCartJson})`);
        }
      } catch (error) {
        setPersistenceStatus('error');
        setErrorDetails(`Error checking persistence: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 500);
    
    return () => clearTimeout(checkTimer);
  }, [cartItems]);

  return (
    <div style={{ 
      padding: '10px', 
      margin: '10px 0', 
      border: '1px solid #ccc',
      borderRadius: '5px',
      backgroundColor: persistenceStatus === 'working' ? '#d4edda' : 
                       persistenceStatus === 'error' ? '#f8d7da' : '#e2e3e5' 
    }}>
      <h3>Cart Persistence Status</h3>
      <p>Status: <strong>{persistenceStatus}</strong></p>
      {errorDetails && <p style={{ color: 'red' }}>{errorDetails}</p>}
      <p>Cart items in Redux: {cartItems.length}</p>
      <p>Cart data: {JSON.stringify(cartItems)}</p>
    </div>
  );
}
