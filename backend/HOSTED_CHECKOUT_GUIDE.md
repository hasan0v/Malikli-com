# PayPro Hosted Checkout Integration Guide

This guide explains the updated payment flow that redirects users to PayPro's hosted checkout page instead of using local payment forms.

## 🔄 Payment Flow Overview

### Old Flow (Local Payment Form)
1. User clicks "Pay Now"
2. Local payment form is displayed
3. User enters card details on your site
4. Payment data is sent to PayPro
5. User sees result

### New Flow (Hosted Checkout)
1. User clicks "Pay Now"
2. Backend creates PayPro payment token
3. User is redirected to PayPro's secure checkout page
4. User enters card details on PayPro's site
5. PayPro handles payment processing
6. User is redirected back to your site with result
7. Your backend processes the callback and updates order status

## 🚀 Benefits of Hosted Checkout

- **Enhanced Security**: Card details never touch your servers
- **PCI Compliance**: Reduced PCI DSS requirements
- **Professional UI**: PayPro's optimized checkout experience
- **Multiple Payment Methods**: Support for various payment options
- **Mobile Optimized**: Responsive design for all devices
- **Fraud Protection**: PayPro's built-in fraud detection

## 📋 Implementation Steps

### 1. Backend API Endpoints

#### Payment Initiation
```http
POST /api/v1/payments/initiate/
Content-Type: application/json

{
    "order_id": "uuid-here",
    "language": "en"  // Optional
}
```

**Response (Success):**
```json
{
    "success": true,
    "payment_url": "https://checkout.paypro.by/v2/checkout?token=...",
    "redirect_url": "https://checkout.paypro.by/v2/checkout?token=...",
    "token": "payment-token-here",
    "order_id": "uuid-here",
    "amount": "99.99",
    "currency": "EUR",
    "message": "Redirect user to payment_url for hosted checkout"
}
```

#### Payment Status Check
```http
GET /api/v1/payments/status/?token=payment-token&order_id=uuid
```

### 2. Return URL Endpoints

PayPro will redirect users to these endpoints after payment:

- **Success**: `/api/v1/payment/success/`
- **Cancel**: `/api/v1/payment/cancelled/`
- **Failed**: `/api/v1/payment/failed/`
- **Declined**: `/api/v1/payment/declined/`

### 3. Frontend Integration

```javascript
// Initiate payment
async function startPayment(orderId) {
    const response = await fetch('/api/v1/payments/initiate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
    });
    
    const data = await response.json();
    
    if (data.success) {
        // Redirect to PayPro hosted checkout
        window.location.href = data.payment_url;
    } else {
        // Handle error
        console.error('Payment initiation failed:', data.error_message);
    }
}
```

## 🔧 Configuration

### Django Settings
```python
# PayPro Configuration
PAYPRO_BPC_SHOP_ID = 'your_shop_id'
PAYPRO_BPC_SECRET_KEY = 'your_secret_key'
PAYPRO_BPC_CHECKOUT_URL = 'https://checkout.paypro.by'
PAYPRO_BPC_SANDBOX = True  # False for production

# Return URLs
FRONTEND_URL = 'https://yourdomain.com'
BACKEND_URL = 'https://yourdomain.com'
PAYMENT_CURRENCY = 'EUR'
```

### PayPro Return URLs
The service automatically configures these return URLs:
- Success: `{BACKEND_URL}/api/v1/payment/success/`
- Cancel: `{BACKEND_URL}/api/v1/payment/cancelled/`
- Failed: `{BACKEND_URL}/api/v1/payment/failed/`
- Webhook: `{BACKEND_URL}/api/v1/webhooks/paypro/`

## 📱 Frontend Pages Required

### 1. Payment Success Page
Route: `/payment/success`
- Shows success message
- Displays order details
- Redirects to order confirmation

### 2. Payment Cancelled Page
Route: `/payment/cancelled`
- Shows cancellation message
- Offers to retry payment
- Redirects back to order

### 3. Payment Failed Page
Route: `/payment/failed`
- Shows error message
- Explains next steps
- Offers to retry payment

## 🔄 Payment Status Handling

### Automatic Status Updates

The system automatically handles:

1. **Success**: Order status → "processing", Payment status → "paid"
2. **Cancel**: Order status → "cancelled", Stock restored
3. **Failed**: Order status → "failed", Stock restored
4. **Webhook**: Real-time status updates from PayPro

### Manual Status Check

```javascript
const status = await checkPaymentStatus(token, orderId);
console.log('Payment status:', status.status);
```

## 🔒 Security Features

### Built-in Security
- CSRF protection on endpoints
- Token-based payment verification
- Secure return URL handling
- Payment status validation

### PayPro Security
- PCI DSS Level 1 compliance
- SSL/TLS encryption
- Fraud detection
- 3D Secure support

## 🧪 Testing

### Test the Flow

1. **Create Test Order**
```bash
curl -X POST http://localhost:8000/api/v1/orders/create/ \
  -H "Content-Type: application/json" \
  -d '{"items": [...], "customer_email": "test@example.com"}'
```

2. **Initiate Payment**
```bash
curl -X POST http://localhost:8000/api/v1/payments/initiate/ \
  -H "Content-Type: application/json" \
  -d '{"order_id": "order-uuid-here"}'
```

3. **Test PayPro Checkout**
- Use sandbox/test mode
- Use PayPro test card numbers
- Verify all return scenarios

### Test Scenarios

- ✅ Successful payment
- ✅ User cancels payment
- ✅ Payment fails (insufficient funds)
- ✅ Card declined
- ✅ Network timeout
- ✅ Invalid token/order

## 🚨 Error Handling

### Common Error Responses

```json
{
    "success": false,
    "error_code": "VALIDATION_ERROR",
    "error_message": "Missing required fields",
    "error_details": [
        "customer_email: This field is required",
        "amount: Must be greater than 0"
    ]
}
```

### Error Codes
- `VALIDATION_ERROR`: Invalid request data
- `ORDER_NOT_FOUND`: Order doesn't exist
- `PAYMENT_ALREADY_PROCESSED`: Order already paid
- `CONNECTION_ERROR`: PayPro API unavailable
- `TIMEOUT`: Request timeout

## 📊 Monitoring

### Log Messages
The system logs all payment activities:
```
INFO: Payment token created for order 12345, redirecting to PayPro hosted checkout
INFO: Order 12345 payment completed successfully
WARNING: Payment failed for order 12345: card_declined
ERROR: PayPro API connection error: timeout
```

### Key Metrics to Monitor
- Payment initiation success rate
- PayPro redirect success rate
- Payment completion rate
- Return callback processing time
- Error rates by type

## 🔄 Migration from Local Forms

### Step 1: Update Frontend
Replace local payment forms with redirect logic:

```javascript
// Old: Show payment form
showPaymentForm(orderData);

// New: Redirect to hosted checkout
initiatePayment(orderData.order_id);
```

### Step 2: Update Payment Button
```html
<!-- Old -->
<button onclick="submitPaymentForm()">Pay Now</button>

<!-- New -->
<button onclick="initiatePayment('{{ order.order_id }}')">Pay Now</button>
```

### Step 3: Add Return Pages
Create frontend pages for:
- `/payment/success`
- `/payment/cancelled`
- `/payment/failed`

### Step 4: Test Thoroughly
- Test all payment scenarios
- Verify order status updates
- Check stock restoration on cancellation
- Validate webhook processing

## 🎯 Best Practices

### 1. User Experience
- Show loading states during redirects
- Provide clear instructions
- Handle edge cases gracefully
- Offer alternative payment methods

### 2. Error Handling
- Log all payment events
- Provide helpful error messages
- Implement retry mechanisms
- Monitor payment failures

### 3. Security
- Validate all return URLs
- Verify payment tokens
- Implement rate limiting
- Monitor for suspicious activity

### 4. Performance
- Cache payment configurations
- Optimize redirect flows
- Monitor API response times
- Implement proper timeouts

## 📞 Support

### Troubleshooting
1. Check PayPro service configuration
2. Verify return URL setup
3. Test with PayPro sandbox
4. Review application logs
5. Monitor webhook deliveries

### Common Issues
- **Redirect loops**: Check return URL configuration
- **Order not updating**: Verify webhook endpoint
- **Payment stuck**: Check PayPro API status
- **Token errors**: Validate PayPro credentials

### Getting Help
- Review PayPro API documentation
- Check application logs for errors
- Test with PayPro sandbox environment
- Contact PayPro support for API issues
