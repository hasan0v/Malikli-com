"use client";

import React, { useEffect, useState } from 'react';
import { CheckoutData, ShippingMethod } from '@/types/checkout';
import { useI18n } from '@/hooks/useI18n';
import styles from './ShippingStep.module.css';

interface ShippingStepProps {
  checkoutData: CheckoutData;
  updateCheckoutData: (data: Partial<CheckoutData>) => void;
  shippingMethods: ShippingMethod[];
  errors: Record<string, string>;
}

export default function ShippingStep({
  checkoutData,
  updateCheckoutData,
  shippingMethods,
  errors,
}: ShippingStepProps) {
  const { t } = useI18n();
  const [selectedAnimation, setSelectedAnimation] = useState<number | null>(null);

  const handleShippingMethodChange = (method: ShippingMethod) => {
    updateCheckoutData({
      shipping_method: method,
    });
    
    // Trigger selection animation
    setSelectedAnimation(method.id);
    setTimeout(() => setSelectedAnimation(null), 600);
  };  const formatDeliveryTime = (method: ShippingMethod) => {
    const minDays = method.estimated_delivery_min_days || 0;
    const maxDays = method.estimated_delivery_max_days || 0;
    
    if (minDays === 0 && maxDays === 0) {
      return t('checkout.shipping.deliveryTime.today');
    }
    
    if (minDays === maxDays) {
      return t('checkout.shipping.deliveryTime.days', { count: minDays });
    }
    
    return t('checkout.shipping.deliveryTime.range', { min: minDays, max: maxDays });
  };
  const formatPrice = (price: number) => {
    return price === 0 ? t('checkout.shipping.free') : `${price.toFixed(2)} EUR`;
  };
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('checkout.shipping.title')}</h2>
        <div className={styles.shippingMethods}>
        {shippingMethods
          .filter(method => method.is_active)
          .map((method) => {
            const isSelected = checkoutData.shipping_method?.id === method.id;
            
            return (              <div
                key={method.id}
                className={`${styles.shippingMethod} ${isSelected ? styles.selected : ''} ${
                  selectedAnimation === method.id ? styles.justSelected : ''
                }`}
                onClick={() => handleShippingMethodChange(method)}
              >
                <div className={styles.methodContent}>
                  <div className={styles.methodHeader}>
                    <div className={styles.radioButton}>
                      <input
                        type="radio"
                        name="shipping_method"
                        checked={isSelected}
                        onChange={() => handleShippingMethodChange(method)}
                        className={styles.radioInput}
                      />
                      <span className={styles.radioMark}></span>
                    </div>
                    
                    <div className={styles.methodInfo}>
                      <div className={styles.methodName}>{method.name}</div>
                      <div className={styles.methodDescription}>{method.description}</div>
                    </div>
                    
                    <div className={styles.methodPricing}>
                      <div className={styles.methodPrice}>{formatPrice(method.cost)}</div>
                      <div className={styles.deliveryTime}>
                        {formatDeliveryTime(method)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>      {errors.shipping_method && (
        <div className={styles.errorMessage}>
          {errors.shipping_method}
        </div>
      )}      <div className={styles.shippingInfo}>
        <div className={styles.infoIcon}>ℹ️</div>
        <div className={styles.infoText}>
          {t('checkout.shipping.info')}
        </div>
      </div>
    </div>
  );
}
