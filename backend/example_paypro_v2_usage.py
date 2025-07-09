"""
PayPro BPC API v2 Integration - Updated Example Usage

This file demonstrates how to use the updated PayPro BPC integration
that follows the official API v2 documentation.

New features in this version:
- Full API v2 compliance with required headers
- Improved error handling and validation
- Support for recurring and one-click payments
- Enhanced webhook processing
- Better status checking
"""

import json
import uuid
from orders.paypro_service import PayProService


def example_basic_payment_flow():
    """
    Example of basic payment flow using PayPro BPC API v2
    """
    print("=== Basic Payment Flow Example ===")
    
    # Initialize PayPro service
    paypro_service = PayProService()
    
    # Example order data
    order_data = {
        'order_id': str(uuid.uuid4()),
        'amount': '99.99',
        'currency': 'EUR',
        'customer_email': 'customer@example.com',
        'customer_first_name': 'John',
        'customer_last_name': 'Smith',
        'description': 'Premium product purchase',
        'language': 'en',  # Optional: en, ru, be, etc.
        'receipt_text': [    # Optional: receipt text
            'Thank you for your purchase!',
            'Contact us at support@example.com for any questions.'
        ]
    }
    
    print(f"Creating payment token for order: {order_data['order_id']}")
    
    # Step 1: Create payment token
    success, response = paypro_service.create_payment_token(order_data)
    
    if success:
        print(f"✅ Payment token created successfully!")
        print(f"   Token: {response['token']}")
        print(f"   Payment URL: {response['payment_url']}")
        print(f"   Redirect URL: {response['redirect_url']}")
        
        # Step 2: Redirect customer to payment URL
        print(f"\n🔗 Customer should be redirected to: {response['payment_url']}")
        
        # Step 3: Check payment status (usually done after customer returns)
        token = response['token']
        return check_payment_status_example(token)
        
    else:
        print(f"❌ Payment token creation failed!")
        print(f"   Error Code: {response.get('error_code')}")
        print(f"   Error Message: {response.get('error_message')}")
        if response.get('error_details'):
            print(f"   Details: {response['error_details']}")
        return False


def check_payment_status_example(token):
    """
    Example of checking payment status
    """
    print(f"\n=== Payment Status Check Example ===")
    
    paypro_service = PayProService()
    
    print(f"Checking status for token: {token}")
    
    success, response = paypro_service.get_payment_status(token)
    
    if success:
        print(f"✅ Payment status retrieved successfully!")
        
        # Parse response data
        checkout_data = response.get('checkout', {})
        transaction_data = response.get('transaction', {})
        
        status = (transaction_data.get('status') or 
                 checkout_data.get('status') or 
                 'unknown')
        
        tracking_id = (checkout_data.get('order', {}).get('tracking_id') or 
                      transaction_data.get('tracking_id'))
        
        transaction_id = (transaction_data.get('id') or 
                         checkout_data.get('token'))
        
        print(f"   Status: {status}")
        print(f"   Transaction ID: {transaction_id}")
        print(f"   Order ID: {tracking_id}")
        
        # Handle different statuses
        if status in ['completed', 'succeeded', 'success', 'paid']:
            print(f"🎉 Payment completed successfully!")
            return True
        elif status in ['failed', 'declined', 'error']:
            print(f"💔 Payment failed!")
            return False
        elif status in ['pending', 'processing']:
            print(f"⏳ Payment is pending...")
            return None
        else:
            print(f"❓ Unknown payment status: {status}")
            return None
            
    else:
        print(f"❌ Failed to check payment status!")
        print(f"   Error: {response.get('error_message')}")
        return False


def example_recurring_payment():
    """
    Example of setting up recurring payments
    """
    print(f"\n=== Recurring Payment Setup Example ===")
    
    paypro_service = PayProService()
    
    order_data = {
        'order_id': str(uuid.uuid4()),
        'amount': '29.99',
        'currency': 'EUR',
        'customer_email': 'subscriber@example.com',
        'customer_first_name': 'Jane',
        'customer_last_name': 'Doe',
        'description': 'Monthly subscription setup'
    }
    
    print(f"Setting up recurring payment for subscription")
    
    success, response = paypro_service.create_recurring_token(order_data)
    
    if success:
        print(f"✅ Recurring payment token created!")
        print(f"   Token: {response['token']}")
        print(f"   Setup URL: {response['payment_url']}")
        return response['token']
    else:
        print(f"❌ Recurring payment setup failed!")
        print(f"   Error: {response.get('error_message')}")
        return None


def example_oneclick_payment():
    """
    Example of one-click payment with saved card
    """
    print(f"\n=== One-Click Payment Example ===")
    
    paypro_service = PayProService()
    
    # Assume we have a saved card token from previous transaction
    saved_card_token = "card_token_from_previous_payment"
    
    order_data = {
        'order_id': str(uuid.uuid4()),
        'amount': '15.50',
        'currency': 'EUR',
        'customer_email': 'returning@example.com',
        'customer_first_name': 'Mike',
        'customer_last_name': 'Johnson',
        'description': 'Quick purchase with saved card'
    }
    
    print(f"Creating one-click payment with saved card")
    
    success, response = paypro_service.create_oneclick_token(order_data, saved_card_token)
    
    if success:
        print(f"✅ One-click payment token created!")
        print(f"   Token: {response['token']}")
        print(f"   Payment URL: {response['payment_url']}")
        return response['token']
    else:
        print(f"❌ One-click payment creation failed!")
        print(f"   Error: {response.get('error_message')}")
        return None


def example_webhook_handling():
    """
    Example of webhook data processing
    """
    print(f"\n=== Webhook Handling Example ===")
    
    # Example webhook data that PayPro might send
    webhook_data = {
        "checkout": {
            "token": "3241e439f8c87d941d92621a4bdc030d4c9a69c67f3b0cfe12de4a13cc34aa51",
            "order": {
                "amount": 2599,
                "currency": "EUR",
                "description": "Payment for Order #12345",
                "tracking_id": "12345"
            },
            "status": "completed"
        },
        "transaction": {
            "id": "txn_abc123def456",
            "status": "completed",
            "tracking_id": "12345"
        }
    }
    
    print(f"Processing webhook notification...")
    print(f"Webhook data: {json.dumps(webhook_data, indent=2)}")
    
    paypro_service = PayProService()
    success, message = paypro_service.handle_webhook(webhook_data)
    
    if success:
        print(f"✅ Webhook processed successfully!")
        print(f"   Message: {message}")
    else:
        print(f"❌ Webhook processing failed!")
        print(f"   Message: {message}")


def example_error_handling():
    """
    Example of error handling scenarios
    """
    print(f"\n=== Error Handling Examples ===")
    
    paypro_service = PayProService()
    
    # Test 1: Missing required fields
    print("Test 1: Missing required fields")
    invalid_data = {
        'order_id': str(uuid.uuid4()),
        # Missing amount, currency, customer_email
    }
    
    success, response = paypro_service.create_payment_token(invalid_data)
    print(f"   Result: {'Success' if success else 'Failed as expected'}")
    if not success:
        print(f"   Error: {response.get('error_message')}")
    
    # Test 2: Invalid amount
    print("\nTest 2: Invalid amount format")
    invalid_amount_data = {
        'order_id': str(uuid.uuid4()),
        'amount': 'not_a_number',
        'currency': 'EUR',
        'customer_email': 'test@example.com'
    }
    
    try:
        success, response = paypro_service.create_payment_token(invalid_amount_data)
        print(f"   Result: {'Success' if success else 'Failed as expected'}")
        if not success:
            print(f"   Error: {response.get('error_message')}")
    except Exception as e:
        print(f"   Caught exception as expected: {str(e)}")
    
    # Test 3: Invalid email
    print("\nTest 3: Invalid email format")
    invalid_email_data = {
        'order_id': str(uuid.uuid4()),
        'amount': '10.00',
        'currency': 'EUR',
        'customer_email': 'invalid_email'
    }
    
    try:
        success, response = paypro_service.create_payment_token(invalid_email_data)
        print(f"   Result: {'Success' if success else 'Failed as expected'}")
        if not success:
            print(f"   Error: {response.get('error_message')}")
    except Exception as e:
        print(f"   Caught exception as expected: {str(e)}")


def main():
    """
    Run all examples
    """
    print("🚀 PayPro BPC API v2 Integration Examples")
    print("=" * 60)
    
    # Basic payment flow
    payment_success = example_basic_payment_flow()
    
    # Recurring payment setup
    example_recurring_payment()
    
    # One-click payment (commented out as it needs a real card token)
    # example_oneclick_payment()
    
    # Webhook handling
    example_webhook_handling()
    
    # Error handling scenarios
    example_error_handling()
    
    print("\n" + "=" * 60)
    print("✨ Examples completed!")
    
    if payment_success:
        print("💡 The basic payment flow worked correctly.")
    else:
        print("⚠️  Check your PayPro configuration if payments are failing.")


if __name__ == '__main__':
    main()
