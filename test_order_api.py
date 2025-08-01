#!/usr/bin/env python3
"""
Test script to check order creation API directly
"""
import requests
import json

# Test the shipping methods endpoint first
print("=== Testing Shipping Methods API ===")
try:
    response = requests.get("http://127.0.0.1:8000/api/v1/shipping-methods/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        shipping_methods = response.json()
        print(f"Found {len(shipping_methods)} shipping methods")
        if shipping_methods:
            print(f"First shipping method: {shipping_methods[0]}")
    print()
except Exception as e:
    print(f"Error: {e}")
    print()

# Test direct order creation
print("=== Testing Direct Order Creation API ===")
direct_order_data = {
    "product_id": 1,  # Assuming product with ID 1 exists
    "quantity": 1,
    "shipping_address_id": 1,  # Assuming address with ID 1 exists
    "billing_address_id": 1,
    "shipping_method_id": 1,
    "customer_notes": "Test order",
    "email_for_guest": "test@example.com"
}

try:
    response = requests.post(
        "http://127.0.0.1:8000/api/v1/orders/create-direct/",
        json=direct_order_data,
        headers={"Content-Type": "application/json"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    print(f"Response text: {response.text}")
    
    if response.status_code == 201:
        order_data = response.json()
        print(f"\n=== Order created successfully ===")
        print(f"Order ID: {order_data.get('order_id')}")
        print(f"Order Number: {order_data.get('order_number')}")
        print(f"Keys in response: {list(order_data.keys())}")
    else:
        print(f"\n=== Order creation failed ===")
        try:
            error_data = response.json()
            print(f"Error details: {error_data}")
        except:
            print("Could not parse error response")
            
except Exception as e:
    print(f"Error: {e}")
