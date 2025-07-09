// Payment and Order Processing API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';

export interface CreateOrderRequest {
  items: Array<{
    product_id: number;
    variant_id?: number;
    quantity: number;
    price: number;
  }>;
  shipping_address: {
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  customer_info: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  shipping_method: string;
  payment_method: string;
  discount_amount?: number;
}

export interface CreateOrderResponse {
  order_id: number;
  order_number: string;
  uid: string;
  payment_url: string;
  total_amount: string;
  status: 'pending';
  success_url: string;
  failure_url: string;
}

export interface PaymentCallbackRequest {
  status: 'success' | 'failed';
  token?: string;
  uid: string;
}

export interface PaymentCallbackResponse {
  success: boolean;
  orderId: number;
  order_number: string;
  status: string;
  payment_status: string;
  message: string;
  reason?: string;
}

/**
 * Create a new order and get payment URL
 */
export async function createOrder(orderData: CreateOrderRequest, token: string): Promise<CreateOrderResponse> {
  const response = await fetch(`${API_BASE_URL}/orders/create/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please log in again');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create order: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Initiate PayPro payment for an order (redirects to hosted checkout)
 */
export async function initiatePayProPayment(orderId: string | number, token?: string): Promise<{ payment_url: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  console.log('Initiating PayPro payment for order:', orderId);
  const response = await fetch(`${API_BASE_URL}/payments/initiate/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ order_id: String(orderId) }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please log in again');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to initiate payment: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Process payment callback from banking platform
 */
export async function processPaymentCallback(callbackData: PaymentCallbackRequest): Promise<PaymentCallbackResponse> {
  const response = await fetch(`${API_BASE_URL}/orders/payment-callback/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(callbackData),
  });

  if (!response.ok) {
    // Log the response for debugging
    const responseText = await response.text();
    console.error('Payment callback failed:', {
      status: response.status,
      statusText: response.statusText,
      response: responseText
    });
    
    let errorMessage = `Payment callback failed: ${response.statusText}`;
    
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Response is not JSON, use default message
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Get order by UID (used for payment callback processing)
 */
export async function getOrderByUID(uid: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/orders/by-uid/${uid}/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Order not found');
    }
    throw new Error(`Failed to fetch order: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate suggested URLs for payment platform redirection
 */
export function generatePaymentRedirectUrls(baseUrl: string = 'https://malikli1992.com') {
  return {
    success_url: `${baseUrl}/order/payment-callback?status=success&token={token}&uid={uid}`,
    failure_url: `${baseUrl}/order/payment-callback?status=failed&token={token}&uid={uid}`,
  };
}

/**
 * Validate payment callback parameters
 */
export function validateCallbackParams(searchParams: URLSearchParams): {
  isValid: boolean;
  status?: 'success' | 'failed';
  token?: string;
  uid?: string;
  error?: string;
} {
  const status = searchParams.get('status');
  const token = searchParams.get('token');
  const uid = searchParams.get('uid');

  if (!status) {
    return { isValid: false, error: 'Missing status parameter' };
  }

  if (status !== 'success' && status !== 'failed') {
    return { isValid: false, error: 'Invalid status parameter' };
  }

  if (!uid) {
    return { isValid: false, error: 'Missing uid parameter' };
  }

  return {
    isValid: true,
    status: status as 'success' | 'failed',
    token: token || undefined,
    uid,
  };
}

export default {
  createOrder,
  initiatePayProPayment,
  processPaymentCallback,
  getOrderByUID,
  generatePaymentRedirectUrls,
  validateCallbackParams,
};
