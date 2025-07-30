// Cart validation alert component
import React, { useState, useEffect } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateQuantity, removeFromCart } from '../../store/cartSlice';
import styles from './CartValidationAlert.module.css';

interface CartValidationAlertProps {
  onValidationComplete?: (isValid: boolean) => void;
  autoValidate?: boolean;
  showSuccessMessage?: boolean;
  className?: string;
}

export const CartValidationAlert: React.FC<CartValidationAlertProps> = ({
  onValidationComplete,
  autoValidate = false,
  showSuccessMessage = false,
  className = ''
}) => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(state => state.cart.items);
  const { validateCart, isValidatingCart } = useInventory();
  
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    unavailableItems: Array<{
      item: any;
      requestedQuantity: number;
      availableQuantity: number;
      reason: string;
    }>;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const performValidation = async () => {
    if (cartItems.length === 0) {
      setValidationResult({ valid: true, unavailableItems: [] });
      setIsVisible(false);
      onValidationComplete?.(true);
      return;
    }

    const result = await validateCart();
    setValidationResult(result);
    setIsVisible(!result.valid || (showSuccessMessage && result.valid));
    onValidationComplete?.(result.valid);
  };

  // Auto-validate on cart changes if enabled
  useEffect(() => {
    if (autoValidate && cartItems.length > 0) {
      const timeoutId = setTimeout(performValidation, 500); // Debounce validation
      return () => clearTimeout(timeoutId);
    }
  }, [cartItems, autoValidate]);

  const handleFixItem = (unavailableItem: any) => {
    const { item, availableQuantity } = unavailableItem;
    
    if (availableQuantity === 0) {
      // Remove item completely if out of stock
      dispatch(removeFromCart({
        id: item.id,
        variantId: item.variantId,
        color: item.color,
        size: item.size
      }));
    } else {
      // Reduce quantity to available amount
      dispatch(updateQuantity({
        id: item.id,
        variantId: item.variantId,
        color: item.color,
        size: item.size,
        quantity: availableQuantity
      }));
    }
  };

  const handleFixAllItems = () => {
    if (!validationResult) return;

    validationResult.unavailableItems.forEach(unavailableItem => {
      handleFixItem(unavailableItem);
    });
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !validationResult) {
    return null;
  }

  // Success message
  if (validationResult.valid && showSuccessMessage) {
    return (
      <div className={`${styles.alert} ${styles.success} ${className}`}>
        <div className={styles.alertContent}>
          <div className={styles.alertIcon}>✅</div>
          <div className={styles.alertMessage}>
            <h4>Cart Validated</h4>
            <p>All items in your cart are available and ready for checkout.</p>
          </div>
          <button 
            className={styles.dismissBtn}
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // Validation errors
  if (!validationResult.valid) {
    return (
      <div className={`${styles.alert} ${styles.error} ${className}`}>
        <div className={styles.alertContent}>
          <div className={styles.alertIcon}>⚠️</div>
          <div className={styles.alertMessage}>
            <h4>Cart Items Need Attention</h4>
            <p>
              {validationResult.unavailableItems.length} item(s) in your cart are no longer available 
              or have insufficient stock.
            </p>
            
            <div className={styles.unavailableItems}>
              {validationResult.unavailableItems.map((unavailableItem, index) => (
                <div key={index} className={styles.unavailableItem}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{unavailableItem.item.name}</span>
                    {unavailableItem.item.color && (
                      <span className={styles.itemVariant}>Color: {unavailableItem.item.color}</span>
                    )}
                    {unavailableItem.item.size && (
                      <span className={styles.itemVariant}>Size: {unavailableItem.item.size}</span>
                    )}
                  </div>
                  <div className={styles.itemIssue}>
                    <span className={styles.reason}>{unavailableItem.reason}</span>
                    <span className={styles.quantities}>
                      Requested: {unavailableItem.requestedQuantity}, 
                      Available: {unavailableItem.availableQuantity}
                    </span>
                  </div>
                  <button
                    className={styles.fixBtn}
                    onClick={() => handleFixItem(unavailableItem)}
                  >
                    {unavailableItem.availableQuantity === 0 ? 'Remove' : 'Fix'}
                  </button>
                </div>
              ))}
            </div>
            
            <div className={styles.alertActions}>
              <button 
                className={styles.fixAllBtn}
                onClick={handleFixAllItems}
                disabled={isValidatingCart}
              >
                Fix All Items
              </button>
              <button 
                className={styles.revalidateBtn}
                onClick={performValidation}
                disabled={isValidatingCart}
              >
                {isValidatingCart ? 'Checking...' : 'Check Again'}
              </button>
            </div>
          </div>
          <button 
            className={styles.dismissBtn}
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// Compact version for checkout pages
interface CheckoutValidationBarProps {
  onValidationResult?: (isValid: boolean) => void;
  className?: string;
}

export const CheckoutValidationBar: React.FC<CheckoutValidationBarProps> = ({
  onValidationResult,
  className = ''
}) => {
  const { validateCart, isValidatingCart } = useInventory();
  const cartItems = useAppSelector(state => state.cart.items);
  const [lastValidation, setLastValidation] = useState<{ valid: boolean; timestamp: number } | null>(null);

  const checkCart = async () => {
    const result = await validateCart();
    const validation = { valid: result.valid, timestamp: Date.now() };
    setLastValidation(validation);
    onValidationResult?.(result.valid);
    return result;
  };

  useEffect(() => {
    checkCart();
  }, [cartItems]);

  const isRecent = lastValidation && (Date.now() - lastValidation.timestamp) < 30000; // 30 seconds

  // Commented out for production - hide cart validation bar from users
  return null;
  
  // return (
  //   <div className={`${styles.checkoutBar} ${className}`}>
  //     <div className={styles.validationStatus}>
  //       {isValidatingCart ? (
  //         <span className={styles.checking}>🔄 Validating cart...</span>
  //       ) : lastValidation?.valid ? (
  //         <span className={styles.valid}>✅ Cart validated {isRecent ? 'recently' : ''}</span>
  //       ) : (
  //         <span className={styles.invalid}>❌ Cart has availability issues</span>
  //       )}
  //     </div>
  //     <button
  //       className={styles.recheckBtn}
  //       onClick={checkCart}
  //       disabled={isValidatingCart}
  //     >
  //       {isValidatingCart ? 'Checking...' : 'Recheck'}
  //     </button>
  //   </div>
  // );
};

export default CartValidationAlert;
