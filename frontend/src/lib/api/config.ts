// Centralized API configuration
// This ensures all API calls use the correct base URL

const getApiBaseUrl = (): string => {
  // In production, use the environment variable or fallback to the production URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (apiUrl) {
    return apiUrl;
  }
  
  // Fallback logic
  if (typeof window !== 'undefined') {
    // Client-side: use the current domain
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api/v1';
    } else {
      return `${protocol}//${hostname}/api/v1`;
    }
  }
  
  // Server-side fallback (should not happen in production)
  return 'https://malikli1992.com/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function for making API requests
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
};

export default API_BASE_URL;
