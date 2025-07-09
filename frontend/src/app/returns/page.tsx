'use client';

import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import styles from './returnsPage.module.css';

const ReturnsPage: React.FC = () => {
  const { t } = useI18n();  const returnProcessSteps = [
    {
      step: '1',
      title: t('returns.process.contact.title'),
      description: t('returns.process.contact.description'),
      icon: '📞'
    },
    {
      step: '2',
      title: t('returns.process.prepare.title'),
      description: t('returns.process.prepare.description'),
      icon: '📦'
    },
    {
      step: '3',
      title: t('returns.process.send.title'),
      description: t('returns.process.send.description'),
      icon: '🚚'
    },
    {
      step: '4',
      title: t('returns.process.receive.title'),
      description: t('returns.process.receive.description'),
      icon: '💰'
    }
  ];
  const returnConditions = [
    {
      icon: '✅',
      title: t('returns.conditions.accepted.title'),
      items: [
        t('returns.conditions.accepted.original'),
        t('returns.conditions.accepted.unworn'),
        t('returns.conditions.accepted.unused'),
        t('returns.conditions.accepted.appearance')
      ]
    },
    {
      icon: '❌',
      title: t('returns.conditions.notAccepted.title'),
      items: [
        t('returns.conditions.notAccepted.used'),
        t('returns.conditions.notAccepted.noTags'),
        t('returns.conditions.notAccepted.damaged'),
        t('returns.conditions.notAccepted.noPackaging')
      ]
    }
  ];
  const faqs = [
    {
      question: t('returns.faq.timeLimit.question'),
      answer: t('returns.faq.timeLimit.answer')
    },
    {
      question: t('returns.faq.documents.question'),
      answer: t('returns.faq.documents.answer')
    },
    {
      question: t('returns.faq.exchange.question'),
      answer: t('returns.faq.exchange.answer')
    },
    {
      question: t('returns.faq.shippingCost.question'),
      answer: t('returns.faq.shippingCost.answer')
    },
    {
      question: t('returns.faq.refundTime.question'),
      answer: t('returns.faq.refundTime.answer')
    }
  ];

  return (
    <div className={styles.container}>      <div className={styles.hero}>
        <h1 className={styles.title}>{t('returns.hero.title')}</h1>
        <p className={styles.subtitle}>
          {t('returns.hero.subtitle')}
        </p>
      </div>

      <div className={styles.content}>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('returns.process.title')}</h2>
          <div className={styles.stepsGrid}>
            {returnProcessSteps.map((step, index) => (
              <div key={index} className={styles.stepCard}>
                <div className={styles.stepNumber}>{step.step}</div>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </div>
            ))}
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('returns.conditions.title')}</h2>
          <div className={styles.conditionsGrid}>
            {returnConditions.map((condition, index) => (
              <div key={index} className={styles.conditionCard}>
                <div className={styles.conditionHeader}>
                  <span className={styles.conditionIcon}>{condition.icon}</span>
                  <h3 className={styles.conditionTitle}>{condition.title}</h3>
                </div>
                <ul className={styles.conditionList}>
                  {condition.items.map((item, itemIndex) => (
                    <li key={itemIndex} className={styles.conditionItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('returns.legal.title')}</h2>
          <div className={styles.legalCard}>
            <div className={styles.legalContent}>
              <h4>{t('returns.legal.basis.title')}</h4>
              <p>
                {t('returns.legal.basis.description')}
              </p>
              <p>
                {t('returns.legal.law')}
              </p>
            </div>
            <div className={styles.legalIcon}>⚖️</div>
          </div>
        </section>        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('returns.faq.title')}</h2>
          <div className={styles.faqContainer}>
            {faqs.map((faq, index) => (
              <div key={index} className={styles.faqItem}>
                <h4 className={styles.faqQuestion}>{faq.question}</h4>
                <p className={styles.faqAnswer}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>        <section className={styles.contactSection}>
          <div className={styles.contactCard}>
            <h3>{t('returns.contact.title')}</h3>
            <p>{t('returns.contact.description')}</p>
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
              <span>{t('returns.contact.workingHours')}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReturnsPage;