'use client';

import React, { useState, useEffect } from 'react';
import { CheckoutData, OrderSummary } from '../../types/checkout';
import { useI18n } from '@/hooks/useI18n';
import { convertEurToByn } from '@/lib/api/currency';
import styles from './ConfirmationStep.module.css';

interface ConfirmationStepProps {
  checkoutData: CheckoutData;
  orderSummary: OrderSummary;
  onPlaceOrder: () => void;
  isLoading?: boolean;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  checkoutData,
  orderSummary,
  onPlaceOrder,
  isLoading = false
}) => {
  const { t } = useI18n();
  const [isTermsAgreed, setIsTermsAgreed] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [bynAmount, setBynAmount] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  
  const { customer_info, shipping_address, shipping_method, payment_method } = checkoutData;
  
  // Fetch BYN conversion when component mounts or total amount changes
  useEffect(() => {
    const fetchBynAmount = async () => {
      setCurrencyLoading(true);
      try {
        const conversion = await convertEurToByn(orderSummary.total_amount);
        setBynAmount(conversion.byn_amount);
        setExchangeRate(conversion.exchange_rate);
      } catch (error) {
        console.error('Failed to fetch BYN conversion:', error);
        // Use fallback conversion
        const fallbackRate = 3.8;
        setBynAmount(Math.round(orderSummary.total_amount * fallbackRate * 100) / 100);
        setExchangeRate(fallbackRate);
      } finally {
        setCurrencyLoading(false);
      }
    };

    fetchBynAmount();
  }, [orderSummary.total_amount]);

  const formatAddress = (address: any) => {
    if (!address) return '';
    const parts = [];
    if (address.street_address) parts.push(address.street_address);
    if (address.apartment) parts.push(address.apartment);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postal_code) parts.push(address.postal_code);
    if (address.country) parts.push(address.country);
    return parts.join(', ');
  };
  const formatDeliveryTime = (days: number) => {
    if (days === 1) return t('checkout.confirmation.deliveryTime.oneDay');
    if (days <= 7) return t('checkout.confirmation.deliveryTime.days', { days });
    if (days <= 14) return t('checkout.confirmation.deliveryTime.weeks', { weeks: '1-2' });
    return t('checkout.confirmation.deliveryTime.weeks', { weeks: Math.ceil(days / 7) });
  };

  return (
    <div className={styles.confirmationStep}>
      <h2>{t('checkout.confirmation.title')}</h2>
      <p className={styles.reviewText}>
        {t('checkout.confirmation.reviewText')}
      </p>

      <div className={styles.confirmationSections}>        {/* Customer Information */}
        <div className={styles.section}>
          <h3>{t('checkout.confirmation.customerInfo.title')}</h3>
          <div className={styles.sectionContent}>
            <p><strong>{t('checkout.confirmation.customerInfo.name')}:</strong> {customer_info?.first_name} {customer_info?.last_name}</p>
            <p><strong>{t('checkout.confirmation.customerInfo.email')}:</strong> {customer_info?.email}</p>
            <p><strong>{t('checkout.confirmation.customerInfo.phone')}:</strong> {customer_info?.phone}</p>
          </div>
        </div>        {/* Shipping Information */}
        <div className={styles.section}>
          <h3>{t('checkout.confirmation.shippingInfo.title')}</h3>
          <div className={styles.sectionContent}>
            <p><strong>{t('checkout.confirmation.shippingInfo.address')}:</strong></p>
            <p>{formatAddress(shipping_address)}</p>
            <p><strong>{t('checkout.confirmation.shippingInfo.method')}:</strong> {shipping_method?.name}</p>
            {/* <p><strong>{t('checkout.confirmation.shippingInfo.deliveryTime')}:</strong> {shipping_method?.estimated_delivery_min_days ? formatDeliveryTime(shipping_method.estimated_delivery_min_days) : 'N/A'}</p> */}
            {shipping_method && shipping_method.cost > 0 && (
              <p><strong>{t('checkout.confirmation.shippingInfo.cost')}:</strong> {shipping_method.cost.toFixed(2)} EUR</p>
            )}
          </div>        </div>        {/* Payment Method */}
        <div className={styles.section}>
          <h3>{t('checkout.confirmation.paymentMethod.title')}</h3>
          <div className={styles.sectionContent}>
            <div className={styles.paymentMethod}>
              <span className={styles.paymentIcon}>
                {payment_method?.type === 'card' && '💳'}
                {payment_method?.type === 'paypal' && '🅿️'}
                {payment_method?.type === 'apple_pay' && '🍎'}
                {payment_method?.type === 'google_pay' && '🔍'}
                {payment_method?.type === 'bank_transfer' && '🏦'}
              </span>
              <span>{payment_method?.name}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className={styles.section}>
          <h3>{t('checkout.confirmation.orderItems.title')}</h3>
          <div className={styles.orderItems}>
            {orderSummary.items.map((item) => (
              <div key={item.id} className={styles.orderItem}>
                <div className={styles.itemInfo}>
                  <h4>{item.name}</h4>
                  <p>{t('checkout.confirmation.orderItems.quantity')}: {item.quantity}</p>
                  {item.variant && (
                    <p className={styles.variant}>{t('checkout.confirmation.orderItems.variant')}: {item.variant}</p>
                  )}
                </div>
                <div className={styles.itemPrice}>
                  {(item.price * item.quantity).toFixed(2)} EUR
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className={styles.section}>
          <h3>{t('checkout.confirmation.orderTotal.title')}</h3>
          <div className={styles.orderTotals}>
            <div className={styles.totalLine}>
              <span>{t('checkout.confirmation.orderTotal.subtotal')}:</span>
              <span>{orderSummary.subtotal.toFixed(2)} EUR</span>
            </div>
            {orderSummary.shipping_cost > 0 && (
              <div className={styles.totalLine}>
                <span>{t('checkout.confirmation.orderTotal.shipping')}:</span>
                <span>{orderSummary.shipping_cost.toFixed(2)} EUR</span>
              </div>
            )}
            {orderSummary.discount_amount > 0 && (
              <div className={styles.totalLine}>
                <span>{t('checkout.confirmation.orderTotal.discount')}:</span>
                <span>-{orderSummary.discount_amount.toFixed(2)} EUR</span>
              </div>
            )}
            <div className={`${styles.totalLine} ${styles.grandTotal}`}>
              <span>{t('checkout.confirmation.orderTotal.total')}:</span>
              <span>{orderSummary.total_amount.toFixed(2)} EUR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className={styles.terms}>
        <label className={styles.termsLabel}>
          <input 
            type="checkbox" 
            checked={isTermsAgreed}
            onChange={(e) => {
              setIsTermsAgreed(e.target.checked);
              if (e.target.checked) {
                setShowTermsError(false);
              }
            }}
            required 
          />
          <span>
            {t('checkout.confirmation.terms.agree')} <a href="/terms" target="_blank">{t('checkout.confirmation.terms.termsLink')}</a> {t('checkout.confirmation.terms.and')}{' '}
            <a href="/privacy" target="_blank">{t('checkout.confirmation.terms.privacyLink')}</a>
          </span>
        </label>
        {showTermsError && (
          <div className={styles.termsError}>
            {t('checkout.confirmation.terms.error')}
          </div>
        )}
      </div>

      {/* Place Order Button */}
      <div className={styles.placeOrderSection}>
        <button
          type="button"          onClick={() => {
            console.log('=== PLACE ORDER BUTTON CLICKED ===');
            console.log('Terms agreed:', isTermsAgreed);
            console.log('Is loading:', isLoading);
            
            if (!isTermsAgreed) {
              console.log('Terms not agreed, showing error');
              setShowTermsError(true);
              return; // Prevent payment if terms not agreed
            }
            
            console.log('Calling onPlaceOrder...');
            onPlaceOrder();
          }}
          disabled={isLoading || !isTermsAgreed}
          className={`${styles.placeOrderButton} ${!isTermsAgreed ? styles.disabled : ''}`}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner}></span>
              {t('checkout.confirmation.button.loading')}
            </>
          ) : (
            t('checkout.confirmation.button.placeOrder', { 
              amount: orderSummary.total_amount.toFixed(2),
              amount_byn: bynAmount ? bynAmount.toFixed(2) : currencyLoading ? '...' : '-.--'
            })
          )}
        </button>
        <p className={styles.redirectNotice}>
          {t('checkout.confirmation.redirectNotice')}
        </p>
      </div>

      {/* Security Notice */}
      <div className={styles.securityNotice}>
        <p>🔒 {t('checkout.confirmation.securityNotice')}</p>
      </div>
    </div>
  );
};

export default ConfirmationStep;
