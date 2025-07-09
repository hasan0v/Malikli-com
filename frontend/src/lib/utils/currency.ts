// Currency utility functions for EUR/BYN display
export interface CurrencyAmount {
  eur: number;
  byn?: number;
  exchangeRate?: number;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: 'EUR' | 'BYN' = 'EUR'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

/**
 * Format dual currency display (EUR with BYN equivalent)
 */
export function formatDualCurrency(eurAmount: number, bynAmount?: number, exchangeRate?: number): string {
  const eurFormatted = formatCurrency(eurAmount, 'EUR');
  
  if (bynAmount) {
    const bynFormatted = formatCurrency(bynAmount, 'BYN');
    return `${eurFormatted} (${bynFormatted})`;
  }
  
  return eurFormatted;
}

/**
 * Parse currency response from backend
 */
export function parseCurrencyResponse(response: any): CurrencyAmount {
  return {
    eur: parseFloat(response.amount || 0),
    byn: response.amount_byn ? parseFloat(response.amount_byn) : undefined,
    exchangeRate: response.exchange_rate ? parseFloat(response.exchange_rate) : undefined,
  };
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: 'EUR' | 'BYN'): string {
  const symbols = {
    EUR: '€',
    BYN: 'Br',
  };
  return symbols[currency] || currency;
}

/**
 * Convert EUR to BYN using provided rate
 */
export function convertEurToByn(eurAmount: number, exchangeRate: number): number {
  return Math.round(eurAmount * exchangeRate * 100) / 100;
}

/**
 * Format amount with currency symbol
 */
export function formatWithSymbol(amount: number, currency: 'EUR' | 'BYN'): string {
  const symbol = getCurrencySymbol(currency);
  return `${amount.toFixed(2)} ${symbol}`;
}
