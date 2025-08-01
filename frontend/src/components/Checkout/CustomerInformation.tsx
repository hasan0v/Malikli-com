import React, { useEffect, useState } from 'react';
import { CheckoutData } from '@/types/checkout';
import { AddressResponse } from '@/lib/api/address';
import { useI18n } from '../../hooks/useI18n';
import styles from './CustomerInformation.module.css';

interface CustomerInformationProps {
  checkoutData: CheckoutData;
  updateCheckoutData: (data: Partial<CheckoutData>) => void;
  errors: Record<string, string>;
  isAuthenticated: boolean;
  userAddresses?: AddressResponse[];
  isLoadingAddresses?: boolean;
  autoSaveInProgress?: boolean;
  onLoadSavedAddress?: (address: AddressResponse) => void;
  onDeleteAddress?: (addressId: number) => void;
  selectedAddressId?: number | null;
}

export default function CustomerInformation({
  checkoutData,
  updateCheckoutData,
  errors,
  isAuthenticated,
  userAddresses = [],
  isLoadingAddresses = false,
  autoSaveInProgress = false,
  onLoadSavedAddress,
  onDeleteAddress,  selectedAddressId = null,
}: CustomerInformationProps) {
  const { t } = useI18n();
  
  const [showAddressForm, setShowAddressForm] = useState(true);  const handleCustomerInfoChange = (field: string, value: string) => {
    updateCheckoutData({
      customer_info: {
        ...checkoutData.customer_info,
        [field]: value,
      },
    });
  };

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailChange = (value: string) => {
    handleCustomerInfoChange('email', value);
    
    // Clear email error when user starts typing a valid email
    if (errors.email && (value === '' || isValidEmail(value))) {
      const newErrors = { ...errors };
      delete newErrors.email;
      // Note: We would need to pass setErrors as a prop to clear errors here
      // For now, errors will be cleared on validation in the parent component
    }
  };const handleAddressChange = (field: string, value: string) => {
    updateCheckoutData({
      shipping_address: {
        ...checkoutData.shipping_address,
        [field]: value,
      },
    });
  };
  // Handle loading a saved address
  const handleUseSavedAddress = (address: AddressResponse) => {
    onLoadSavedAddress?.(address);
    setShowAddressForm(false); // Hide form when using saved address
  };  // Handle adding a new address
  const handleAddNewAddress = () => {
    // Clear current address data
    updateCheckoutData({
      shipping_address: {
        street_address: '',
        apartment: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'AU', // Default to Australia
      },
    });
    setShowAddressForm(true);
  };

  // Check if we're using a saved address (read-only mode)
  const isUsingSavedAddress = selectedAddressId && !showAddressForm;
  const selectedAddress = userAddresses.find(addr => addr.id === selectedAddressId);

  return (
    <div className={styles.container}>      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('checkout.customerInfo.title')}</h2>
          {isAuthenticated && (
          <div className={styles.authenticatedNotice}>
            ✓ {t('checkout.customerInfo.loggedIn')}
            {autoSaveInProgress && (
              <div className={styles.autoSaveStatus}>
                🔄 {t('checkout.customerInfo.saving')}
              </div>
            )}
          </div>
        )}
        
        {!isAuthenticated && (
          <div className={styles.guestNotice}>
            <div className={styles.guestNoticeIcon}>👤</div>
            <div className={styles.guestNoticeContent}>
              <p>{t('checkout.customerInfo.guestCheckout')}</p>
              <p className={styles.guestNoticeSubtext}>
                {t('checkout.customerInfo.guestCheckoutNote')}
              </p>
            </div>
          </div>
        )}{/* Saved Addresses Section */}
        {isAuthenticated && userAddresses.length > 0 && (
          <div className={styles.savedAddressesSection}>
            <h3 className={styles.savedAddressesTitle}>{t('checkout.customerInfo.savedAddresses')}</h3>
            {isLoadingAddresses ? (
              <div className={styles.loadingAddresses}>{t('checkout.customerInfo.loadingAddresses')}</div>
            ) : (
              <div className={styles.savedAddressesList}>
                {userAddresses.map((address) => (
                  <div 
                    key={address.id} 
                    className={`${styles.savedAddressItem} ${selectedAddressId === address.id ? styles.selectedAddress : ''}`}
                  >
                    <div className={styles.savedAddressInfo}>
                      <div className={styles.savedAddressName}>
                        {address.recipient_name}
                        {address.is_default_shipping && (
                          <span className={styles.defaultBadge}>{t('checkout.customerInfo.default')}</span>
                        )}
                      </div>
                      <div className={styles.savedAddressText}>
                        {address.street_address}
                        {address.address_line_2 && `, ${address.address_line_2}`}, 
                        {address.city}, {address.postal_code}
                      </div>
                    </div>
                    <div className={styles.savedAddressActions}>                      <button
                        type="button"
                        className={styles.useSavedAddressBtn}
                        onClick={() => handleUseSavedAddress(address)}
                      >
                        {t('checkout.customerInfo.use')}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteSavedAddressBtn}
                        onClick={() => onDeleteAddress?.(address.id)}
                      >
                        {t('checkout.customerInfo.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
              {/* Add new address button */}
            <button
              type="button"
              className={styles.addNewAddressBtn}
              onClick={handleAddNewAddress}
            >
              + {t('checkout.customerInfo.addNewAddress')}
            </button>
          </div>
        )}        {/* Selected Address Display (Read-only) */}
        {isUsingSavedAddress && selectedAddress && (
          <div className={styles.selectedAddressDisplay}>
            <div className={styles.selectedAddressHeader}>
              <h3 className={styles.selectedAddressTitle}>{t('checkout.customerInfo.selectedAddress')}</h3>
            </div>
            
            <div className={styles.selectedAddressDetails}>
              <div className={styles.selectedAddressRow}>
                <strong>{selectedAddress.recipient_name}</strong>
              </div>
              <div className={styles.selectedAddressRow}>
                {selectedAddress.street_address}
                {selectedAddress.address_line_2 && `, ${selectedAddress.address_line_2}`}
              </div>
              <div className={styles.selectedAddressRow}>
                {selectedAddress.city}, {selectedAddress.state_province} {selectedAddress.postal_code}
              </div>
              {selectedAddress.phone_number && (
                <div className={styles.selectedAddressRow}>
                  {t('checkout.customerInfo.phoneLabel')}: {selectedAddress.phone_number}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.formRow}>
          <div className={styles.formGroup}>            <label htmlFor="firstName" className={styles.label}>
              {t('checkout.customerInfo.firstName')} <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="firstName"
              value={checkoutData.customer_info.first_name}
              onChange={(e) => handleCustomerInfoChange('first_name', e.target.value)}
              className={`${styles.input} ${errors.first_name ? styles.inputError : ''}`}
              placeholder={t('checkout.customerInfo.firstNamePlaceholder')}
            />
            {errors.first_name && <span className={styles.errorText}>{errors.first_name}</span>}
          </div>

          <div className={styles.formGroup}>            <label htmlFor="lastName" className={styles.label}>
              {t('checkout.customerInfo.lastName')} <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="lastName"
              value={checkoutData.customer_info.last_name}
              onChange={(e) => handleCustomerInfoChange('last_name', e.target.value)}
              className={`${styles.input} ${errors.last_name ? styles.inputError : ''}`}
              placeholder={t('checkout.customerInfo.lastNamePlaceholder')}
            />
            {errors.last_name && <span className={styles.errorText}>{errors.last_name}</span>}
          </div>
        </div>

        <div className={styles.formRow}>          <div className={styles.formGroup}>            <label htmlFor="email" className={styles.label}>
              {t('checkout.customerInfo.email')} <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              id="email"
              value={checkoutData.customer_info.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              placeholder={t('checkout.customerInfo.emailPlaceholder')}
            />
            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone" className={styles.label}>
              {t('checkout.customerInfo.phone')}
            </label>
            <input
              type="tel"
              id="phone"
              value={checkoutData.customer_info.phone}
              onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
              className={styles.input}
              placeholder={t('checkout.customerInfo.phonePlaceholder')}
            />
          </div>
        </div>      </div>

      {/* Address Form Section - only show when editing or adding new */}
      {showAddressForm && (
        <div className={styles.section}>          <div className={styles.addressFormHeader}>
            <h2 className={styles.sectionTitle}>{t('checkout.customerInfo.shippingAddress')}</h2>
            {!isUsingSavedAddress && isAuthenticated && (
              <div className={styles.addressModeNote}>
                {t('checkout.customerInfo.addressNote')}
              </div>
            )}
          </div>
        
        <div className={styles.formGroup}>          <label htmlFor="streetAddress" className={styles.label}>
            {t('checkout.customerInfo.streetAddress')} <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="streetAddress"
            value={checkoutData.shipping_address.street_address}
            onChange={(e) => handleAddressChange('street_address', e.target.value)}
            className={`${styles.input} ${errors.street_address ? styles.inputError : ''}`}
            placeholder={t('checkout.customerInfo.streetAddressPlaceholder')}
          />
          {errors.street_address && <span className={styles.errorText}>{errors.street_address}</span>}
        </div>

        <div className={styles.formGroup}>          <label htmlFor="apartment" className={styles.label}>
            {t('checkout.customerInfo.apartment')}
          </label>
          <input
            type="text"
            id="apartment"
            value={checkoutData.shipping_address.apartment}
            onChange={(e) => handleAddressChange('apartment', e.target.value)}
            className={styles.input}
            placeholder={t('checkout.customerInfo.apartmentPlaceholder')}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>            <label htmlFor="city" className={styles.label}>
              {t('checkout.customerInfo.city')} <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="city"
              value={checkoutData.shipping_address.city}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              className={`${styles.input} ${errors.city ? styles.inputError : ''}`}
              placeholder={t('checkout.customerInfo.cityPlaceholder')}
            />
            {errors.city && <span className={styles.errorText}>{errors.city}</span>}
          </div>          <div className={styles.formGroup}>            <label htmlFor="state" className={styles.label}>
              {t('checkout.customerInfo.state')} <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="state"
              value={checkoutData.shipping_address.state}
              onChange={(e) => handleAddressChange('state', e.target.value)}
              className={`${styles.input} ${errors.state ? styles.inputError : ''}`}
              placeholder={t('checkout.customerInfo.statePlaceholder')}
            />
            {errors.state && <span className={styles.errorText}>{errors.state}</span>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="postalCode" className={styles.label}>
              {t('checkout.customerInfo.postalCode')} <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="postalCode"
              value={checkoutData.shipping_address.postal_code}
              onChange={(e) => handleAddressChange('postal_code', e.target.value)}
              className={`${styles.input} ${errors.postal_code ? styles.inputError : ''}`}
              placeholder={t('checkout.customerInfo.postalCodePlaceholder')}
            />
            {errors.postal_code && <span className={styles.errorText}>{errors.postal_code}</span>}
          </div>

          <div className={styles.formGroup}>            <label htmlFor="country" className={styles.label}>
              {t('checkout.customerInfo.country')} <span className={styles.required}>*</span>
            </label>
            <select
              id="country"
              value={checkoutData.shipping_address.country}
              onChange={(e) => handleAddressChange('country', e.target.value)}
              className={styles.select}
            >              
            <option value="AF">{t('checkout.customerInfo.countries.afghanistan')}</option>
            <option value="AL">{t('checkout.customerInfo.countries.albania')}</option>
            <option value="DZ">{t('checkout.customerInfo.countries.algeria')}</option>
            <option value="AO">{t('checkout.customerInfo.countries.angola')}</option>
            <option value="AI">{t('checkout.customerInfo.countries.anguilla')}</option>
            <option value="AG">{t('checkout.customerInfo.countries.antiguaAndBarbuda')}</option>
            <option value="AR">{t('checkout.customerInfo.countries.argentina')}</option>
            <option value="AW">{t('checkout.customerInfo.countries.aruba')}</option>
            <option value="AU">{t('checkout.customerInfo.countries.australia')}</option>
            <option value="AT">{t('checkout.customerInfo.countries.austria')}</option>
            <option value="AZ">{t('checkout.customerInfo.countries.azerbaijan')}</option>
            <option value="BS">{t('checkout.customerInfo.countries.bahamas')}</option>
            <option value="BH">{t('checkout.customerInfo.countries.bahrain')}</option>
            <option value="BD">{t('checkout.customerInfo.countries.bangladesh')}</option>
            <option value="BB">{t('checkout.customerInfo.countries.barbados')}</option>
            <option value="BY">{t('checkout.customerInfo.countries.belarus')}</option>
            <option value="BE">{t('checkout.customerInfo.countries.belgium')}</option>
            <option value="BZ">{t('checkout.customerInfo.countries.belize')}</option>
            <option value="BJ">{t('checkout.customerInfo.countries.benin')}</option>
            <option value="BM">{t('checkout.customerInfo.countries.bermuda')}</option>
            <option value="BT">{t('checkout.customerInfo.countries.bhutan')}</option>
            <option value="BO">{t('checkout.customerInfo.countries.bolivia')}</option>
            <option value="BQ">{t('checkout.customerInfo.countries.bonaireSintEustatiusSaba')}</option>
            <option value="BA">{t('checkout.customerInfo.countries.bosniaHerzegovina')}</option>
            <option value="BW">{t('checkout.customerInfo.countries.botswana')}</option>
            <option value="BR">{t('checkout.customerInfo.countries.brazil')}</option>
            <option value="BN">{t('checkout.customerInfo.countries.bruneiDarussalam')}</option>
            <option value="BG">{t('checkout.customerInfo.countries.bulgaria')}</option>
            <option value="BF">{t('checkout.customerInfo.countries.burkinaFaso')}</option>
            <option value="BI">{t('checkout.customerInfo.countries.burundi')}</option>
            <option value="KH">{t('checkout.customerInfo.countries.cambodia')}</option>
            <option value="CM">{t('checkout.customerInfo.countries.cameroon')}</option>
            <option value="CA">{t('checkout.customerInfo.countries.canada')}</option>
            <option value="IC">{t('checkout.customerInfo.countries.canaryIslands')}</option>
            <option value="CV">{t('checkout.customerInfo.countries.capeVerde')}</option>
            <option value="KY">{t('checkout.customerInfo.countries.caymanIslands')}</option>
            <option value="CF">{t('checkout.customerInfo.countries.centralAfricanRepublic')}</option>
            <option value="TD">{t('checkout.customerInfo.countries.chad')}</option>
            <option value="CL">{t('checkout.customerInfo.countries.chile')}</option>
            <option value="CN">{t('checkout.customerInfo.countries.china')}</option>
            <option value="CO">{t('checkout.customerInfo.countries.colombia')}</option>
            <option value="KM">{t('checkout.customerInfo.countries.comorosIslands')}</option>
            <option value="CR">{t('checkout.customerInfo.countries.costaRica')}</option>
            <option value="CI">{t('checkout.customerInfo.countries.coteIvoire')}</option>
            <option value="HR">{t('checkout.customerInfo.countries.croatia')}</option>
            <option value="CU">{t('checkout.customerInfo.countries.cuba')}</option>
            <option value="CW">{t('checkout.customerInfo.countries.curacao')}</option>
            <option value="CY">{t('checkout.customerInfo.countries.cyprus')}</option>
            <option value="CZ">{t('checkout.customerInfo.countries.czechRepublic')}</option>
            <option value="CD">{t('checkout.customerInfo.countries.democraticRepublicCongo')}</option>
            <option value="DK">{t('checkout.customerInfo.countries.denmark')}</option>
            <option value="DJ">{t('checkout.customerInfo.countries.djibouti')}</option>
            <option value="DM">{t('checkout.customerInfo.countries.dominica')}</option>
            <option value="DO">{t('checkout.customerInfo.countries.dominicanRepublic')}</option>
            <option value="EC">{t('checkout.customerInfo.countries.ecuador')}</option>
            <option value="EG">{t('checkout.customerInfo.countries.egypt')}</option>
            <option value="SV">{t('checkout.customerInfo.countries.salvador')}</option>
            <option value="GQ">{t('checkout.customerInfo.countries.equatorialGuinea')}</option>
            <option value="ER">{t('checkout.customerInfo.countries.eritrea')}</option>
            <option value="EE">{t('checkout.customerInfo.countries.estonia')}</option>
            <option value="SZ">{t('checkout.customerInfo.countries.eswatini')}</option>
            <option value="ET">{t('checkout.customerInfo.countries.ethiopia')}</option>
            <option value="FO">{t('checkout.customerInfo.countries.faroeIslands')}</option>
            <option value="FJ">{t('checkout.customerInfo.countries.fiji')}</option>
            <option value="FI">{t('checkout.customerInfo.countries.finland')}</option>
            <option value="FR">{t('checkout.customerInfo.countries.france')}</option>
            <option value="PF">{t('checkout.customerInfo.countries.frenchPolynesia')}</option>
            <option value="GA">{t('checkout.customerInfo.countries.gabon')}</option>
            <option value="GM">{t('checkout.customerInfo.countries.gambia')}</option>
            <option value="GE">{t('checkout.customerInfo.countries.georgia')}</option>
            <option value="DE">{t('checkout.customerInfo.countries.germany')}</option>
            <option value="GH">{t('checkout.customerInfo.countries.ghana')}</option>
            <option value="GI">{t('checkout.customerInfo.countries.gibraltar')}</option>
            <option value="GR">{t('checkout.customerInfo.countries.greece')}</option>
            <option value="GL">{t('checkout.customerInfo.countries.greenland')}</option>
            <option value="GD">{t('checkout.customerInfo.countries.grenada')}</option>
            <option value="GT">{t('checkout.customerInfo.countries.guatemala')}</option>
            <option value="GG">{t('checkout.customerInfo.countries.guernsey')}</option>
            <option value="GN">{t('checkout.customerInfo.countries.guinea')}</option>
            <option value="GY">{t('checkout.customerInfo.countries.guyana')}</option>
            <option value="HT">{t('checkout.customerInfo.countries.haiti')}</option>
            <option value="HK">{t('checkout.customerInfo.countries.hongKong')}</option>
            <option value="HU">{t('checkout.customerInfo.countries.hungary')}</option>
            <option value="IS">{t('checkout.customerInfo.countries.iceland')}</option>
            <option value="IN">{t('checkout.customerInfo.countries.india')}</option>
            <option value="ID">{t('checkout.customerInfo.countries.indonesia')}</option>
            <option value="IR">{t('checkout.customerInfo.countries.iran')}</option>
            <option value="IQ">{t('checkout.customerInfo.countries.iraq')}</option>
            <option value="IE">{t('checkout.customerInfo.countries.ireland')}</option>
            <option value="IT">{t('checkout.customerInfo.countries.italy')}</option>
            <option value="JM">{t('checkout.customerInfo.countries.jamaica')}</option>
            <option value="JP">{t('checkout.customerInfo.countries.japan')}</option>
            <option value="JE">{t('checkout.customerInfo.countries.jersey')}</option>
            <option value="JO">{t('checkout.customerInfo.countries.jordan')}</option>
            <option value="KZ">{t('checkout.customerInfo.countries.kazakhstan')}</option>
            <option value="KE">{t('checkout.customerInfo.countries.kenya')}</option>
            <option value="KI">{t('checkout.customerInfo.countries.kiribati')}</option>
            <option value="XK">{t('checkout.customerInfo.countries.kosovo')}</option>
            <option value="KW">{t('checkout.customerInfo.countries.kuwait')}</option>
            <option value="KG">{t('checkout.customerInfo.countries.kyrgyzstan')}</option>
            <option value="LA">{t('checkout.customerInfo.countries.laos')}</option>
            <option value="LV">{t('checkout.customerInfo.countries.latvia')}</option>
            <option value="LB">{t('checkout.customerInfo.countries.lebanon')}</option>
            <option value="LS">{t('checkout.customerInfo.countries.lesotho')}</option>
            <option value="LR">{t('checkout.customerInfo.countries.liberia')}</option>
            <option value="LY">{t('checkout.customerInfo.countries.libya')}</option>
            <option value="LI">{t('checkout.customerInfo.countries.liechtenstein')}</option>
            <option value="LT">{t('checkout.customerInfo.countries.lithuania')}</option>
            <option value="LU">{t('checkout.customerInfo.countries.luxembourg')}</option>
            <option value="MO">{t('checkout.customerInfo.countries.macao')}</option>
            <option value="MG">{t('checkout.customerInfo.countries.madagascar')}</option>
            <option value="MW">{t('checkout.customerInfo.countries.malawi')}</option>
            <option value="MY">{t('checkout.customerInfo.countries.malaysia')}</option>
            <option value="MV">{t('checkout.customerInfo.countries.maldives')}</option>
            <option value="ML">{t('checkout.customerInfo.countries.mali')}</option>
            <option value="MT">{t('checkout.customerInfo.countries.malta')}</option>
            <option value="MR">{t('checkout.customerInfo.countries.mauritania')}</option>
            <option value="MU">{t('checkout.customerInfo.countries.mauritius')}</option>
            <option value="MX">{t('checkout.customerInfo.countries.mexico')}</option>
            <option value="MD">{t('checkout.customerInfo.countries.moldova')}</option>
            <option value="MC">{t('checkout.customerInfo.countries.monaco')}</option>
            <option value="MN">{t('checkout.customerInfo.countries.mongolia')}</option>
            <option value="ME">{t('checkout.customerInfo.countries.montenegro')}</option>
            <option value="MA">{t('checkout.customerInfo.countries.morocco')}</option>
            <option value="MZ">{t('checkout.customerInfo.countries.mozambique')}</option>
            <option value="MM">{t('checkout.customerInfo.countries.myanmar')}</option>
            <option value="NA">{t('checkout.customerInfo.countries.namibia')}</option>
            <option value="NP">{t('checkout.customerInfo.countries.nepal')}</option>
            <option value="NL">{t('checkout.customerInfo.countries.netherlands')}</option>
            <option value="NC">{t('checkout.customerInfo.countries.newCaledonia')}</option>
            <option value="NZ">{t('checkout.customerInfo.countries.newZealand')}</option>
            <option value="NI">{t('checkout.customerInfo.countries.nicaragua')}</option>
            <option value="NE">{t('checkout.customerInfo.countries.niger')}</option>
            <option value="NG">{t('checkout.customerInfo.countries.nigeria')}</option>
            <option value="KP">{t('checkout.customerInfo.countries.northKorea')}</option>
            <option value="MK">{t('checkout.customerInfo.countries.northMacedonia')}</option>
            <option value="NO">{t('checkout.customerInfo.countries.norway')}</option>
            <option value="OM">{t('checkout.customerInfo.countries.oman')}</option>
            <option value="PK">{t('checkout.customerInfo.countries.pakistan')}</option>
            <option value="PA">{t('checkout.customerInfo.countries.panama')}</option>
            <option value="PG">{t('checkout.customerInfo.countries.papuaNewGuinea')}</option>
            <option value="PY">{t('checkout.customerInfo.countries.paraguay')}</option>
            <option value="PE">{t('checkout.customerInfo.countries.peru')}</option>
            <option value="PH">{t('checkout.customerInfo.countries.philippines')}</option>
            <option value="PL">{t('checkout.customerInfo.countries.poland')}</option>
            <option value="PT">{t('checkout.customerInfo.countries.portugal')}</option>
            <option value="QA">{t('checkout.customerInfo.countries.qatar')}</option>
            {/* <option value="CG">{t('checkout.customerInfo.countries.republicCongo')}</option> */}
            <option value="RO">{t('checkout.customerInfo.countries.romania')}</option>
            <option value="RU">{t('checkout.customerInfo.countries.russianFederation')}</option>
            <option value="RW">{t('checkout.customerInfo.countries.rwanda')}</option>
            <option value="KN">{t('checkout.customerInfo.countries.saintKittsAndNevis')}</option>
            <option value="LC">{t('checkout.customerInfo.countries.stLucia')}</option>
            <option value="MF">{t('checkout.customerInfo.countries.saintMartin')}</option>
            <option value="VC">{t('checkout.customerInfo.countries.stVincentAndGrenadines')}</option>
            <option value="WS">{t('checkout.customerInfo.countries.samoa')}</option>
            <option value="SM">{t('checkout.customerInfo.countries.sanMarino')}</option>
            <option value="ST">{t('checkout.customerInfo.countries.saoTomeAndPrincipe')}</option>
            <option value="SA">{t('checkout.customerInfo.countries.saudiArabia')}</option>
            <option value="SN">{t('checkout.customerInfo.countries.senegal')}</option>
            <option value="RS">{t('checkout.customerInfo.countries.serbia')}</option>
            <option value="SC">{t('checkout.customerInfo.countries.seychelles')}</option>
            <option value="SL">{t('checkout.customerInfo.countries.sierraLeone')}</option>
            <option value="SG">{t('checkout.customerInfo.countries.singapore')}</option>
            <option value="SK">{t('checkout.customerInfo.countries.slovakia')}</option>
            <option value="SI">{t('checkout.customerInfo.countries.slovenia')}</option>
            <option value="SB">{t('checkout.customerInfo.countries.solomonIsland')}</option>
            <option value="ZA">{t('checkout.customerInfo.countries.southAfrica')}</option>
            <option value="ES">{t('checkout.customerInfo.countries.spain')}</option>
            <option value="LK">{t('checkout.customerInfo.countries.sriLanka')}</option>
            <option value="SD">{t('checkout.customerInfo.countries.sudan')}</option>
            <option value="SR">{t('checkout.customerInfo.countries.surinam')}</option>
            <option value="SE">{t('checkout.customerInfo.countries.sweden')}</option>
            <option value="CH">{t('checkout.customerInfo.countries.switzerland')}</option>
            <option value="SY">{t('checkout.customerInfo.countries.syrianArabRepublic')}</option>
            <option value="TW">{t('checkout.customerInfo.countries.taiwan')}</option>
            <option value="TJ">{t('checkout.customerInfo.countries.tajikistan')}</option>
            <option value="TZ">{t('checkout.customerInfo.countries.tanzania')}</option>
            <option value="TH">{t('checkout.customerInfo.countries.thailand')}</option>
            <option value="TG">{t('checkout.customerInfo.countries.togoleseRepublic')}</option>
            <option value="TO">{t('checkout.customerInfo.countries.tonga')}</option>
            <option value="TT">{t('checkout.customerInfo.countries.trinidadAndTobago')}</option>
            <option value="TN">{t('checkout.customerInfo.countries.tunisia')}</option>
            <option value="TR">{t('checkout.customerInfo.countries.turkey')}</option>
            <option value="TM">{t('checkout.customerInfo.countries.turkmenistan')}</option>
            <option value="TC">{t('checkout.customerInfo.countries.turksAndCaicosIslands')}</option>
            <option value="UG">{t('checkout.customerInfo.countries.uganda')}</option>
            <option value="UA">{t('checkout.customerInfo.countries.ukraine')}</option>
            <option value="AE">{t('checkout.customerInfo.countries.unitedArabEmirates')}</option>
            <option value="GB">{t('checkout.customerInfo.countries.unitedKingdom')}</option>
            <option value="UY">{t('checkout.customerInfo.countries.uruguay')}</option>
            <option value="US">{t('checkout.customerInfo.countries.usa')}</option>
            <option value="VI">{t('checkout.customerInfo.countries.usVirginIslands')}</option>
            <option value="UZ">{t('checkout.customerInfo.countries.uzbekistan')}</option>
            <option value="VU">{t('checkout.customerInfo.countries.vanuatu')}</option>
            <option value="VA">{t('checkout.customerInfo.countries.vatican')}</option>
            <option value="VE">{t('checkout.customerInfo.countries.venezuela')}</option>
            <option value="VN">{t('checkout.customerInfo.countries.vietnam')}</option>
            <option value="VG">{t('checkout.customerInfo.countries.virginIslands')}</option>
            <option value="YE">{t('checkout.customerInfo.countries.yemen')}</option>
            <option value="ZM">{t('checkout.customerInfo.countries.zambia')}</option>
            <option value="ZW">{t('checkout.customerInfo.countries.zimbabwe')}</option>
            </select>
          </div>
        </div>

        {/* Save Address Checkbox for authenticated users */}
        {isAuthenticated && (
          <div className={styles.checkbox}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={checkoutData.save_address}
                onChange={(e) => updateCheckoutData({ save_address: e.target.checked })}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxMark}></span>
              {t('checkout.customerInfo.saveAddress')}
            </label>
          </div>
        )}
        
        </div>
      )}

    </div>
  );
}
