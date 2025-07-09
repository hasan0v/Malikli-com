"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/authSlice';
import styles from './Navbar.module.css';
import { CartItem } from '../../store/cartSlice';
import CartSidebar from '../Cart/CartSidebar';
import LanguageSwitcher from '../LanguageSwitcher';
import { useI18n } from '../../hooks/useI18n';

export default function Navbar() {
  const { t } = useI18n();
  // Initialize with false and only update after hydration
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  
  // Force scrolled appearance when mobile menu is open
  const isScrolledOrMenuOpen = scrolled || mobileMenuOpen;
  // Only calculate total items on client-side to avoid hydration mismatch
  const totalItems = mounted 
    ? cartItems.reduce((total: number, item: CartItem) => total + item.quantity, 0)
    : 0;

  // Mark component as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle scroll event to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    
    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  // Only apply transparent style on homepage and when not scrolled or menu open
  const isHomePage = pathname === '/';
  
  // Only apply client-side effects after hydration
  const navbarClass = !mounted ? styles.navbar : (
    isHomePage
      ? isScrolledOrMenuOpen
        ? `${styles.navbar} ${mobileMenuOpen ? styles.mobileOpen : ''}`
        : `${styles.navbar} ${styles.transparent}`
      : styles.navbar
  );

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setCartSidebarOpen(true);
  };

  const handleUserMenuToggle = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    setUserMenuOpen(false);
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <>
      <nav className={navbarClass}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoContainer}>
            {/* Use standard logo on server render, then conditionally apply styles once mounted */}
            <Image 
              src="/logo.png" 
              alt="Malikli1992 Logo" 
              width={150} 
              height={40} 
              className={mounted && isHomePage && !isScrolledOrMenuOpen ? styles.logoWhite : styles.logo}
              priority
              style={{
                width: 'auto',
                height: 'auto',
                maxHeight: '40px',
                // Responsive sizing handled by CSS media queries
              }}
            />
          </Link>

          <div className={styles.navLinks}>
            <Link href="/delivery" className={styles.navLink}>
              {t('nav.delivery')}
            </Link>
            <Link href="/about" className={styles.navLink}>
              {t('nav.about')}
            </Link>
            <Link href="/contact" className={styles.navLink}>
              {t('nav.contact')}
            </Link>
          </div>

          <div className={styles.navIcons}>
            {/* Language Switcher - show on mobile as well */}
            <div className={styles.languageSwitcher}>
              <LanguageSwitcher />
            </div>
            
            {/* User Authentication Section */}
            {isAuthenticated && user ? (
              <div className={`${styles.userMenuContainer} user-menu-container`}>
                <button 
                  className={styles.userButton}
                  onClick={handleUserMenuToggle}
                >
                  <div className={styles.userAvatar}>
                    {(() => {
                      const firstName = user.first_name?.trim();
                      const lastName = user.last_name?.trim();
                      
                      if (firstName && lastName) {
                        return `${firstName[0].toUpperCase()}${lastName[0].toUpperCase()}`;
                      } else if (firstName) {
                        return firstName[0].toUpperCase();
                      } else if (lastName) {
                        return lastName[0].toUpperCase();
                      } else if (user.username) {
                        return user.username[0].toUpperCase();
                      } else {
                        return 'У';
                      }
                    })()}
                  </div>
                  <span className={styles.userName}>
                    {(() => {
                      const firstName = user.first_name?.trim();
                      const lastName = user.last_name?.trim();
                      
                      if (firstName && lastName) {
                        return `${firstName} ${lastName}`;
                      } else if (firstName) {
                        return firstName;
                      } else if (lastName) {
                        return lastName;
                      } else {
                        return user.username;
                      }
                    })()}
                  </span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor" 
                    className={`${styles.chevron} ${userMenuOpen ? styles.chevronUp : ''}`}
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {mounted && userMenuOpen && (
                  <div className={styles.userDropdown}>
                    <Link 
                      href="/profile" 
                      className={styles.dropdownItem}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={styles.dropdownIcon}>
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clipRule="evenodd" />
                      </svg>
                      {t('nav.profile')}
                    </Link>
                    <Link 
                      href="/orders" 
                      className={styles.dropdownItem}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={styles.dropdownIcon}>
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {t('nav.orders')}
                    </Link>
                    {/* Admin Panel Link - Only show for staff users */}
                    {user.is_staff && (
                      <Link 
                        href="/admin" 
                        className={styles.dropdownItem}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={styles.dropdownIcon}>
                          <path fillRule="evenodd" d="M9.493 2.853a.75.75 0 00-.386.67V6.75h-1.25a.75.75 0 100 1.5h1.25v2.25H8.75a.75.75 0 000 1.5h.357v3.25a.75.75 0 00.386.67l2.5 1.25a.75.75 0 00.67-.048l2.5-1.5a.75.75 0 00.337-.622V10.5h.25a.75.75 0 000-1.5H15.5V6.75h.25a.75.75 0 000-1.5H15.5V3.523a.75.75 0 00-.337-.622l-2.5-1.5a.75.75 0 00-.67.048l-2.5 1.25zM11 6.75V3.72l1.5-.9v3.105a.75.75 0 00.75.75h.25v2.25h-.25a.75.75 0 00-.75.75v2.58l-1.5.9V10.5a.75.75 0 00-.75-.75H10V7.5h.25a.75.75 0 00.75-.75z" clipRule="evenodd" />
                        </svg>
                        {t('nav.adminPanel')}
                      </Link>
                    )}
                    <button 
                      className={styles.dropdownItem}
                      onClick={handleLogout}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={styles.dropdownIcon}>
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                      </svg>
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Login button hidden on mobile - only available in hamburger menu */
              <div className={styles.desktopOnly}>
                {mounted ? (
                  <Link href="/auth/login" className={styles.iconLink}>
                    <span className={`${styles.iconSvg} ${mounted && isHomePage && !isScrolledOrMenuOpen ? styles.iconLight : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437.695z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </Link>
                ) : (
                  <div className={styles.iconLink} style={{ opacity: 0, pointerEvents: 'none' }}>
                    <span className={styles.iconSvg}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            className={styles.mobileMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className={`${styles.iconSvg} ${mounted && isHomePage && !isScrolledOrMenuOpen ? styles.iconLight : ''}`}>
              {!mounted ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              ) : mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          </button>
        </div>

        {/* Mobile menu overlay */}
        <div className={`${styles.mobileMenu} ${mounted && mobileMenuOpen ? styles.open : ''} ${mounted && mobileMenuOpen ? styles.dark : ''}`}>
          <div className={`${styles.mobileMenuLinks} ${mounted && mobileMenuOpen ? styles.dark : ''}`}>
            <Link href="/delivery" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.delivery')}
            </Link>
            <Link href="/about" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.about')}
            </Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.contact')}
            </Link>
            
            {/* Auth section for mobile - only show login/register when not authenticated */}
            {!isAuthenticated && (
              <div className={styles.mobileAuthSection}>
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className={styles.mobileAuthAction}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.mobileActionIcon}>
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                    </svg>
                    {t('nav.login')}
                  </Link>
                  <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)} className={styles.mobileAuthAction}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.mobileActionIcon}>
                      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                    </svg>
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
      </nav>
      
      {/* Cart sidebar */}
      <CartSidebar isOpen={cartSidebarOpen} onClose={() => setCartSidebarOpen(false)} />
        
      {/* Fixed cart button at bottom right */}
      <button 
        className={styles.fixedCartButton}
        onClick={handleCartClick}
        aria-label="Open cart"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
        </svg>
        {mounted && totalItems > 0 && (
          <span className={styles.fixedCartCount}>{totalItems}</span>
        )}
      </button>
    </>
  );
}
