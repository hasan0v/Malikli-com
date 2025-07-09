// src/components/Layout/Footer.tsx
"use client";

import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import { useI18n } from '../../hooks/useI18n';
import styles from './Footer.module.css';

const Footer: React.FC = () => {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();
  
  const paymentLogos = [
    { src: '/belkart-logo.png', alt: 'Belkart', name: 'belkart' },
    { src: '/bepaid-logo.svg', alt: 'bePaid', name: 'bepaid' },
    { src: '/erip-logo.png', alt: 'ERIP', name: 'erip' },
    { src: '/visa-logo.png', alt: 'Visa', name: 'visa' },
    { src: '/mastercard-logo.png', alt: 'Mastercard', name: 'mastercard' },
  ];
  
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>        <div className={styles.footerGrid}>
          <div className={styles.footerSection}>
            <Image
              src="/logo.png"
              alt="Malikli 1992"
              width={180}
              height={60}
              className={styles.footerLogo}
              priority={false}
            />            <p className={styles.footerDescription}>
              {t('footer.description')}
            </p>
            <p className={styles.footerCompanyInfo}>{t('footer.companyInfo.fullName')}</p>
            <p className={styles.footerCompanyInfo}>{t('footer.companyInfo.manufacturer')}</p>
            <p className={styles.footerCompanyInfo}>{t('footer.companyInfo.registration')}</p>
            <p className={styles.footerCompanyInfo}>{t('footer.companyInfo.address')}</p>
            <p className={styles.footerCompanyInfo}>{t('footer.companyInfo.tradeRegistry')}</p>
          </div>
            <div className={styles.footerSection}>
            <h4 className={styles.footerHeading}>{t('footer.information.title')}</h4>
            <ul className={styles.footerLinksList}>
              <li><Link href="/faq" className={styles.footerLink}>{t('footer.information.faq')}</Link></li>
              <li><Link href="/delivery" className={styles.footerLink}>{t('footer.information.delivery')}</Link></li>
              <li><Link href="/returns" className={styles.footerLink}>{t('footer.information.returns')}</Link></li>
              <li><Link href="/terms" className={styles.footerLink}>{t('footer.information.terms')}</Link></li>
              <li><Link href="/privacy" className={styles.footerLink}>{t('footer.information.privacy')}</Link></li>
            </ul>
          </div>
            <div className={styles.footerSection}>
            <h4 className={styles.footerHeading}>{t('footer.contact.title')}</h4>
            <ul className={styles.footerLinksList}>
              <li className={styles.footerContactInfo}>+375 44 537 1787</li>
              <li className={styles.footerContactInfo}>support@malikli1992.com</li>
              <li className={styles.footerContactInfo}>{t('footer.contact.workingHours')}</li>
            </ul>
          </div>
        </div>
        
        <div className={styles.footerBottomSection}>          <p className={styles.footerCopyright}>
            {t('footer.copyright', { year: currentYear })}
          </p>
          
          <div className={styles.paymentLogos}>
            {paymentLogos.map((logo) => (
              <Image
                key={logo.name}
                src={logo.src}
                alt={logo.alt}
                width={60}
                height={32}
                className={styles.paymentLogo}
                priority={false}
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;