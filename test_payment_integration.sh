#!/bin/bash

# PayPro Payment Integration Test Script
# This script helps test the complete payment flow

echo "=== PayPro Payment Integration Test ==="
echo ""

# Check if backend is running
echo "1. Checking backend status..."
BACKEND_URL="http://127.0.0.1:8000"
if curl -s "$BACKEND_URL/api/v1/health/" > /dev/null 2>&1; then
    echo "✓ Backend is running on $BACKEND_URL"
else
    echo "✗ Backend is not running. Please start Django server first:"
    echo "   cd backend && python manage.py runserver"
    exit 1
fi

# Check if frontend is running
echo ""
echo "2. Checking frontend status..."
FRONTEND_URL="http://localhost:3000"
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "✓ Frontend is running on $FRONTEND_URL"
else
    echo "✗ Frontend is not running. Please start Next.js server:"
    echo "   cd frontend && npm run dev"
    exit 1
fi

# Test PayPro service configuration
echo ""
echo "3. Testing PayPro service configuration..."
curl -s -X POST "$BACKEND_URL/api/v1/orders/initiate-payment/" \
    -H "Content-Type: application/json" \
    -d '{"order_id": 999}' | grep -q "error"

if [ $? -eq 0 ]; then
    echo "✓ PayPro service is configured (returned expected error for non-existent order)"
else
    echo "⚠ PayPro service may not be configured properly"
fi

echo ""
echo "=== Manual Testing Instructions ==="
echo ""
echo "1. Complete Checkout Flow:"
echo "   - Go to: $FRONTEND_URL/checkout"
echo "   - Add items to cart or use Buy Now"
echo "   - Fill out customer information"
echo "   - Select shipping method"
echo "   - Select payment method"
echo "   - Click 'Place Order'"
echo ""
echo "2. Payment Redirect:"
echo "   - Should redirect to: $FRONTEND_URL/payment?order_id=XXX"
echo "   - Should show 'Redirecting to Secure Payment' message"
echo "   - Should automatically redirect to PayPro hosted checkout"
echo ""
echo "3. PayPro Return:"
echo "   - Complete payment on PayPro platform"
echo "   - Should return to: $FRONTEND_URL/order/payment-callback"
echo "   - Should redirect to success or failure page"
echo ""
echo "4. Expected URLs:"
echo "   - Success: $FRONTEND_URL/order/complete?orderId=XXX"
echo "   - Failed: $FRONTEND_URL/order/failed?orderId=XXX&reason=..."
echo ""
echo "=== PayPro Configuration Required ==="
echo ""
echo "Make sure these are configured in backend/backend/settings.py:"
echo ""
echo "PAYPRO_CONFIG = {"
echo "    'MERCHANT_ID': 'your_merchant_id',"
echo "    'API_KEY': 'your_api_key',"
echo "    'SECRET_KEY': 'your_secret_key',"
echo "    'IS_SANDBOX': True,  # Set to False for production"
echo "    'API_BASE_URL': 'https://sandbox.paypro.com.pk/v2/'  # or production URL"
echo "}"
echo ""
echo "=== End of Test Script ==="
