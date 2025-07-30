"use client";

import React, { useState, useEffect } from 'react';
import { 
  calculateEMSShipping, 
  getAvailableEMSCountries, 
  formatWeight,
  type EMSShippingCalculation
} from '@/utils/emsShippingCalculator';
import { formatCurrency } from '@/utils/formatters';
import styles from './EMSShippingCalculator.module.css';

interface EMSShippingCalculatorProps {
  itemCount: number;
  declaredValue?: number;
  selectedCountry?: string;
  onShippingCalculated?: (calculation: EMSShippingCalculation) => void;
  className?: string;
}

export default function EMSShippingCalculator({
  itemCount,
  declaredValue = 0,
  selectedCountry = '',
  onShippingCalculated,
  className
}: EMSShippingCalculatorProps) {
  const [country, setCountry] = useState(selectedCountry);
  const [calculation, setCalculation] = useState<EMSShippingCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [shipmentType, setShipmentType] = useState<'goods' | 'documents'>('goods');

  const availableCountries = getAvailableEMSCountries();

  // Calculate shipping when inputs change
  useEffect(() => {
    if (country && itemCount > 0) {
      setIsCalculating(true);
      
      // Add a small delay to simulate calculation
      const timer = setTimeout(() => {
        const result = calculateEMSShipping(country, {
          itemCount,
          declaredValue,
          type: shipmentType
        });
        
        setCalculation(result);
        onShippingCalculated?.(result);
        setIsCalculating(false);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setCalculation(null);
      onShippingCalculated?.(null as any);
    }
  }, [country, itemCount, declaredValue, shipmentType, onShippingCalculated]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountry(e.target.value);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShipmentType(e.target.value as 'goods' | 'documents');
  };

  return (
    <div className={`${styles.calculator} ${className || ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.emsLogo}>📦</span>
          EMS International Express Mail Service
        </h3>
        <p className={styles.subtitle}>
          Calculate accurate shipping rates for your order
        </p>
      </div>

      <div className={styles.inputSection}>
        <div className={styles.inputGroup}>
          <label htmlFor="country-select" className={styles.label}>
            Destination Country *
          </label>
          <select
            id="country-select"
            value={country}
            onChange={handleCountryChange}
            className={styles.select}
            required
          >
            <option value="">Select destination country...</option>
            {availableCountries.map((countryName) => (
              <option key={countryName} value={countryName}>
                {countryName}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Shipment Type</label>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="shipmentType"
                value="goods"
                checked={shipmentType === 'goods'}
                onChange={handleTypeChange}
                className={styles.radioInput}
              />
              <span className={styles.radioMark}></span>
              Goods
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="shipmentType"
                value="documents"
                checked={shipmentType === 'documents'}
                onChange={handleTypeChange}
                className={styles.radioInput}
              />
              <span className={styles.radioMark}></span>
              Documents
            </label>
          </div>
        </div>

        <div className={styles.orderSummary}>
          <div className={styles.summaryItem}>
            <span>Items:</span>
            <span>{itemCount}</span>
          </div>
          <div className={styles.summaryItem}>
            <span>Total Weight:</span>
            <span>{formatWeight(itemCount * 400)}</span>
          </div>
          {declaredValue > 0 && (
            <div className={styles.summaryItem}>
              <span>Declared Value:</span>
              <span>{formatCurrency(declaredValue)}</span>
            </div>
          )}
        </div>
      </div>

      {isCalculating && (
        <div className={styles.calculating}>
          <div className={styles.spinner}></div>
          <span>Calculating shipping rates...</span>
        </div>
      )}

      {calculation && !isCalculating && (
        <div className={styles.results}>
          {calculation.isAvailable ? (
            <>
              <div className={styles.resultSuccess}>
                <div className={styles.resultHeader}>
                  <h4 className={styles.resultTitle}>
                    ✅ EMS shipping available to {calculation.country}
                  </h4>
                  <div className={styles.totalCost}>
                    {formatCurrency(calculation.finalTotal)}
                  </div>
                </div>

                <div className={styles.breakdown}>
                  <div className={styles.breakdownItem}>
                    <span>Base shipping rate:</span>
                    <span>{formatCurrency(calculation.baseRate)}</span>
                  </div>
                  
                  {calculation.additionalKgRate > 0 && (
                    <div className={styles.breakdownItem}>
                      <span>Additional weight charge:</span>
                      <span>{formatCurrency(calculation.additionalKgRate)}</span>
                    </div>
                  )}
                  
                  <div className={styles.breakdownItem}>
                    <span>Customs clearance fee:</span>
                    <span>{formatCurrency(calculation.customsClearanceFee)}</span>
                  </div>
                  
                  {calculation.declaredValueFee > 0 && (
                    <div className={styles.breakdownItem}>
                      <span>Declared value fee (3%):</span>
                      <span>{formatCurrency(calculation.declaredValueFee)}</span>
                    </div>
                  )}
                  
                  <div className={`${styles.breakdownItem} ${styles.total}`}>
                    <span>Total shipping cost:</span>
                    <span>{formatCurrency(calculation.finalTotal)}</span>
                  </div>
                </div>

                <div className={styles.deliveryInfo}>
                  <span className={styles.deliveryIcon}>🚚</span>
                  <span>Estimated delivery: 5-10 business days</span>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.resultError}>
              <div className={styles.errorIcon}>❌</div>
              <div className={styles.errorContent}>
                <h4 className={styles.errorTitle}>
                  EMS shipping not available
                </h4>
                <p className={styles.errorMessage}>
                  {calculation.errorMessage || 'Shipping to this destination is not supported'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!country && !isCalculating && (
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>🌍</div>
          <p>Select a destination country to calculate EMS shipping rates</p>
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.infoIcon}>ℹ️</div>
        <div className={styles.footerText}>
          <p>
            EMS (Express Mail Service) is a premium international postal service offering 
            fast and reliable delivery with tracking and insurance coverage.
          </p>
          <p>
            All rates are calculated based on 400g per item weight and include 
            customs clearance fees where applicable.
          </p>
        </div>
      </div>
    </div>
  );
}
