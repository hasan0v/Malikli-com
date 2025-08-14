"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  // Tagline visual variant selector: change value to switch designs quickly.
  // Supported: 'refined' | 'minimal' | 'monoBar' | 'hero'
  const TAGLINE_VARIANT = 'refined' as 'refined' | 'minimal' | 'monoBar' | 'hero';
  // Initialize with false and only update after hydration
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileUserDropdownOpen, setMobileUserDropdownOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const navListRef = useRef<HTMLUListElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number; animating?: boolean }>({ left: 0, width: 0, opacity: 0, animating: false });
  const indicatorAnimFrame = useRef<number | null>(null);
  const currentStyleRef = useRef(indicatorStyle);
  const [navHovering, setNavHovering] = useState(false);

  useEffect(() => { currentStyleRef.current = indicatorStyle; }, [indicatorStyle]);
  // NOTE: Profile dropdown visibility now strictly depends on real authentication state
  // If you previously saw it disappear, most common reasons:
  // 1) User not authenticated (token expired / store reset on refresh)
  // 2) Very small viewport (<375px) where CSS hides mobile user section intentionally
  // 3) Mobile menu closed -> effect resets dropdown state
  // 4) Logout dispatch cleared user
  // Remove any temporary demo code to avoid confusion.
  
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

  const handleMobileUserDropdownToggle = () => {
    setMobileUserDropdownOpen(!mobileUserDropdownOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    setUserMenuOpen(false);
    setMobileUserDropdownOpen(false);
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

  // Close mobile user dropdown when mobile menu is closed
  useEffect(() => {
    if (!mobileMenuOpen) {
      setMobileUserDropdownOpen(false);
      // Restore body scroll when menu closes
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    } else {
      // Prevent body scroll when menu open
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
    }
  }, [mobileMenuOpen]);

  // When auth status changes to unauthenticated, close any open menus
  useEffect(() => {
    if (!isAuthenticated) {
      setUserMenuOpen(false);
      setMobileUserDropdownOpen(false);
    }
  }, [isAuthenticated]);

  // ESC key handling & focus trap for mobile menu
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (userMenuOpen) setUserMenuOpen(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
      if (mobileMenuOpen && e.key === 'Tab') {
        const container = mobileMenuRef.current;
        if (!container) return;
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => !el.getAttribute('aria-hidden'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        // Shift+Tab on first => wrap to last
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileMenuOpen, userMenuOpen]);

  // Auto focus first link when mobile menu opens (after animation frame)
  useEffect(() => {
    if (mobileMenuOpen && mobileMenuRef.current) {
      requestAnimationFrame(() => {
        const firstLink = mobileMenuRef.current?.querySelector<HTMLElement>('a, button');
        firstLink?.focus();
      });
    }
  }, [mobileMenuOpen]);

  // Helper: cancel any ongoing animation
  const cancelIndicatorAnimation = () => {
    if (indicatorAnimFrame.current !== null) {
      cancelAnimationFrame(indicatorAnimFrame.current);
      indicatorAnimFrame.current = null;
    }
  };

  // Physics-like easeOutBack
  const easeOutBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const animateIndicator = (targetLeft: number, targetWidth: number, targetOpacity: number) => {
    cancelIndicatorAnimation();
    const start = performance.now();
    const duration = 450; // ms
    const { left: startLeft, width: startWidth, opacity: startOpacity } = currentStyleRef.current;
    setIndicatorStyle(s => ({ ...s, animating: true }));

    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const e = easeOutBack(t); // overshoot built-in
      const newLeft = startLeft + (targetLeft - startLeft) * e;
      const newWidth = startWidth + (targetWidth - startWidth) * e;
      const newOpacity = startOpacity + (targetOpacity - startOpacity) * t; // linear fade sufficient
      setIndicatorStyle({ left: newLeft, width: newWidth, opacity: newOpacity, animating: t < 1 });
      if (t < 1) {
        indicatorAnimFrame.current = requestAnimationFrame(step);
      } else {
        indicatorAnimFrame.current = null;
      }
    };
    indicatorAnimFrame.current = requestAnimationFrame(step);
  };

  // Calculate target metrics for active link
  const recalcActiveMetrics = () => {
    const listEl = navListRef.current;
    if (!listEl) return { hasActive: false };
    const active = listEl.querySelector<HTMLElement>('a.' + styles.navLinkActive.replace(/ /g, '.'));
    if (!active) return { hasActive: false };
    const listRect = listEl.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    return {
      hasActive: true,
      left: activeRect.left - listRect.left,
      width: activeRect.width
    };
  };

  // Drive indicator when route changes or mount (unless hovering)
  useEffect(() => {
    if (!mounted || navHovering) return;
    const { hasActive, left, width } = recalcActiveMetrics();
      if (!hasActive || typeof left !== 'number' || typeof width !== 'number') {
        const cur = currentStyleRef.current;
        animateIndicator(cur.left || 0, cur.width || 0, 0);
        return;
      }
      animateIndicator(left, width, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, mounted, navHovering]);

  // Resize listener
  useEffect(() => {
    const handle = () => {
      if (navHovering) return; // postpone until hover ends
      const { hasActive, left, width } = recalcActiveMetrics();
        if (hasActive && typeof left === 'number' && typeof width === 'number') {
          animateIndicator(left, width, 1);
        } else {
          const cur = currentStyleRef.current;
          animateIndicator(cur.left || 0, cur.width || 0, 0);
        }
    };
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navHovering]);

  // Cleanup on unmount
  useEffect(() => () => cancelIndicatorAnimation(), []);

  // Recalculate on resize (debounced via rAF)
  useEffect(() => {
    const handle = () => {
      requestAnimationFrame(() => {
        const listEl = navListRef.current;
        if (!listEl) return;
        const active = listEl.querySelector<HTMLElement>('a.' + styles.navLinkActive.replace(/ /g, '.'));
        if (!active) return;
        const listRect = listEl.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        setIndicatorStyle({ left: activeRect.left - listRect.left, width: activeRect.width, opacity: 1 });
      });
    };
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  return (
    <>
      <nav className={navbarClass} data-scrolled={isScrolledOrMenuOpen ? 'true' : 'false'}>
        {/* navInner introduces the new structural layout layer; keep navContainer for backward-compatible styling */}
        <div className={`${styles.navContainer} ${styles.navInner}`}>
          {/* Brand Cluster */}
          <div className={`${styles.logoSection} ${styles.brandCluster}`}>
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
            {(() => {
              const common = [styles.tagline, styles.taglineModern];
              const variantClass =
                TAGLINE_VARIANT === 'refined' ? styles.taglineRefined :
                TAGLINE_VARIANT === 'minimal' ? styles.taglineMinimal :
                TAGLINE_VARIANT === 'monoBar' ? styles.taglineMonoBar :
                styles.taglineHero;
              const heroActive = TAGLINE_VARIANT === 'hero' && mounted && isHomePage && !isScrolledOrMenuOpen;
              return (
                <span
                  className={[
                    ...common,
                    variantClass,
                    heroActive ? styles.taglineHeroActive : '',
                    mounted && isHomePage && !isScrolledOrMenuOpen ? styles.taglineWhite : ''
                  ].filter(Boolean).join(' ')}
                  data-variant={TAGLINE_VARIANT}
                >
                  {t('nav.tagline')}
                </span>
              );
            })()}
          </div>
          {/* Primary Navigation */}
          <nav aria-label="Primary" className={`${styles.navLinks} ${styles.primaryNav}`}>
            <ul
              className={`${styles.navList} ${styles.hasIndicator}`}
              ref={navListRef}
              onMouseEnter={() => {
                setNavHovering(true);
                cancelIndicatorAnimation();
                setIndicatorStyle(s => ({ ...s, opacity: 0 }));
              }}
              onMouseLeave={() => {
                setNavHovering(false);
                const { hasActive, left, width } = recalcActiveMetrics();
                if (hasActive && typeof left === 'number' && typeof width === 'number') {
                  animateIndicator(left, width, 1);
                } else {
                  const cur = currentStyleRef.current;
                  animateIndicator(cur.left || 0, cur.width || 0, 0);
                }
              }}
            >
              {mounted && (
                <span
                  aria-hidden="true"
                  className={`${styles.navIndicator} ${indicatorStyle.animating ? styles.navIndicatorAnimating : ''}`}
                  style={{
                    transform: `translateX(${indicatorStyle.left}px)`,
                    width: indicatorStyle.width,
                    opacity: indicatorStyle.opacity,
                  }}
                />
              )}
              <li className={styles.navItem}>
                <Link
                  href="/delivery"
                  className={`${styles.navLink} ${pathname === '/delivery' ? styles.navLinkActive : ''}`}
                  aria-current={pathname === '/delivery' ? 'page' : undefined}
                >
                  {t('nav.delivery')}
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link
                  href="/about"
                  className={`${styles.navLink} ${pathname === '/about' ? styles.navLinkActive : ''}`}
                  aria-current={pathname === '/about' ? 'page' : undefined}
                >
                  {t('nav.about')}
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link
                  href="/contact"
                  className={`${styles.navLink} ${pathname === '/contact' ? styles.navLinkActive : ''}`}
                  aria-current={pathname === '/contact' ? 'page' : undefined}
                >
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Utility Cluster (language, user, cart trigger placeholder) */}
          <div className={`${styles.navIcons} ${styles.utilityCluster}`}>
            {/* Language Switcher - show on mobile as well */}
            <div className={styles.languageSwitcher}>
              <LanguageSwitcher />
            </div>
            
            {/* User Authentication Section - Hidden on mobile */}
            {isAuthenticated && user ? (
              <div className={`${styles.userMenuContainer} ${styles.desktopOnly} user-menu-container`}>
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

          {/* Burger button */}
          <button
            className={`${styles.mobileMenuButton} ${styles.burger}`}
            aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-panel"
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
        <div
          id="mobile-navigation-panel"
            // role dialog for accessibility (screen readers treat as modal region)
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.mobileMenu') || 'Mobile navigation'}
          ref={mobileMenuRef}
          className={`${styles.mobileMenu} ${mounted && mobileMenuOpen ? styles.open : ''} ${mounted && mobileMenuOpen ? styles.dark : ''}`}
        >
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
            
            {/* User profile section for mobile - only when authenticated */}
            {(isAuthenticated && user) && (
              <div className={styles.mobileUserSection}>
                <button 
                  className={styles.mobileUserInfo}
                  onClick={handleMobileUserDropdownToggle}
                >
                  <div className={styles.mobileUserAvatar}>
                    {(user?.first_name ? user.first_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()) || 'U'}
                  </div>
                  <div className={styles.mobileUserDetails}>
                    <div className={styles.mobileUserName}>
                      {(user?.first_name && user?.last_name)
                        ? `${user.first_name} ${user.last_name}`
                        : (user?.first_name || user?.email?.split('@')[0] || t('nav.user'))}
                    </div>
                    <div className={styles.mobileUserEmail}>
                      {user?.email}
                    </div>
                  </div>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor" 
                    className={`${styles.mobileChevron} ${mobileUserDropdownOpen ? styles.mobileChevronUp : ''}`}
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {mobileUserDropdownOpen && (
                  <div className={styles.mobileUserActions}>
                  <Link 
                    href="/profile" 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setMobileUserDropdownOpen(false);
                    }} 
                    className={styles.mobileUserAction}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.mobileActionIcon}>
                      <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
                    </svg>
                    {t('nav.profile')}
                  </Link>
                  
                  <Link 
                    href="/orders" 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setMobileUserDropdownOpen(false);
                    }} 
                    className={styles.mobileUserAction}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.mobileActionIcon}>
                      <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                      <path fillRule="evenodd" d="m3.087 9 .54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                    </svg>
                    {t('nav.orders')}
                  </Link>
                  
                  {user?.is_staff && (
                    <Link 
                      href="/admin" 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileUserDropdownOpen(false);
                      }} 
                      className={styles.mobileUserAction}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.mobileActionIcon}>
                        <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.570.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                      </svg>
                      {t('nav.admin')}
                    </Link>
                  )}
                  
                  <button 
                    onClick={handleLogout}
                    className={styles.mobileUserAction}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.mobileActionIcon}>
                      <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M19.28 9.47a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 11-1.06-1.06l.97-.97H9a.75.75 0 010-1.5h7.94l-.97-.97a.75.75 0 111.06-1.06l2.25 2.25z" clipRule="evenodd" />
                    </svg>
                    {t('nav.logout')}
                  </button>
                  </div>
                )}
              </div>
            )}
            
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
