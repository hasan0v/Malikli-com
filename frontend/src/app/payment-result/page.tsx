'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { updateOrderPaymentStatus } from '@/lib/api/orders';
import { useI18n } from '@/hooks/useI18n';
import styles from './payment-result.module.css';

export default function PaymentResultPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'cancelled' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        // Get payment result from URL parameters
        const status = searchParams?.get('status');
        const orderIdParam = searchParams?.get('orderid');
        const paymentSuccess = searchParams?.get('payment') === 'success';
        const paymentCancelled = searchParams?.get('payment') === 'cancelled';
        
        let finalStatus: 'success' | 'failed' | 'cancelled' = 'failed';
        
        if (paymentSuccess || status === 'success') {
          finalStatus = 'success';
        } else if (paymentCancelled || status === 'cancelled') {
          finalStatus = 'cancelled';
        } else if (status === 'failed') {
          finalStatus = 'failed';
        }

        setPaymentStatus(finalStatus);
        setOrderId(orderIdParam || null);

        // Update order status if we have an order ID and user is authenticated
        if (orderIdParam && isAuthenticated) {
          const token = localStorage.getItem('access_token');
          if (token) {
            try {
              await updateOrderPaymentStatus(
                orderIdParam,
                finalStatus === 'success' ? 'paid' : finalStatus === 'cancelled' ? 'pending' : 'failed',
                token
              );
            } catch (updateError) {
              console.error('Failed to update order status:', updateError);
              // Don't show error to user, as the payment might still be processed
            }
          }
        }

      } catch (err) {
        console.error('Error processing payment result:', err);
        setError('Failed to process payment result');
      } finally {
        setIsProcessing(false);
      }
    };

    if (searchParams) {
      processPaymentResult();
    }
  }, [searchParams, isAuthenticated]);

  if (isProcessing) {
    return (
      <div className={styles.paymentResultPage}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <h2>Processing payment result...</h2>
            <p>Please wait while we confirm your payment status.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleContinueShopping = () => {
    router.push('/');
  };

  const handleViewOrders = () => {
    router.push('/orders');
  };

  return (
    <div className={styles.paymentResultPage}>
      <div className={styles.container}>
        {paymentStatus === 'success' && (
          <div className={styles.success}>
            <div className={styles.icon}>✅</div>
            <h1>Payment Successful!</h1>
            <p>Your order has been successfully processed.</p>
            {orderId && (
              <p className={styles.orderInfo}>
                Order ID: <strong>{orderId}</strong>
              </p>
            )}
            <div className={styles.actions}>
              <button onClick={handleViewOrders} className={styles.primaryButton}>
                View Orders
              </button>
              <button onClick={handleContinueShopping} className={styles.secondaryButton}>
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {paymentStatus === 'cancelled' && (
          <div className={styles.cancelled}>
            <div className={styles.icon}>⚠️</div>
            <h1>Payment Cancelled</h1>
            <p>Your payment was cancelled. Your order is still pending.</p>
            {orderId && (
              <p className={styles.orderInfo}>
                Order ID: <strong>{orderId}</strong>
              </p>
            )}
            <p>You can try to complete the payment again from your orders page.</p>
            <div className={styles.actions}>
              <button onClick={handleViewOrders} className={styles.primaryButton}>
                View Orders
              </button>
              <button onClick={handleContinueShopping} className={styles.secondaryButton}>
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className={styles.failed}>
            <div className={styles.icon}>❌</div>
            <h1>Payment Failed</h1>
            <p>Unfortunately, your payment could not be processed.</p>
            {orderId && (
              <p className={styles.orderInfo}>
                Order ID: <strong>{orderId}</strong>
              </p>
            )}
            <p>Please try again or contact support if the problem persists.</p>
            <div className={styles.actions}>
              <button onClick={handleViewOrders} className={styles.primaryButton}>
                View Orders
              </button>
              <button onClick={handleContinueShopping} className={styles.secondaryButton}>
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <div className={styles.icon}>⚠️</div>
            <h1>Error</h1>
            <p>{error}</p>
            <div className={styles.actions}>
              <button onClick={handleContinueShopping} className={styles.primaryButton}>
                Go Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
