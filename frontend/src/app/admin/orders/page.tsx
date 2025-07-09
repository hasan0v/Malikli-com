'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/store/store';
import { useI18n } from '@/hooks/useI18n';
import styles from './adminOrders.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';

interface AdminOrder {
  order_id: string; // UUID field
  user_email: string;
  order_status: string;
  payment_status: string;
  total_amount: string;
  created_at: string;
  updated_at: string;
}

export default function AdminOrdersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user, isInitialized } = useSelector((state: RootState) => state.auth);
    const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (isInitialized && (!isAuthenticated || !user?.is_staff)) {
      router.push('/');
      return;
    }
  }, [isInitialized, isAuthenticated, user, router]);

  // Load all orders (admin view)
  useEffect(() => {
    const loadAdminOrders = async () => {
      if (!isAuthenticated || !user?.is_staff) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('No access token found');
          return;
        }        // Admin-specific API endpoint
        const response = await fetch(`${API_BASE_URL}/admin/orders/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load orders');
        }

        const data = await response.json();
        setOrders(data.results || []);
      } catch (err) {
        console.error('Error loading admin orders:', err);
        setError('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && user?.is_staff) {
      loadAdminOrders();
    }
  }, [isAuthenticated, user]);
  // Function to update payment status
  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    if (!isAuthenticated || !user?.is_staff) return;
    
    setUpdatingPaymentStatus(orderId);
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No access token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/update_payment_status/`, {
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
        // Update the order in the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.order_id === orderId 
            ? { ...order, payment_status: updatedOrder.payment_status }
            : order
        )
      );
      
    } catch (err) {
      console.error('Error updating payment status:', err);
      setError('Failed to update payment status');
    } finally {
      setUpdatingPaymentStatus(null);
    }  };

  // Filter orders based on selected status and payment status
  const filteredOrders = orders.filter(order => {
    const statusMatch = selectedStatus === 'all' || order.order_status === selectedStatus;
    const paymentStatusMatch = selectedPaymentStatus === 'all' || order.payment_status === selectedPaymentStatus;
    return statusMatch && paymentStatusMatch;
  });

  if (!isInitialized || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading orders...</p>
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
      </div>
    );
  }

  return (
    <div className={styles.adminOrdersPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Admin - Order Management</h1>
          <p>Manage all orders in the system</p>
        </div>        <div className={styles.filters}>          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={styles.statusFilter}
          >
            <option key="all-order-status" value="all">All Order Status</option>
            <option key="pending_payment" value="pending_payment">Pending Payment</option>
            <option key="processing" value="processing">Processing</option>
            <option key="shipped" value="shipped">Shipped</option>
            <option key="delivered" value="delivered">Delivered</option>
            <option key="cancelled" value="cancelled">Cancelled</option>
            <option key="refunded" value="refunded">Refunded</option>
            <option key="failed" value="failed">Failed</option>
          </select>
          
          <select 
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className={styles.statusFilter}
          >
            <option key="all-payment-status" value="all">All Payment Status</option>
            <option key="pending-payment" value="pending">Pending</option>
            <option key="paid-payment" value="paid">Paid</option>
            <option key="failed-payment" value="failed">Failed</option>
            <option key="refunded-payment" value="refunded">Refunded</option>
          </select></div>        <div className={styles.ordersGrid}>
          {filteredOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No orders found</h3>
              <p>No orders match the current filters.</p>
            </div>
          ) : (            filteredOrders.map((order, index) => (
              <div key={`order-${order.order_id || index}`} className={styles.orderCard}><div className={styles.orderHeader}>
                  <span className={styles.orderId}>Order #{order.order_id}</span>
                  <span className={`${styles.status} ${styles[order.order_status || 'pending_payment']}`}>
                    {(order.order_status || 'pending_payment').toUpperCase().replace('_', ' ')}
                  </span>
                </div>                <div className={styles.orderDetails}>
                  <p><strong>Customer:</strong> {order.user_email}</p>
                  <p><strong>Total:</strong> ${order.total_amount}</p>
                  <p><strong>Payment Status:</strong> 
                    <span className={`${styles.paymentStatus} ${styles[`payment_${order.payment_status || 'pending'}`]}`}>
                      {(order.payment_status || 'pending').toUpperCase()}
                    </span>
                  </p>
                  <p><strong>Created:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className={styles.paymentActions}>
                  <h4>Update Payment Status:</h4>                  <div className={styles.paymentButtons}>
                    <button 
                      key={`order-${order.order_id || index}-pending`}
                      className={`${styles.paymentButton} ${styles.pendingButton}`}
                      onClick={() => updatePaymentStatus(order.order_id, 'pending')}
                      disabled={updatingPaymentStatus === order.order_id || order.payment_status === 'pending'}
                    >
                      {updatingPaymentStatus === order.order_id ? 'Updating...' : 'Mark Pending'}
                    </button>
                    <button 
                      key={`order-${order.order_id || index}-paid`}
                      className={`${styles.paymentButton} ${styles.paidButton}`}
                      onClick={() => updatePaymentStatus(order.order_id, 'paid')}
                      disabled={updatingPaymentStatus === order.order_id || order.payment_status === 'paid'}
                    >
                      {updatingPaymentStatus === order.order_id ? 'Updating...' : 'Mark Paid'}
                    </button>
                    <button 
                      key={`order-${order.order_id || index}-failed`}
                      className={`${styles.paymentButton} ${styles.failedButton}`}
                      onClick={() => updatePaymentStatus(order.order_id, 'failed')}
                      disabled={updatingPaymentStatus === order.order_id || order.payment_status === 'failed'}
                    >
                      {updatingPaymentStatus === order.order_id ? 'Updating...' : 'Mark Failed'}
                    </button>
                    <button 
                      key={`order-${order.order_id || index}-refunded`}
                      className={`${styles.paymentButton} ${styles.refundedButton}`}
                      onClick={() => updatePaymentStatus(order.order_id, 'refunded')}
                      disabled={updatingPaymentStatus === order.order_id || order.payment_status === 'refunded'}
                    >
                      {updatingPaymentStatus === order.order_id ? 'Updating...' : 'Mark Refunded'}
                    </button>
                  </div>
                </div>                <div className={styles.orderActions}>
                  <button 
                    className={styles.viewButton}
                    onClick={() => router.push(`/admin/orders/${order.order_id}`)}
                  >
                    View Details
                  </button>                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
