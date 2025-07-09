'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function PaymentPendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  const [countdown, setCountdown] = useState(20);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isClient, setIsClient] = useState(false);
  
  const orderId = searchParams.get('order_id');
  const status = searchParams.get('status');
  
  // Prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Status checking
  useEffect(() => {
    if (!orderId || !isClient) {
      setCheckingStatus(false);
      return;
    }
    
    const checkPaymentStatus = async () => {
      try {
        // Use the improved payment status endpoint
        const response = await fetch(`/api/v1/payments/status/?order_id=${orderId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const statusData = await response.json();
          
          if (statusData.success && statusData.order) {
            const order = statusData.order;
            
            // If payment is completed, redirect to success
            if (order.payment_status === 'paid' || statusData.payment_status === 'completed' || statusData.payment_status === 'successful') {
              router.push(`/payment/success?order_id=${orderId}&status=success`);
              return;
            }
            
            // If payment failed, redirect to failed page
            if (order.payment_status === 'failed' || statusData.payment_status === 'failed') {
              router.push(`/payment/failed?order_id=${orderId}&error=payment_failed`);
              return;
            }
            
            // If payment cancelled, redirect to cancelled page
            if (order.payment_status === 'cancelled' || statusData.payment_status === 'cancelled') {
              router.push(`/payment/cancelled?order_id=${orderId}&status=cancelled`);
              return;
            }
            
            // If still pending, continue checking
            setCheckingStatus(false);
          } else {
            // Fallback to order API if status check fails
            const orderResponse = await fetch(`/api/v1/orders/${orderId}/`, {
              credentials: 'include',
            });
            
            if (orderResponse.ok) {
              const order = await orderResponse.json();
              
              // If payment is completed, redirect to success
              if (order.payment_status === 'paid' || order.payment_status === 'completed') {
                router.push(`/payment/success?order_id=${orderId}&status=success`);
                return;
              }
              
              // If payment failed, redirect to failed page
              if (order.payment_status === 'failed' || order.payment_status === 'declined') {
                router.push(`/payment/failed?order_id=${orderId}&error=payment_failed`);
                return;
              }
              
              // If still pending, continue checking
              setCheckingStatus(false);
            }
          }
        } else {
          console.error('Error checking payment status:', response.statusText);
          setCheckingStatus(false);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setCheckingStatus(false);
      }
    };
    
    // Check immediately
    checkPaymentStatus();
    
    // Then check every 3 seconds (reduced from 5 for faster updates)
    const statusInterval = setInterval(checkPaymentStatus, 3000);
    
    return () => clearInterval(statusInterval);
  }, [orderId, router, isClient]);
  
  // Redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/orders');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router]);
  
  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return {
          title: 'Payment Processing',
          message: 'Your payment is being processed. This may take a few minutes.',
          description: 'Please do not close this page or refresh your browser.'
        };
      case 'authorized':
        return {
          title: 'Payment Authorized',
          message: 'Your payment has been authorized and is awaiting final confirmation.',
          description: 'We are finalizing your payment. You will receive confirmation shortly.'
        };
      case 'pending':
        return {
          title: 'Payment Pending',
          message: 'Your payment is pending confirmation from your bank.',
          description: 'This process may take up to 10 minutes. We will update you once confirmed.'
        };
      default:
        return {
          title: 'Payment In Progress',
          message: 'We are processing your payment request.',
          description: 'Please wait while we complete your transaction.'
        };
    }
  };
  
  const statusInfo = getStatusMessage();
  
  const handleCheckStatus = async () => {
    if (!orderId) return;
    
    setCheckingStatus(true);
    try {
      // Use the improved payment status endpoint
      const response = await fetch(`/api/v1/payments/status/?order_id=${orderId}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const statusData = await response.json();
        
        if (statusData.success && statusData.order) {
          const order = statusData.order;
          
          if (order.payment_status === 'paid' || statusData.payment_status === 'completed' || statusData.payment_status === 'successful') {
            router.push(`/payment/success?order_id=${orderId}&status=success`);
          } else if (order.payment_status === 'failed' || statusData.payment_status === 'failed') {
            router.push(`/payment/failed?order_id=${orderId}&error=payment_failed`);
          } else if (order.payment_status === 'cancelled' || statusData.payment_status === 'cancelled') {
            router.push(`/payment/cancelled?order_id=${orderId}&status=cancelled`);
          }
        } else {
          // Fallback to order API
          const orderResponse = await fetch(`/api/v1/orders/${orderId}/`, {
            credentials: 'include',
          });
          
          if (orderResponse.ok) {
            const order = await orderResponse.json();
            
            if (order.payment_status === 'paid') {
              router.push(`/payment/success?order_id=${orderId}&status=success`);
            } else if (order.payment_status === 'failed') {
              router.push(`/payment/failed?order_id=${orderId}&error=payment_failed`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };
  
  const handleContactSupport = () => {
    window.location.href = 'mailto:support@malikli1992.com?subject=Payment Status Inquiry&body=Order ID: ' + (orderId || 'N/A');
  };
  
  // Show loading state during SSR to prevent hydration mismatch
  if (!isClient) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '1rem' 
      }}>
        <div className="card" style={{ 
          maxWidth: '448px', 
          width: '100%',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #f59e0b',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '2rem auto'
          }}></div>
          <p style={{ color: '#6b7280', margin: '0 0 2rem 0' }}>Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem' 
    }}>
      <div className="card" style={{ 
        maxWidth: '448px', 
        width: '100%',
        background: '#fffbeb',
        borderRadius: '16px',
        border: '1px solid #fcd34d'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center', position: 'relative' }}>
            <div style={{ fontSize: '4rem', lineHeight: '1', marginBottom: '1rem' }}>
              🕐
            </div>
            {checkingStatus && (
              <div style={{ 
                position: 'absolute', 
                top: '-4px', 
                right: '-4px',
                width: '24px',
                height: '24px',
                border: '2px solid #f59e0b',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            )}
          </div>
          
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            color: '#92400e', 
            marginBottom: '1rem',
            textAlign: 'center' 
          }}>
            {statusInfo.title}
          </h1>
          
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '1rem', 
            lineHeight: '1.6', 
            fontSize: '0.95rem',
            textAlign: 'center' 
          }}>
            {statusInfo.message}
          </p>
          
          <div className="card" style={{ 
            marginBottom: '1.5rem', 
            width: '100%', 
            background: 'white',
            border: '1px solid #e2e8f0' 
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ 
                fontSize: '1.25rem', 
                color: '#d97706', 
                marginTop: '0.125rem', 
                marginRight: '0.5rem', 
                flexShrink: 0 
              }}>
                ⚠️
              </span>
              <p style={{ 
                margin: '0', 
                fontSize: '0.875rem', 
                color: '#374151', 
                lineHeight: '1.5',
                textAlign: 'left' 
              }}>
                {statusInfo.description}
              </p>
            </div>
          </div>
          
          {orderId && (
            <div className="card" style={{ 
              marginBottom: '1.5rem', 
              width: '100%', 
              background: 'white',
              border: '1px solid #e2e8f0' 
            }}>
              <h3 style={{ 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 0.5rem 0', 
                fontSize: '0.95rem' 
              }}>
                Payment Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>Order ID:</span>
                  <span style={{ fontWeight: '500', color: '#1e293b' }}>{orderId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>Status:</span>
                  <span style={{ 
                    fontWeight: '500', 
                    color: '#d97706',
                    textTransform: 'capitalize' 
                  }}>
                    {status || 'Processing'}
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
              onClick={handleCheckStatus}
              disabled={checkingStatus}
              className="btn btn-primary"
              style={{
                width: '100%',
                background: checkingStatus ? '#ccc' : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                cursor: checkingStatus ? 'not-allowed' : 'pointer',
                opacity: checkingStatus ? 0.5 : 1
              }}
            >
              {checkingStatus ? 'Checking...' : 'Check Payment Status'}
            </button>
            
            <button
              onClick={handleContactSupport}
              className="btn"
              style={{
                width: '100%',
                background: 'white',
                color: '#4f46e5',
                border: '2px solid #4f46e5'
              }}
            >
              Contact Support
            </button>
          </div>
          
          <div style={{ 
            marginTop: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.875rem', 
            color: '#6b7280',
            marginBottom: '0.5rem'
          }}>
            <span style={{ marginRight: '0.25rem' }}>�</span>
            <span>Auto-checking status every 3 seconds</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.875rem', 
            color: '#6b7280' 
          }}>
            <span>Redirecting to orders in <strong style={{ color: '#d97706' }}>{countdown}</strong> seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}
