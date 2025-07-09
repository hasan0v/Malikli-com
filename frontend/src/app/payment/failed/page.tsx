'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function PaymentFailedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  const [countdown, setCountdown] = useState(15);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const orderId = searchParams.get('order_id');
  const error = searchParams.get('error');
  const status = searchParams.get('status');
  const token = searchParams.get('token');
  
  // Redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Handle redirect when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/checkout');
    }
  }, [countdown, isRedirecting, router]);
  
  const getErrorMessage = () => {
    switch (error) {
      case 'insufficient_funds':
        return {
          title: 'Insufficient Funds',
          message: 'Your payment was declined due to insufficient funds. Please check your account balance or try a different payment method.',
          suggestion: 'Try using a different card or payment method.',
          icon: '💳'
        };
      case 'card_declined':
        return {
          title: 'Card Declined',
          message: 'Your payment was declined by your bank. This could be due to security reasons or card restrictions.',
          suggestion: 'Please contact your bank or try a different card.',
          icon: '🚫'
        };
      case 'expired_card':
        return {
          title: 'Card Expired',
          message: 'The payment card you used has expired.',
          suggestion: 'Please use a different payment card.',
          icon: '📅'
        };
      case 'processing_error':
        return {
          title: 'Processing Error',
          message: 'There was a technical error while processing your payment.',
          suggestion: 'Please try again in a few minutes.',
          icon: '⚠️'
        };
      case 'network_error':
        return {
          title: 'Network Error',
          message: 'There was a connection problem during payment processing.',
          suggestion: 'Please check your internet connection and try again.',
          icon: '🌐'
        };
      case 'timeout':
        return {
          title: 'Payment Timeout',
          message: 'The payment took too long to process and timed out.',
          suggestion: 'Please try your payment again.',
          icon: '⏰'
        };
      default:
        return {
          title: 'Payment Failed',
          message: 'We were unable to process your payment at this time.',
          suggestion: 'Please try again or contact support if the problem persists.',
          icon: '❌'
        };
    }
  };
  
  const errorInfo = getErrorMessage();
  
  const handleRetryPayment = () => {
    if (orderId) {
      router.push(`/payment?order_id=${orderId}`);
    } else {
      router.push('/checkout');
    }
  };
  
  const handleBackToCheckout = () => {
    router.push('/checkout');
  };
  
  const handleContactSupport = () => {
    // You can implement a contact form or redirect to support page
    window.location.href = 'mailto:support@malikli1992.com?subject=Payment Issue&body=Order ID: ' + (orderId || 'N/A') + '%0AError: ' + (error || 'Unknown') + '%0AToken: ' + (token || 'N/A');
  };
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
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
        border: '1px solid #fecaca'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', lineHeight: '1', marginBottom: '1rem' }}>
              {errorInfo.icon}
            </div>
          </div>
          
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            color: '#991b1b', 
            marginBottom: '1rem',
            textAlign: 'center' 
          }}>
            {errorInfo.title}
          </h1>
          
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '1.5rem', 
            lineHeight: '1.6', 
            fontSize: '0.95rem',
            textAlign: 'center' 
          }}>
            {errorInfo.message}
          </p>
          
          <div style={{ 
            background: '#fef3c7', 
            border: '1px solid #fcd34d', 
            borderRadius: '12px', 
            padding: '1rem', 
            marginBottom: '1.5rem', 
            width: '100%' 
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '0.5rem', 
              fontWeight: '600', 
              color: '#92400e', 
              fontSize: '0.9rem' 
            }}>
              <span style={{ marginRight: '0.5rem' }}>💡</span>
              <strong>What to do next:</strong>
            </div>
            <p style={{ 
              margin: '0', 
              fontSize: '0.875rem', 
              color: '#92400e', 
              lineHeight: '1.5' 
            }}>
              {errorInfo.suggestion}
            </p>
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
                margin: '0 0 0.75rem 0', 
                fontSize: '0.95rem' 
              }}>
                Payment Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {orderId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6b7280' }}>Order ID:</span>
                    <span style={{ fontWeight: '500', color: '#1e293b' }}>{orderId}</span>
                  </div>
                )}
                {error && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6b7280' }}>Error Code:</span>
                    <span style={{ fontWeight: '500', color: '#dc2626', fontFamily: 'monospace' }}>{error}</span>
                  </div>
                )}
                {status && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6b7280' }}>Status:</span>
                    <span style={{ fontWeight: '500', color: '#1e293b' }}>{status}</span>
                  </div>
                )}
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
              onClick={handleRetryPayment}
              className="btn btn-primary"
              disabled={isRedirecting}
              style={{
                width: '100%',
                background: isRedirecting ? '#ccc' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                cursor: isRedirecting ? 'not-allowed' : 'pointer'
              }}
            >
              Try Payment Again
            </button>
            
            <button
              onClick={handleBackToCheckout}
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
              Back to Checkout
            </button>
            
            <button
              onClick={handleContactSupport}
              className="btn"
              disabled={isRedirecting}
              style={{
                width: '100%',
                background: isRedirecting ? '#ccc' : 'white',
                color: isRedirecting ? '#999' : '#6b7280',
                border: `2px solid ${isRedirecting ? '#ccc' : '#6b7280'}`,
                cursor: isRedirecting ? 'not-allowed' : 'pointer'
              }}
            >
              Contact Support
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
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  🕐 Redirecting to checkout in <strong style={{ color: '#dc2626', fontWeight: '700' }}>{countdown}</strong> seconds
                </>
              )}
            </p>
          </div>

          <div style={{ fontSize: '0.875rem', color: '#9b9b9b', textAlign: 'center' }}>
            <p style={{ margin: '0' }}>
              Need help? <a href="/contact" style={{ 
                color: '#40b8b8', 
                textDecoration: 'none', 
                fontWeight: '600' 
              }}>Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
