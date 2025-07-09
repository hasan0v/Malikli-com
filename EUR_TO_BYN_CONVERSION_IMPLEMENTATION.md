# EUR to BYN Currency Conversion Implementation

## Overview
Implemented comprehensive currency conversion from EUR to BYN throughout the payment system, as PayPro BPC only accepts BYN currency.

## Backend Changes

### 1. Currency Conversion Service (`backend/orders/currency_service.py`)
**NEW FILE** - Comprehensive currency conversion service:

- **Exchange Rate APIs**: Fetches real-time EUR to BYN rates from multiple sources:
  - exchangerate-api.com (requires API key)
  - fixer.io (backup)
  - exchangerate.host (free, no API key required)

- **Caching**: Redis/database caching of exchange rates (1 hour default)

- **Fallback Rate**: Configurable fallback rate (default: 3.2 BYN per EUR)

- **Methods**:
  - `get_eur_to_byn_rate()` - Get current exchange rate
  - `convert_eur_to_byn(eur_amount)` - Convert EUR to BYN
  - `convert_byn_to_eur(byn_amount)` - Convert BYN to EUR
  - `get_display_amounts(eur_amount)` - Get both amounts + rate

### 2. PayPro Service Updates (`backend/orders/paypro_service.py`)
**MODIFIED** - Enhanced for currency conversion:

- **Auto-conversion**: Automatically converts EUR amounts to BYN for PayPro
- **Dual amounts**: Tracks both original EUR and payment BYN amounts
- **Exchange rate logging**: Records exchange rates used
- **Response data**: Includes currency conversion information

**Key Changes**:
```python
# Before: Fixed currency
"currency": order_data['currency'].upper()

# After: Dynamic conversion
if original_currency == 'EUR':
    byn_amount = currency_converter.convert_eur_to_byn(original_amount)
    payment_currency = 'BYN'
```

### 3. Settings Configuration (`backend/backend/settings.py`)
**MODIFIED** - Added currency configuration:

```python
# Payment Configuration  
PAYMENT_CURRENCY = 'BYN'  # Changed from EUR

# Currency Conversion Configuration
EUR_TO_BYN_FALLBACK_RATE = 3.2
EXCHANGE_RATE_API_KEY = None  # Optional
CURRENCY_CACHE_TIMEOUT = 3600  # 1 hour
```

### 4. Order Views Updates (`backend/orders/views.py`)
**MODIFIED** - Enhanced payment initiation:

- **Currency conversion**: Calculates EUR to BYN conversion before PayPro call
- **Payment records**: Stores both EUR and BYN amounts in payment details
- **Response data**: Returns conversion information to frontend

**Response Format**:
```json
{
  "amount": "25.00",           // Original EUR amount
  "amount_byn": "80.00",       // BYN payment amount  
  "currency": "EUR",           // Original currency
  "payment_currency": "BYN",   // PayPro payment currency
  "exchange_rate": "3.20"      // Rate used for conversion
}
```

## Frontend Changes

### 1. Currency Utility (`frontend/src/lib/utils/currency.ts`)
**NEW FILE** - Currency formatting and conversion utilities:

- **Formatting**: `formatCurrency()`, `formatDualCurrency()`
- **Conversion**: `convertEurToByn()`, `parseCurrencyResponse()`
- **Display**: Dual currency display (EUR with BYN equivalent)

### 2. Translation Updates (`frontend/src/locales/en.json`)
**MODIFIED** - Updated payment button text:

```json
"placeOrder": "Proceed to Payment - {{amount}} EUR ({{amount_byn}} BYN)"
```

## Flow Overview

### 1. Order Creation
```
User sees prices in EUR → Order created with EUR amounts → Stored in database as EUR
```

### 2. Payment Initiation
```
Frontend calls /payments/initiate/ 
→ Backend converts EUR to BYN using live rate
→ PayPro receives BYN amount
→ Response includes both EUR and BYN amounts
```

### 3. PayPro Payment
```
User pays in BYN on PayPro platform
→ PayPro processes BYN payment
→ Callback includes BYN transaction details
```

### 4. Payment Completion
```
Payment record stores:
- Original EUR amount
- Actual BYN payment amount  
- Exchange rate used
- Conversion timestamp
```

## Configuration

### Required Environment Variables
```bash
# Exchange Rate API (optional, improves accuracy)
EXCHANGE_RATE_API_KEY=your_api_key_here

# Fallback rate (used if API fails)
EUR_TO_BYN_FALLBACK_RATE=3.2

# Cache timeout for exchange rates (seconds)
CURRENCY_CACHE_TIMEOUT=3600
```

### PayPro BPC Configuration
```python
# Ensure PayPro is configured for BYN
PAYPRO_BPC_SHOP_ID = "your_shop_id"
PAYPRO_BPC_SECRET_KEY = "your_secret_key"  
PAYMENT_CURRENCY = "BYN"
```

## Testing

### 1. Exchange Rate Fetching
```python
from orders.currency_service import currency_converter
rate = currency_converter.get_eur_to_byn_rate()
byn_amount = currency_converter.convert_eur_to_byn(Decimal('25.00'))
```

### 2. Payment Flow
1. Create order with EUR amounts
2. Initiate payment → Check conversion happens
3. Verify PayPro receives BYN amounts
4. Check payment record has both currencies

### 3. API Response Testing
```bash
curl -X POST /api/v1/payments/initiate/ \
  -d '{"order_id": "test-order"}' \
  -H "Content-Type: application/json"

# Should return:
# {
#   "amount": "25.00",
#   "amount_byn": "80.00", 
#   "exchange_rate": "3.20"
# }
```

## Error Handling

### 1. Exchange Rate API Failures
- Falls back to configured rate
- Logs warning messages
- Continues payment processing

### 2. Invalid Currency Data
- Validates EUR amounts before conversion
- Returns appropriate error messages
- Prevents payment processing with invalid data

### 3. Cache Failures
- Degrades to direct API calls
- Uses fallback rate if all APIs fail
- Logs errors for monitoring

## Benefits

1. **Compliance**: PayPro BPC requirement satisfied
2. **Transparency**: Users see both EUR and BYN amounts
3. **Accuracy**: Real-time exchange rates
4. **Reliability**: Multiple API sources + fallback
5. **Performance**: Cached exchange rates
6. **Audit Trail**: Complete currency conversion history

## Monitoring

### Key Metrics to Monitor
- Exchange rate API success/failure rates
- Currency conversion accuracy
- Cache hit/miss ratios
- Payment completion rates

### Log Messages to Watch
```
"Using cached EUR to BYN rate: 3.20"
"Fetched and cached EUR to BYN rate: 3.21"  
"Using fallback EUR to BYN rate: 3.20"
"Converting 25.00 EUR to 80.00 BYN (rate: 3.20)"
```

## Next Steps

1. **Monitor exchange rates** and adjust fallback rate if needed
2. **Set up API key** for exchangerate-api.com for better reliability
3. **Create admin interface** for currency rate monitoring
4. **Add currency conversion** to order history displays
5. **Implement rate alerts** for significant rate changes
