import { redirect } from 'next/navigation';

// Redirect /shipping-calculator to /ems-shipping for SEO and user convenience
export default function ShippingCalculatorRedirect() {
  redirect('/ems-shipping');
}

export const metadata = {
  title: 'Shipping Calculator - Redirecting...',
  description: 'Redirecting to EMS International Shipping Calculator',
};
