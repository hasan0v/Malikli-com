'use client';

import React from 'react';
import { OrderSummary as OrderSummaryType } from '../../types/checkout';
import { useI18n } from '../../hooks/useI18n';
import styles from './OrderSummary.module.css';

interface OrderSummaryProps {
  orderSummary: OrderSummaryType;
  isLoading?: boolean;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  orderSummary,
  isLoading = false
}) => {
  const { t } = useI18n();
  
  return (
    <div className={styles.orderSummary}>
      <h3>{t('checkout.summary.title')}</h3>
      
      {/* Order Items */}
      <div className={styles.orderItems}>
        {orderSummary.items.map((item) => (
          <div key={item.id} className={styles.orderItem}>            <div className={styles.itemImage}>
              {item.image ? (
                <img src={item.image} alt={item.name} onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.add(styles.visible);
                }} />
              ) : null}
              <div className={`${styles.placeholderImage} ${!item.image ? styles.visible : ''}`}>
                <span>📦</span>
              </div>
              <span className={styles.quantity}>{item.quantity}</span>
            </div>
            <div className={styles.itemDetails}>
              <h4 className={styles.itemName}>{item.name}</h4>
              {item.variant && (
                <p className={styles.itemVariant}>{item.variant}</p>
              )}              {(item.color || item.size) && (
                <p className={styles.itemOptions}>
                  {item.color && (
                    <span className={styles.colorOption}>
                      {item.colorCode && (
                        <span 
                          className={styles.colorCircle}
                          style={{ backgroundColor: item.colorCode }}
                          title={item.color}
                        ></span>
                      )}
                      {item.color}
                    </span>
                  )}
                  {item.size && <span>{t('checkout.summary.size')}: {item.size}</span>}
                </p>
              )}
            </div>
            <div className={styles.itemPrice}>
              {(item.price * item.quantity).toFixed(2)} EUR
            </div>
          </div>
        ))}
      </div>

      {/* Discount Code Section */}
      {/* <div className={styles.discountSection}>
        <div className={styles.discountInput}>
          <input
            type="text"
            placeholder="Discount code"
            className={styles.discountCode}
          />
          <button type="button" className={styles.applyButton}>
            Apply
          </button>
        </div>
      </div> */}      {/* Order Totals */}
      <div className={styles.orderTotals}>
        <div className={styles.totalLine}>
          <span>{t('checkout.summary.subtotal')}</span>
          <span>{orderSummary.subtotal.toFixed(2)} EUR</span>
        </div>
          {orderSummary.shipping_cost > 0 && (
          <div className={styles.totalLine}>
            <span>{t('checkout.summary.shipping')}</span>
            <span>{orderSummary.shipping_cost.toFixed(2)} EUR</span>
          </div>
        )}
        
        {orderSummary.discount_amount > 0 && (
          <div className={styles.totalLine}>
            <span>{t('checkout.summary.discount')}</span>
            <span className={styles.discountAmount}>
              -{orderSummary.discount_amount.toFixed(2)} EUR
            </span>
          </div>
        )}
        
        <div className={`${styles.totalLine} ${styles.grandTotal}`}>
          <span>{t('checkout.summary.total')}</span>
          <span>{orderSummary.total_amount.toFixed(2)} EUR</span>
        </div>
      </div>      {/* Security Badges */}
      <div className={styles.securityBadges}>
        <div className={styles.badge}>
          <span className={styles.badgeIcon}>🔒</span>
          <span>{t('checkout.secureCheckout')}</span>
        </div>
        <div className={styles.badge}>
          <span className={styles.badgeIcon}>🚚</span>
          <span>{t('checkout.summary.freeReturns')}</span>
        </div>
        <div className={styles.badge}>
          <span className={styles.badgeIcon}>📞</span>
          <span>{t('checkout.summary.support')}</span>
        </div>
      </div>      {/* Loading Overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>{t('checkout.summary.updating')}</p>
        </div>
      )}
    </div>
  );
};

export default OrderSummary;
