#!/usr/bin/env python3
"""
Inventory and Payment Monitoring Dashboard
Shows current status of inventory reservations and pending payments
"""

import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Setup Django environment
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(os.path.dirname(current_dir), 'backend')
sys.path.append(backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db.models import Sum, Count, Q
from orders.models import Order, Payment
from carts.models import CartItem
from products.models import ProductVariant


def print_header(title):
    """Print formatted header"""
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print(f"{'='*60}")


def print_section(title):
    """Print formatted section"""
    print(f"\n📊 {title}")
    print("-" * 40)


def format_timedelta(td):
    """Format timedelta for display"""
    if td.days > 0:
        return f"{td.days}d {td.seconds//3600}h"
    elif td.seconds >= 3600:
        return f"{td.seconds//3600}h {(td.seconds%3600)//60}m"
    else:
        return f"{td.seconds//60}m {td.seconds%60}s"


def get_inventory_status():
    """Get current inventory status"""
    print_section("Inventory Reservations")
    
    now = timezone.now()
    
    # Total reserved quantity across all product variants
    total_reserved = ProductVariant.objects.aggregate(
        total=Sum('reserved_quantity')
    )['total'] or 0
    
    # Active reservations from InventoryReservation model
    from orders.models import InventoryReservation
    active_reservations = InventoryReservation.objects.filter(
        is_active=True,
        expires_at__gte=now
    ).select_related('product_variant', 'drop_product')
    
    expired_reservations = InventoryReservation.objects.filter(
        is_active=True,
        expires_at__lt=now
    ).select_related('product_variant', 'drop_product')
    
    active_count = active_reservations.count()
    expired_count = expired_reservations.count()
    
    active_quantity = sum(res.quantity for res in active_reservations)
    expired_quantity = sum(res.quantity for res in expired_reservations)
    
    print(f"📦 Total Reserved Quantity (ProductVariants): {total_reserved}")
    print(f"✅ Active Reservations: {active_count} reservations ({active_quantity} units)")
    print(f"⚠️  Expired Reservations: {expired_count} reservations ({expired_quantity} units)")
    
    if expired_count > 0:
        print(f"\n🚨 ATTENTION: {expired_count} expired reservations need cleanup!")
        print("   Run: python manage.py cleanup_expired_reservations")
    
    # Show oldest expired reservations
    if expired_reservations.exists():
        print(f"\n🕐 Oldest Expired Reservations:")
        for res in expired_reservations.order_by('expires_at')[:5]:
            age = now - res.expires_at
            product_name = str(res.product_variant) if res.product_variant else str(res.drop_product)
            print(f"   • {product_name}: {res.quantity} units (expired {format_timedelta(age)} ago)")
    
    # Check for inconsistencies between reservation models
    total_reservation_quantity = sum(res.quantity for res in active_reservations if res.product_variant)
    if abs(total_reserved - total_reservation_quantity) > 0:
        print(f"\n⚠️  INCONSISTENCY DETECTED:")
        print(f"   ProductVariant reserved_quantity total: {total_reserved}")
        print(f"   InventoryReservation active total: {total_reservation_quantity}")
        print(f"   Difference: {abs(total_reserved - total_reservation_quantity)}")
        print("   Consider running cleanup to fix inconsistencies")


def get_payment_status():
    """Get current payment status"""
    print_section("Payment Status Overview")
    
    now = timezone.now()
    
    # Recent orders (last 24h)
    recent_cutoff = now - timedelta(hours=24)
    recent_orders = Order.objects.filter(created_at__gte=recent_cutoff)
    
    # Payment status breakdown
    statuses = recent_orders.values('payment_status').annotate(
        count=Count('id')
    ).order_by('-count')
    
    print(f"📅 Orders in last 24 hours: {recent_orders.count()}")
    for status in statuses:
        emoji = {
            'paid': '✅',
            'pending': '⏳',
            'failed': '❌',
            'cancelled': '🚫',
            'timeout': '⏰'
        }.get(status['payment_status'], '❓')
        print(f"   {emoji} {status['payment_status']}: {status['count']}")
    
    # Pending payments by age
    pending_orders = Order.objects.filter(payment_status='pending')
    
    if pending_orders.exists():
        print(f"\n⏳ Pending Payments: {pending_orders.count()}")
        
        # Group by age
        age_groups = {
            '< 1h': 0,
            '1-6h': 0,
            '6-24h': 0,
            '> 24h': 0
        }
        
        old_orders = []
        
        for order in pending_orders:
            age = now - order.created_at
            hours = age.total_seconds() / 3600
            
            if hours < 1:
                age_groups['< 1h'] += 1
            elif hours < 6:
                age_groups['1-6h'] += 1
            elif hours < 24:
                age_groups['6-24h'] += 1
            else:
                age_groups['> 24h'] += 1
                old_orders.append((order, age))
        
        for age_group, count in age_groups.items():
            if count > 0:
                emoji = '🔴' if '24h' in age_group else '🟡' if '6-24h' in age_group else '🟢'
                print(f"   {emoji} {age_group}: {count} orders")
        
        # Show oldest pending orders
        if old_orders:
            print(f"\n🚨 Old Pending Orders (>24h):")
            old_orders.sort(key=lambda x: x[1], reverse=True)
            for order, age in old_orders[:5]:
                print(f"   • Order {order.order_id}: {format_timedelta(age)} old")
                print(f"     Action needed: Check payment status or timeout")


def get_recent_activity():
    """Get recent activity summary"""
    print_section("Recent Activity (Last 6 Hours)")
    
    cutoff = timezone.now() - timedelta(hours=6)
    
    # Recent successful orders
    successful_orders = Order.objects.filter(
        payment_status='paid',
        updated_at__gte=cutoff
    ).count()
    
    # Recent failed orders
    failed_orders = Order.objects.filter(
        payment_status__in=['failed', 'cancelled', 'timeout'],
        updated_at__gte=cutoff
    ).count()
    
    # Recent payments
    recent_payments = Payment.objects.filter(
        updated_at__gte=cutoff
    ).values('status').annotate(count=Count('id'))
    
    print(f"✅ Successful Orders: {successful_orders}")
    print(f"❌ Failed/Cancelled Orders: {failed_orders}")
    
    if recent_payments:
        print(f"\n💳 Payment Activity:")
        for payment in recent_payments:
            emoji = {
                'succeeded': '✅',
                'failed': '❌',
                'cancelled': '🚫',
                'timeout': '⏰',
                'pending': '⏳'
            }.get(payment['status'], '❓')
            print(f"   {emoji} {payment['status']}: {payment['count']}")


def get_system_health():
    """Get system health indicators"""
    print_section("System Health Indicators")
    
    now = timezone.now()
    
    # Check for stuck orders (pending > 2 hours)
    stuck_orders = Order.objects.filter(
        payment_status='pending',
        created_at__lt=now - timedelta(hours=2)
    ).count()
    
    # Check for high reservation ratio
    total_stock = ProductVariant.objects.aggregate(
        total=Sum('stock_quantity')
    )['total'] or 0
    
    total_reserved = ProductVariant.objects.aggregate(
        total=Sum('reserved_quantity')
    )['total'] or 0
    
    reservation_ratio = (total_reserved / total_stock * 100) if total_stock > 0 else 0
    
    # Check for products with high reservation ratio
    high_reservation_products = ProductVariant.objects.filter(
        stock_quantity__gt=0,
        reserved_quantity__gt=0
    ).extra(
        where=["reserved_quantity::float / stock_quantity::float > 0.8"]
    ).count()
    
    # Health indicators
    health_score = 100
    issues = []
    
    if stuck_orders > 5:
        health_score -= 20
        issues.append(f"🚨 {stuck_orders} orders stuck in pending state")
    elif stuck_orders > 0:
        health_score -= 10
        issues.append(f"⚠️  {stuck_orders} orders pending > 2h")
    
    if reservation_ratio > 50:
        health_score -= 15
        issues.append(f"🚨 High reservation ratio: {reservation_ratio:.1f}%")
    elif reservation_ratio > 30:
        health_score -= 5
        issues.append(f"⚠️  Moderate reservation ratio: {reservation_ratio:.1f}%")
    
    if high_reservation_products > 10:
        health_score -= 10
        issues.append(f"⚠️  {high_reservation_products} products with high reservations")
    
    # Display health score
    if health_score >= 90:
        health_emoji = "🟢"
        health_status = "EXCELLENT"
    elif health_score >= 70:
        health_emoji = "🟡"
        health_status = "GOOD"
    elif health_score >= 50:
        health_emoji = "🟠"
        health_status = "FAIR"
    else:
        health_emoji = "🔴"
        health_status = "POOR"
    
    print(f"{health_emoji} System Health: {health_score}/100 ({health_status})")
    print(f"📊 Reservation Ratio: {reservation_ratio:.1f}%")
    
    if issues:
        print(f"\n⚠️  Issues Detected:")
        for issue in issues:
            print(f"   {issue}")
    
    # Recommendations
    print(f"\n💡 Recommendations:")
    if stuck_orders > 0:
        print(f"   • Run payment status check: python manage.py check_pending_payments")
    if reservation_ratio > 20:
        print(f"   • Run reservation cleanup: python manage.py cleanup_expired_reservations")
    if high_reservation_products > 0:
        print(f"   • Check products with high reservations")
    
    print(f"   • Set up automated monitoring with cron jobs")


def main():
    """Main dashboard function"""
    print_header(f"Malikli.com Inventory & Payment Dashboard - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        get_system_health()
        get_inventory_status()
        get_payment_status()
        get_recent_activity()
        
        print_section("Quick Actions")
        print("🧹 Cleanup expired reservations:")
        print("   python manage.py cleanup_expired_reservations")
        print("")
        print("💳 Check payment statuses:")
        print("   python manage.py check_pending_payments --verbose")
        print("")
        print("🔍 Full monitoring:")
        print("   python manage.py check_pending_payments --cleanup-reservations --check-orphaned-reservations")
        print("")
        print("📊 View this dashboard:")
        print(f"   python {os.path.basename(__file__)}")
        
    except Exception as e:
        print(f"❌ Error generating dashboard: {e}")
        return 1
    
    print(f"\n{'='*60}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
