'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { loadTokensFromStorage } from '@/store/authSlice';
import { useI18n } from '../hooks/useI18n';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const { t } = useI18n();
  const { isAuthenticated, isLoading, isInitialized } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  useEffect(() => {
    // Redirect if not authenticated after initialization is complete
    if (isInitialized && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isInitialized, isAuthenticated, router, redirectTo]);
  // Show loading while checking authentication or while API is loading
  if (!isInitialized || isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280' }}>{!isInitialized ? t('common.initializing') || 'Initializing...' : t('common.checkingAuth')}</p>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
