"use client";

import React, { useEffect, useState } from 'react';
import { CheckoutData, ShippingMethod } from '@/types/checkout';
import { useI18n } from '@/hooks/useI18n';
import { getEMSShippingMethod, getAvailableEMSCountries, calculateEMSShipping } from '@/utils/emsShippingCalculator';
import styles from './ShippingStep.module.css';

// Map country codes to full country names for EMS calculation
// Based on the EMS shipping data available - Complete mapping for all 201+ countries
const countryCodeToName: Record<string, string> = {
  'AE': 'United Arab Emirates',
  'AF': 'Afghanistan',
  'AG': 'Antigua and Barbuda',
  'AI': 'Anguilla',
  'AL': 'Albania',
  'AM': 'Armenia',
  'AO': 'Angola',
  'AR': 'Argentina',
  'AT': 'Austria',
  'AU': 'Australia',
  'AW': 'Aruba',
  'AZ': 'Azerbaijan',
  'BA': 'Bosnia-Herzegovina',
  'BB': 'Барбадос',
  'BD': 'Bangladesh',
  'BE': 'Belgium',
  'BF': 'Burkina Faso',
  'BG': 'Bulgaria',
  'BH': 'Bahrain',
  'BI': 'Burundi',
  'BJ': 'Benin',
  'BM': 'Bermuda',
  'BN': 'Brunei Darussalam',
  'BO': 'Bolivia',
  'BQ': 'Bonaire, Sint Eustatius, and Saba (the former Antilles)',
  'BR': 'Brazil',
  'BS': 'Bahamas',
  'BT': 'Bhutan',
  'BW': 'Botswana',
  'BZ': 'Belize',
  'CA': 'Canada',
  'CD': 'Dem. Republic of the Congo',
  'CF': 'Central African Republic',
  'CH': 'Switzerland',
  'CI': 'Côte d\'Ivoire (Rep.)',
  'CL': 'Chile',
  'CM': 'Cameroon',
  'CN': 'China',
  'CO': 'Columbia',
  'CR': 'Costa Rica',
  'CU': 'Cuba',
  'CV': 'Cape Verde',
  'CW': 'Curaçao',
  'CY': 'Cyprus',
  'CZ': 'Czech Republic',
  'DE': 'Germany',
  'DJ': 'Djibouti',
  'DK': 'Denmark',
  'DM': 'Dominica',
  'DO': 'Dominican Republic',
  'DZ': 'Algeria',
  'EC': 'Ecuador',
  'EE': 'Estonia',
  'EG': 'Egypt',
  'ER': 'Eritrea',
  'ES': 'Spain',
  'ET': 'Ethiopia',
  'FI': 'Finland',
  'FJ': 'Fiji',
  'FO': 'Faroe Islands (Denmark)',
  'FR': 'France',
  'GA': 'Gabon',
  'GB': 'United Kingdom of Great Britain and Northern Ireland',
  'GD': 'Grenada',
  'GE': 'Georgia',
  'GG': 'Guernsey (Britain)',
  'GH': 'Ghana',
  'GI': 'Gibraltar (Britain)',
  'GL': 'Greenland (Denmark)',
  'GM': 'Gambia',
  'GN': 'Guinea',
  'GQ': 'Equatorial Guinea',
  'GR': 'Greece',
  'GT': 'Guatemala',
  'GY': 'Guyana',
  'HK': 'Hong Kong (China)',
  'HR': 'Croatia',
  'HT': 'Haiti',
  'HU': 'Hungary',
  'IC': 'Canary Islands (Spain)',
  'ID': 'Indonesia',
  'IE': 'Ireland',
  'IL': 'Israel',
  'IN': 'India',
  'IQ': 'Iraq',
  'IR': 'Iran (Islamic Rep.)',
  'IS': 'Iceland',
  'IT': 'Italy',
  'JE': 'Jersey (Britain)',
  'JM': 'Jamaica',
  'JO': 'Jordan',
  'JP': 'Japan',
  'KE': 'Kenya',
  'KG': 'Kyrgyzstan',
  'KH': 'Cambodia',
  'KI': 'Kiribati',
  'KM': 'Comoros Islands',
  'KN': 'Saint Kitts and Nevis',
  'KP': 'Dem. People\'s Rep. of Korea',
  'KW': 'Kuwait',
  'KY': 'Cayman Islands',
  'KZ': 'Kazakhstan',
  'LA': 'Laos',
  'LB': 'Lebanon',
  'LC': 'St. Lucia',
  'LI': 'Liechtenstein',
  'LK': 'Sri Lanka',
  'LR': 'Liberia',
  'LS': 'Lesotho',
  'LT': 'Lithuania',
  'LU': 'Luxembourg',
  'LV': 'Latvia',
  'LY': 'Libya',
  'MA': 'Morocco',
  'MC': 'Monaco',
  'MD': 'Moldova',
  'ME': 'Montenegro',
  'MF': 'Saint-Martin',
  'MG': 'Madagascar',
  'MK': 'North Macedonia',
  'ML': 'Mali',
  'MM': 'Myanmar',
  'MN': 'Mongolia',
  'MO': 'Macao',
  'MR': 'Mauritania',
  'MT': 'Malta',
  'MU': 'Mauritius',
  'MV': 'Maldives',
  'MW': 'Malawi',
  'MX': 'Mexico',
  'MY': 'Malaysia',
  'MZ': 'Mozambique',
  'NA': 'Namibia',
  'NC': 'New Caledonia',
  'NE': 'Niger',
  'NG': 'Nigeria',
  'NI': 'Nicaragua',
  'NL': 'Netherlands',
  'NO': 'Norway',
  'NP': 'Nepal',
  'NZ': 'New Zealand',
  'OM': 'Oman',
  'PA': 'Panama (Rep.)',
  'PE': 'Peru',
  'PF': 'French Polynesia',
  'PG': 'Papua New Guinea',
  'PH': 'Philippines',
  'PK': 'Pakistan',
  'PL': 'Poland',
  'PT': 'Portugal',
  'PY': 'Paraguay',
  'QA': 'Qatar',
  'RO': 'Romania',
  'RS': 'Serbia',
  'RU': 'Russian Federation',
  'RW': 'Rwanda',
  'SA': 'Saudi Arabia',
  'SB': 'Solomon Island',
  'SC': 'Seychelles',
  'SD': 'Sudan',
  'SE': 'Sweden',
  'SG': 'Singapore',
  'SI': 'Slovenia',
  'SK': 'Slovakia',
  'SL': 'Sierra Leone',
  'SM': 'San Marino',
  'SN': 'Senegal',
  'SR': 'Surinam',
  'ST': 'Sao Tome and Principe',
  'SV': 'Salvador',
  'SY': 'Syrian Arab Republic',
  'SZ': 'Eswatini (ex. Swaziland)',
  'TC': 'Turks and Caicos Islands',
  'TD': 'Chad',
  'TG': 'Togolese Republic',
  'TH': 'Thailand',
  'TJ': 'Tajikistan',
  'TM': 'Turkmenistan',
  'TN': 'Tunisia',
  'TO': 'Tonga',
  'TR': 'Turkey',
  'TT': 'Trinidad and Tobago',
  'TW': 'Taiwan (China)',
  'TZ': 'Tanzania',
  'UA': 'Ukraine',
  'UG': 'Uganda',
  'US': 'USA (United States)',
  'UY': 'Uruguay',
  'UZ': 'Uzbekistan',
  'VA': 'Vatican',
  'VC': 'St. Vincent and the Grenadines',
  'VE': 'Venezuela',
  'VG': 'Virgin Islands',
  'VN': 'Vietnam',
  'VU': 'Vanuatu',
  'WS': 'Samoa',
  'XK': 'Kosovo',
  'YE': 'Yemen',
  'ZA': 'South Africa',
  'ZM': 'Zambia',
  'ZW': 'Zimbabwe',
};

// Helper function to get country name from code
const getCountryNameFromCode = (countryCode: string | undefined): string | null => {
  if (!countryCode) {
    return null;
  }
  
  const countryName = countryCodeToName[countryCode];
  return countryName || null;
};

interface ShippingStepProps {
  checkoutData: CheckoutData;
  updateCheckoutData: (data: Partial<CheckoutData>) => void;
  shippingMethods: ShippingMethod[];
  errors: Record<string, string>;
  orderItems?: Array<{ id: number; quantity: number; price: number; name: string }>;
  orderSubtotal?: number;
}

export default function ShippingStep({
  checkoutData,
  updateCheckoutData,
  shippingMethods,
  errors,
  orderItems = [],
  orderSubtotal = 0,
}: ShippingStepProps) {
  const { t } = useI18n();
  const [selectedAnimation, setSelectedAnimation] = useState<number | null>(null);
  const [allShippingMethods, setAllShippingMethods] = useState<ShippingMethod[]>(shippingMethods);

  // Calculate total item count
  const totalItemCount = orderItems.reduce((total, item) => total + item.quantity, 0);

  // Auto-calculate EMS shipping when user's country and item count are available
  useEffect(() => {
    const userCountryCode = checkoutData.shipping_address?.country;
    const userCountryName = getCountryNameFromCode(userCountryCode);
    
    // Only calculate EMS if we have items and a valid country
    if (totalItemCount > 0 && userCountryName) {
      // Calculate weight information for the description
      const calculation = calculateEMSShipping(userCountryName, { itemCount: totalItemCount, declaredValue: orderSubtotal });
      const weightInKg = calculation.isAvailable ? (calculation.totalWeight / 1000).toFixed(2) : '0.00';
      
      // Create localized description
      const localizedDescription = `${t('checkout.shipping.ems.fastReliableShipping', { country: userCountryName })} ${weightInKg}kg`;
      const localizedName = t('checkout.shipping.ems.serviceName');
      
      const emsMethod = getEMSShippingMethod(userCountryName, totalItemCount, orderSubtotal, localizedDescription, localizedName);
      
      if (emsMethod) {
        // Add EMS method to the list if it doesn't already exist
        const currentEMSIndex = allShippingMethods.findIndex(method => method.id === 999);
        if (currentEMSIndex === -1) {
          setAllShippingMethods([...shippingMethods, emsMethod]);
        } else {
          setAllShippingMethods(prev => 
            prev.map(method => method.id === 999 ? emsMethod : method)
          );
        }
      } else {
        setAllShippingMethods(shippingMethods.filter(method => method.id !== 999));
      }
    } else {
      setAllShippingMethods(shippingMethods);
    }
  }, [checkoutData.shipping_address?.country, totalItemCount, orderSubtotal, shippingMethods, t]);

  const handleShippingMethodChange = (method: ShippingMethod) => {
    const isEMSMethod = method.id === 999;
    
    updateCheckoutData({
      shipping_method: method,
      dynamic_shipping_cost: isEMSMethod ? method.cost : null,
      dynamic_shipping_method_name: isEMSMethod ? method.name : null,
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
      
      {/* All Shipping Methods (including auto-calculated EMS) */}
      <div className={styles.shippingMethods}>
        {allShippingMethods
          .filter(method => method.is_active)
          .map((method) => {
            const isSelected = checkoutData.shipping_method?.id === method.id;
            const isEMSMethod = method.id === 999;
            
            return (
              <div
                key={method.id}
                className={`${styles.shippingMethod} ${isEMSMethod ? styles.emsMethod : ''} ${isSelected ? styles.selected : ''} ${
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
                      <div className={styles.methodName}>
                        {isEMSMethod && <span className={styles.emsIcon}>📦</span>}
                        {method.name}
                      </div>
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
      </div>

      {/* EMS availability message */}
      {checkoutData.shipping_address?.country && totalItemCount > 0 && (
        (() => {
          const userCountryName = getCountryNameFromCode(checkoutData.shipping_address.country);
          const availableCountries = getAvailableEMSCountries();
          const isEMSAvailable = userCountryName && availableCountries.includes(userCountryName);
          
          if (!isEMSAvailable && userCountryName) {
            return (
              <div className={styles.emsUnavailable}>
                <div className={styles.infoIcon}>📦</div>
                <div className={styles.infoText}>
                  <strong>{t('checkout.shipping.ems.serviceName')}</strong> {t('checkout.shipping.ems.unavailable')} {userCountryName}. 
                  <details className={styles.emsDetails}>
                    <summary>{t('checkout.shipping.ems.viewSupportedCountries')}</summary>
                    <div className={styles.supportedCountries}>
                      {availableCountries.join(', ')}
                    </div>
                  </details>
                </div>
              </div>
            );
          }
          return null;
        })()
      )}

      {errors.shipping_method && (
        <div className={styles.errorMessage}>
          {errors.shipping_method}
        </div>
      )}

      <div className={styles.shippingInfo}>
        <div className={styles.infoIcon}>ℹ️</div>
        <div className={styles.infoText}>
          {t('checkout.shipping.info')}
          {checkoutData.shipping_address?.country && totalItemCount > 0 && (
            <span className={styles.emsInfo}>
              {getCountryNameFromCode(checkoutData.shipping_address.country)
                ? ` ${t('checkout.shipping.ems.availableFor')} ${getCountryNameFromCode(checkoutData.shipping_address.country)}.`
                : ` ${t('checkout.shipping.ems.mayBeAvailable')}`
              }
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
