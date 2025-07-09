'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { getOrderById, updateOrderPaymentStatus, Order } from '@/lib/api/orders';
import { useI18n } from '@/hooks/useI18n';
import LoadingCircle from '@/components/LoadingCircle';
import styles from '../checkout.module.css';

export default function PaymentRetryPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isInitialized } = useSelector((state: RootState) => state.auth);
  
  const orderId = searchParams?.get('orderId');
  const amount = searchParams?.get('amount');
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/auth/login?redirect=/orders');
      return;
    }
  }, [isInitialized, isAuthenticated, router]);

  // Load order details
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId || !isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('No access token found');
          return;
        }

        const orderData = await getOrderById(orderId, token);
        setOrder(orderData);
        
        // Verify this order needs payment
        if (orderData.payment_status === 'paid') {
          setError('This order has already been paid');
        } else if (orderData.status === 'cancelled') {
          setError('This order has been cancelled and cannot be paid');
        }
        
      } catch (error) {
        console.error('Failed to load order:', error);
        setError(error instanceof Error ? error.message : 'Failed to load order');
      } finally {
        setIsLoading(false);
      }
    };

    if (isInitialized && isAuthenticated) {
      loadOrder();
    }
  }, [orderId, isAuthenticated, isInitialized]);

  const handlePayment = async () => {
    if (!order) return;
    
    setIsProcessingPayment(true);
    setError(null);
    
    try {
      // In a real implementation, you would integrate with your payment provider
      // For now, we'll simulate the payment process
      
      // Example: Redirect to payment provider
      const totalAmount = parseFloat(order.total_amount || '0');
      const returnUrl = `${window.location.origin}/orders?payment=success`;
      const cancelUrl = `${window.location.origin}/orders?payment=cancelled`;
      
      // Simulate payment gateway redirect
      // Replace this with your actual payment provider integration
      const paymentUrl = `https://your-payment-provider.com/pay?` +
        `amount=${totalAmount.toFixed(2)}&` +
        `currency=EUR&` +
        `orderid=${order.id}&` +
        `returnUrl=${encodeURIComponent(returnUrl)}&` +
        `cancelUrl=${encodeURIComponent(cancelUrl)}`;
      
      // For demonstration, we'll just simulate success after 2 seconds
      setTimeout(async () => {
        try {
          const token = localStorage.getItem('access_token');
          if (token) {
            await updateOrderPaymentStatus(order.id, 'paid', token);
            router.push('/orders?payment=success');
          }
        } catch (error) {
          console.error('Payment update failed:', error);
          setError('Payment processing failed');
          setIsProcessingPayment(false);
        }
      }, 2000);
      
      // In a real app, uncomment this line to redirect to payment provider:
      // window.location.href = paymentUrl;
      
    } catch (error) {
      console.error('Payment initiation failed:', error);
      setError(error instanceof Error ? error.message : 'Payment failed');
      setIsProcessingPayment(false);
    }
  };

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className={styles.checkoutPage}>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <LoadingCircle size="large" color="primary" />
            <p>{t('checkout.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show error state
  if (error || !order) {
    return (
      <div className={styles.checkoutPage}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <h2>{t('checkout.error.title') || 'Payment Error'}</h2>
            <p>{error || 'Order not found'}</p>
            <button
              onClick={() => router.push('/orders')}
              className={styles.button}
            >
              {t('orders.backToOrders') || 'Back to Orders'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.checkoutPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('checkout.payment.retryTitle') || 'Complete Payment'}</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.paymentRetrySection}>
            <div className={styles.orderSummary}>
              <h3>{t('checkout.payment.orderSummary') || 'Order Summary'}</h3>
              <div className={styles.orderDetails}>
                <div className={styles.orderRow}>
                  <span>{t('orders.orderNumber') || 'Order Number'}:</span>
                  <span>{order.order_number}</span>
                </div>
                <div className={styles.orderRow}>
                  <span>{t('orders.total') || 'Total'}:</span>
                  <span>${parseFloat(order.total_amount || '0').toFixed(2)}</span>
                </div>
                <div className={styles.orderRow}>
                  <span>{t('orders.status.label') || 'Status'}:</span>
                  <span>{t(`orders.status.${order.status}`) || order.status}</span>
                </div>
                <div className={styles.orderRow}>
                  <span>{t('orders.paymentStatus.label') || 'Payment Status'}:</span>
                  <span>{t(`orders.paymentStatus.${order.payment_status}`) || order.payment_status}</span>
                </div>
              </div>
            </div>

            <div className={styles.orderItems}>
              <h4>{t('orders.items') || 'Order Items'}</h4>
              {order.items.map((item) => (
                <div key={item.id} className={styles.orderItem}>
                  <div className={styles.itemImage}>
                    <img 
                      src={item.image || '/placeholder-product.png'} 
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-product.png';
                      }}
                    />
                  </div>
                  <div className={styles.itemDetails}>
                    <h5>{item.name}</h5>
                    <div className={styles.itemMeta}>
                      {item.color && <span>{t('product.color')}: {item.color}</span>}
                      {item.size && <span>{t('product.size')}: {item.size}</span>}
                      <span>{t('product.quantity')}: {item.quantity}</span>
                    </div>
                    <div className={styles.itemPrice}>
                      ${parseFloat(item.price || '0').toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.paymentActions}>
              <button
                onClick={() => router.push('/orders')}
                className={styles.secondaryButton}
                disabled={isProcessingPayment}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handlePayment}
                className={styles.primaryButton}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <>
                    <LoadingCircle size="small" color="white" />
                    {t('checkout.payment.processing') || 'Processing...'}
                  </>
                ) : (
                  t('checkout.payment.proceedToPayment') || 'Proceed to Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
