// Currency conversion API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://malikli1992.com/api/v1';

export interface ExchangeRateResponse {
  rate: number;
  source: 'api' | 'cache' | 'fallback';
  cached_at?: string;
  next_update?: string;
}

export interface CurrencyConversionResponse {
  eur_amount: number;
  byn_amount: number;
  exchange_rate: number;
  source: 'api' | 'cache' | 'fallback';
}

/**
 * Get current EUR to BYN exchange rate
 */
export async function getEurToBynRate(): Promise<ExchangeRateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/currency/rate/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    // Return fallback rate
    return {
      rate: 3.8, // Default fallback rate
      source: 'fallback',
    };
  }
}

/**
 * Convert EUR amount to BYN
 */
export async function convertEurToByn(eurAmount: number): Promise<CurrencyConversionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/currency/convert/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eur_amount: eurAmount,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to convert currency: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error converting currency:', error);
    // Fallback conversion
    const fallbackRate = 3.8;
    return {
      eur_amount: eurAmount,
      byn_amount: Math.round(eurAmount * fallbackRate * 100) / 100,
      exchange_rate: fallbackRate,
      source: 'fallback',
    };
  }
}

export default {
  getEurToBynRate,
  convertEurToByn,
};
