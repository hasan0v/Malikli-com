// Address API functions
import { Address } from '@/types/checkout';

export interface CreateAddressRequest {
  address_type: 'shipping' | 'billing';
  recipient_name: string;
  street_address: string;
  address_line_2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  phone_number?: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
}

export interface AddressResponse {
  id: number;
  user: number;
  address_type: string;
  recipient_name: string;
  street_address: string;
  address_line_2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  phone_number?: string;
  is_default_shipping: boolean;
  is_default_billing: boolean;
  created_at: string;
  updated_at: string;
}

// Save a new address for the authenticated user
export const saveAddress = async (addressData: CreateAddressRequest, token: string): Promise<AddressResponse> => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';
  
  const response = await fetch(`${API_BASE}/auth/addresses/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(addressData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Save API Error Response:', errorText);
    const errorData = (() => {
      try {
        return JSON.parse(errorText);
      } catch {
        return { message: errorText };
      }
    })();
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

// Get all addresses for the authenticated user
export const getUserAddresses = async (token: string): Promise<AddressResponse[]> => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';
  
  const response = await fetch(`${API_BASE}/auth/addresses/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', errorText);
    const errorData = (() => {
      try {
        return JSON.parse(errorText);
      } catch {
        return { message: errorText };
      }
    })();
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Handle both direct array response and paginated response
  if (Array.isArray(data)) {
    return data;
  } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
    // Django REST Framework pagination
    return data.results;
  } else {
    return [];
  }
};

// Update an existing address
export const updateAddress = async (addressId: number, addressData: Partial<CreateAddressRequest>, token: string): Promise<AddressResponse> => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';
  const response = await fetch(`${API_BASE}/auth/addresses/${addressId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(addressData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Delete an address
export const deleteAddress = async (addressId: number, token: string): Promise<void> => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';
  const response = await fetch(`${API_BASE}/auth/addresses/${addressId}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
};

// Save a guest address (no authentication required)
export const saveGuestAddress = async (addressData: CreateAddressRequest): Promise<AddressResponse> => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';
  
  const response = await fetch(`${API_BASE}/auth/guest-address/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(addressData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to save guest address:', errorText);
    throw new Error(`Failed to save guest address: ${errorText}`);
  }

  return response.json();
};
