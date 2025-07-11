# orders/views_admin.py - Admin dashboard views
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render, redirect
from django.utils import timezone
from django.db.models import Q, F, Sum
from orders.models import Order, InventoryReservation
from orders.inventory import InventoryManager
from products.models import ProductVariant
from drops.models import DropProduct


@staff_member_required
def inventory_dashboard(request):
    """
    Admin dashboard showing inventory status and reservations
    """
    # Get inventory statistics
    low_stock_items = InventoryManager.get_low_stock_items()
    
    # Active reservations
    active_reservations = InventoryReservation.objects.filter(is_active=True).count()
    expired_reservations = InventoryReservation.objects.filter(
        is_active=True,
        expires_at__lt=timezone.now()
    ).count()
    
    # Orders requiring attention
    pending_orders = Order.objects.filter(
        order_status='pending_payment',
        payment_status='pending'
    ).count()
    
    # Recent activity
    recent_orders = Order.objects.filter(
        created_at__gte=timezone.now() - timezone.timedelta(hours=24)
    ).count()
    
    context = {
        'low_stock_variants': low_stock_items['variants'][:10],
        'low_stock_drops': low_stock_items['drop_products'][:10],
        'low_stock_count': low_stock_items['variants'].count() + low_stock_items['drop_products'].count(),
        'active_reservations': active_reservations,
        'expired_reservations': expired_reservations,
        'pending_orders': pending_orders,
        'recent_orders': recent_orders,
    }
    
    return render(request, 'admin/inventory_dashboard.html', context)


@staff_member_required
def cleanup_inventory(request):
    """
    Manually trigger inventory cleanup
    """
    if request.method == 'POST':
        cleaned_count = InventoryManager.cleanup_expired_reservations()
        
        from django.contrib import messages
        messages.success(
            request, 
            f"Successfully cleaned up {cleaned_count} expired reservations."
        )
    
    return redirect('admin:orders_inventoryreservation_changelist')
