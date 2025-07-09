'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/store/store';
import { useI18n } from '@/hooks/useI18n';
import { useEffect } from 'react';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user, isInitialized } = useSelector((state: RootState) => state.auth);

  // Check if user is admin
  useEffect(() => {
    if (isInitialized && (!isAuthenticated || !user?.is_staff)) {
      router.push('/');
      return;
    }
  }, [isInitialized, isAuthenticated, user, router]);

  if (!isInitialized) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user?.is_staff) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className={styles.adminDashboard}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Admin Dashboard</h1>
          <p>Welcome to the admin panel, {user.first_name || user.username}</p>
        </div>

        <div className={styles.dashboardGrid}>
          <div className={styles.dashboardCard} onClick={() => router.push('/admin/orders')}>
            <div className={styles.cardIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 7L12 12L5 7M5 6H19C20.1046 6 21 6.89543 21 8V16C21 17.1046 20.1046 18 19 18H5C3.89543 18 3 17.1046 3 16V8C3 6.89543 3.89543 6 5 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Order Management</h3>
            <p>View and manage all customer orders</p>
            <div className={styles.cardArrow}>→</div>
          </div>

          <div className={styles.dashboardCard} onClick={() => router.push('/admin/products')}>
            <div className={styles.cardIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 7L12 3L4 7L12 11L20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 12L12 16L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 17L12 21L20 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Product Management</h3>
            <p>Manage product catalog and inventory</p>
            <div className={styles.cardArrow}>→</div>
          </div>

          <div className={styles.dashboardCard} onClick={() => router.push('/admin/users')}>
            <div className={styles.cardIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M23 21V19C23 18.1645 22.7155 17.3541 22.2094 16.6977C21.7033 16.0414 20.9963 15.5744 20.194 15.3706" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1712 4.55232C18.7193 5.25392 19.0247 6.11683 19.0247 7.005C19.0247 7.89317 18.7193 8.75608 18.1712 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>User Management</h3>
            <p>Manage customer accounts and permissions</p>
            <div className={styles.cardArrow}>→</div>
          </div>

          <div className={styles.dashboardCard} onClick={() => router.push('/admin/analytics')}>
            <div className={styles.cardIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 9L12 6L16 10L21 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Analytics</h3>
            <p>View sales reports and statistics</p>
            <div className={styles.cardArrow}>→</div>
          </div>
        </div>

        <div className={styles.quickStats}>
          <h2>Quick Overview</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>Total Orders</h3>
              <p className={styles.statNumber}>-</p>
              <span className={styles.statLabel}>All time</span>
            </div>
            <div className={styles.statCard}>
              <h3>Pending Orders</h3>
              <p className={styles.statNumber}>-</p>
              <span className={styles.statLabel}>Needs attention</span>
            </div>
            <div className={styles.statCard}>
              <h3>Total Products</h3>
              <p className={styles.statNumber}>-</p>
              <span className={styles.statLabel}>In catalog</span>
            </div>
            <div className={styles.statCard}>
              <h3>Total Users</h3>
              <p className={styles.statNumber}>-</p>
              <span className={styles.statLabel}>Registered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
