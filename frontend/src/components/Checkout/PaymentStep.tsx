"use client";

import React from 'react';
import { CheckoutData, PaymentMethod, OrderSummary } from '@/types/checkout';
import { useI18n } from '@/hooks/useI18n';
import styles from './PaymentStep.module.css';

interface PaymentStepProps {
  checkoutData: CheckoutData;
  updateCheckoutData: (data: Partial<CheckoutData>) => void;
  paymentMethods: PaymentMethod[];
  errors: Record<string, string>;
  orderSummary: OrderSummary;
}

export default function PaymentStep({
  checkoutData,
  updateCheckoutData,
  paymentMethods,
  errors,
  orderSummary,
}: PaymentStepProps) {
  const { t } = useI18n();
  
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    updateCheckoutData({
      payment_method: method,
    });
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('checkout.payment.title')}</h2>
      
      <div className={styles.paymentMethods}>
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`${styles.paymentMethod} ${
              checkoutData.payment_method?.id === method.id ? styles.selected : ''
            }`}
            onClick={() => handlePaymentMethodChange(method)}
          >
            <div className={styles.methodContent}>
              <div className={styles.radioButton}>
                <input
                  type="radio"
                  name="payment_method"
                  checked={checkoutData.payment_method?.id === method.id}
                  onChange={() => handlePaymentMethodChange(method)}
                  className={styles.radioInput}
                />
                <span className={styles.radioMark}></span>
              </div>
              
              <div className={styles.methodIcon}>{method.icon}</div>
                <div className={styles.methodInfo}>
                <div className={styles.methodName}>{method.name}</div>
                {method.description && (
                  <div className={styles.methodDescription}>{t(method.description)}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {errors.payment_method && (
        <div className={styles.errorMessage}>
          {errors.payment_method}
        </div>
      )}      {checkoutData.payment_method && (
        <div className={styles.paymentInstructions}>
          <div className={styles.instructionsIcon}>🔒</div>
          <div className={styles.instructionsText}>
            {t('checkout.payment.instructions')}
          </div>
        </div>
      )}{errors.payment_method && (
        <div className={styles.errorMessage}>
          {errors.payment_method}
        </div>
      )}
    </div>
  );
}
