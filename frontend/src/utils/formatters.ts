"use client";

// Utility for consistent currency formatting
export const formatCurrency = (amount: number): string => {
  // Only run the formatter on the client side
  if (typeof window === 'undefined') {
    return `${amount.toFixed(2)} EUR`;
  }

  return new Intl.NumberFormat('AU', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};
