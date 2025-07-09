# carts/models.py
import uuid
from django.db import models
from django.conf import settings # To get AUTH_USER_MODEL
from drops.models import DropProduct # Items in the cart are specific DropProducts
from products.models import ProductVariant # For product variant selections

class Cart(models.Model):
    # A unique ID for the cart, can be used for guest carts session tracking
    # For guest carts, this id might be stored in the frontend session/localStorage
    cart_id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        null=True, blank=True, related_name='carts'
    ) # Null for guest carts
    # session_id = models.CharField(max_length=255, unique=True, null=True, blank=True) # Alternative for guest cart ID if not using UUID as primary
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # expires_at = models.DateTimeField(null=True, blank=True) # For auto-clearing old carts

    def __str__(self):
        if self.user:
            return f"Cart for {self.user.username} (ID: {str(self.cart_id)[:8]})"
        return f"Guest Cart (ID: {str(self.cart_id)[:8]})"

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self):
        return sum(item.total_price for item in self.items.all())

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    drop_product = models.ForeignKey(DropProduct, on_delete=models.CASCADE, related_name='cart_items', null=True, blank=True)
    # Add support for regular products with variants
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='cart_items', null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    # Color and size options (keep for backward compatibility and drop products)
    color = models.CharField(max_length=100, null=True, blank=True)
    color_code = models.CharField(max_length=30, null=True, blank=True)
    size = models.CharField(max_length=20, null=True, blank=True)
    # Price at add could be stored if prices change and you want to honor price at time of adding to cart
    # For now, we'll assume price is always fetched from DropProduct.drop_price or ProductVariant
    # price_at_add = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.product_variant:
            item_desc = f"{self.quantity} x {self.product_variant.product.name}"
            variant_parts = []
            if self.product_variant.size:
                variant_parts.append(f"Size: {self.product_variant.size.name}")
            if self.product_variant.color:
                variant_parts.append(f"Color: {self.product_variant.color.name}")
            if variant_parts:
                item_desc += f" ({', '.join(variant_parts)})"
        elif self.drop_product:
            item_desc = f"{self.quantity} x {self.drop_product.product.name}"
            if self.color or self.size:
                variants = []
                if self.color:
                    variants.append(f"Color: {self.color}")
                if self.size:
                    variants.append(f"Size: {self.size}")
                item_desc += f" ({', '.join(variants)})"
        else:
            item_desc = f"{self.quantity} x Unknown Product"
        
        return f"{item_desc} in cart {str(self.cart.cart_id)[:8]}"

    @property
    def unit_price(self):
        if self.product_variant:
            return self.product_variant.product.base_price + self.product_variant.additional_price
        elif self.drop_product:
            return self.drop_product.drop_price
        return 0

    @property
    def total_price(self):
        return self.quantity * self.unit_price

    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Ensure either drop_product or product_variant is set, but not both
        if not self.drop_product and not self.product_variant:
            raise ValidationError("Either drop_product or product_variant must be set.")
        if self.drop_product and self.product_variant:
            raise ValidationError("Cannot set both drop_product and product_variant.")
        
        # Ensure quantity does not exceed available stock
        if self.drop_product and self.quantity > self.drop_product.current_stock_quantity:
            raise ValidationError(
                f"Cannot add {self.quantity} items. Only {self.drop_product.current_stock_quantity} available."
            )
        # For product variants, stock checking would need to be implemented separately

    class Meta:
        # Update unique constraint to handle both drop products and product variants
        constraints = [
            models.UniqueConstraint(
                fields=['cart', 'drop_product', 'color', 'size'],
                condition=models.Q(drop_product__isnull=False),
                name='unique_cart_drop_product_variant'
            ),
            models.UniqueConstraint(
                fields=['cart', 'product_variant'],
                condition=models.Q(product_variant__isnull=False),
                name='unique_cart_product_variant'
            )
        ]
        ordering = ['added_at']