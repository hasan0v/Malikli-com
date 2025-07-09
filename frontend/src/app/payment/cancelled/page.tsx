'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function PaymentCancelledPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  const [countdown, setCountdown] = useState(12);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const orderId = searchParams.get('order_id');
  const status = searchParams.get('status');
  const error = searchParams.get('error');
  
  // Prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Redirect countdown
  useEffect(() => {
    if (!isClient) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRedirecting(true);
          router.push('/checkout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router, isClient]);
  
  const getMessage = () => {
    if (error === 'processing_error') {
      return {
        title: 'Payment Processing Error',
        message: 'There was an error processing your payment cancellation. Your order has been cancelled.',
        icon: '⚠️'
      };
    }
    
    return {
      title: 'Payment Cancelled',
      message: 'You have cancelled the payment process. Your order has been cancelled and any reserved items have been returned to inventory.',
      icon: '❌'
    };
  };
  
  // Show loading state during SSR to prevent hydration mismatch
  if (!isClient) {
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
          background: 'white',
          borderRadius: '16px',
          border: '1px solid rgba(64, 184, 178, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #40b8b8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '2rem auto'
          }}></div>
          <p style={{ color: '#6b7280', margin: '0 0 2rem 0' }}>Loading...</p>
        </div>
      </div>
    );
  }
  
  const messageInfo = getMessage();
  
  const handleTryAgain = () => {
    if (orderId) {
      router.push(`/payment?order_id=${orderId}`);
    } else {
      router.push('/checkout');
    }
  };
  
  const handleBackToCheckout = () => {
    router.push('/checkout');
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
        background: 'white',
        borderRadius: '16px',
        border: '1px solid rgba(64, 184, 178, 0.1)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', lineHeight: '1', marginBottom: '1rem' }}>
              {messageInfo.icon}
            </div>
          </div>
          
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            color: '#1f2937', 
            marginBottom: '1rem',
            textAlign: 'center' 
          }}>
            {messageInfo.title}
          </h1>
          
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '1.5rem', 
            lineHeight: '1.6', 
            fontSize: '0.95rem',
            textAlign: 'center' 
          }}>
            {messageInfo.message}
          </p>
          
          <div style={{ 
            background: '#f0fdff', 
            border: '1px solid rgba(64, 184, 178, 0.2)', 
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
              color: '#1e293b', 
              fontSize: '0.9rem' 
            }}>
              <span style={{ marginRight: '0.5rem' }}>ℹ️</span>
              <strong>What happened?</strong>
            </div>
            <p style={{ 
              margin: '0', 
              fontSize: '0.875rem', 
              color: '#475569', 
              lineHeight: '1.5' 
            }}>
              Your payment was cancelled and no charges were made to your account. 
              If you had items in your cart, they have been returned to inventory.
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
                Cancellation Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>Order ID:</span>
                  <span style={{ fontWeight: '500', color: '#1e293b' }}>{orderId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>Status:</span>
                  <span style={{ fontWeight: '500', color: '#dc2626' }}>Cancelled</span>
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
              onClick={handleTryAgain}
              className="btn btn-primary"
              disabled={isRedirecting}
              style={{
                width: '100%',
                background: isRedirecting ? '#ccc' : 'linear-gradient(135deg, #40b8b8 0%, #36a3a3 100%)',
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
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  🕐 Redirecting to checkout in <strong style={{ color: '#40b8b8', fontWeight: '700' }}>{countdown}</strong> seconds
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
