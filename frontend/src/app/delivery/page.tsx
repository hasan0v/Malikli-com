'use client';

import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import styles from './delivery.module.css';

const DeliveryPage: React.FC = () => {
  const { t, locale } = useI18n();
  
  // Helper function to get arrays from translations
  const getTranslationArray = (key: string): string[] => {
    const keys = key.split('.');
    let translations;
    
    switch (locale) {
      case 'ru':
        translations = require('@/locales/ru.json');
        break;
      case 'tr':
        translations = require('@/locales/tr.json');
        break;
      case 'ar':
        translations = require('@/locales/ar.json');
        break;
      case 'zh':
        translations = require('@/locales/zh.json');
        break;
      default:
        translations = require('@/locales/en.json');
    }

    let value: any = translations;
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return [];
      }
    }
    
    return Array.isArray(value) ? value : [];
  };

  return (
    <div className={styles.container}>
      {/* Global Reach Section */}
      <section className={styles.globalReachSection}>
        <div className={styles.globalReachContainer}>
          <h1 className={styles.mainTitle}>{t('deliveryPage.globalReach.title')}</h1>
          <p className={styles.mainSubtitle}>
            {t('deliveryPage.globalReach.subtitle')}
          </p>
          
          <div className={styles.servicesGrid}>
            {/* <div className={styles.serviceCard}>
              <div className={styles.serviceIcon}>🏠</div>
              <h3 className={styles.serviceTitle}>{t('deliveryPage.services.domestic.title')}</h3>
              <div className={styles.serviceSubtitle}>{t('deliveryPage.services.domestic.subtitle')}</div>
              <p className={styles.serviceTime}>{t('deliveryPage.services.domestic.time')}</p>
            </div> */}
            
            <div className={styles.serviceCard}>
              <div className={styles.serviceIcon}>🌍</div>
              <h3 className={styles.serviceTitle}>{t('deliveryPage.services.international.title')}</h3>
              <div className={styles.serviceSubtitle}>{t('deliveryPage.services.international.subtitle')}</div>
              <p className={styles.serviceTime}>{t('deliveryPage.services.international.time')}</p>
            </div>
            
            {/* <div className={styles.serviceCard}>
              <div className={styles.serviceIcon}>⚡</div>
              <h3 className={styles.serviceTitle}>{t('deliveryPage.services.express.title')}</h3>
              <p className={styles.serviceTime}>{t('deliveryPage.services.express.time')}</p>
            </div>
            
            <div className={styles.serviceCard}>
              <div className={styles.serviceIcon}>📦</div>
              <h3 className={styles.serviceTitle}>{t('deliveryPage.services.standard.title')}</h3>
              <p className={styles.serviceTime}>{t('deliveryPage.services.standard.time')}</p>
            </div> */}
          </div>
        </div>
      </section>      {/* Delivery Times Section */}
      {/* <section className={styles.deliveryTimesSection}>
        <div className={styles.deliveryTimesContainer}>
          <h2 className={styles.sectionTitle}>{t('deliveryPage.deliveryTimes.title')}</h2>
          
          <h3 className={styles.serviceMainTitle}>{t('deliveryPage.deliveryTimes.emsTitle')}</h3>
          
          <div className={styles.emsGrid}>
            <div className={styles.emsCard}>
              <div className={styles.emsHeader}>
                <span className={styles.emsFlag}>🇪🇺</span>
                <h4 className={styles.emsTitle}>{t('deliveryPage.regions.europe.title')}</h4>
              </div>
              <div className={styles.emsDetails}>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.deliveryTime')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.europe.deliveryTime')}</span>
                </div>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.tracking')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.europe.tracking')}</span>
                </div>
              </div>
            </div>

            <div className={styles.emsCard}>
              <div className={styles.emsHeader}>
                <span className={styles.emsFlag}>🌍</span>
                <h4 className={styles.emsTitle}>{t('deliveryPage.regions.northAmerica.title')}</h4>
              </div>
              <div className={styles.emsCountries}>
                <span className={styles.countryTag}>{t('deliveryPage.regions.northAmerica.countries.0')}</span>
                <span className={styles.countryTag}>{t('deliveryPage.regions.northAmerica.countries.1')}</span>
              </div>
              <div className={styles.emsDetails}>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.deliveryTime')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.northAmerica.deliveryTime')}</span>
                </div>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.tracking')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.northAmerica.tracking')}</span>
                </div>
              </div>
            </div>

            <div className={styles.emsCard}>
              <div className={styles.emsHeader}>
                <span className={styles.emsFlag}>🌏</span>
                <h4 className={styles.emsTitle}>{t('deliveryPage.regions.asia.title')}</h4>
              </div>
              <div className={styles.emsDetails}>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.deliveryTime')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.asia.deliveryTime')}</span>
                </div>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.tracking')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.asia.tracking')}</span>
                </div>
              </div>
            </div>

            <div className={styles.emsCard}>
              <div className={styles.emsHeader}>
                <span className={styles.emsFlag}>🇦🇺</span>
                <h4 className={styles.emsTitle}>{t('deliveryPage.regions.australia.title')}</h4>
              </div>
              <div className={styles.emsDetails}>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.deliveryTime')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.australia.deliveryTime')}</span>
                </div>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.tracking')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.australia.tracking')}</span>
                </div>
              </div>
            </div>

            <div className={styles.emsCard}>
              <div className={styles.emsHeader}>
                <span className={styles.emsFlag}>🇷🇺</span>
                <h4 className={styles.emsTitle}>{t('deliveryPage.regions.russia.title')}</h4>
              </div>
              <div className={styles.emsDetails}>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.deliveryTime')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.russia.deliveryTime')}</span>
                </div>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.note')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.russia.note')}</span>
                </div>
              </div>
            </div>

            <div className={styles.emsCard}>
              <div className={styles.emsHeader}>
                <span className={styles.emsFlag}>🌐</span>
                <h4 className={styles.emsTitle}>{t('deliveryPage.regions.cis.title')}</h4>
              </div>
              <div className={styles.emsDetails}>
                <div className={styles.emsDetail}>
                  <span className={styles.emsLabel}>{t('deliveryPage.labels.deliveryTime')}</span>
                  <span className={styles.emsValue}>{t('deliveryPage.regions.cis.deliveryTime')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>       */}
      {/* Factors Section */}
      <section className={styles.factorsSection}>
        <div className={styles.factorsContainer}>
          <h2 className={styles.sectionTitle}>{t('deliveryPage.factors.title')}</h2>

          <div className={styles.factorsGrid}>
            <div className={`${styles.factorCard} ${styles.delaysCard}`}>
              <h3 className={styles.factorTitle}>{t('deliveryPage.factors.delays.title')}</h3>
              <ul className={styles.factorList}>
                {getTranslationArray('deliveryPage.factors.delays.items').map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* <div className={`${styles.factorCard} ${styles.fasterCard}`}>
              <h3 className={styles.factorTitle}>{t('deliveryPage.factors.faster.title')}</h3>
              <ul className={styles.factorList}>
                {getTranslationArray('deliveryPage.factors.faster.items').map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div className={`${styles.factorCard} ${styles.longerCard}`}>
              <h3 className={styles.factorTitle}>{t('deliveryPage.factors.longer.title')}</h3>
              <ul className={styles.factorList}>
                {getTranslationArray('deliveryPage.factors.longer.items').map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div> */}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DeliveryPage;
