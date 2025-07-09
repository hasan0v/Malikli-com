// PaymentIntegration.js - Complete React component for PayPro frontend integration

import React, { useState, useEffect } from 'react';

const PaymentIntegration = ({ orderId }) => {
  const [sessionData, setSessionData] = useState(null);
  const [cardDetails, setCardDetails] = useState({
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    cardholder_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Create payment session when component mounts
  useEffect(() => {
    const createPaymentSession = async () => {
      try {
        const response = await fetch('/api/v1/payments/session/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ order_id: orderId })
        });

        if (response.ok) {
          const data = await response.json();
          setSessionData(data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to create payment session');
        }
      } catch (err) {
        setError('Network error: Unable to create payment session');
      }
    };

    if (orderId) {
      createPaymentSession();
    }
  }, [orderId]);

  // Handle payment form submission
  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const paymentData = {
        session_id: sessionData.session_id,
        order_id: sessionData.order_id,
        payment_method: 'credit_card',
        amount: sessionData.amount,
        currency: sessionData.currency,
        ...cardDetails
      };

      const response = await fetch('/api/v1/payments/process/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (result.success) {        setSuccess(true);
        // Redirect to success page after a brief delay
        setTimeout(() => {
          window.location.href = `/checkout/success?order_id=${orderId}`;
        }, 2000);
      } else {
        setError(result.error_message || 'Payment failed');
      }
    } catch (err) {
      setError('Network error: Payment could not be processed');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes with basic validation
  const handleInputChange = (field, value) => {
    setCardDetails(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
  };

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  if (!sessionData) {
    return (
      <div className="payment-loading">
        <p>Loading payment form...</p>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (success) {
    return (
      <div className="payment-success">
        <h2>✅ Payment Successful!</h2>
        <p>Your payment of {sessionData.amount} {sessionData.currency} has been processed.</p>
        <p>Redirecting to order confirmation...</p>
      </div>
    );
  }

  return (
    <div className="payment-form-container">
      <h2>Complete Your Payment</h2>
      <div className="order-summary">
        <p><strong>Order:</strong> {sessionData.order_id}</p>
        <p><strong>Amount:</strong> {sessionData.amount} {sessionData.currency}</p>
      </div>

      <form onSubmit={handlePayment} className="payment-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="card_number">Card Number</label>
          <input
            type="text"
            id="card_number"
            placeholder="1234 5678 9012 3456"
            value={formatCardNumber(cardDetails.card_number)}
            onChange={(e) => handleInputChange('card_number', e.target.value.replace(/\s/g, ''))}
            maxLength="19"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="expiry_month">Month</label>
            <select
              id="expiry_month"
              value={cardDetails.expiry_month}
              onChange={(e) => handleInputChange('expiry_month', e.target.value)}
              required
            >
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month.toString().padStart(2, '0')}>
                  {month.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="expiry_year">Year</label>
            <select
              id="expiry_year"
              value={cardDetails.expiry_year}
              onChange={(e) => handleInputChange('expiry_year', e.target.value)}
              required
            >
              <option value="">YY</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                <option key={year} value={year.toString().slice(-2)}>
                  {year.toString().slice(-2)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="cvv">CVV</label>
            <input
              type="text"
              id="cvv"
              placeholder="123"
              value={cardDetails.cvv}
              onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, ''))}
              maxLength="4"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="cardholder_name">Cardholder Name</label>
          <input
            type="text"
            id="cardholder_name"
            placeholder="John Doe"
            value={cardDetails.cardholder_name}
            onChange={(e) => handleInputChange('cardholder_name', e.target.value)}
            required
          />
        </div>

        <button 
          type="submit" 
          className="pay-button"
          disabled={loading}
        >
          {loading ? 'Processing...' : `Pay ${sessionData.amount} ${sessionData.currency}`}
        </button>
      </form>

      <div className="security-info">
        <p>🔒 Your payment information is secure and encrypted</p>
      </div>
    </div>
  );
};

export default PaymentIntegration;

// CSS Styles (add to your stylesheet)
const styles = `
.payment-form-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
}

.order-summary {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.payment-form {
  space-y: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-row {
  display: flex;
  gap: 10px;
}

.form-row .form-group {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

input, select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

input:focus, select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.pay-button {
  width: 100%;
  padding: 15px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pay-button:hover:not(:disabled) {
  background: #218838;
}

.pay-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.payment-success {
  text-align: center;
  padding: 30px;
  background: #d4edda;
  border-radius: 8px;
  color: #155724;
}

.security-info {
  text-align: center;
  margin-top: 15px;
  color: #6c757d;
  font-size: 14px;
}
`;

// Usage example in your checkout page:
/*
const CheckoutPage = () => {
  const { orderId } = useParams(); // Get order ID from URL

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      <PaymentIntegration orderId={orderId} />
    </div>
  );
};
*/
