'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useParams } from 'next/navigation';
import { RootState } from '@/store/store';
import { useI18n } from '@/hooks/useI18n';
import { getOrderById, cancelOrder, reorderItems, Order } from '@/lib/api/orders';
import styles from './orderDetails.module.css';

export default function OrderDetailsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const orderId = params?.id as string;

  // Check authentication state with localStorage fallback
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      
      // If we have a token but Redux state says not authenticated, 
      // give Redux time to rehydrate (happens on page refresh)
      if (token && !isAuthenticated && !authChecked) {
        setTimeout(() => {
          setAuthChecked(true);
        }, 100);
        return;
      }
      
      // If no token and not authenticated, redirect to login
      if (!token && !isAuthenticated) {
        const currentPath = window.location.pathname;
        router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }
      
      setAuthChecked(true);
    };

    checkAuth();
  }, [isAuthenticated, authChecked, router]);

  // Load order details
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId || !authChecked) {        setError('Invalid order ID');
        setIsLoading(false);
        return;
      }

      // Check if we have authentication (either Redux state or token)
      const token = localStorage.getItem('access_token');
      if (!isAuthenticated && !token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const accessToken = token || localStorage.getItem('access_token');
        if (!accessToken) {
          setError('No access token found');
          return;
        }        const orderData = await getOrderById(orderId, accessToken);
        console.log('Order data loaded:', orderData);
        console.log('Customer info:', orderData.customer_info);
        setOrder(orderData);
      } catch (error) {
        console.error('Failed to load order:', error);
        
        // Handle authentication errors
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            // Token is invalid, redirect to login
            localStorage.removeItem('access_token');
            const currentPath = window.location.pathname;
            router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
            return;
          }
        }
        
        setError(error instanceof Error ? error.message : 'Failed to load order');
      } finally {
        setIsLoading(false);
      }
    };    if (authChecked && orderId) {
      loadOrder();
    }
  }, [authChecked, orderId]);

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!order || !confirm(t('orderDetails.actions.confirmCancel'))) return;
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No access token found');
        return;
      }

      await cancelOrder(order.id, token);
      
      // Refresh order details
      const orderData = await getOrderById(orderId, token);
      setOrder(orderData);
      
    } catch (error) {
      console.error('Failed to cancel order:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel order');
    }
  };
  // Handle reorder
  const handleReorder = async () => {
    if (!order) return;
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No access token found');
        return;
      }

      const result = await reorderItems(order.id, token);
      alert(result.message || 'Items added to cart!');
      
    } catch (error) {
      console.error('Failed to reorder:', error);
      alert(error instanceof Error ? error.message : 'Failed to reorder items');
    }
  };

  // Handle retry payment
  const handleRetryPayment = () => {
    if (!order) return;
    
    // Calculate total amount
    const totalAmount = parseFloat(order.total_amount || '0');
      // Redirect to payment gateway with the order ID
    const paymentUrl = `https://payment.gateway.com/pay?amount=${totalAmount.toFixed(2)}&currency=EUR&orderid=${order.id}&returnUrl=${encodeURIComponent(window.location.origin + '/payment-result?status=success&orderid=' + order.id)}&cancelUrl=${encodeURIComponent(window.location.origin + '/payment-result?status=cancelled&orderid=' + order.id)}`;
    
    window.location.href = paymentUrl;
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'var(--warning-color)';
      case 'confirmed': return 'var(--color-info)';
      case 'processing': return 'var(--color-primary)';
      case 'shipped': return 'var(--color-secondary)';
      case 'delivered': return 'var(--color-success)';
      case 'cancelled': return 'var(--error-color)';
      default: return 'var(--color-text-secondary)';
    }
  };

  const getPaymentStatusColor = (status: Order['payment_status']) => {
    switch (status) {
      case 'paid': return 'var(--color-success)';
      case 'pending': return 'var(--warning-color)';
      case 'failed': return 'var(--color-error)';
      case 'refunded': return 'var(--color-info)';
      default: return 'var(--color-text-secondary)';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper functions to handle string to number conversions from API
  const formatPrice = (price: string | number): number => {
    return typeof price === 'string' ? parseFloat(price) : price;
  };

  const formatCurrency = (amount: string | number): string => {
    const numAmount = formatPrice(amount);
    return numAmount.toFixed(2);
  };
  // Don't render anything until auth is checked
  if (!authChecked) {
    return (
      <div className={styles.orderDetailsPage}>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.orderDetailsPage}>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{t('orders.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.orderDetailsPage}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <h2>{t('orders.error.title')}</h2>
            <p>{error || t('orders.error.orderNotFound')}</p>
            <button 
              onClick={() => router.push('/orders')}
              className={styles.backButton}
            >
              {t('orders.error.backToOrders')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.orderDetailsPage}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button 
            onClick={() => router.push('/orders')}
            className={styles.backButton}
          >
            ← {t('orders.actions.backToOrders')}
          </button>
          <div className={styles.headerContent}>
            <h1 className={styles.orderNumber}>{order.order_number}</h1>
            <div className={styles.orderStatus}>
              <span 
                className={styles.status}
                style={{ backgroundColor: getStatusColor(order.status) }}
              >
                {t(`orders.status.${order.status}`)}
              </span>
              <span 
                className={styles.paymentStatus}
                style={{ color: getPaymentStatusColor(order.payment_status) }}
              >
                {t(`orders.paymentStatus.${order.payment_status}`)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.content}>          {/* Order Summary */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('orderDetails.summary.title')}</h2>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.label}>{t('orders.orderDate')}:</span>
                <span className={styles.value}>{formatDate(order.created_at)}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.label}>{t('orders.total')}:</span>
                <span className={styles.value}>${formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>{/* Customer Information */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('orderDetails.customer.title')}</h2>
            <div className={styles.customerInfo}>
              <div className={styles.infoItem}>
                <span className={styles.label}>{t('orderDetails.customer.name')}:</span>
                <span className={styles.value}>
                  {order.customer_info?.first_name || ''} {order.customer_info?.last_name || ''}
                  {(!order.customer_info?.first_name && !order.customer_info?.last_name) && 
                    <span className={styles.missingInfo}>Name not provided</span>
                  }
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>{t('orderDetails.customer.email')}:</span>
                <span className={styles.value}>
                  {order.customer_info?.email || 
                    <span className={styles.missingInfo}>Email not provided</span>
                  }
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>{t('orderDetails.customer.phone')}:</span>
                <span className={styles.value}>
                  {order.customer_info?.phone || 
                    <span className={styles.missingInfo}>Phone not provided</span>
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('orderDetails.shipping.title')}</h2>
            <div className={styles.shippingInfo}>
              <div className={styles.addressInfo}>
                <h3>{t('orderDetails.shipping.address')}</h3>
                <div className={styles.address}>
                  <p>{order.shipping_address.street_address}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                  <p>{order.shipping_address.postal_code}</p>
                </div>
              </div>
              
              {order.tracking_number && (
                <div className={styles.trackingInfo}>
                  <h3>{t('orders.delivery.trackingNumber')}</h3>
                  <div className={styles.trackingDetails}>
                    <span className={styles.trackingNumber}>{order.tracking_number}</span>
                    <button 
                      className={styles.trackButton}
                      onClick={() => {
                        // In a real app, this would open tracking page
                        alert(`Track order: ${order.tracking_number}`);
                      }}
                    >
                      {t('orders.delivery.track')}
                    </button>
                  </div>
                </div>
              )}

              {order.estimated_delivery && (
                <div className={styles.deliveryInfo}>
                  <h3>{t('orders.delivery.estimated')}</h3>
                  <p>{new Date(order.estimated_delivery).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('orderDetails.items.title')}</h2>
            <div className={styles.itemsList}>
              {order.items.map((item) => (
                <div key={item.id} className={styles.orderItem}>
                  <div className={styles.itemImage}>
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className={styles.itemDetails}>
                    <h4 className={styles.itemName}>{item.name}</h4>
                    <div className={styles.itemVariants}>
                      {item.color && (
                        <span className={styles.variant}>
                          {t('orders.item.color')}: {item.color}
                        </span>
                      )}
                      {item.size && (
                        <span className={styles.variant}>
                          {t('orders.item.size')}: {item.size}
                        </span>
                      )}
                    </div>
                    <div className={styles.itemPricing}>
                      <span className={styles.quantity}>
                        {t('orders.item.quantity')}: {item.quantity}
                      </span>                      <span className={styles.unitPrice}>
                        ${formatCurrency(item.price)} {t('orderDetails.items.each')}
                      </span>
                      <span className={styles.totalPrice}>
                        ${formatCurrency(formatPrice(item.price) * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Total */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('orderDetails.total.title')}</h2>            <div className={styles.orderTotal}>
              <div className={styles.totalItem}>
                <span className={styles.label}>{t('orderDetails.total.subtotal')}:</span>
                <span className={styles.value}>
                  ${formatCurrency(formatPrice(order.total_amount) - formatPrice(order.shipping_cost) + formatPrice(order.discount_amount))}
                </span>
              </div>
              <div className={styles.totalItem}>
                <span className={styles.label}>{t('orderDetails.total.shipping')}:</span>
                <span className={styles.value}>
                  {formatPrice(order.shipping_cost) === 0 ? t('orderDetails.total.free') : `$${formatCurrency(order.shipping_cost)}`}
                </span>
              </div>
              {formatPrice(order.discount_amount) > 0 && (
                <div className={styles.totalItem}>
                  <span className={styles.label}>{t('orderDetails.total.discount')}:</span>
                  <span className={styles.value}>-${formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div className={styles.totalItem + ' ' + styles.grandTotal}>
                <span className={styles.label}>{t('orderDetails.total.total')}:</span>
                <span className={styles.value}>${formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>          
          {/* Actions */}
          <div className={styles.actions}>            
            {/* Retry Payment Button for pending payments (excluding cancelled orders) */}
            {order.payment_status === 'pending' && order.status !== 'cancelled' && (
              <button 
                className={styles.retryPaymentButton}
                onClick={handleRetryPayment}
              >
                {t('orders.actions.retryPayment') || 'Retry Payment'}
              </button>
            )}

            {order.status === 'delivered' && (
              <button 
                className={styles.reorderButton}
                onClick={() => {
                  // In a real app, this would add items to cart
                  alert('Items added to cart!');
                }}
              >
                {t('orders.actions.reorder')}
              </button>
            )}
            
            {(order.status === 'pending' || order.status === 'confirmed') && (
              <button 
                className={styles.cancelButton}
                onClick={() => {
                  if (confirm(t('orders.actions.confirmCancel'))) {
                    // In a real app, this would cancel the order
                    alert('Order cancelled');
                  }
                }}
              >
                {t('orders.actions.cancel')}
              </button>
            )}

            <button 
              className={styles.printButton}
              onClick={() => window.print()}
            >
              {t('orderDetails.actions.print')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
