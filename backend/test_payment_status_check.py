#!/usr/bin/env python
"""
Test script to check and update pending payment statuses manually
Run this from the Django project root: python test_payment_status_check.py
"""

import os
import sys
import django
from datetime import timedelta
from django.utils import timezone

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from orders.models import Order, Payment
from orders.paypro_service import PayProService

def test_pending_payments():
    print("🔍 TESTING PENDING PAYMENT STATUS UPDATES")
    print("=" * 60)
    
    # Find pending orders
    pending_orders = Order.objects.filter(payment_status='pending').order_by('-created_at')
    print(f"📋 Found {pending_orders.count()} pending orders")
    
    if pending_orders.count() == 0:
        print("✅ No pending orders found!")
        return
    
    paypro_service = PayProService()
    
    for i, order in enumerate(pending_orders[:5]):  # Check first 5
        print(f"\n{i+1}. 🔍 Checking Order {order.order_id}")
        print(f"   📅 Created: {order.created_at}")
        print(f"   💰 Amount: {order.total_amount} EUR")
        print(f"   📧 Email: {order.user.email if order.user else order.email_for_guest}")
        
        # Find PayPro payment
        payment = Payment.objects.filter(
            order=order,
            payment_method_type__in=['paypro_hosted', 'paypro_card']
        ).first()
        
        if not payment:
            print("   ❌ No PayPro payment found")
            continue
            
        if not payment.gateway_transaction_id:
            print("   ❌ No payment token found")
            continue
            
        token = payment.gateway_transaction_id
        print(f"   🎫 Token: {token[:12]}...")
        
        # Check status with PayPro
        try:
            success, status_data = paypro_service.get_payment_status(token)
            
            if success:
                checkout_data = status_data.get('checkout', {})
                transaction_data = status_data.get('transaction', {})
                
                payment_status = (
                    transaction_data.get('status') or 
                    checkout_data.get('status') or 
                    'unknown'
                )
                
                print(f"   📊 PayPro Status: {payment_status}")
                
                # Show what we would do
                if payment_status in ['completed', 'succeeded', 'success', 'paid', 'successful']:
                    print("   ✅ Would update to: PAID")
                elif payment_status in ['failed', 'declined', 'error']:
                    print("   ❌ Would update to: FAILED")
                elif payment_status in ['cancelled', 'canceled']:
                    print("   🚫 Would update to: CANCELLED")
                else:
                    print("   ⏳ Would remain: PENDING")
                    
            else:
                error_code = status_data.get('error_code', 'unknown')
                error_message = status_data.get('error_message', 'unknown error')
                print(f"   ❌ PayPro Error: {error_code} - {error_message}")
                
        except Exception as e:
            print(f"   ❌ Exception: {e}")
    
    print(f"\n{'='*60}")
    print("🔧 To actually update payments, run:")
    print("   python manage.py check_pending_payments")
    print("🧪 To see what would be updated without changes:")
    print("   python manage.py check_pending_payments --dry-run")

if __name__ == '__main__':
    test_pending_payments()
