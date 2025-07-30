# orders/models.py
import uuid
from django.db import models
from django.conf import settings # AUTH_USER_MODEL
from django.utils import timezone
from datetime import timedelta
from users.models import Address # For shipping/billing addresses
from drops.models import DropProduct # For ordered items

class ShippingMethod(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    estimated_delivery_min_days = models.PositiveIntegerField(null=True, blank=True)
    estimated_delivery_max_days = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - ${self.cost}"

class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ('pending_payment', 'Pending Payment'),
        ('processing', 'Processing'), # Payment received, preparing shipment
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
        ('failed', 'Failed'), # Payment failed or other issue
    ]
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded_partial', 'Refunded (Partial)'),
        ('refunded_full', 'Refunded (Full)'),
    ]

    order_id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    order_number = models.CharField(max_length=50, unique=True, blank=True) # Public-facing, generate this
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, # Keep order even if user is deleted
        null=True, blank=True, related_name='orders'
    )
    email_for_guest = models.EmailField(blank=True, null=True) # If guest checkout

    # Store copies of addresses or link to user's Address model
    # Storing copies ensures address at time of order is preserved
    # For simplicity now, we'll link. Consider snapshotting address fields later.
    shipping_address = models.ForeignKey(
        Address, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='shipping_orders'
    )
    billing_address = models.ForeignKey(
        Address, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='billing_orders'
    )
    # Alternative: Store JSON snapshot of address
    # shipping_address_snapshot = models.JSONField(null=True, blank=True)
    # billing_address_snapshot = models.JSONField(null=True, blank=True)

    shipping_method = models.ForeignKey(
        ShippingMethod, on_delete=models.SET_NULL, null=True, blank=True
    )
    shipping_method_name_snapshot = models.CharField(max_length=255, blank=True, null=True)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    subtotal_amount = models.DecimalField(max_digits=10, decimal_places=2) # Sum of (item price * quantity)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2) # subtotal - discount + tax + shipping

    order_status = models.CharField(
        max_length=50, choices=ORDER_STATUS_CHOICES, default='pending_payment'
    )
    payment_status = models.CharField(
        max_length=50, choices=PAYMENT_STATUS_CHOICES, default='pending'
    )

    customer_notes = models.TextField(blank=True, null=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.order_number:
            # Generate a unique order number using current time
            import datetime
            current_time = datetime.datetime.now()
            self.order_number = f"ORD-{current_time.strftime('%Y%m%d')}-{str(self.order_id)[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.order_number} ({self.get_order_status_display()})"

    class Meta:
        ordering = ['-created_at']

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    drop_product = models.ForeignKey(
        DropProduct, on_delete=models.PROTECT, # Prevent deleting DropProduct if it's in an order
        related_name='order_items',
        null=True, blank=True  # Make optional to support direct product orders
    )
    
    # Direct order fields (for orders not using drop_product)
    product_id = models.IntegerField(null=True, blank=True)  # Store product ID directly
    product_variant_id = models.IntegerField(null=True, blank=True)  # Store variant ID directly  
    product_slug = models.CharField(max_length=255, null=True, blank=True)  # Store product slug
    product_image_url = models.URLField(null=True, blank=True)  # Store product image URL
    color = models.CharField(max_length=50, null=True, blank=True)  # Store color directly
    size = models.CharField(max_length=50, null=True, blank=True)  # Store size directly
    
    # Snapshot fields (important as product/variant details can change)
    product_name_snapshot = models.CharField(max_length=255)
    variant_name_snapshot = models.CharField(max_length=100, blank=True, null=True)
    sku_snapshot = models.CharField(max_length=100) # Combined SKU (prefix + suffix)
    quantity = models.PositiveIntegerField()
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2) # Price at time of order
    subtotal = models.DecimalField(max_digits=10, decimal_places=2) # quantity * price_per_unit

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) # Though typically not updated after order

    def __str__(self):
        return f"{self.quantity} x {self.product_name_snapshot} for Order {self.order.order_number}"

    class Meta:
        # unique_together = ('order', 'drop_product') # Usually an item isn't in an order twice
        ordering = ['created_at']


class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    payment_method_type = models.CharField(max_length=50) # e.g., 'credit_card', 'paypal', 'stripe_pi'
    gateway_transaction_id = models.CharField(max_length=255, unique=True, db_index=True) # ID from payment provider
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency_code = models.CharField(max_length=3, default='EUR') # ISO 4217 currency code
    status = models.CharField(max_length=50, choices=PAYMENT_STATUS_CHOICES)
    # Store limited, non-sensitive details; DO NOT STORE FULL CC INFO
    payment_details = models.JSONField(blank=True, null=True) # e.g., last 4 digits, card type, Stripe PaymentIntent details
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.gateway_transaction_id} for Order {self.order.order_number} - {self.status}"


class InventoryReservation(models.Model):
    """
    Track inventory reservations for unpaid orders.
    Automatically expires after a certain time period.
    """
    RESERVATION_TYPE_CHOICES = [
        ('product_variant', 'Product Variant'),
        ('drop_product', 'Drop Product'),
    ]
    
    reservation_id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='reservations')
    
    # Polymorphic fields - only one should be set
    product_variant = models.ForeignKey(
        'products.ProductVariant',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='reservations'
    )
    drop_product = models.ForeignKey(
        DropProduct,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='reservations'
    )
    
    reservation_type = models.CharField(max_length=20, choices=RESERVATION_TYPE_CHOICES)
    quantity = models.PositiveIntegerField()
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    # Status tracking
    is_active = models.BooleanField(default=True)
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['expires_at', 'is_active']),
            models.Index(fields=['order', 'is_active']),
            models.Index(fields=['product_variant', 'is_active']),
            models.Index(fields=['drop_product', 'is_active']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantity__gt=0),
                name='check_reservation_quantity_positive'
            ),
            # Ensure only one of product_variant or drop_product is set
            models.CheckConstraint(
                check=(
                    models.Q(product_variant__isnull=True, drop_product__isnull=False) |
                    models.Q(product_variant__isnull=False, drop_product__isnull=True)
                ),
                name='check_reservation_single_product_type'
            ),
        ]
    
    def save(self, *args, **kwargs):
        # Set reservation type based on which product field is set
        if self.product_variant:
            self.reservation_type = 'product_variant'
        elif self.drop_product:
            self.reservation_type = 'drop_product'
        
        # Set expiration time if not provided
        if not self.expires_at:
            reservation_timeout = getattr(settings, 'ORDER_RESERVATION_TIMEOUT_MINUTES', 15)
            self.expires_at = timezone.now() + timedelta(minutes=reservation_timeout)
        
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        """Check if reservation has expired"""
        return timezone.now() > self.expires_at
    
    @property
    def time_remaining(self):
        """Get time remaining until expiration"""
        if self.is_expired:
            return timedelta(0)
        return self.expires_at - timezone.now()
    
    def fulfill(self):
        """Mark reservation as fulfilled and reduce actual stock"""
        if not self.is_active or self.fulfilled_at:
            return False
        
        from django.db import transaction
        with transaction.atomic():
            if self.product_variant:
                self.product_variant.fulfill_order(self.quantity)
            elif self.drop_product:
                self.drop_product.fulfill_order(self.quantity)
            
            self.is_active = False
            self.fulfilled_at = timezone.now()
            self.save(update_fields=['is_active', 'fulfilled_at'])
            return True
    
    def cancel(self):
        """Cancel reservation and release stock"""
        if not self.is_active or self.cancelled_at:
            return False
        
        from django.db import transaction
        with transaction.atomic():
            if self.product_variant:
                self.product_variant.release_reservation(self.quantity)
            elif self.drop_product:
                self.drop_product.release_reservation(self.quantity)
            
            self.is_active = False
            self.cancelled_at = timezone.now()
            self.save(update_fields=['is_active', 'cancelled_at'])
            return True
    
    def __str__(self):
        product_name = ""
        if self.product_variant:
            product_name = str(self.product_variant)
        elif self.drop_product:
            product_name = str(self.drop_product)
        
        return f"Reservation {str(self.reservation_id)[:8]} - {self.quantity}x {product_name}"
