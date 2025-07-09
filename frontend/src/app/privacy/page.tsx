'use client';

import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import styles from './privacyPage.module.css';

const PrivacyPage: React.FC = () => {
  const { t } = useI18n();  const dataTypes = [
    {
      icon: '👤',
      title: t('privacy.dataTypes.personal.title'),
      items: [
        t('privacy.dataTypes.personal.name'),
        t('privacy.dataTypes.personal.birthDate'),
        t('privacy.dataTypes.personal.passport')
      ]
    },
    {
      icon: '📞',
      title: t('privacy.dataTypes.contact.title'),
      items: [
        t('privacy.dataTypes.contact.email'),
        t('privacy.dataTypes.contact.phone'),
        t('privacy.dataTypes.contact.address')
      ]
    },
    {
      icon: '💳',
      title: t('privacy.dataTypes.payment.title'),
      items: [
        t('privacy.dataTypes.payment.details'),
        t('privacy.dataTypes.payment.history'),
        t('privacy.dataTypes.payment.methods')
      ]
    },
    {
      icon: '📊',
      title: t('privacy.dataTypes.additional.title'),
      items: [
        t('privacy.dataTypes.additional.preferences'),
        t('privacy.dataTypes.additional.history'),
        t('privacy.dataTypes.additional.reviews')
      ]
    }
  ];
  const purposes = [
    {
      icon: '🛒',
      title: t('privacy.purposes.orders.title'),
      description: t('privacy.purposes.orders.description')
    },
    {
      icon: '📞',
      title: t('privacy.purposes.communication.title'),
      description: t('privacy.purposes.communication.description')
    },
    {
      icon: '📧',
      title: t('privacy.purposes.marketing.title'),
      description: t('privacy.purposes.marketing.description')
    },
    {
      icon: '📈',
      title: t('privacy.purposes.improvement.title'),
      description: t('privacy.purposes.improvement.description')
    }
  ];
  const userRights = [
    {
      icon: '📋',
      title: t('privacy.userRights.information.title'),
      description: t('privacy.userRights.information.description')
    },
    {
      icon: '✏️',
      title: t('privacy.userRights.modification.title'),
      description: t('privacy.userRights.modification.description')
    },
    {
      icon: '🗑️',
      title: t('privacy.userRights.deletion.title'),
      description: t('privacy.userRights.deletion.description')
    },
    {
      icon: '❌',
      title: t('privacy.userRights.withdrawal.title'),
      description: t('privacy.userRights.withdrawal.description')
    }
  ];

  return (
    <div className={styles.container}>      <div className={styles.hero}>
        <h1 className={styles.title}>{t('privacy.hero.title')}</h1>
        <p className={styles.subtitle}>
          {t('privacy.hero.subtitle')}
        </p>
        <div className={styles.effectiveDate}>
          <span className={styles.dateIcon}>📅</span>
          <span>{t('privacy.hero.effectiveDate')}</span>
        </div>
      </div>

      <div className={styles.content}>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.general.title')}</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoContent}>
              <h4>{t('privacy.general.about')}</h4>
              <p>
                {t('privacy.general.intro')}
              </p>
              <p>
                {t('privacy.general.compliance')}
              </p>
            </div>
            <div className={styles.infoIcon}>🛡️</div>
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.dataTypes.title')}</h2>
          <div className={styles.dataGrid}>
            {dataTypes.map((dataType, index) => (
              <div key={index} className={styles.dataCard}>
                <div className={styles.dataIcon}>{dataType.icon}</div>
                <h3 className={styles.dataTitle}>{dataType.title}</h3>
                <ul className={styles.dataList}>
                  {dataType.items.map((item, itemIndex) => (
                    <li key={itemIndex} className={styles.dataItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.purposes.title')}</h2>
          <div className={styles.purposesGrid}>
            {purposes.map((purpose, index) => (
              <div key={index} className={styles.purposeCard}>
                <div className={styles.purposeIcon}>{purpose.icon}</div>
                <h3 className={styles.purposeTitle}>{purpose.title}</h3>
                <p className={styles.purposeDescription}>{purpose.description}</p>
              </div>
            ))}
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.userRights.title')}</h2>
          <div className={styles.rightsGrid}>
            {userRights.map((right, index) => (
              <div key={index} className={styles.rightCard}>
                <div className={styles.rightIcon}>{right.icon}</div>
                <div className={styles.rightContent}>
                  <h4 className={styles.rightTitle}>{right.title}</h4>
                  <p className={styles.rightDescription}>{right.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.security.title')}</h2>
          <div className={styles.securityGrid}>
            <div className={styles.securityCard}>
              <div className={styles.securityIcon}>🔒</div>
              <h4>{t('privacy.security.technical.title')}</h4>
              <p>{t('privacy.security.technical.description')}</p>
            </div>
            <div className={styles.securityCard}>
              <div className={styles.securityIcon}>👥</div>
              <h4>{t('privacy.security.organizational.title')}</h4>
              <p>{t('privacy.security.organizational.description')}</p>
            </div>
            <div className={styles.securityCard}>
              <div className={styles.securityIcon}>⏰</div>
              <h4>{t('privacy.security.retention.title')}</h4>
              <p>{t('privacy.security.retention.description')}</p>
            </div>
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.thirdParty.title')}</h2>
          <div className={styles.transferCard}>
            <div className={styles.transferIcon}>🤝</div>
            <div className={styles.transferContent}>
              <h4>{t('privacy.thirdParty.when.title')}</h4>
              <p>
                {t('privacy.thirdParty.when.description')}
              </p>
              <ul className={styles.transferList}>
                <li>{t('privacy.thirdParty.when.contractual')}</li>
                <li>{t('privacy.thirdParty.when.government')}</li>
                <li>{t('privacy.thirdParty.when.consent')}</li>
                <li>{t('privacy.thirdParty.when.security')}</li>
              </ul>
            </div>
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy.consent.title')}</h2>
          <div className={styles.consentCard}>
            <div className={styles.consentIcon}>✅</div>
            <div className={styles.consentContent}>
              <h4>{t('privacy.consent.how.title')}</h4>
              <p>
                {t('privacy.consent.how.description')}
              </p>
              <p>
                {t('privacy.consent.withdrawal')}
              </p>
            </div>
          </div>
        </section>        <section className={styles.contactSection}>
          <div className={styles.contactCard}>
            <h3>{t('privacy.contact.title')}</h3>
            <p>{t('privacy.contact.description')}</p>
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
              <span>{t('privacy.contact.workingHours')}</span>
            </div>
          </div>
        </section>        <section className={styles.updateSection}>
          <div className={styles.updateCard}>
            <h4>{t('privacy.updates.title')}</h4>
            <p>
              {t('privacy.updates.description')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPage;
