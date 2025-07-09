"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { RootState } from '@/store/store';
import { removeFromCart, updateQuantity, clearCart } from '@/store/cartSlice';
import { formatCurrency } from '@/utils/formatters';
import { useI18n } from '@/hooks/useI18n';
import LoadingCircle from '@/components/LoadingCircle';
import styles from './cartPage.module.css';

export default function CartPage() {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const router = useRouter();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  // Add client-side rendering flag
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Add debounce timeout refs for API calls
  const updateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true);
    // Simulate loading time for cart data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all pending timeouts when component unmounts
      updateTimeouts.current.forEach(timeout => clearTimeout(timeout));
      updateTimeouts.current.clear();
    };
  }, []);

  // Optimized remove handler with immediate UI update
  const handleRemoveItem = useCallback((item: any) => {
    // Immediately update UI
    dispatch(removeFromCart({
      id: item.id,
      variantId: item.variantId,
      color: item.color,
      size: item.size
    }));
  }, [dispatch]);

  // Optimized quantity handler with debouncing
  const handleUpdateQuantity = useCallback((item: any, quantity: number) => {
    if (quantity < 1) return;
    
    // Immediately update UI
    dispatch(updateQuantity({
      id: item.id,
      variantId: item.variantId,
      color: item.color,
      size: item.size,
      quantity
    }));
  }, [dispatch]);

  const handleClearCart = useCallback(() => {
    dispatch(clearCart());
  }, [dispatch]);

  const handleCheckout = useCallback(() => {
    // Redirect to checkout page with cart data
    router.push('/checkout');
  }, [router]);

  // Show loading state while initializing
  if (!isClient || isLoading) {
    return (      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <LoadingCircle 
            size="large" 
            color="primary" 
            text={t('cart.loading')} 
          />
        </div>
      </div>
    );
  }

  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const shipping = subtotal > 0 ? 15 : 0; // Example shipping cost
  const total = subtotal + shipping;
  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyCartContainer}>
        <h1>{t('cart.empty.title')}</h1>
        <p>{t('cart.empty.message')}</p>
        <Link href="/" className={styles.continueShoppingBtn}>
          {t('cart.empty.continueShopping')}
        </Link>
      </div>
    );
  }
  return (
    <div className={styles.cartPageContainer}>
      <h1 className={styles.cartTitle}>{t('cart.title')}</h1>
      
      <div className={styles.cartContent}>
        <div className={styles.cartItems}>
          <div className={styles.cartHeader}>
            <div className={styles.productCol}>{t('cart.headers.product')}</div>
            <div className={styles.priceCol}>{t('cart.headers.price')}</div>
            <div className={styles.quantityCol}>{t('cart.headers.quantity')}</div>
            <div className={styles.totalCol}>{t('cart.headers.total')}</div>
            <div className={styles.actionCol}></div>
          </div>{cartItems.map((item) => (
            <div key={`${item.id}-${item.variantId || 'default'}-${item.color || ''}-${item.size || ''}`} className={styles.cartItem}><div className={styles.productCol}>
                <div className={styles.productInfo}>
                  <div className={styles.productImage}>
                    {item.image && (
                      <Image 
                        src={item.image} 
                        alt={item.name}
                        width={80}
                        height={80}
                        className={styles.itemImage}
                      />
                    )}
                  </div>
                  <div className={styles.productDetails}>                      <div className={styles.productName}>{item.name}</div>
                      
                      {/* Display color and size information */}
                      {isClient && (                        <div className={styles.productVariants}>
                          {item.color && (
                            <div className={styles.variantItem}>
                              <span className={styles.variantLabel}>{t('product.variants.color')}:</span>
                              <div className={styles.variantInfo}>
                                {item.colorCode && (
                                  <div 
                                    className={styles.colorSwatch}
                                    style={{ backgroundColor: item.colorCode }}
                                  ></div>
                                )}
                                <span>{item.color}</span>
                              </div>
                            </div>
                          )}
                          {item.size && (
                            <div className={styles.variantItem}>
                              <span className={styles.variantLabel}>{t('product.variants.size')}:</span>
                              <span>{item.size}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>
              </div>
              
              <div className={styles.priceCol}>
                {formatCurrency(item.price)}
              </div>
              
              <div className={styles.quantityCol}>                <div className={styles.quantityControl}>
                  <button 
                    onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                    className={styles.quantityBtn}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span className={styles.quantityDisplay}>{item.quantity}</span>
                  <button 
                    onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                    className={styles.quantityBtn}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className={styles.totalCol}>
                {formatCurrency(item.price * item.quantity)}
              </div>
                <div className={styles.actionCol}>                <button 
                  onClick={() => handleRemoveItem(item)}
                  className={styles.removeItemBtn}
                  aria-label={t('cart.removeItem')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
            <div className={styles.cartActions}>
            <button onClick={handleClearCart} className={styles.clearCartBtn}>
              {t('cart.actions.clearCart')}
            </button>
            <Link href="/" className={styles.continueShoppingBtn}>
              {t('cart.actions.continueShopping')}
            </Link>
          </div>
        </div>
        
        <div className={styles.orderSummary}>
          <h2 className={styles.summaryTitle}>{t('cart.summary.title')}</h2>
          
          <div className={styles.summaryItems}>            <div className={styles.summaryItem}>
              <span>{t('cart.summary.items', { count: cartItems.reduce((count, item) => count + item.quantity, 0) })}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            <div className={styles.summaryItem}>
              <span>{t('cart.summary.shipping')}</span>
              <span>{formatCurrency(shipping)}</span>
            </div>
            
            <div className={`${styles.summaryItem} ${styles.totalRow}`}>
              <span>{t('cart.summary.total')}</span>
              <span className={styles.totalAmount}>
                {formatCurrency(total)}
              </span>
            </div>
          </div>
            <button className={styles.checkoutBtn} onClick={handleCheckout}>
            {t('cart.actions.checkout')}
          </button>
          
          <div className={styles.secureCheckout}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
            <span>{t('cart.secureCheckout')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
