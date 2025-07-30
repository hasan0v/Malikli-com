// Checkout-related TypeScript interfaces

export interface Address {
  id?: number;
  street_address: string;
  apartment?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

export interface ShippingMethod {
  id: number;
  name: string;
  description?: string;
  cost: number;
  estimated_delivery_min_days?: number;
  estimated_delivery_max_days?: number;
  is_active: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_transfer';
  icon?: string;
  description?: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  variant_id?: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  color?: string;
  colorCode?: string;
  size?: string;
  sku?: string;
  variant?: string;
}

export interface OrderSummary {
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  items: OrderItem[];
}

export interface CheckoutData {
  customer_info: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  shipping_address: Address;
  save_address: boolean;
  shipping_method: ShippingMethod | null;
  payment_method: PaymentMethod | null;
  customer_notes?: string;
  // Add a field for dynamic shipping cost, e.g., from EMS
  dynamic_shipping_cost?: number | null;
  dynamic_shipping_method_name?: string | null;
}

export interface Order {
  order_id: string;
  order_number: string;
  user?: number;
  email_for_guest?: string;
  shipping_address: Address;
  shipping_method: ShippingMethod;
  shipping_cost: number;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  order_status: 'pending_payment' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'failed';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded_partial' | 'refunded_full';
  customer_notes?: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface CheckoutStep {
  id: number;
  name: string;
  title: string;
  completed: boolean;
  current: boolean;
  accessible?: boolean;
}

export const CHECKOUT_STEPS: CheckoutStep[] = [
  { id: 1, name: 'information', title: 'checkout.steps.information', completed: false, current: true, accessible: true },
  { id: 2, name: 'shipping', title: 'checkout.steps.shipping', completed: false, current: false, accessible: false },
  { id: 3, name: 'payment', title: 'checkout.steps.payment', completed: false, current: false, accessible: false },
  { id: 4, name: 'confirmation', title: 'checkout.steps.confirmation', completed: false, current: false, accessible: false },
];

// Updated payment methods - only Visa/Mastercard
export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'card', name: 'Visa/Mastercard', type: 'card', icon: '💳', description: 'checkout.payment.cardDescription' },
];
