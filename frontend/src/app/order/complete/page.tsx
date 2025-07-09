'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useI18n } from '@/hooks/useI18n';
import { getOrderById, Order } from '@/lib/api/orders';
import styles from './orderComplete.module.css';

export default function OrderCompletePage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams?.get('orderId');

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('Order ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Authentication required');
          setIsLoading(false);
          return;
        }

        const orderData = await getOrderById(orderId, token);
        setOrder(orderData);
      } catch (error) {
        console.error('Failed to load order:', error);
        setError(error instanceof Error ? error.message : 'Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadOrder();
    } else {
      setIsLoading(false);
    }
  }, [orderId, isAuthenticated]);

  const formatPrice = (price: string | number): number => {
    return typeof price === 'string' ? parseFloat(price) : price;
  };

  const formatCurrency = (amount: string | number): string => {
    const numAmount = formatPrice(amount);
    return numAmount.toFixed(2);
  };

  const handleViewOrder = () => {
    if (order) {
      router.push(`/orders/${order.id}`);
    }
  };

  const handleContinueShopping = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className={styles.completePage}>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{t('orderComplete.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.completePage}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h1 className={styles.errorTitle}>{t('orderComplete.error.title')}</h1>
            <p className={styles.errorMessage}>{error}</p>
            <div className={styles.actions}>
              <button onClick={() => router.push('/orders')} className={styles.primaryButton}>
                {t('orderComplete.error.viewOrders')}
              </button>
              <button onClick={handleContinueShopping} className={styles.secondaryButton}>
                {t('orderComplete.error.backHome')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.completePage}>
      <div className={styles.container}>
        <div className={styles.successState}>
          {/* Success Icon */}
          <div className={styles.successIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#10B981"/>
              <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Success Message */}
          <h1 className={styles.successTitle}>{t('orderComplete.success.title')}</h1>
          <p className={styles.successMessage}>{t('orderComplete.success.message')}</p>

          {/* Order Summary */}
          {order && (
            <div className={styles.orderSummary}>
              <h2 className={styles.summaryTitle}>{t('orderComplete.summary.title')}</h2>
              
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.label}>{t('orderComplete.summary.orderNumber')}:</span>
                  <span className={styles.value}>{order.order_number}</span>
                </div>
                
                <div className={styles.summaryItem}>
                  <span className={styles.label}>{t('orderComplete.summary.total')}:</span>
                  <span className={styles.value}>${formatCurrency(order.total_amount)}</span>
                </div>
                
                <div className={styles.summaryItem}>
                  <span className={styles.label}>{t('orderComplete.summary.paymentStatus')}:</span>
                  <span className={`${styles.value} ${styles.statusPaid}`}>
                    {t(`orders.paymentStatus.${order.payment_status}`)}
                  </span>
                </div>
                
                <div className={styles.summaryItem}>
                  <span className={styles.label}>{t('orderComplete.summary.orderStatus')}:</span>
                  <span className={styles.value}>
                    {t(`orders.status.${order.status}`)}
                  </span>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className={styles.itemsPreview}>
                <h3 className={styles.itemsTitle}>{t('orderComplete.items.title')}</h3>
                <div className={styles.itemsList}>
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className={styles.orderItem}>
                      <img 
                        src={item.image || '/placeholder-product.png'} 
                        alt={item.name}
                        className={styles.itemImage}
                      />
                      <div className={styles.itemDetails}>
                        <span className={styles.itemName}>{item.name}</span>
                        <span className={styles.itemQuantity}>
                          {t('orderComplete.items.quantity')}: {item.quantity}
                        </span>
                      </div>
                      <span className={styles.itemPrice}>
                        ${formatCurrency(formatPrice(item.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                  
                  {order.items.length > 3 && (
                    <div className={styles.moreItems}>
                      {t('orderComplete.items.andMore', { count: order.items.length - 3 })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className={styles.nextSteps}>
            <h3 className={styles.nextStepsTitle}>{t('orderComplete.nextSteps.title')}</h3>
            <ul className={styles.stepsList}>
              <li>{t('orderComplete.nextSteps.confirmation')}</li>
              <li>{t('orderComplete.nextSteps.processing')}</li>
              <li>{t('orderComplete.nextSteps.shipping')}</li>
              <li>{t('orderComplete.nextSteps.tracking')}</li>
            </ul>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button onClick={handleViewOrder} className={styles.primaryButton}>
              {t('orderComplete.actions.viewOrder')}
            </button>
            <button onClick={handleContinueShopping} className={styles.secondaryButton}>
              {t('orderComplete.actions.continueShopping')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
