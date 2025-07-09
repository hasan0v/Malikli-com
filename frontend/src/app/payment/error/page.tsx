'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function PaymentErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  const [countdown, setCountdown] = useState(15);
  const [isClient, setIsClient] = useState(false);
  
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
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router, isClient]);
  
  const getErrorMessage = () => {
    switch (error) {
      case 'order_not_found':
        return {
          title: 'Order Not Found',
          message: 'The order associated with this payment could not be found.',
          suggestion: 'Please check your order history or contact support.'
        };
      case 'invalid_response':
        return {
          title: 'Invalid Payment Response',
          message: 'The payment response received was invalid or corrupted.',
          suggestion: 'This is likely a temporary issue. Please try your payment again.'
        };
      case 'status_check_failed':
        return {
          title: 'Status Check Failed',
          message: 'We were unable to verify the status of your payment.',
          suggestion: 'Please check your order status in your account or contact support.'
        };
      case 'missing_token':
        return {
          title: 'Missing Payment Information',
          message: 'Required payment information was not provided.',
          suggestion: 'Please restart the payment process from checkout.'
        };
      case 'processing_error':
        return {
          title: 'Payment Processing Error',
          message: 'An unexpected error occurred while processing your payment.',
          suggestion: 'Please try again or contact support if the problem persists.'
        };
      default:
        return {
          title: 'Payment Error',
          message: 'An unexpected error occurred during the payment process.',
          suggestion: 'Please try again or contact our support team for assistance.'
        };
    }
  };
  
  const errorInfo = getErrorMessage();
  
  const handleTryAgain = () => {
    router.push('/checkout');
  };
  
  const handleContactSupport = () => {
    window.location.href = 'mailto:support@malikli1992.com?subject=Payment Error&body=Error: ' + (error || 'Unknown') + '%0ATime: ' + new Date().toISOString();
  };
  
  const handleGoHome = () => {
    router.push('/');
  };
  
  // Show loading state during SSR to prevent hydration mismatch
  if (!isClient) {
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
          border: '1px solid rgba(252, 165, 165, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #dc2626',
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
      background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem' 
    }}>
      <div className="card" style={{ 
        maxWidth: '448px', 
        width: '100%',
        background: '#fef2f2',
        borderRadius: '16px',
        border: '1px solid #fca5a5'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', lineHeight: '1', marginBottom: '1rem' }}>
              ⚠️
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
            marginBottom: '1rem', 
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
                color: '#92400e', 
                lineHeight: '1.5',
                textAlign: 'left' 
              }}>
                <strong>What to do next:</strong> {errorInfo.suggestion}
              </p>
            </div>
          </div>
          
          {error && (
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
                Error Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>Error Code:</span>
                  <span style={{ fontWeight: '500', color: '#dc2626' }}>{error}</span>
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
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)'
              }}
            >
              Try Again
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
            
            <button
              onClick={handleGoHome}
              className="btn"
              style={{
                width: '100%',
                background: '#f3f4f6',
                color: '#4b5563',
                border: '2px solid #d1d5db'
              }}
            >
              Go to Homepage
            </button>
          </div>
          
          <div style={{ 
            marginTop: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.875rem', 
            color: '#6b7280' 
          }}>
            <span style={{ marginRight: '0.25rem' }}>🕐</span>
            <span>Redirecting to homepage in {countdown} seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}
