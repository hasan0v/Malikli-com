"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { RootState, AppDispatch } from '@/store/store';
import { useAppDispatch } from '@/store/hooks';
import { removeFromCart, updateQuantity, removeFromCartAPI, updateCartItemQuantityAPI } from '@/store/cartSlice';
import { formatCurrency } from '@/utils/formatters';
import { useI18n } from '@/hooks/useI18n';
import { useCheckoutOptions } from '@/hooks/useCheckoutOptions';
import CheckoutOptionsModal from '../Auth/CheckoutOptionsModal';
import styles from './CartSidebar.module.css';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isModalOpen, redirectUrl, showCheckoutOptions, hideCheckoutOptions } = useCheckoutOptions();
  const sidebarRef = useRef<HTMLDivElement>(null);
  // Add client-side rendering flag
  const [isClient, setIsClient] = useState(false);
  // Add debounce timeout refs for API calls
  const updateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all pending timeout when component unmounts
      updateTimeouts.current.forEach(timeout => clearTimeout(timeout));
      updateTimeouts.current.clear();
    };
  }, []);
  // Handle checkout navigation with authentication check
  const handleCheckout = () => {
    const checkoutUrl = '/checkout';
    
    if (!isAuthenticated) {
      // Show checkout options modal for unauthenticated users
      showCheckoutOptions(checkoutUrl);
    } else {
      // User is authenticated, proceed directly to checkout
      router.push(checkoutUrl);
    }
    onClose(); // Close sidebar after navigation
  };

  // Optimistic remove with background API sync
  const handleRemoveItem = useCallback(async (item: any) => {
    // Immediately update UI for responsive feel
    dispatch(removeFromCart({
      id: item.id,
      variantId: item.variantId,
      color: item.color,
      size: item.size
    }));

    // Background API sync (non-blocking)
    try {
      await dispatch(removeFromCartAPI({
        id: item.id,
        variantId: item.variantId,
        color: item.color,
        size: item.size
      })).unwrap();
    } catch (error) {
      console.error('Failed to sync remove with backend:', error);
      // Could show a toast notification here, but don't revert UI
    }
  }, [dispatch]);  // Optimistic quantity update with debounced API sync
  const handleUpdateQuantity = useCallback(async (item: any, newQuantity: number) => {
    // If quantity would be 0 or less, remove the item instead
    if (newQuantity <= 0) {
      handleRemoveItem(item);
      return;
    }
    
    // Ensure quantity is a positive integer
    const quantity = Math.floor(newQuantity);
    
    // Immediately update UI for responsive feel
    dispatch(updateQuantity({
      id: item.id,
      variantId: item.variantId,
      color: item.color,
      size: item.size,
      quantity
    }));

    // Create a unique key for this item to debounce API calls
    const itemKey = `${item.id}-${item.variantId || 'default'}-${item.color || ''}-${item.size || ''}`;
    
    // Clear any existing timeout for this item
    const existingTimeout = updateTimeouts.current.get(itemKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set a new debounced timeout for API sync
    const timeout = setTimeout(async () => {
      try {
        await dispatch(updateCartItemQuantityAPI({
          id: item.id,
          variantId: item.variantId,
          color: item.color,
          size: item.size,
          quantity
        })).unwrap();
        updateTimeouts.current.delete(itemKey);
      } catch (error) {
        console.error('Failed to sync quantity update with backend:', error);
        updateTimeouts.current.delete(itemKey);
        // Could show a toast notification here, but don't revert UI
      }
    }, 500); // 500ms debounce
    
    updateTimeouts.current.set(itemKey, timeout);
  }, [dispatch, handleRemoveItem]);

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent scrolling of the body when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key press to close the sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div className={`${styles.cartSidebarOverlay} ${isOpen ? styles.open : ''}`} onClick={onClose} />
      
      <div 
        ref={sidebarRef}
        className={`${styles.cartSidebar} ${isOpen ? styles.open : ''}`}
        aria-hidden={!isOpen}
      >        <div className={styles.cartSidebarHeader}>
          <h2>{t('cart.sidebar.title', { count: isClient ? totalItems : 0 })}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={t('cart.sidebar.close')}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
          <div className={styles.cartSidebarContent}>          {!isClient ? (
            <div className={styles.emptyCart}>
              <p>{t('common.loading')}</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className={styles.emptyCart}>
              <p>{t('cart.sidebar.empty')}</p>
              <Link href="/" className={styles.shopNowBtn} onClick={onClose}>
                {t('cart.sidebar.startShopping')}
              </Link>
            </div>
          ) : (
            <><div className={styles.cartItemsList}>
                {cartItems.map((item) => (
                  <div key={`${item.id}-${item.variantId || 'default'}-${item.color || ''}-${item.size || ''}`} className={styles.sidebarCartItem}>
                    <div className={styles.itemImage}>
                      {item.image && (
                        <Image 
                          src={item.image} 
                          alt={item.name}
                          width={80}
                          height={80}
                          className={styles.productImage}
                        />
                      )}
                    </div>
                    
                    <div className={styles.itemDetails}>                      <div className={styles.itemName}>{item.name}</div>
                      
                      {/* Add color and size display */}
                      {isClient && (
                        <div className={styles.itemVariants}>
                          {item.color && (
                            <div className={styles.variantItem}>
                              {item.colorCode && (
                                <div 
                                  className={styles.colorSwatch}
                                  style={{ backgroundColor: item.colorCode }}
                                ></div>
                              )}
                              <span className={styles.variantName}>{item.color}</span>
                            </div>
                          )}                          {item.size && (
                            <div className={styles.variantItem}>
                              <span className={styles.variantName}>{t('product.variants.size')}: {item.size}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className={styles.itemPriceRow}>                        <div className={styles.itemQuantity}>
                          <button 
                            onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                            className={styles.quantityBtn}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                            className={styles.quantityBtn}
                          >
                            +
                          </button>
                        </div>
                        <div className={styles.itemPrice}>
                          {formatCurrency(item.price)}
                        </div>
                      </div>
                    </div>                      <button 
                      onClick={() => handleRemoveItem(item)}
                      className={styles.removeItemBtn}
                      aria-label={t('cart.removeItem')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
                <div className={styles.cartSummary}>
                <div className={styles.subtotalRow}>
                  <span>{t('cart.sidebar.total')}:</span>
                  <span className={styles.subtotalAmount}>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                
                <div className={styles.cartButtons}>                  <Link href="/cart" className={styles.viewCartBtn} onClick={onClose}>
                    {t('cart.sidebar.viewCart')}
                  </Link>
                  <button onClick={handleCheckout} className={styles.checkoutBtn}>
                    {t('cart.sidebar.checkout')}
                  </button>                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Checkout Options Modal */}
      <CheckoutOptionsModal
        isOpen={isModalOpen}
        onClose={hideCheckoutOptions}
        redirectUrl={redirectUrl}
      />
    </>
  );
}
