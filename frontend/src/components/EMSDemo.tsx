"use client";

import React, { useState } from 'react';
import EMSShippingCalculator from '@/components/EMSShippingCalculator';
import { type EMSShippingCalculation } from '@/utils/emsShippingCalculator';
import { formatCurrency } from '@/utils/formatters';
import styles from './EMSDemo.module.css';

export default function EMSDemo() {
  const [selectedCalculation, setSelectedCalculation] = useState<EMSShippingCalculation | null>(null);
  const [itemCount, setItemCount] = useState(2);
  const [declaredValue, setDeclaredValue] = useState(150);

  const handleCalculationUpdate = (calculation: EMSShippingCalculation | null) => {
    setSelectedCalculation(calculation);
  };

  return (
    <div className={styles.demoPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          EMS International Shipping Calculator
        </h1>
        <p className={styles.subtitle}>
          Calculate accurate EMS shipping rates for international deliveries based on weight and destination
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.controlPanel}>
          <h2 className={styles.sectionTitle}>Order Configuration</h2>
          
          <div className={styles.inputGroup}>
            <label htmlFor="item-count" className={styles.label}>
              Number of Items
            </label>
            <input
              id="item-count"
              type="number"
              min="1"
              max="50"
              value={itemCount}
              onChange={(e) => setItemCount(parseInt(e.target.value) || 1)}
              className={styles.input}
            />
            <span className={styles.helpText}>
              Each item weighs approximately 400 grams
            </span>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="declared-value" className={styles.label}>
              Declared Value (EUR)
            </label>
            <input
              id="declared-value"
              type="number"
              min="0"
              step="0.01"
              value={declaredValue}
              onChange={(e) => setDeclaredValue(parseFloat(e.target.value) || 0)}
              className={styles.input}
            />
            <span className={styles.helpText}>
              Used for calculating 3% declared value fee
            </span>
          </div>

          <div className={styles.summary}>
            <h3 className={styles.summaryTitle}>Order Summary</h3>
            <div className={styles.summaryItem}>
              <span>Items:</span>
              <span>{itemCount}</span>
            </div>
            <div className={styles.summaryItem}>
              <span>Total Weight:</span>
              <span>{(itemCount * 0.4).toFixed(2)} kg</span>
            </div>
            <div className={styles.summaryItem}>
              <span>Declared Value:</span>
              <span>{formatCurrency(declaredValue)}</span>
            </div>
            {selectedCalculation && selectedCalculation.isAvailable && (
              <div className={`${styles.summaryItem} ${styles.total}`}>
                <span>Total Shipping:</span>
                <span>{formatCurrency(selectedCalculation.finalTotal)}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.calculatorPanel}>
          <EMSShippingCalculator
            itemCount={itemCount}
            declaredValue={declaredValue}
            onShippingCalculated={handleCalculationUpdate}
            className={styles.calculator}
          />
        </div>
      </div>

      {selectedCalculation && selectedCalculation.isAvailable && (
        <div className={styles.resultsSummary}>
          <h2 className={styles.sectionTitle}>Calculation Details</h2>
          <div className={styles.detailsGrid}>
            <div className={styles.detailCard}>
              <h3>Basic Information</h3>
              <div className={styles.detailItem}>
                <span>Destination:</span>
                <span>{selectedCalculation.country}</span>
              </div>
              <div className={styles.detailItem}>
                <span>Package Type:</span>
                <span>{selectedCalculation.type === 'goods' ? 'Goods' : 'Documents'}</span>
              </div>
              <div className={styles.detailItem}>
                <span>Total Weight:</span>
                <span>{(selectedCalculation.totalWeight / 1000).toFixed(2)} kg</span>
              </div>
              <div className={styles.detailItem}>
                <span>Items Count:</span>
                <span>{selectedCalculation.itemCount}</span>
              </div>
            </div>

            <div className={styles.detailCard}>
              <h3>Cost Breakdown</h3>
              <div className={styles.detailItem}>
                <span>Base Rate:</span>
                <span>{formatCurrency(selectedCalculation.baseRate)}</span>
              </div>
              {selectedCalculation.additionalKgRate > 0 && (
                <div className={styles.detailItem}>
                  <span>Additional Weight:</span>
                  <span>{formatCurrency(selectedCalculation.additionalKgRate)}</span>
                </div>
              )}
              <div className={styles.detailItem}>
                <span>Customs Clearance:</span>
                <span>{formatCurrency(selectedCalculation.customsClearanceFee)}</span>
              </div>
              {selectedCalculation.declaredValueFee > 0 && (
                <div className={styles.detailItem}>
                  <span>Declared Value Fee (3%):</span>
                  <span>{formatCurrency(selectedCalculation.declaredValueFee)}</span>
                </div>
              )}
              <div className={`${styles.detailItem} ${styles.totalItem}`}>
                <span>Total Cost:</span>
                <span>{formatCurrency(selectedCalculation.finalTotal)}</span>
              </div>
            </div>

            <div className={styles.detailCard}>
              <h3>Service Features</h3>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🚚</span>
                <span>Express delivery (5-10 business days)</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>📋</span>
                <span>Full tracking and insurance coverage</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🌍</span>
                <span>International postal service network</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>✅</span>
                <span>Reliable and secure delivery</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.footerContent}>
          <h2>About EMS International Express Mail Service</h2>
          <p>
            EMS (Express Mail Service) is a premium international postal service that provides fast, 
            reliable, and secure delivery to over 190 destinations worldwide. All rates include 
            standard insurance coverage and full tracking capabilities.
          </p>
          <div className={styles.features}>
            <div className={styles.featureItem}>
              <strong>Fast Delivery:</strong> Express service with 5-10 business day delivery
            </div>
            <div className={styles.featureItem}>
              <strong>Full Tracking:</strong> Real-time tracking from pickup to delivery
            </div>
            <div className={styles.featureItem}>
              <strong>Insurance:</strong> Standard coverage included in all shipments
            </div>
            <div className={styles.featureItem}>
              <strong>Reliable:</strong> Backed by international postal network
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
