# carts/serializers.py
from rest_framework import serializers
from .models import Cart, CartItem
from drops.serializers import DropProductSerializer # To show item details
from products.serializers import ProductVariantWithProductSerializer # For product variant details with full product info

class CartItemSerializer(serializers.ModelSerializer):
    # Use simplified serializers for cart items
    drop_product_details = DropProductSerializer(source='drop_product', read_only=True)
    product_variant_details = ProductVariantWithProductSerializer(source='product_variant', read_only=True)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id', 'cart', 'drop_product', 'product_variant', 'quantity', 'color', 'color_code', 'size',
            'drop_product_details', 'product_variant_details', 'unit_price', 'total_price', 'added_at'
        ]
        read_only_fields = ['cart', 'unit_price', 'total_price'] # 'cart' set by context or URL

    def validate(self, data):
        # Ensure either drop_product or product_variant is set, but not both
        drop_product = data.get('drop_product')
        product_variant = data.get('product_variant')
        
        if not drop_product and not product_variant:
            raise serializers.ValidationError("Either drop_product or product_variant must be provided.")
        if drop_product and product_variant:
            raise serializers.ValidationError("Cannot set both drop_product and product_variant.")
        
        return data

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be a positive integer.")
        return value

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)


    class Meta:
        model = Cart
        fields = [
            'cart_id', 'user', 'user_username', 'items', 'total_items', 'subtotal',
            'created_at', 'updated_at'
        ]
        read_only_fields = ('user', 'user_username', 'total_items', 'subtotal') # User will be set based on authentication

# Serializer for adding/updating items (simpler input)
class CartItemAddSerializer(serializers.Serializer):
    drop_product_id = serializers.IntegerField(write_only=True)
    quantity = serializers.IntegerField(min_value=1)
    # Add color and size fields
    color = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    color_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    size = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_drop_product_id(self, value):
        from drops.models import DropProduct # Local import to avoid circularity if any
        try:
            dp = DropProduct.objects.get(id=value)
            # Check if the drop product is part of an active drop
            if not (dp.drop.is_public and dp.drop.status == 'active'): # or dp.drop.current_status == 'active'
                 raise serializers.ValidationError("This product is not currently available in an active drop.")
            if dp.current_stock_quantity == 0 :
                raise serializers.ValidationError("This product is out of stock.")

        except DropProduct.DoesNotExist:
            raise serializers.ValidationError("Drop product not found.")
        return value

    def validate_quantity(self, value):
        # This validation might be better placed in an update context or combined
        # with drop_product_id validation to check against stock.
        # For now, just basic positive integer.
        if value <= 0:
             raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate(self, data):
        from drops.models import DropProduct
        drop_product_id = data.get('drop_product_id')
        quantity = data.get('quantity')
        try:
            drop_product = DropProduct.objects.get(id=drop_product_id)
            if quantity > drop_product.current_stock_quantity:
                raise serializers.ValidationError(
                    {'quantity': f"Only {drop_product.current_stock_quantity} items in stock. Requested {quantity}."}
                )
            # Check max_per_customer here if needed (would require cart context)
        except DropProduct.DoesNotExist:
            pass # Already handled by field validation
        return data

# Add new serializers for cart synchronization
class CartSyncItemSerializer(serializers.Serializer):
    """Serializer for syncing cart items from frontend"""
    drop_product_id = serializers.IntegerField(required=False, allow_null=True)
    product_variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1)
    color = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    color_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    size = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, data):
        drop_product_id = data.get('drop_product_id')
        product_variant_id = data.get('product_variant_id')
        
        if not drop_product_id and not product_variant_id:
            raise serializers.ValidationError("Either drop_product_id or product_variant_id must be provided.")
        if drop_product_id and product_variant_id:
            raise serializers.ValidationError("Cannot set both drop_product_id and product_variant_id.")
            
        return data

    def validate_drop_product_id(self, value):
        if value is None:
            return value
            
        from drops.models import DropProduct
        try:
            dp = DropProduct.objects.get(id=value)
            if not (dp.drop.is_public and dp.drop.status == 'active'):
                raise serializers.ValidationError("This product is not currently available in an active drop.")
            if dp.current_stock_quantity == 0:
                raise serializers.ValidationError("This product is out of stock.")
        except DropProduct.DoesNotExist:
            raise serializers.ValidationError("Drop product not found.")
        return value

    def validate_product_variant_id(self, value):
        if value is None:
            return value
            
        from products.models import ProductVariant
        try:
            ProductVariant.objects.get(id=value)
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError("Product variant not found.")
        return value

class CartSyncSerializer(serializers.Serializer):
    """Serializer for syncing entire cart from frontend localStorage"""
    items = CartSyncItemSerializer(many=True)
    guest_cart_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_items(self, items):
        """Validate all items and check stock constraints"""
        from drops.models import DropProduct
        from products.models import ProductVariant
        
        for item_data in items:
            drop_product_id = item_data.get('drop_product_id')
            product_variant_id = item_data.get('product_variant_id')
            
            if drop_product_id:
                try:
                    drop_product = DropProduct.objects.get(id=drop_product_id)
                    if item_data['quantity'] > drop_product.current_stock_quantity:
                        raise serializers.ValidationError(
                            f"Product {drop_product.product.name}: Only {drop_product.current_stock_quantity} items in stock. Requested {item_data['quantity']}."
                        )
                except DropProduct.DoesNotExist:
                    continue  # Already handled by field validation
            
            # For product variants, you might want to add stock validation here too
            # depending on your ProductVariant model structure
        
        return items

class CartMergeSerializer(serializers.Serializer):
    """Serializer for merging guest cart with user cart on login"""
    guest_cart_id = serializers.UUIDField()
    merge_strategy = serializers.ChoiceField(
        choices=['replace', 'merge', 'keep_user'],
        default='merge',
        help_text="replace: Replace user cart with guest cart, merge: Combine quantities, keep_user: Keep user cart unchanged"
    )