"""
API views for inventory management and frontend integration
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from products.models import ProductVariant
from drops.models import DropProduct
from .inventory import InventoryManager
from .models import InventoryReservation


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def check_stock_availability(request):
    """
    Check stock availability for items before adding to cart or processing order.
    
    POST data format:
    {
        "items": [
            {
                "type": "variant",  # or "drop_product"
                "id": 123,
                "quantity": 2
            },
            {
                "type": "drop_product",
                "id": 456,
                "quantity": 1
            }
        ]
    }
    """
    items = request.data.get('items', [])
    if not items:
        return Response({'error': 'No items provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    results = []
    all_available = True
    
    for item in items:
        item_type = item.get('type')
        item_id = item.get('id')
        quantity = item.get('quantity', 1)
        
        if not item_type or not item_id:
            results.append({
                'item': item,
                'available': False,
                'error': 'Missing type or id'
            })
            all_available = False
            continue
        
        try:
            if item_type == 'variant':
                variant = get_object_or_404(ProductVariant, id=item_id)
                available = variant.available_quantity >= quantity
                results.append({
                    'type': 'variant',
                    'id': item_id,
                    'quantity_requested': quantity,
                    'available_quantity': variant.available_quantity,
                    'stock_quantity': variant.stock_quantity,
                    'reserved_quantity': variant.reserved_quantity,
                    'available': available,
                    'product_name': variant.product.name,
                    'variant_name': str(variant),
                    'is_low_stock': variant.is_low_stock
                })
                if not available:
                    all_available = False
                    
            elif item_type == 'drop_product':
                drop_product = get_object_or_404(DropProduct, id=item_id)
                available = drop_product.available_quantity >= quantity
                results.append({
                    'type': 'drop_product',
                    'id': item_id,
                    'quantity_requested': quantity,
                    'available_quantity': drop_product.available_quantity,
                    'stock_quantity': drop_product.stock_quantity,
                    'reserved_quantity': drop_product.reserved_quantity,
                    'available': available,
                    'product_name': drop_product.product.name,
                    'drop_price': drop_product.drop_price,
                    'is_low_stock': drop_product.is_low_stock
                })
                if not available:
                    all_available = False
            else:
                results.append({
                    'item': item,
                    'available': False,
                    'error': f'Unknown item type: {item_type}'
                })
                all_available = False
                
        except Exception as e:
            results.append({
                'item': item,
                'available': False,
                'error': str(e)
            })
            all_available = False
    
    return Response({
        'all_available': all_available,
        'items': results,
        'total_items_checked': len(items)
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_reservations(request):
    """
    Get current inventory reservations for the authenticated user.
    Useful for showing pending orders and reserved items.
    """
    if not hasattr(request.user, 'orders'):
        return Response({'reservations': []})
    
    # Get pending orders for this user
    pending_orders = request.user.orders.filter(
        order_status='pending_payment',
        payment_status='pending'
    ).prefetch_related('reservations')
    
    reservations_data = []
    for order in pending_orders:
        for reservation in order.reservations.filter(is_active=True):
            reservations_data.append({
                'id': reservation.id,
                'order_number': order.order_number,
                'quantity': reservation.quantity,
                'expires_at': reservation.expires_at,
                'minutes_remaining': reservation.get_minutes_remaining(),
                'item_type': 'variant' if reservation.product_variant else 'drop_product',
                'item_id': reservation.product_variant_id or reservation.drop_product_id,
                'item_name': str(reservation),
                'created_at': reservation.created_at
            })
    
    return Response({
        'reservations': reservations_data,
        'total_reserved_items': len(reservations_data)
    })


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def bulk_stock_update(request):
    """
    Bulk update stock quantities for multiple variants.
    Staff only endpoint for inventory management.
    
    POST data format:
    {
        "updates": [
            {
                "type": "variant",
                "id": 123,
                "stock_quantity": 50,
                "low_stock_threshold": 5
            },
            {
                "type": "drop_product", 
                "id": 456,
                "stock_quantity": 25,
                "low_stock_threshold": 3
            }
        ]
    }
    """
    updates = request.data.get('updates', [])
    if not updates:
        return Response({'error': 'No updates provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    results = []
    successful_updates = 0
    
    for update in updates:
        update_type = update.get('type')
        item_id = update.get('id')
        stock_quantity = update.get('stock_quantity')
        low_stock_threshold = update.get('low_stock_threshold')
        
        try:
            if update_type == 'variant':
                variant = get_object_or_404(ProductVariant, id=item_id)
                if stock_quantity is not None:
                    variant.stock_quantity = stock_quantity
                if low_stock_threshold is not None:
                    variant.low_stock_threshold = low_stock_threshold
                variant.save()
                
                results.append({
                    'type': 'variant',
                    'id': item_id,
                    'success': True,
                    'item_name': str(variant),
                    'new_stock_quantity': variant.stock_quantity,
                    'new_available_quantity': variant.available_quantity,
                    'new_low_stock_threshold': variant.low_stock_threshold
                })
                successful_updates += 1
                
            elif update_type == 'drop_product':
                drop_product = get_object_or_404(DropProduct, id=item_id)
                if stock_quantity is not None:
                    drop_product.stock_quantity = stock_quantity
                if low_stock_threshold is not None:
                    drop_product.low_stock_threshold = low_stock_threshold
                drop_product.save()
                
                results.append({
                    'type': 'drop_product',
                    'id': item_id,
                    'success': True,
                    'item_name': str(drop_product),
                    'new_stock_quantity': drop_product.stock_quantity,
                    'new_available_quantity': drop_product.available_quantity,
                    'new_low_stock_threshold': drop_product.low_stock_threshold
                })
                successful_updates += 1
            else:
                results.append({
                    'type': update_type,
                    'id': item_id,
                    'success': False,
                    'error': f'Unknown update type: {update_type}'
                })
                
        except Exception as e:
            results.append({
                'type': update_type,
                'id': item_id,
                'success': False,
                'error': str(e)
            })
    
    return Response({
        'results': results,
        'total_updates': len(updates),
        'successful_updates': successful_updates,
        'failed_updates': len(updates) - successful_updates
    })


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def inventory_dashboard_data(request):
    """
    Get comprehensive inventory data for admin dashboard.
    """
    low_stock_data = InventoryManager.get_low_stock_items()
    
    # Get recent reservations (last 24 hours)
    from django.utils import timezone
    from datetime import timedelta
    
    recent_reservations = InventoryReservation.objects.filter(
        created_at__gte=timezone.now() - timedelta(hours=24),
        is_active=True
    ).select_related('order', 'product_variant', 'drop_product')
    
    # Calculate inventory stats
    total_variants = ProductVariant.objects.filter(is_active=True).count()
    total_drop_products = DropProduct.objects.count()
    low_stock_count = low_stock_data['variants'].count() + low_stock_data['drop_products'].count()
    out_of_stock_variants = ProductVariant.objects.filter(
        is_active=True, 
        stock_quantity__lte=0
    ).count()
    
    # Calculate total reserved quantities
    total_reserved_variants = sum(
        variant.reserved_quantity for variant in ProductVariant.objects.filter(is_active=True)
    )
    total_reserved_drops = sum(
        drop.reserved_quantity for drop in DropProduct.objects.all()
    )
    
    return Response({
        'summary': {
            'total_active_variants': total_variants,
            'total_drop_products': total_drop_products,
            'low_stock_items': low_stock_count,
            'out_of_stock_variants': out_of_stock_variants,
            'total_reserved_items': total_reserved_variants + total_reserved_drops,
            'active_reservations_24h': recent_reservations.count()
        },
        'low_stock_variants': [
            {
                'id': v.id,
                'name': str(v),
                'available_quantity': v.available_quantity,
                'low_stock_threshold': v.low_stock_threshold,
                'product_name': v.product.name
            } for v in low_stock_data['variants'][:10]  # Limit to 10 for dashboard
        ],
        'low_stock_drop_products': [
            {
                'id': d.id,
                'name': str(d),
                'available_quantity': d.available_quantity,
                'low_stock_threshold': d.low_stock_threshold,
                'product_name': d.product.name
            } for d in low_stock_data['drop_products'][:10]  # Limit to 10 for dashboard
        ],
        'recent_reservations': [
            {
                'id': r.id,
                'quantity': r.quantity,
                'expires_at': r.expires_at,
                'item_name': str(r),
                'order_number': r.order.order_number if r.order else None
            } for r in recent_reservations[:20]  # Limit to 20 for dashboard
        ]
    })
