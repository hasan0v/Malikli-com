'use client';
import { useState } from 'react';
import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import styles from './faqPage.module.css';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const FAQPage: React.FC = () => {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState<number[]>([]);
  const categories = [
    { id: 'all', name: t('faq.categories.all'), icon: '📋' },
    { id: 'orders', name: t('faq.categories.orders'), icon: '🛒' },
    { id: 'delivery', name: t('faq.categories.delivery'), icon: '🚚' },
    { id: 'payment', name: t('faq.categories.payment'), icon: '💳' },
    { id: 'returns', name: t('faq.categories.returns'), icon: '🔄' },
    { id: 'account', name: t('faq.categories.account'), icon: '👤' },
    { id: 'general', name: t('faq.categories.general'), icon: '❓' }
  ];
  const faqData: FAQItem[] = [
    {
      id: 1,
      category: 'orders',
      question: t('faq.questions.orders.howToOrder.question'),
      answer: t('faq.questions.orders.howToOrder.answer')
    },
    {
      id: 2,
      category: 'orders',
      question: t('faq.questions.orders.changeOrder.question'),
      answer: t('faq.questions.orders.changeOrder.answer')
    },
    {
      id: 3,
      category: 'orders',
      question: t('faq.questions.orders.trackOrder.question'),
      answer: t('faq.questions.orders.trackOrder.answer')
    },
    {
      id: 4,
      category: 'delivery',
      question: t('faq.questions.delivery.methods.question'),
      answer: t('faq.questions.delivery.methods.answer')
    },
    {
      id: 5,
      category: 'delivery',
      question: t('faq.questions.delivery.cost.question'),
      answer: t('faq.questions.delivery.cost.answer')
    },
    {
      id: 6,
      category: 'delivery',
      question: t('faq.questions.delivery.time.question'),
      answer: t('faq.questions.delivery.time.answer')
    },
    {
      id: 7,
      category: 'payment',
      question: t('faq.questions.payment.methods.question'),
      answer: t('faq.questions.payment.methods.answer')
    },
    {
      id: 8,
      category: 'payment',
      question: t('faq.questions.payment.security.question'),
      answer: t('faq.questions.payment.security.answer')
    },
    {
      id: 9,
      category: 'payment',
      question: t('faq.questions.payment.when.question'),
      answer: t('faq.questions.payment.when.answer')
    },
    {
      id: 10,
      category: 'returns',
      question: t('faq.questions.returns.canReturn.question'),
      answer: t('faq.questions.returns.canReturn.answer')
    },
    {
      id: 11,
      category: 'returns',
      question: t('faq.questions.returns.howToReturn.question'),
      answer: t('faq.questions.returns.howToReturn.answer')
    },
    {
      id: 12,
      category: 'returns',
      question: t('faq.questions.returns.deliveryCost.question'),
      answer: t('faq.questions.returns.deliveryCost.answer')
    },
    {
      id: 13,
      category: 'account',
      question: t('faq.questions.account.registration.question'),
      answer: t('faq.questions.account.registration.answer')
    },
    {
      id: 14,
      category: 'account',
      question: t('faq.questions.account.forgotPassword.question'),
      answer: t('faq.questions.account.forgotPassword.answer')
    },
    {
      id: 15,
      category: 'account',
      question: t('faq.questions.account.changeData.question'),
      answer: t('faq.questions.account.changeData.answer')
    },
    {
      id: 16,
      category: 'general',
      question: t('faq.questions.general.contact.question'),
      answer: t('faq.questions.general.contact.answer')
    },
    {
      id: 17,
      category: 'general',
      question: t('faq.questions.general.loyalty.question'),
      answer: t('faq.questions.general.loyalty.answer')
    },
    {
      id: 18,
      category: 'general',
      question: t('faq.questions.general.warranty.question'),
      answer: t('faq.questions.general.warranty.answer')
    }
  ];

  const toggleItem = (id: number) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredFAQ = activeCategory === 'all' 
    ? faqData 
    : faqData.filter(item => item.category === activeCategory);

  const searchQuestions = (searchTerm: string) => {
    return faqData.filter(item => 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className={styles.container}>      <div className={styles.hero}>
        <h1 className={styles.title}>{t('faq.hero.title')}</h1>
        <p className={styles.subtitle}>
          {t('faq.hero.subtitle')}
        </p>
        <div className={styles.searchBox}>
          <div className={styles.searchIcon}>🔍</div>
          <input 
            type="text" 
            placeholder={t('faq.hero.searchPlaceholder')}
            className={styles.searchInput}
            onChange={(e) => {
              if (e.target.value) {
                const results = searchQuestions(e.target.value);
                // Handle search results
              }
            }}
          />
        </div>
      </div>

      <div className={styles.content}>        <div className={styles.categoriesSection}>
          <h2 className={styles.categoriesTitle}>{t('faq.categoriesSection.title')}</h2>
          <div className={styles.categoriesGrid}>
            {categories.map(category => (
              <button
                key={category.id}
                className={`${styles.categoryCard} ${activeCategory === category.id ? styles.active : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <div className={styles.categoryIcon}>{category.icon}</div>
                <span className={styles.categoryName}>{category.name}</span>
                <div className={styles.categoryCount}>
                  {category.id === 'all' 
                    ? faqData.length 
                    : faqData.filter(item => item.category === category.id).length
                  }
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.faqSection}>          <div className={styles.faqHeader}>
            <h2 className={styles.faqTitle}>
              {activeCategory === 'all' 
                ? t('faq.categories.all')
                : categories.find(cat => cat.id === activeCategory)?.name
              }
            </h2>
            <div className={styles.resultsCount}>
              {t('faq.resultsCount', { count: filteredFAQ.length })}
            </div>
          </div>

          <div className={styles.faqList}>
            {filteredFAQ.map(item => (
              <div key={item.id} className={styles.faqItem}>
                <button 
                  className={styles.faqQuestion}
                  onClick={() => toggleItem(item.id)}
                >
                  <span className={styles.questionText}>{item.question}</span>
                  <div className={`${styles.toggleIcon} ${openItems.includes(item.id) ? styles.open : ''}`}>
                    <span>+</span>
                  </div>
                </button>
                <div className={`${styles.faqAnswer} ${openItems.includes(item.id) ? styles.open : ''}`}>
                  <div className={styles.answerContent}>
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>        <div className={styles.helpSection}>
          <div className={styles.helpCard}>
            <div className={styles.helpIcon}>💬</div>
            <div className={styles.helpContent}>
              <h3>{t('faq.help.title')}</h3>
              <p>{t('faq.help.description')}</p>
              <div className={styles.helpActions}>
                <a href="tel:+375445371787" className={styles.helpAction}>
                  <span className={styles.actionIcon}>📞</span>
                  <span>{t('faq.help.call')}</span>
                </a>
                <a href="mailto:support@malikli1992.com" className={styles.helpAction}>
                  <span className={styles.actionIcon}>✉️</span>
                  <span>{t('faq.help.email')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>        <div className={styles.quickLinks}>
          <h3 className={styles.quickLinksTitle}>{t('faq.quickLinks.title')}</h3>
          <div className={styles.quickLinksGrid}>
            <a href="/delivery" className={styles.quickLink}>
              <div className={styles.quickLinkIcon}>🚚</div>
              <div className={styles.quickLinkContent}>
                <div className={styles.quickLinkTitle}>{t('faq.quickLinks.delivery.title')}</div>
                <div className={styles.quickLinkDescription}>{t('faq.quickLinks.delivery.description')}</div>
              </div>
            </a>
            <a href="/returns" className={styles.quickLink}>
              <div className={styles.quickLinkIcon}>🔄</div>
              <div className={styles.quickLinkContent}>
                <div className={styles.quickLinkTitle}>{t('faq.quickLinks.returns.title')}</div>
                <div className={styles.quickLinkDescription}>{t('faq.quickLinks.returns.description')}</div>
              </div>
            </a>
            <a href="/terms" className={styles.quickLink}>
              <div className={styles.quickLinkIcon}>📋</div>
              <div className={styles.quickLinkContent}>
                <div className={styles.quickLinkTitle}>{t('faq.quickLinks.terms.title')}</div>
                <div className={styles.quickLinkDescription}>{t('faq.quickLinks.terms.description')}</div>
              </div>
            </a>
            <a href="/privacy" className={styles.quickLink}>
              <div className={styles.quickLinkIcon}>🔒</div>
              <div className={styles.quickLinkContent}>
                <div className={styles.quickLinkTitle}>{t('faq.quickLinks.privacy.title')}</div>
                <div className={styles.quickLinkDescription}>{t('faq.quickLinks.privacy.description')}</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
