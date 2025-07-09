// Orders API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';

export interface OrderItem {
  id: number;
  product_id: number;
  variant_id?: number | null;
  product_name: string;
  variant_name?: string | null;
  product_image?: string | null;
  product_slug: string;
  price: string; // API returns as string
  quantity: number;
  color?: string | null;
  size?: string | null;
  subtotal: string; // API returns as string
  sku_snapshot: string;
  // Computed fields for backward compatibility
  name: string; // Will be computed from product_name
  image: string; // Will be computed from product_image
  variant?: string; // Will be computed from variant_name
}

export interface Order {
  id: number | string; // Can be UUID from backend
  order_number: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  total_amount: string; // API returns as string
  shipping_cost: string; // API returns as string
  discount_amount: string; // API returns as string
  subtotal_amount: string; // API returns as string
  items: OrderItem[];
  shipping_address: {
    first_name?: string;
    last_name?: string;
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  shipping_method: string;
  shipping_method_details?: {
    id: number;
    name: string;
    description?: string;
    cost: string;
  };
  tracking_number?: string;
  estimated_delivery?: string;
  customer_info: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export interface OrdersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
}

// Interface for creating an order
export interface CreateOrderRequest {
  cart_id: string;
  shipping_address_id: number;
  billing_address_id?: number;
  shipping_method_id: number;
  customer_notes?: string;
  email_for_guest?: string; // For guest checkout
}

/**
 * Fetch user's orders from the API
 */
export async function getUserOrders(token: string, params?: {
  status?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}): Promise<OrdersResponse> {
  const url = new URL(`${API_BASE_URL}/orders/`);
  
  // Add query parameters
  if (params) {
    if (params.status && params.status !== 'all') {
      url.searchParams.append('status', params.status);
    }
    if (params.ordering) {
      url.searchParams.append('ordering', params.ordering);
    }
    if (params.page) {
      url.searchParams.append('page', params.page.toString());
    }
    if (params.page_size) {
      url.searchParams.append('page_size', params.page_size.toString());
    }
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please log in again');
    }
    throw new Error(`Failed to fetch orders: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    ...data,
    results: data.results.map(transformOrder),
  };
}

/**
 * Create a new order
 */
export async function createOrder(
  orderData: CreateOrderRequest,
  token?: string | null
): Promise<Order> {
  console.log('=== CREATE ORDER API CALLED ===');
  console.log('API URL:', `${API_BASE_URL}/orders/create/`);
  console.log('Order data:', orderData);
  console.log('Token available:', !!token);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/orders/create/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderData),
  });

  console.log('=== CREATE ORDER RESPONSE ===');
  console.log('Status:', response.status);
  console.log('Status text:', response.statusText);
  console.log('Response OK:', response.ok);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('=== CREATE ORDER ERROR RESPONSE ===');
    console.error('Error data:', errorData);
    throw new Error(errorData.message || 'Failed to create order');
  }

  const backendOrder = await response.json();
  console.log('=== CREATE ORDER SUCCESS ===');
  console.log('Backend order response:', backendOrder);
  
  const transformedOrder = transformOrder(backendOrder);
  console.log('Transformed order:', transformedOrder);
  
  return transformedOrder;
}

/**
 * Update order payment status (typically called after payment completion)
 */
export async function updateOrderPaymentStatus(
  orderId: string | number,
  paymentStatus: 'paid' | 'failed' | 'pending',
  token?: string
): Promise<Order> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/orders/payment-callback/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      uid: orderId,
      status: paymentStatus === 'paid' ? 'success' : 'failed',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update order payment status');
  }

  const result = await response.json();
    // If successful, fetch the updated order
  if (result.success && token) {
    return getOrderById(String(orderId), token);
  }

  throw new Error('Payment status update failed');
}

/**
 * Fetch a specific order by ID
 */
export async function getOrderById(orderId: string, token: string): Promise<Order> {  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please log in again');
    }
    if (response.status === 404) {
      throw new Error('Order not found');
    }
    throw new Error(`Failed to fetch order: ${response.statusText}`);
  }

  const data = await response.json();
  return transformOrder(data);
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string | number, token: string): Promise<Order> {
  console.log('=== CANCEL ORDER API CALLED ===');
  console.log('Order ID:', orderId);
  console.log('API URL:', `${API_BASE_URL}/orders/${orderId}/cancel/`);

  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('=== CANCEL ORDER RESPONSE ===');
  console.log('Status:', response.status);
  console.log('Status text:', response.statusText);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please log in again');
    }
    if (response.status === 404) {
      throw new Error('Order not found');
    }
    if (response.status === 400) {
      const errorData = await response.json();
      console.error('Cancel order error:', errorData);
      // Provide more specific error messages
      if (errorData.detail) {
        throw new Error(errorData.detail);
      } else if (errorData.message) {
        throw new Error(errorData.message);
      } else if (errorData.error) {
        throw new Error(errorData.error);
      } else {
        throw new Error('Cannot cancel this order - it may already be processed or shipped');
      }
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to cancel this order');
    }
    throw new Error(`Failed to cancel order: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('=== CANCEL ORDER SUCCESS ===');
  console.log('Cancelled order data:', data);
  
  return transformOrder(data);
}

/**
 * Reorder items from a previous order
 */
export async function reorderItems(orderId: string | number, token: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/reorder/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please log in again');
    }
    if (response.status === 404) {
      throw new Error('Order not found');
    }
    if (response.status === 400) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Cannot reorder these items');
    }
    throw new Error(`Failed to reorder items: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Transform backend order item to frontend format
 */
function transformOrderItem(backendItem: any): OrderItem {
  return {
    id: backendItem.id,
    product_id: backendItem.product_id,
    variant_id: backendItem.variant_id,
    product_name: backendItem.product_name,
    variant_name: backendItem.variant_name,
    product_image: backendItem.product_image,
    product_slug: backendItem.product_slug,
    price: backendItem.price,
    quantity: backendItem.quantity,
    color: backendItem.color,
    size: backendItem.size,
    subtotal: backendItem.subtotal,
    sku_snapshot: backendItem.sku_snapshot,
    // Backward compatibility fields
    name: backendItem.product_name,
    image: backendItem.product_image || '/placeholder-product.png',
    variant: backendItem.variant_name,
  };
}

/**
 * Transform backend order to frontend format
 */
function transformOrder(backendOrder: any): Order {
  console.log('Transforming backend order:', backendOrder);
  
  const shippingAddress = backendOrder.shipping_address_details || backendOrder.shipping_address || {};
  
  console.log('Shipping address details:', shippingAddress);
  console.log('User fields from backend:', {
    user_first_name: backendOrder.user_first_name,
    user_last_name: backendOrder.user_last_name,
    user_email: backendOrder.user_email,
    user_phone: backendOrder.user_phone,
    email_for_guest: backendOrder.email_for_guest
  });
  
  return {
    id: backendOrder.order_id || backendOrder.id,
    order_number: backendOrder.order_number,
    status: mapBackendStatus(backendOrder.order_status),
    payment_status: mapBackendPaymentStatus(backendOrder.payment_status),
    created_at: backendOrder.created_at,
    updated_at: backendOrder.updated_at,
    total_amount: backendOrder.total_amount,
    shipping_cost: backendOrder.shipping_cost,
    discount_amount: backendOrder.discount_amount,
    subtotal_amount: backendOrder.subtotal_amount,
    items: backendOrder.items?.map(transformOrderItem) || [],    shipping_address: {
      first_name: shippingAddress.recipient_name?.split(' ')[0] || shippingAddress.first_name || '',
      last_name: shippingAddress.recipient_name?.split(' ').slice(1).join(' ') || shippingAddress.last_name || '',
      street_address: shippingAddress.street_address || shippingAddress.address_line_1 || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state_province || shippingAddress.state || shippingAddress.region || '',
      postal_code: shippingAddress.postal_code || shippingAddress.zip_code || '',
      country: shippingAddress.country_code || shippingAddress.country || '',
      phone: shippingAddress.phone_number || shippingAddress.phone || '',
    },
    shipping_method: backendOrder.shipping_method_details?.name || backendOrder.shipping_method || 'Standard',
    shipping_method_details: backendOrder.shipping_method_details,
    tracking_number: backendOrder.tracking_number,
    estimated_delivery: backendOrder.estimated_delivery,    customer_info: {
      // Use the serialized user fields from backend, then fall back to shipping address
      first_name: backendOrder.user_first_name || shippingAddress.recipient_name?.split(' ')[0] || '',
      last_name: backendOrder.user_last_name || shippingAddress.recipient_name?.split(' ').slice(1).join(' ') || '',
      email: backendOrder.user_email || backendOrder.email_for_guest || '',
      phone: backendOrder.user_phone || shippingAddress.phone_number || '',
    },
  };
}

/**
 * Map backend order status to frontend status
 */
function mapBackendStatus(backendStatus: string): Order['status'] {
  const statusMap: Record<string, Order['status']> = {
    'pending_payment': 'pending',
    'processing': 'processing',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'refunded': 'cancelled',
    'failed': 'cancelled',
  };
  return statusMap[backendStatus] || 'pending';
}

/**
 * Map backend payment status to frontend payment status
 */
function mapBackendPaymentStatus(backendStatus: string): Order['payment_status'] {
  const statusMap: Record<string, Order['payment_status']> = {
    'pending': 'pending',
    'paid': 'paid',
    'failed': 'failed',
    'refunded_partial': 'refunded',
    'refunded_full': 'refunded',
  };
  return statusMap[backendStatus] || 'pending';
}

/**
 * Interface for direct order creation request
 */
export interface CreateDirectOrderRequest {
  product_id: number;
  product_variant_id?: number;
  quantity?: number;
  shipping_address_id: number;
  billing_address_id?: number;
  shipping_method_id: number;
  customer_notes?: string;
  color?: string;
  color_code?: string;
  size?: string;
  product_image?: string; // Add image URL to preserve it
  email_for_guest?: string; // For guest checkout
}

/**
 * Create a direct order from product information without requiring a cart
 * Used for single-item purchases like Buy Now functionality
 */
export async function createDirectOrder(
  orderData: CreateDirectOrderRequest,
  token?: string
): Promise<Order> {
  console.log('=== CREATE DIRECT ORDER API CALLED ===');
  console.log('API URL:', `${API_BASE_URL}/orders/create-direct/`);
  console.log('Order data:', orderData);
  console.log('Token available:', !!token);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/orders/create-direct/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderData),
  });

  console.log('=== CREATE DIRECT ORDER RESPONSE ===');
  console.log('Status:', response.status);
  console.log('Status text:', response.statusText);
  console.log('Response OK:', response.ok);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('=== CREATE DIRECT ORDER ERROR RESPONSE ===');
    console.error('Error data:', errorData);
    throw new Error(errorData.message || 'Failed to create direct order');
  }

  const backendOrder = await response.json();
  console.log('=== CREATE DIRECT ORDER SUCCESS ===');
  console.log('Backend order response:', backendOrder);
  
  const transformedOrder = transformOrder(backendOrder);
  console.log('Transformed direct order:', transformedOrder);
  
  return transformedOrder;
}
