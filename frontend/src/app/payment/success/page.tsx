'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  const [countdown, setCountdown] = useState(10);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const orderId = searchParams.get('order_id');
  const status = searchParams.get('status');
  
  // Redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRedirecting(true);
          router.push('/orders');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router]);
  
  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/v1/orders/${orderId}/`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const order = await response.json();
        setOrderDetails(order);
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);
  
  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);
  
  const getStatusMessage = () => {
    switch (status) {
      case 'success':
        return {
          title: 'Payment Successful!',
          message: 'Your payment has been processed successfully. Thank you for your purchase!',
          icon: '✅',
          bgColor: '#f0fdf4',
          borderColor: '#bbf7d0'
        };
      case 'already_paid':
        return {
          title: 'Order Already Paid',
          message: 'This order has already been paid for. Thank you for your purchase!',
          icon: '💙',
          bgColor: '#eff6ff',
          borderColor: '#bfdbfe'
        };
      default:
        return {
          title: 'Payment Completed',
          message: 'Your payment has been processed. Please check your email for confirmation.',
          icon: '✅',
          bgColor: '#f0fdf4',
          borderColor: '#bbf7d0'
        };
    }
  };
  
  const statusInfo = getStatusMessage();
  
  const handleViewOrders = () => {
    router.push('/orders');
  };
  
  const handleContinueShopping = () => {
    router.push('/');
  };
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0fdff 0%, #e6fffc 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem' 
    }}>
      <div className="card" style={{ 
        maxWidth: '448px', 
        width: '100%',
        background: statusInfo.bgColor,
        borderRadius: '16px',
        border: `1px solid ${statusInfo.borderColor}`
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', lineHeight: '1', marginBottom: '1rem' }}>
              {statusInfo.icon}
            </div>
          </div>
          
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            color: '#1f2937', 
            marginBottom: '1rem',
            textAlign: 'center' 
          }}>
            {statusInfo.title}
          </h1>
          
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '1.5rem', 
            lineHeight: '1.6', 
            fontSize: '0.95rem',
            textAlign: 'center' 
          }}>
            {statusInfo.message}
          </p>
          
          {orderDetails && (
            <div className="card" style={{ 
              marginBottom: '1.5rem', 
              width: '100%', 
              background: 'white',
              border: '1px solid #e2e8f0' 
            }}>
              <h3 style={{ 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 0.75rem 0', 
                fontSize: '0.95rem' 
              }}>
                Order Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>Order Number:</span>
                  <span style={{ fontWeight: '500', color: '#1e293b' }}>#{orderDetails.order_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>Total Amount:</span>
                  <span style={{ fontWeight: '500', color: '#1e293b' }}>{orderDetails.total_amount} EUR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>Payment Status:</span>
                  <span style={{ 
                    fontWeight: '500', 
                    color: '#10b981',
                    textTransform: 'capitalize' 
                  }}>
                    {orderDetails.payment_status}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem', 
            width: '100%', 
            marginBottom: '1.5rem' 
          }}>
            <button
              onClick={handleViewOrders}
              className="btn btn-primary"
              disabled={isRedirecting}
              style={{
                width: '100%',
                background: isRedirecting ? '#ccc' : undefined,
                cursor: isRedirecting ? 'not-allowed' : 'pointer'
              }}
            >
              View My Orders
            </button>
            
            <button
              onClick={handleContinueShopping}
              className="btn"
              disabled={isRedirecting}
              style={{
                width: '100%',
                background: isRedirecting ? '#ccc' : 'white',
                color: isRedirecting ? '#999' : '#40b8b8',
                border: `2px solid ${isRedirecting ? '#ccc' : '#40b8b8'}`,
                cursor: isRedirecting ? 'not-allowed' : 'pointer'
              }}
            >
              Continue Shopping
            </button>
          </div>
          
          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              {isRedirecting ? (
                <>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #e5e7eb',
                    borderTop: '2px solid #40b8b8',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                  Redirecting to orders...
                </>
              ) : (
                <>
                  🕐 Redirecting to orders in <strong style={{ color: '#40b8b8', fontWeight: '700' }}>{countdown}</strong> seconds
                </>
              )}
            </p>
          </div>
          
          {loading && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '2px solid #e5e7eb',
                borderTop: '2px solid #40b8b8',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
