'use client';

import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import styles from './termsPage.module.css';

const TermsPage: React.FC = () => {
  const { t } = useI18n();  const userGuidelines = [
    {
      icon: '📝',
      title: t('terms.userGuidelines.registration.title'),
      description: t('terms.userGuidelines.registration.description'),
      details: t('terms.userGuidelines.registration.details')
    },
    {
      icon: '🛒',
      title: t('terms.userGuidelines.orders.title'),
      description: t('terms.userGuidelines.orders.description'),
      details: t('terms.userGuidelines.orders.details')
    },
    {
      icon: '💳',
      title: t('terms.userGuidelines.payment.title'),
      description: t('terms.userGuidelines.payment.description'),
      details: t('terms.userGuidelines.payment.details')
    },
    {
      icon: '📱',
      title: t('terms.userGuidelines.usage.title'),
      description: t('terms.userGuidelines.usage.description'),
      details: t('terms.userGuidelines.usage.details')
    }
  ];
  const companyServices = [
    {
      icon: '🏪',
      title: t('terms.companyServices.products.title'),
      description: t('terms.companyServices.products.description')
    },
    {
      icon: '🚚',
      title: t('terms.companyServices.delivery.title'),
      description: t('terms.companyServices.delivery.description')
    },
    {
      icon: '🔄',
      title: t('terms.companyServices.returns.title'),
      description: t('terms.companyServices.returns.description')
    },
    {
      icon: '🛡️',
      title: t('terms.companyServices.dataProtection.title'),
      description: t('terms.companyServices.dataProtection.description')
    }
  ];
  const responsibilities = [
    {
      type: 'user',
      icon: '👤',
      title: t('terms.responsibilities.user.title'),
      items: [
        t('terms.responsibilities.user.items.accurate'),
        t('terms.responsibilities.user.items.rules'),
        t('terms.responsibilities.user.items.payment'),
        t('terms.responsibilities.user.items.updates')
      ]
    },
    {
      type: 'company',
      icon: '🏢',
      title: t('terms.responsibilities.company.title'),
      items: [
        t('terms.responsibilities.company.items.quality'),
        t('terms.responsibilities.company.items.delivery'),
        t('terms.responsibilities.company.items.website'),
        t('terms.responsibilities.company.items.dataProtection')
      ]
    }
  ];
  const intellectualProperty = [
    {
      icon: '©️',
      title: t('terms.intellectualProperty.copyright.title'),
      description: t('terms.intellectualProperty.copyright.description')
    },
    {
      icon: '™️',
      title: t('terms.intellectualProperty.trademarks.title'),
      description: t('terms.intellectualProperty.trademarks.description')
    },
    {
      icon: '🔒',
      title: t('terms.intellectualProperty.confidential.title'),
      description: t('terms.intellectualProperty.confidential.description')
    }
  ];

  return (
    <div className={styles.container}>      <div className={styles.hero}>
        <h1 className={styles.title}>{t('terms.hero.title')}</h1>
        <p className={styles.subtitle}>
          {t('terms.hero.subtitle')}
        </p>
        <div className={styles.effectiveDate}>
          <span className={styles.dateIcon}>📅</span>
          <span>{t('terms.hero.effectiveDate')}</span>
        </div>
      </div>

      <div className={styles.content}>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.general.title')}</h2>
          <div className={styles.introCard}>
            <div className={styles.introContent}>
              <h4>{t('terms.general.welcome')}</h4>
              <p>
                {t('terms.general.intro')}
              </p>
              <p>
                {t('terms.general.agreement')}
              </p>
            </div>
            <div className={styles.introIcon}>📋</div>
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.userGuidelines.title')}</h2>
          <div className={styles.guidelinesGrid}>
            {userGuidelines.map((guideline, index) => (
              <div key={index} className={styles.guidelineCard}>
                <div className={styles.guidelineIcon}>{guideline.icon}</div>
                <h3 className={styles.guidelineTitle}>{guideline.title}</h3>
                <p className={styles.guidelineDescription}>{guideline.description}</p>
                <div className={styles.guidelineDetails}>
                  <p>{guideline.details}</p>
                </div>
              </div>
            ))}
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.companyServices.title')}</h2>
          <div className={styles.servicesGrid}>
            {companyServices.map((service, index) => (
              <div key={index} className={styles.serviceCard}>
                <div className={styles.serviceIcon}>{service.icon}</div>
                <h3 className={styles.serviceTitle}>{service.title}</h3>
                <p className={styles.serviceDescription}>{service.description}</p>
              </div>
            ))}
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.responsibilities.title')}</h2>
          <div className={styles.responsibilitiesGrid}>
            {responsibilities.map((responsibility, index) => (
              <div key={index} className={styles.responsibilityCard}>
                <div className={styles.responsibilityHeader}>
                  <div className={styles.responsibilityIcon}>{responsibility.icon}</div>
                  <h3 className={styles.responsibilityTitle}>{responsibility.title}</h3>
                </div>
                <ul className={styles.responsibilityList}>
                  {responsibility.items.map((item, itemIndex) => (
                    <li key={itemIndex} className={styles.responsibilityItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.paymentDelivery.title')}</h2>
          <div className={styles.paymentDeliveryCard}>
            <div className={styles.paymentSection}>
              <div className={styles.paymentIcon}>💳</div>
              <div className={styles.paymentContent}>
                <h4>{t('terms.paymentDelivery.payment.title')}</h4>
                <p>
                  {t('terms.paymentDelivery.payment.description')}
                </p>
              </div>
            </div>
            <div className={styles.deliverySection}>
              <div className={styles.deliveryIcon}>🚚</div>
              <div className={styles.deliveryContent}>
                <h4>{t('terms.paymentDelivery.delivery.title')}</h4>
                <p>
                  {t('terms.paymentDelivery.delivery.description')}
                </p>
              </div>
            </div>
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.intellectualProperty.title')}</h2>
          <div className={styles.ipGrid}>
            {intellectualProperty.map((ip, index) => (
              <div key={index} className={styles.ipCard}>
                <div className={styles.ipIcon}>{ip.icon}</div>
                <h4 className={styles.ipTitle}>{ip.title}</h4>
                <p className={styles.ipDescription}>{ip.description}</p>
              </div>
            ))}
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.liability.title')}</h2>
          <div className={styles.liabilityCard}>
            <div className={styles.liabilityIcon}>⚠️</div>
            <div className={styles.liabilityContent}>
              <h4>{t('terms.liability.limitations.title')}</h4>
              <p>
                {t('terms.liability.limitations.description')}
              </p>
              <ul className={styles.liabilityList}>
                <li>{t('terms.liability.limitations.technical')}</li>
                <li>{t('terms.liability.limitations.thirdParty')}</li>
                <li>{t('terms.liability.limitations.forceMajeure')}</li>
                <li>{t('terms.liability.limitations.improperUse')}</li>
              </ul>
            </div>
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('terms.applicableLaw.title')}</h2>
          <div className={styles.legalCard}>
            <div className={styles.legalIcon}>⚖️</div>
            <div className={styles.legalContent}>
              <h4>{t('terms.applicableLaw.jurisdiction.title')}</h4>
              <p>
                {t('terms.applicableLaw.jurisdiction.description')}
              </p>
              <p>
                {t('terms.applicableLaw.disputes')}
              </p>
            </div>
          </div>
        </section>        <section className={styles.contactSection}>
          <div className={styles.contactCard}>
            <h3>{t('terms.contact.title')}</h3>
            <p>{t('terms.contact.description')}</p>
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>📞</span>
                <span>+375 44 537 1787</span>
              </div>
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>✉️</span>
                <span>support@malikli1992.com</span>
              </div>
            </div>
            <div className={styles.workingHours}>
              <span className={styles.clockIcon}>🕐</span>
              <span>{t('terms.contact.workingHours')}</span>
            </div>
          </div>
        </section>        <section className={styles.updateSection}>
          <div className={styles.updateCard}>
            <h4>{t('terms.updates.title')}</h4>
            <p>
              {t('terms.updates.description')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
