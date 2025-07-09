#!/usr/bin/env python
"""
Quick verification script to check payment statuses
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from orders.models import Order

def check_payment_statuses():
    print("📊 PAYMENT STATUS SUMMARY")
    print("=" * 40)
    
    total_orders = Order.objects.count()
    pending_orders = Order.objects.filter(payment_status='pending').count()
    paid_orders = Order.objects.filter(payment_status='paid').count()
    failed_orders = Order.objects.filter(payment_status='failed').count()
    cancelled_orders = Order.objects.filter(payment_status='cancelled').count()
    
    print(f"📋 Total Orders: {total_orders}")
    print(f"⏳ Pending: {pending_orders}")
    print(f"✅ Paid: {paid_orders}")
    print(f"❌ Failed: {failed_orders}")
    print(f"🚫 Cancelled: {cancelled_orders}")
    
    if pending_orders > 0:
        print(f"\n🔍 Recent pending orders:")
        for order in Order.objects.filter(payment_status='pending').order_by('-created_at')[:3]:
            print(f"   - {order.order_id} ({order.created_at.strftime('%Y-%m-%d %H:%M')})")
    
    if paid_orders > 0:
        print(f"\n✅ Recent paid orders:")
        for order in Order.objects.filter(payment_status='paid').order_by('-created_at')[:3]:
            print(f"   - {order.order_id} ({order.created_at.strftime('%Y-%m-%d %H:%M')})")

if __name__ == '__main__':
    check_payment_statuses()
