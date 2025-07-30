'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { RootState } from '@/store/store';
import { useI18n } from '@/hooks/useI18n';
import { getUserOrders, cancelOrder, reorderItems, Order, OrdersResponse } from '@/lib/api/orders';
import styles from './orders.module.css';

export default function OrdersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, isInitialized } = useSelector((state: RootState) => state.auth);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersResponse, setOrdersResponse] = useState<OrdersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // Redirect if not authenticated after initialization is complete
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/auth/login?redirect=/orders');
      return;
    }
  }, [isInitialized, isAuthenticated, router]);
  // Load orders
  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('No access token found');
          return;
        }

        // Map sort options to API format
        let ordering = '';
        switch (sortBy) {
          case 'date':
            ordering = sortOrder === 'desc' ? '-created_at' : 'created_at';
            break;
          case 'amount':
            ordering = sortOrder === 'desc' ? '-total_amount' : 'total_amount';
            break;
          case 'status':
            ordering = sortOrder === 'desc' ? '-status' : 'status';
            break;
        }        const response = await getUserOrders(token, {
          status: selectedStatus,
          ordering: ordering,
          page_size: 50 // Get up to 50 orders
        });        // console.log('Orders response:', response); // Debug log - Commented out for production
        setOrdersResponse(response);
        setOrders(response.results || []);
      } catch (error) {
        console.error('Failed to load orders:', error);
        setError(error instanceof Error ? error.message : 'Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };    if (isInitialized && isAuthenticated && user) {
      loadOrders();    }
  }, [isInitialized, isAuthenticated, user, selectedStatus, sortBy, sortOrder]);

  // Handle payment result notifications
  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    if (paymentStatus) {
      // Show notification based on payment status
      if (paymentStatus === 'success') {
        // You could show a success toast/notification here
        console.log('Payment successful!');
      } else if (paymentStatus === 'cancelled') {
        // You could show a cancelled notification here
        console.log('Payment cancelled');
      }
      
      // Clean up the URL by removing the payment parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment');
      window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
    }
  }, [searchParams]);

// Since we're now doing sorting and filtering on the server side,
  // we can use the orders directly without client-side filtering
  const filteredAndSortedOrders = Array.isArray(orders) ? orders : [];
  // Handle order cancellation
  const handleCancelOrder = async (orderId: string | number) => {
    const confirmMessage = t('orders.actions.confirmCancel') || 'Are you sure you want to cancel this order?';
    if (!confirm(confirmMessage)) return;
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No access token found. Please log in again.');
        return;
      }

      // Show loading state (you could add a loading state per order if needed)
      console.log(`Cancelling order ${orderId}...`);

      const cancelledOrder = await cancelOrder(orderId, token);
      
      // Update the specific order in the current list instead of refetching all
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: cancelledOrder.status, payment_status: cancelledOrder.payment_status }
            : order
        )
      );

      // Show success message
      console.log('Order cancelled successfully');
      
    } catch (error) {
      console.error('Failed to cancel order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel order';
      setError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };
  // Handle reorder
  const handleReorder = async (orderId: string | number) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No access token found');
        return;
      }

      const result = await reorderItems(orderId, token);
      alert(result.message || 'Items added to cart!');
      
    } catch (error) {
      console.error('Failed to reorder:', error);
      alert(error instanceof Error ? error.message : 'Failed to reorder items');
    }  };
  // Handle retry payment
  const handleRetryPayment = (order: Order) => {
    if (!order) return;
    
    // Redirect to checkout page with order ID for payment retry
    // This will let the user complete payment for the existing order
    router.push(`/checkout/payment?orderId=${order.id}&amount=${order.total_amount}`);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return '#F39C12';
      case 'confirmed': return '#3498DB';
      case 'processing': return '#0ABAB5';
      case 'shipped': return '#81D8D4';
      case 'delivered': return '#27AE60';
      case 'cancelled': return '#E74C3C';
      default: return '#95A5A6';
    }
  };

  const getPaymentStatusColor = (status: Order['payment_status']) => {
    switch (status) {
      case 'paid': return '#27AE60';
      case 'pending': return '#F39C12';
      case 'failed': return '#E74C3C';
      case 'refunded': return '#3498DB';
      default: return '#95A5A6';
    }
  };
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString; // Return original string if parsing fails
    }
  };
  // Show loading while auth initializes or while fetching orders
  if (!isInitialized || isLoading) {
    return (
      <div className={styles.ordersPage}>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{!isInitialized ? t('general.initializing') || 'Initializing...' : t('orders.loading')}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <div className={styles.ordersPage}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>{t('orders.error.title')}</h3>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className={styles.retryButton}
            >
              {t('orders.error.retry')}
            </button>
          </div>
        </div>
      </div>
    );  }

  return (
    <div className={styles.ordersPage}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>{t('orders.title')}</h1>
          <p className={styles.subtitle}>{t('orders.subtitle')}</p>        </div>

        {/* Controls - Commented out 
        <div className={styles.controls}>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label htmlFor="status-filter">{t('orders.filters.status')}</label>              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={styles.select}
              >
                <option value="all">{t('orders.filters.allStatuses')}</option>
                <option value="pending_payment">{t('orders.status.pending')}</option>
                <option value="processing">{t('orders.status.processing')}</option>
                <option value="shipped">{t('orders.status.shipped')}</option>
                <option value="delivered">{t('orders.status.delivered')}</option>
                <option value="cancelled">{t('orders.status.cancelled')}</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="sort-filter">{t('orders.filters.sortBy')}</label>
              <select
                id="sort-filter"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('-');
                  setSortBy(sort as 'date' | 'amount' | 'status');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className={styles.select}
              >
                <option value="date-desc">{t('orders.filters.dateDesc')}</option>
                <option value="date-asc">{t('orders.filters.dateAsc')}</option>
                <option value="amount-desc">{t('orders.filters.amountDesc')}</option>
                <option value="amount-asc">{t('orders.filters.amountAsc')}</option>
                <option value="status-asc">{t('orders.filters.statusAsc')}</option>
              </select>
            </div>
          </div>

          <div className={styles.orderCount}>
            {t('orders.orderCount', { count: filteredAndSortedOrders.length })}
          </div>
        </div>
        */}

        {/* Orders List */}
        {filteredAndSortedOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📦</div>
            <h3>{t('orders.empty.title')}</h3>
            <p>{t('orders.empty.message')}</p>
            <button
              onClick={() => router.push('/')}
              className={styles.shopButton}
            >
              {t('orders.empty.startShopping')}
            </button>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {filteredAndSortedOrders.map((order) => (
              <div key={order.id} className={styles.orderCard}>
                {/* Order Header */}
                <div className={styles.orderHeader}>
                  <div className={styles.orderInfo}>
                    <h3 className={styles.orderNumber}>{order.order_number}</h3>
                    <div className={styles.orderMeta}>
                      <span className={styles.orderDate}>
                        {t('orders.orderDate')}: {formatDate(order.created_at)}
                      </span>                      <span className={styles.orderTotal}>
                        {t('orders.total')}: ${order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.orderStatuses}>
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

                {/* Order Items */}
                <div className={styles.orderItems}>                  {order.items.map((item) => (
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
                        <h4 className={styles.itemName}>{item.name}</h4>
                        <div className={styles.itemVariant}>
                          {item.color && <span>{t('orders.item.color')}: {item.color}</span>}
                          {item.size && <span>{t('orders.item.size')}: {item.size}</span>}
                        </div>                        <div className={styles.itemPrice}>
                          <span className={styles.quantity}>{t('orders.item.quantity')}: {item.quantity}</span>
                          <span className={styles.price}>
                            ${item.price ? parseFloat(item.price).toFixed(2) : '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery Info */}
                {(order.tracking_number || order.estimated_delivery) && (
                  <div className={styles.deliveryInfo}>
                    <h4>{t('orders.delivery.title')}</h4>
                    <div className={styles.deliveryDetails}>
                      {order.tracking_number && (
                        <div className={styles.trackingInfo}>
                          <strong>{t('orders.delivery.trackingNumber')}:</strong>
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
                      )}                      {order.estimated_delivery && (
                        <div className={styles.estimatedDelivery}>
                          <strong>{t('orders.delivery.estimated')}:</strong>
                          <span>{formatDate(order.estimated_delivery)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}                {/* Order Actions */}
                <div className={styles.orderActions}>
                  <button 
                    className={styles.viewDetailsButton}
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    {t('orders.actions.viewDetails')}
                  </button>
                  {/* Retry Payment Button for pending payments (excluding cancelled orders) */}
                  {/* {order.payment_status === 'pending' && order.status !== 'cancelled' && (
                    <button 
                      className={styles.retryPaymentButton}
                      onClick={() => handleRetryPayment(order)}
                      title="Complete payment for this order"
                    >
                      {t('orders.actions.retryPayment') || 'Complete Payment'}
                    </button>
                  )} */}
                  
                  {order.status === 'delivered' && (
                    <button 
                      className={styles.reorderButton}
                      onClick={() => handleReorder(order.id)}
                      title="Add these items to cart again"
                    >
                      {t('orders.actions.reorder')}
                    </button>
                  )}
                  
                  {/* Show cancel button for orders that can be cancelled */}
                  {/* {(order.status === 'pending' || order.status === 'confirmed') && 
                   order.payment_status !== 'paid' && (
                    <button 
                      className={styles.cancelButton}
                      onClick={() => handleCancelOrder(order.id)}
                      title="Cancel this order"
                    >
                      {t('orders.actions.cancel') || 'Cancel Order'}
                    </button>
                  )} */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
