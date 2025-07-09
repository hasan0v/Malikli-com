#!/usr/bin/env python
"""
Example usage of the PayPro payment gateway integration.

This script demonstrates how to:
1. Create an order
2. Initiate a PayPro payment
3. Handle the payment response
"""

import json
import requests
from decimal import Decimal

# Configuration
BASE_URL = "https://malikli1992.com/api/v1"  # Update with your domain
API_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def example_payment_flow():
    """
    Example of complete payment flow using PayPro integration
    """
    
    # Step 1: Create an order (using existing order creation endpoint)
    # This would normally be done by your frontend application
    order_data = {
        "cart_id": "your-cart-uuid-here",
        "shipping_address_id": 1,
        "billing_address_id": 1,
        "shipping_method_id": 1,
        "customer_notes": "Test order for PayPro integration"
    }
    
    print("Creating order...")
    # order_response = requests.post(f"{BASE_URL}/orders/create/", 
    #                               json=order_data, headers=API_HEADERS)
    
    # For this example, assume we have an existing order
    order_id = "550e8400-e29b-41d4-a716-446655440000"  # Example UUID
    
    # Step 2: Initiate PayPro payment
    payment_data = {
        "order_id": order_id
    }
    
    print(f"Initiating PayPro payment for order: {order_id}")
    
    try:
        payment_response = requests.post(
            f"{BASE_URL}/payments/initiate/",
            json=payment_data,
            headers=API_HEADERS
        )
        
        if payment_response.status_code == 200:
            response_data = payment_response.json()
            payment_url = response_data.get("payment_url")
            
            print(f"✅ Payment initiated successfully!")
            print(f"Payment URL: {payment_url}")
            print(f"🔗 Redirect user to: {payment_url}")
            
            return payment_url
            
        else:
            error_data = payment_response.json()
            print(f"❌ Payment initiation failed:")
            print(f"Status Code: {payment_response.status_code}")
            print(f"Error: {error_data.get('error_message', 'Unknown error')}")
            print(f"Error Code: {error_data.get('error_code', 'N/A')}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON response: {e}")


def example_webhook_data():
    """
    Example of what PayPro webhook data might look like
    """
    
    # This is what your webhook endpoint will receive from PayPro
    success_webhook = {
        "status": "success",
        "transaction_id": "txn_123456789",
        "order_id": "550e8400-e29b-41d4-a716-446655440000",
        "amount": "149.99",
        "currency": "EUR",
        "timestamp": "2025-06-21T10:30:00Z"
    }
    
    failed_webhook = {
        "status": "failed",
        "transaction_id": "txn_123456789",
        "order_id": "550e8400-e29b-41d4-a716-446655440000",
        "amount": "149.99",
        "currency": "EUR",
        "error_code": "INSUFFICIENT_FUNDS",
        "error_message": "Insufficient funds in account",
        "timestamp": "2025-06-21T10:30:00Z"
    }
    
    print("Example webhook data for successful payment:")
    print(json.dumps(success_webhook, indent=2))
    
    print("\nExample webhook data for failed payment:")
    print(json.dumps(failed_webhook, indent=2))


if __name__ == "__main__":
    print("=== PayPro Payment Gateway Integration Example ===\n")
    
    print("1. Example Payment Flow:")
    example_payment_flow()
    
    print("\n" + "="*50 + "\n")
    
    print("2. Example Webhook Data:")
    example_webhook_data()
    
    print("\n=== Integration Complete ===")
    print("\nNext steps:")
    print("1. Test with real PayPro credentials")
    print("2. Implement full webhook handling logic")
    print("3. Add frontend payment redirect handling")
    print("4. Test end-to-end payment flow")
