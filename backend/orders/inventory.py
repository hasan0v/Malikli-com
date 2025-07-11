# orders/inventory.py
"""
Inventory management utilities for orders
"""
from django.db import models, transaction
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


class InventoryManager:
    """
    Service class for managing inventory operations
    """
    
    @staticmethod
    def reserve_order_items(order):
        """
        Reserve inventory for all items in an order.
        Returns (success: bool, failed_items: list)
        """
        from .models import InventoryReservation
        
        failed_items = []
        reservations_created = []
        
        try:
            with transaction.atomic():
                for order_item in order.items.all():
                    if order_item.drop_product:
                        # Reserve drop product stock
                        success = order_item.drop_product.reserve_stock(order_item.quantity)
                        if success:
                            reservation = InventoryReservation.objects.create(
                                order=order,
                                drop_product=order_item.drop_product,
                                quantity=order_item.quantity
                            )
                            reservations_created.append(reservation)
                        else:
                            failed_items.append({
                                'item': order_item,
                                'type': 'drop_product',
                                'requested': order_item.quantity,
                                'available': order_item.drop_product.available_quantity
                            })
                    
                    elif hasattr(order_item, 'product_variant_id') and order_item.product_variant_id:
                        # Handle product variant reservations for direct orders
                        from products.models import ProductVariant
                        try:
                            variant = ProductVariant.objects.get(id=order_item.product_variant_id)
                            success = variant.reserve_stock(order_item.quantity)
                            if success:
                                reservation = InventoryReservation.objects.create(
                                    order=order,
                                    product_variant=variant,
                                    quantity=order_item.quantity
                                )
                                reservations_created.append(reservation)
                            else:
                                failed_items.append({
                                    'item': order_item,
                                    'type': 'product_variant',
                                    'requested': order_item.quantity,
                                    'available': variant.available_quantity
                                })
                        except ProductVariant.DoesNotExist:
                            failed_items.append({
                                'item': order_item,
                                'type': 'product_variant',
                                'error': 'Variant not found'
                            })
                
                # If any items failed, rollback all reservations
                if failed_items:
                    # The transaction.atomic() will automatically rollback
                    # But we should also manually clean up any reservations
                    for reservation in reservations_created:
                        reservation.cancel()
                    raise Exception("Some items could not be reserved")
                
                return True, []
        
        except Exception:
            return False, failed_items
    
    @staticmethod
    def fulfill_order(order):
        """
        Fulfill an order by converting reservations to actual stock reduction
        """
        with transaction.atomic():
            for reservation in order.reservations.filter(is_active=True):
                reservation.fulfill()
    
    @staticmethod
    def cancel_order_reservations(order):
        """
        Cancel all active reservations for an order
        """
        with transaction.atomic():
            for reservation in order.reservations.filter(is_active=True):
                reservation.cancel()
    
    @staticmethod
    def cleanup_expired_reservations():
        """
        Clean up expired reservations and release their stock.
        Returns count of cleaned up reservations.
        """
        from .models import InventoryReservation
        
        now = timezone.now()
        expired_reservations = InventoryReservation.objects.filter(
            is_active=True,
            expires_at__lt=now
        )
        
        count = 0
        for reservation in expired_reservations:
            reservation.cancel()
            count += 1
        
        return count
    
    @staticmethod
    def get_low_stock_items():
        """
        Get items that are below their low stock threshold
        """
        from products.models import ProductVariant
        from drops.models import DropProduct
        
        low_stock_variants = ProductVariant.objects.filter(
            is_active=True,
            stock_quantity__lte=models.F('low_stock_threshold')
        ).select_related('product')
        
        low_stock_drops = DropProduct.objects.filter(
            current_stock_quantity__lte=models.F('low_stock_threshold')
        ).select_related('product', 'drop')
        
        return {
            'variants': low_stock_variants,
            'drop_products': low_stock_drops
        }
