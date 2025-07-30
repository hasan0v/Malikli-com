// services/cartRecoveryService.ts
import { CartItem } from '@/store/cartSlice';

interface CartValidationResult {
  isValid: boolean;
  errors: string[];
  recoveredItems: CartItem[];
  corruptedItems: any[];
}

interface CartRecoveryOptions {
  enableLogging: boolean;
  enableBackup: boolean;
  maxRecoveryAttempts: number;
}

class CartRecoveryService {
  private static instance: CartRecoveryService;
  private readonly CART_STORAGE_KEY = 'cart';
  private readonly CART_BACKUP_KEY = 'cart_backup';
  private readonly CART_ID_KEY = 'cartId';
  private readonly RECOVERY_LOG_KEY = 'cart_recovery_log';
  private readonly CART_SYNC_FLAG_KEY = 'cart_needs_sync';

  private options: CartRecoveryOptions = {
    enableLogging: true,
    enableBackup: true,
    maxRecoveryAttempts: 3,
  };

  private constructor() {}

  public static getInstance(): CartRecoveryService {
    if (!CartRecoveryService.instance) {
      CartRecoveryService.instance = new CartRecoveryService();
    }
    return CartRecoveryService.instance;
  }

  /**
   * Safely load cart from localStorage with comprehensive validation and recovery
   */
  public loadCartSafely(): CartItem[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      // Try to load the main cart
      const mainCart = this.loadAndValidateCart(this.CART_STORAGE_KEY);
      if (mainCart.isValid && mainCart.recoveredItems.length > 0) {
        this.log('Successfully loaded main cart', { itemCount: mainCart.recoveredItems.length });
        return mainCart.recoveredItems;
      }

      // If main cart is corrupted, try backup
      if (this.options.enableBackup) {
        this.log('Main cart corrupted, attempting backup recovery');
        const backupCart = this.loadAndValidateCart(this.CART_BACKUP_KEY);
        if (backupCart.isValid && backupCart.recoveredItems.length > 0) {
          this.log('Successfully recovered from backup', { itemCount: backupCart.recoveredItems.length });
          // Restore backup to main storage
          this.saveCartSafely(backupCart.recoveredItems);
          return backupCart.recoveredItems;
        }
      }

      // If both fail, return empty cart and log the issue
      this.log('Cart recovery failed, returning empty cart', {
        mainCartErrors: mainCart.errors,
        mainCartCorrupted: mainCart.corruptedItems.length,
      });

      return [];
    } catch (error) {
      this.log('Critical error during cart loading', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Safely save cart to localStorage with backup and validation
   */
  public saveCartSafely(items: CartItem[]): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      // Validate items before saving
      const validation = this.validateCartItems(items);
      
      if (!validation.isValid) {
        this.log('Cannot save invalid cart items', {
          errors: validation.errors,
          corruptedCount: validation.corruptedItems.length,
        });
        
        // Try to save only the valid items
        if (validation.recoveredItems.length > 0) {
          return this.saveCartSafely(validation.recoveredItems);
        }
        return false;
      }

      // Create backup of current cart before overwriting
      if (this.options.enableBackup) {
        try {
          const currentCart = localStorage.getItem(this.CART_STORAGE_KEY);
          if (currentCart) {
            localStorage.setItem(this.CART_BACKUP_KEY, currentCart);
          }
        } catch (backupError) {
          this.log('Failed to create cart backup', { 
            error: backupError instanceof Error ? backupError.message : String(backupError) 
          });
        }
      }

      // Save the validated cart
      const cartData = JSON.stringify(validation.recoveredItems);
      localStorage.setItem(this.CART_STORAGE_KEY, cartData);

      // Update sync flag
      this.setSyncFlag(true);

      this.log('Cart saved successfully', { itemCount: validation.recoveredItems.length });
      return true;

    } catch (error) {
      this.log('Failed to save cart', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Load cart ID with validation
   */
  public loadCartIdSafely(): string | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    try {
      const cartId = localStorage.getItem(this.CART_ID_KEY);
      if (cartId && this.isValidCartId(cartId)) {
        return cartId;
      }
      
      if (cartId && !this.isValidCartId(cartId)) {
        this.log('Invalid cart ID found, clearing', { cartId });
        localStorage.removeItem(this.CART_ID_KEY);
      }

      return undefined;
    } catch (error) {
      this.log('Error loading cart ID', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return undefined;
    }
  }

  /**
   * Save cart ID with validation
   */
  public saveCartIdSafely(cartId?: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      if (cartId && this.isValidCartId(cartId)) {
        localStorage.setItem(this.CART_ID_KEY, cartId);
        this.log('Cart ID saved', { cartId });
        return true;
      } else if (cartId === undefined || cartId === null) {
        localStorage.removeItem(this.CART_ID_KEY);
        this.log('Cart ID cleared');
        return true;
      } else {
        this.log('Invalid cart ID provided', { cartId });
        return false;
      }
    } catch (error) {
      this.log('Error saving cart ID', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Get sync flag status
   */
  public getSyncFlag(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return localStorage.getItem(this.CART_SYNC_FLAG_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Set sync flag
   */
  public setSyncFlag(needsSync: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (needsSync) {
        localStorage.setItem(this.CART_SYNC_FLAG_KEY, 'true');
      } else {
        localStorage.removeItem(this.CART_SYNC_FLAG_KEY);
      }
    } catch (error) {
      this.log('Error setting sync flag', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Clear all cart data with confirmation
   */
  public clearAllCartData(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const keysToRemove = [
        this.CART_STORAGE_KEY,
        this.CART_BACKUP_KEY,
        this.CART_ID_KEY,
        this.CART_SYNC_FLAG_KEY,
      ];

      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          this.log(`Failed to remove ${key}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      });

      this.log('All cart data cleared');
      return true;
    } catch (error) {
      this.log('Error clearing cart data', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Get cart recovery statistics
   */
  public getRecoveryStats(): any {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const logData = localStorage.getItem(this.RECOVERY_LOG_KEY);
      return logData ? JSON.parse(logData) : { logs: [], totalRecoveries: 0 };
    } catch (error) {
      return { 
        logs: [], 
        totalRecoveries: 0, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Enable or disable cross-tab synchronization
   */
  public enableCrossTabSync(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === this.CART_STORAGE_KEY && event.newValue !== event.oldValue) {
        this.log('Cart updated in another tab, triggering sync');
        
        // Dispatch a custom event that the app can listen to
        window.dispatchEvent(new CustomEvent('cartUpdatedInAnotherTab', {
          detail: { newValue: event.newValue, oldValue: event.oldValue }
        }));
      }
    });

    this.log('Cross-tab synchronization enabled');
  }

  /**
   * Private: Load and validate cart from a specific storage key
   */
  private loadAndValidateCart(storageKey: string): CartValidationResult {
    let savedCart: string | null = null;
    
    try {
      savedCart = localStorage.getItem(storageKey);
      if (!savedCart) {
        return {
          isValid: true,
          errors: [],
          recoveredItems: [],
          corruptedItems: [],
        };
      }

      const parsedCart = JSON.parse(savedCart);
      return this.validateCartItems(parsedCart);

    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to parse cart data: ${error instanceof Error ? error.message : String(error)}`],
        recoveredItems: [],
        corruptedItems: [savedCart],
      };
    }
  }

  /**
   * Private: Validate cart items and attempt recovery
   */
  private validateCartItems(items: any): CartValidationResult {
    const errors: string[] = [];
    const recoveredItems: CartItem[] = [];
    const corruptedItems: any[] = [];

    // Check if items is an array
    if (!Array.isArray(items)) {
      return {
        isValid: false,
        errors: ['Cart data is not an array'],
        recoveredItems: [],
        corruptedItems: [items],
      };
    }

    // Validate each item
    items.forEach((item, index) => {
      const validation = this.validateCartItem(item, index);
      
      if (validation.isValid && validation.recoveredItem) {
        recoveredItems.push(validation.recoveredItem);
      } else {
        errors.push(...validation.errors);
        corruptedItems.push(item);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      recoveredItems,
      corruptedItems,
    };
  }

  /**
   * Private: Validate a single cart item
   */
  private validateCartItem(item: any, index: number): { isValid: boolean; errors: string[]; recoveredItem?: CartItem } {
    const errors: string[] = [];
    
    // Check required fields
    if (typeof item !== 'object' || item === null) {
      return { isValid: false, errors: [`Item ${index}: Not an object`] };
    }

    // Validate and recover ID
    if (typeof item.id !== 'number' || item.id <= 0) {
      errors.push(`Item ${index}: Invalid ID`);
      return { isValid: false, errors };
    }

    // Validate and recover name
    if (typeof item.name !== 'string' || item.name.trim() === '') {
      errors.push(`Item ${index}: Invalid name`);
      return { isValid: false, errors };
    }

    // Validate and recover price
    const price = this.recoverNumber(item.price, 0);
    if (price === undefined || price < 0) {
      errors.push(`Item ${index}: Invalid price`);
      return { isValid: false, errors };
    }

    // Validate and recover quantity
    const quantity = this.recoverNumber(item.quantity, 1);
    if (quantity === undefined || quantity <= 0) {
      errors.push(`Item ${index}: Invalid quantity`);
      return { isValid: false, errors };
    }

    // Create recovered item with validated data
    const recoveredItem: CartItem = {
      id: item.id,
      name: item.name.trim(),
      price: price,
      quantity: quantity,
      variantId: this.recoverNumber(item.variantId),
      dropProductId: this.recoverNumber(item.dropProductId),
      image: typeof item.image === 'string' ? item.image : undefined,
      color: typeof item.color === 'string' ? item.color.trim() : undefined,
      colorCode: typeof item.colorCode === 'string' ? item.colorCode.trim() : undefined,
      size: typeof item.size === 'string' ? item.size.trim() : undefined,
      isDropProduct: typeof item.isDropProduct === 'boolean' ? item.isDropProduct : false,
    };

    return { isValid: true, errors: [], recoveredItem };
  }

  /**
   * Private: Attempt to recover a number from various input types
   */
  private recoverNumber(value: any, defaultValue?: number): number | undefined {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    
    return defaultValue;
  }

  /**
   * Private: Validate cart ID format
   */
  private isValidCartId(cartId: string): boolean {
    // Basic validation - adjust according to your cart ID format
    return typeof cartId === 'string' && 
           cartId.length > 0 && 
           cartId.length <= 100 && 
           /^[a-zA-Z0-9_-]+$/.test(cartId);
  }

  /**
   * Private: Log recovery events
   */
  private log(message: string, data?: any): void {
    if (!this.options.enableLogging) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data,
    };

    // Console logging for development
    // console.log(`[CartRecovery] ${message}`, data || ''); // Commented out for production

    // Persistent logging for analysis
    try {
      if (typeof window !== 'undefined') {
        const existingLogs = localStorage.getItem(this.RECOVERY_LOG_KEY);
        const logs = existingLogs ? JSON.parse(existingLogs) : { logs: [], totalRecoveries: 0 };
        
        logs.logs.push(logEntry);
        
        // Keep only the last 50 log entries to avoid storage bloat
        if (logs.logs.length > 50) {
          logs.logs = logs.logs.slice(-50);
        }
        
        logs.totalRecoveries = logs.totalRecoveries + 1;
        
        localStorage.setItem(this.RECOVERY_LOG_KEY, JSON.stringify(logs));
      }
    } catch (error) {
      console.warn('Failed to persist recovery log:', error);
    }
  }
}

export default CartRecoveryService;
