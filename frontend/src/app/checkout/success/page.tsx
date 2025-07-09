'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Order } from '../../../types/checkout';
import { useI18n } from '../../../hooks/useI18n';
import styles from './success.module.css';

const CheckoutSuccess: React.FC = () => {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams?.get('order_id');

  useEffect(() => {
    if (!orderId) {
      router.push('/');
      return;
    }

    // Simulate fetching order details
    // In a real app, you would fetch this from your API
    const fetchOrderDetails = async () => {
      try {
        setIsLoading(true);
        // Replace this with actual API call
        // const response = await fetch(`/api/orders/${orderId}`);
        // const orderData = await response.json();
        
        // Mock order data for now
        const mockOrder: Order = {
          order_id: orderId,
          order_number: `ORD-${Date.now()}`,          
          shipping_address: {
            street_address: '123 Main St',
            city: 'New York',
            state: 'NY',
            postal_code: '10001',
            country: 'USA'
          },
          shipping_method: {
            id: 1,
            name: 'Standard Shipping',
            description: '5-14 business days',
            cost: 9.99,
            estimated_delivery_min_days: 5,
            estimated_delivery_max_days: 7,
            is_active: true
          },          
          shipping_cost: 9.99,
          subtotal_amount: 89.99,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: 99.98,
          order_status: 'processing',
          payment_status: 'paid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [
            {
              id: 1,
              product_id: 1,
              name: 'Premium T-Shirt',
              price: 29.99,
              quantity: 2,
              variant: 'Blue, Size M',
              color: 'Blue',
              size: 'M'
            },
            {
              id: 2,
              product_id: 2,
              name: 'Classic Jeans',
              price: 59.99,
              quantity: 1,
              variant: 'Dark Blue, Size 32',
              color: 'Dark Blue',
              size: '32'
            }
          ]
        };

        setOrder(mockOrder);
      } catch (err) {
        setError('Failed to load order details');
        console.error('Error fetching order:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, router]);
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>{t('checkout.success.loading')}</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>❌</div>
        <h1>{t('checkout.success.error.title')}</h1>
        <p>{error || t('checkout.success.error.orderNotFound')}</p>
        <Link href="/" className={styles.homeButton}>
          {t('checkout.success.error.returnHome')}
        </Link>
      </div>
    );
  }

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + (order.shipping_method.estimated_delivery_max_days || 7));

  return (
    <div className={styles.successContainer}>
      <div className={styles.successContent}>        {/* Success Header */}
        <div className={styles.successHeader}>
          <div className={styles.successIcon}>✅</div>
          <h1>{t('checkout.success.title')}</h1>
          <p className={styles.thankYou}>
            {t('checkout.success.message')}
          </p>
        </div>

        {/* Order Details */}
        <div className={styles.orderDetails}>
          <div className={styles.orderInfo}>
            <h2>{t('checkout.success.orderInfo.title')}</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>{t('checkout.success.orderInfo.orderNumber')}:</span>
                <span className={styles.value}>{order.order_number}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>{t('checkout.success.orderInfo.orderDate')}:</span>
                <span className={styles.value}>
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>{t('checkout.success.orderInfo.totalAmount')}:</span>
                <span className={styles.value}>${order.total_amount.toFixed(2)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>{t('checkout.success.orderInfo.paymentStatus')}:</span>
                <span className={`${styles.value} ${styles.statusPaid}`}>
                  {order.payment_status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>          {/* Shipping Information */}
          <div className={styles.shippingInfo}>
            <h3>{t('checkout.success.shipping.title')}</h3>
            <div className={styles.addressBlock}>
              <p>{order.shipping_address.street_address}</p>
              {order.shipping_address.apartment && (
                <p>{order.shipping_address.apartment}</p>
              )}
              <p>
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
              </p>
              <p>{order.shipping_address.country}</p>
            </div>
            <div className={styles.deliveryInfo}>
              <p><strong>{t('checkout.success.shipping.method')}:</strong> {order.shipping_method.name}</p>
              <p><strong>{t('checkout.success.shipping.estimatedDelivery')}:</strong> {estimatedDelivery.toLocaleDateString()}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className={styles.orderItems}>
            <h3>{t('checkout.success.items.title')}</h3>
            {order.items.map((item) => (
              <div key={item.id} className={styles.orderItem}>
                <div className={styles.itemDetails}>
                  <h4>{item.name}</h4>
                  {item.variant && <p className={styles.variant}>{item.variant}</p>}
                  <p className={styles.quantity}>{t('checkout.success.items.quantity')}: {item.quantity}</p>
                </div>
                <div className={styles.itemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Order Total */}
          <div className={styles.orderTotal}>
            <div className={styles.totalLine}>
              <span>{t('checkout.success.total.subtotal')}:</span>
              <span>${order.subtotal_amount.toFixed(2)}</span>
            </div>
            <div className={styles.totalLine}>
              <span>{t('checkout.success.total.shipping')}:</span>
              <span>${order.shipping_cost.toFixed(2)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className={styles.totalLine}>
                <span>{t('checkout.success.total.discount')}:</span>
                <span>-${order.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className={`${styles.totalLine} ${styles.grandTotal}`}>
              <span>{t('checkout.success.total.total')}:</span>
              <span>${order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>        {/* Next Steps */}
        <div className={styles.nextSteps}>
          <h3>{t('checkout.success.nextSteps.title')}</h3>
          <div className={styles.stepsList}>
            <div className={styles.step}>
              <span className={styles.stepIcon}>📧</span>
              <div>
                <h4>{t('checkout.success.nextSteps.email.title')}</h4>
                <p>{t('checkout.success.nextSteps.email.description')}</p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepIcon}>📦</span>
              <div>
                <h4>{t('checkout.success.nextSteps.processing.title')}</h4>
                <p>{t('checkout.success.nextSteps.processing.description')}</p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepIcon}>🚚</span>
              <div>
                <h4>{t('checkout.success.nextSteps.shipping.title')}</h4>
                <p>{t('checkout.success.nextSteps.shipping.description')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <Link href="/" className={styles.continueShoppingButton}>
            {t('checkout.success.actions.continueShopping')}
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className={styles.printButton}
          >
            {t('checkout.success.actions.printOrder')}
          </button>
        </div>

        {/* Support Information */}
        <div className={styles.supportInfo}>
          <h4>{t('checkout.success.support.title')}</h4>
          <p>
            {t('checkout.success.support.message')}
          </p>
          <div className={styles.supportContacts}>
            <a href="mailto:support@example.com" className={styles.supportLink}>
              📧 support@example.com
            </a>
            <a href="tel:+1234567890" className={styles.supportLink}>
              📞 (123) 456-7890
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
