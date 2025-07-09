'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useParams } from 'next/navigation';
import { RootState } from '@/store/store';
import { useI18n } from '@/hooks/useI18n';
import styles from './adminOrderDetails.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';

interface AdminOrderDetail {
  order_id: string;
  order_number: string;
  user_email: string;
  order_status: string;
  payment_status: string;
  total_amount: string;
  subtotal_amount: string;
  shipping_cost: string;
  created_at: string;
  updated_at: string;
  customer_notes?: string;
  tracking_number?: string;
  items: any[];
  shipping_address_details?: any;
  billing_address_details?: any;
}

export default function AdminOrderDetailsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, user, isInitialized } = useSelector((state: RootState) => state.auth);
  
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const orderId = params?.id as string;

  // Check if user is admin
  useEffect(() => {
    if (isInitialized && (!isAuthenticated || !user?.is_staff)) {
      router.push('/');
      return;
    }
  }, [isInitialized, isAuthenticated, user, router]);

  // Load order details
  useEffect(() => {
    const loadOrderDetails = async () => {
      if (!isAuthenticated || !user?.is_staff || !orderId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('No access token found');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load order details');
        }

        const data = await response.json();
        setOrder(data);
      } catch (err) {
        console.error('Error loading order details:', err);
        setError('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && user?.is_staff && orderId) {
      loadOrderDetails();
    }
  }, [isAuthenticated, user, orderId]);

  // Function to update order status
  const updateOrderStatus = async (newStatus: string) => {
    if (!order || updatingStatus) return;
    
    setUpdatingStatus(true);
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No access token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/orders/${order.order_id}/update_status/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Function to update payment status
  const updatePaymentStatus = async (newStatus: string) => {
    if (!order || updatingStatus) return;
    
    setUpdatingStatus(true);
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No access token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/orders/${order.order_id}/update_payment_status/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payment_status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      
    } catch (err) {
      console.error('Error updating payment status:', err);
      setError('Failed to update payment status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!isInitialized || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user?.is_staff) {
    return null; // Will redirect via useEffect
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          className={styles.backButton}
          onClick={() => router.push('/admin/orders')}
        >
          Back to Orders
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.errorContainer}>
        <h2>Order Not Found</h2>
        <p>The requested order could not be found.</p>
        <button 
          className={styles.backButton}
          onClick={() => router.push('/admin/orders')}
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className={styles.adminOrderDetailsPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/admin/orders')}
          >
            ← Back to Orders
          </button>
          <h1>Order Details - #{order.order_number}</h1>
        </div>

        <div className={styles.orderInfo}>
          <div className={styles.infoCard}>
            <h3>Order Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>Order ID:</label>
                <span>{order.order_id}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Order Number:</label>
                <span>{order.order_number}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Customer:</label>
                <span>{order.user_email}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Created:</label>
                <span>{new Date(order.created_at).toLocaleString()}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Updated:</label>
                <span>{new Date(order.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className={styles.statusCard}>
            <h3>Status Management</h3>
            <div className={styles.statusSection}>
              <div className={styles.currentStatus}>
                <label>Order Status:</label>
                <span className={`${styles.statusBadge} ${styles[order.order_status || 'pending_payment']}`}>
                  {(order.order_status || 'pending_payment').toUpperCase().replace('_', ' ')}
                </span>
              </div>
              <div className={styles.statusButtons}>
                <button 
                  onClick={() => updateOrderStatus('pending_payment')}
                  disabled={updatingStatus || order.order_status === 'pending_payment'}
                  className={`${styles.statusButton} ${styles.pendingButton}`}
                >
                  Pending Payment
                </button>
                <button 
                  onClick={() => updateOrderStatus('processing')}
                  disabled={updatingStatus || order.order_status === 'processing'}
                  className={`${styles.statusButton} ${styles.processingButton}`}
                >
                  Processing
                </button>
                <button 
                  onClick={() => updateOrderStatus('shipped')}
                  disabled={updatingStatus || order.order_status === 'shipped'}
                  className={`${styles.statusButton} ${styles.shippedButton}`}
                >
                  Shipped
                </button>
                <button 
                  onClick={() => updateOrderStatus('delivered')}
                  disabled={updatingStatus || order.order_status === 'delivered'}
                  className={`${styles.statusButton} ${styles.deliveredButton}`}
                >
                  Delivered
                </button>
                <button 
                  onClick={() => updateOrderStatus('cancelled')}
                  disabled={updatingStatus || order.order_status === 'cancelled'}
                  className={`${styles.statusButton} ${styles.cancelledButton}`}
                >
                  Cancelled
                </button>
              </div>
            </div>

            <div className={styles.statusSection}>
              <div className={styles.currentStatus}>
                <label>Payment Status:</label>
                <span className={`${styles.statusBadge} ${styles[`payment_${order.payment_status || 'pending'}`]}`}>
                  {(order.payment_status || 'pending').toUpperCase()}
                </span>
              </div>
              <div className={styles.statusButtons}>
                <button 
                  onClick={() => updatePaymentStatus('pending')}
                  disabled={updatingStatus || order.payment_status === 'pending'}
                  className={`${styles.statusButton} ${styles.pendingButton}`}
                >
                  Pending
                </button>
                <button 
                  onClick={() => updatePaymentStatus('paid')}
                  disabled={updatingStatus || order.payment_status === 'paid'}
                  className={`${styles.statusButton} ${styles.paidButton}`}
                >
                  Paid
                </button>
                <button 
                  onClick={() => updatePaymentStatus('failed')}
                  disabled={updatingStatus || order.payment_status === 'failed'}
                  className={`${styles.statusButton} ${styles.failedButton}`}
                >
                  Failed
                </button>
                <button 
                  onClick={() => updatePaymentStatus('refunded')}
                  disabled={updatingStatus || order.payment_status === 'refunded'}
                  className={`${styles.statusButton} ${styles.refundedButton}`}
                >
                  Refunded
                </button>
              </div>
            </div>
          </div>

          <div className={styles.amountCard}>
            <h3>Order Amounts</h3>
            <div className={styles.amountGrid}>
              <div className={styles.amountItem}>
                <label>Subtotal:</label>
                <span>${order.subtotal_amount}</span>
              </div>
              <div className={styles.amountItem}>
                <label>Shipping:</label>
                <span>${order.shipping_cost || '0.00'}</span>
              </div>
              <div className={styles.amountItem}>
                <label>Total:</label>
                <span className={styles.totalAmount}>${order.total_amount}</span>
              </div>
            </div>
          </div>
        </div>

        {order.customer_notes && (
          <div className={styles.notesCard}>
            <h3>Customer Notes</h3>
            <p>{order.customer_notes}</p>
          </div>
        )}

        {order.tracking_number && (
          <div className={styles.trackingCard}>
            <h3>Tracking Information</h3>
            <p><strong>Tracking Number:</strong> {order.tracking_number}</p>
          </div>
        )}
      </div>
    </div>
  );
}
