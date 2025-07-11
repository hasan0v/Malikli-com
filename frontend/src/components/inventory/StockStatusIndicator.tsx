// Stock status indicator component
import React from 'react';
import styles from './StockStatusIndicator.module.css';

interface StockStatusIndicatorProps {
  availableQuantity: number;
  isLowStock?: boolean;
  isInStock?: boolean;
  showQuantity?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const StockStatusIndicator: React.FC<StockStatusIndicatorProps> = ({
  availableQuantity,
  isLowStock = false,
  isInStock = availableQuantity > 0,
  showQuantity = false,
  size = 'medium',
  className = ''
}) => {
  const getStatusConfig = () => {
    if (!isInStock || availableQuantity === 0) {
      return {
        status: 'out-of-stock',
        text: 'Out of Stock',
        icon: '❌',
        color: '#ef4444'
      };
    } else if (isLowStock) {
      return {
        status: 'low-stock',
        text: showQuantity ? `Low Stock (${availableQuantity} left)` : 'Low Stock',
        icon: '⚠️',
        color: '#f59e0b'
      };
    } else if (availableQuantity <= 5) {
      return {
        status: 'limited-stock',
        text: showQuantity ? `${availableQuantity} in stock` : 'Limited Stock',
        icon: '📦',
        color: '#3b82f6'
      };
    } else {
      return {
        status: 'in-stock',
        text: 'In Stock',
        icon: '✅',
        color: '#10b981'
      };
    }
  };

  const config = getStatusConfig();

  return (
    <div 
      className={`${styles.stockIndicator} ${styles[size]} ${styles[config.status]} ${className}`}
      style={{ '--indicator-color': config.color } as React.CSSProperties}
    >
      <span className={styles.icon} role="img" aria-label={config.status}>
        {config.icon}
      </span>
      <span className={styles.text}>{config.text}</span>
    </div>
  );
};

// Badge version for compact display
interface StockBadgeProps {
  availableQuantity: number;
  isLowStock?: boolean;
  isInStock?: boolean;
  className?: string;
}

export const StockBadge: React.FC<StockBadgeProps> = ({
  availableQuantity,
  isLowStock = false,
  isInStock = availableQuantity > 0,
  className = ''
}) => {
  const getBadgeConfig = () => {
    if (!isInStock || availableQuantity === 0) {
      return { text: 'Out of Stock', className: styles.outOfStock };
    } else if (isLowStock) {
      return { text: 'Low Stock', className: styles.lowStock };
    } else {
      return { text: 'In Stock', className: styles.inStock };
    }
  };

  const config = getBadgeConfig();

  return (
    <span className={`${styles.stockBadge} ${config.className} ${className}`}>
      {config.text}
    </span>
  );
};

// Quantity selector with stock validation
interface StockAwareQuantitySelectorProps {
  availableQuantity: number;
  currentQuantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export const StockAwareQuantitySelector: React.FC<StockAwareQuantitySelectorProps> = ({
  availableQuantity,
  currentQuantity,
  onQuantityChange,
  min = 1,
  max,
  disabled = false,
  className = ''
}) => {
  const effectiveMax = max ? Math.min(max, availableQuantity) : availableQuantity;
  const isAtMax = currentQuantity >= effectiveMax;
  const isAtMin = currentQuantity <= min;

  const handleDecrease = () => {
    if (!isAtMin && !disabled) {
      onQuantityChange(Math.max(min, currentQuantity - 1));
    }
  };

  const handleIncrease = () => {
    if (!isAtMax && !disabled && availableQuantity > currentQuantity) {
      onQuantityChange(Math.min(effectiveMax, currentQuantity + 1));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || min;
    const clampedValue = Math.min(effectiveMax, Math.max(min, value));
    onQuantityChange(clampedValue);
  };

  return (
    <div className={`${styles.quantitySelector} ${className}`}>
      <button 
        className={styles.quantityBtn}
        onClick={handleDecrease}
        disabled={disabled || isAtMin}
        aria-label="Decrease quantity"
      >
        -
      </button>
      
      <input
        type="number"
        className={styles.quantityInput}
        value={currentQuantity}
        onChange={handleInputChange}
        min={min}
        max={effectiveMax}
        disabled={disabled}
        aria-label="Quantity"
      />
      
      <button 
        className={styles.quantityBtn}
        onClick={handleIncrease}
        disabled={disabled || isAtMax || availableQuantity === 0}
        aria-label="Increase quantity"
      >
        +
      </button>
      
      {availableQuantity > 0 && currentQuantity >= effectiveMax && (
        <div className={styles.maxStockNotice}>
          <span>Max: {effectiveMax}</span>
        </div>
      )}
      
      {availableQuantity === 0 && (
        <div className={styles.outOfStockNotice}>
          <span>Out of stock</span>
        </div>
      )}
    </div>
  );
};

export default StockStatusIndicator;
