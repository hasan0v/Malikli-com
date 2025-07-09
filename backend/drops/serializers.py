# drops/serializers.py
from rest_framework import serializers
from .models import Drop, DropProduct
from products.serializers import ProductSerializer, ProductVariantSerializer # For nesting product info

class DropProductSerializer(serializers.ModelSerializer):
    # To show product/variant details instead of just IDs
    # You might want simplified versions of Product/Variant serializers here
    # to avoid circular dependencies or overly large payloads.
    product_details = ProductSerializer(source='product', read_only=True)
    variant_details = ProductVariantSerializer(source='variant', read_only=True, allow_null=True)

    class Meta:
        model = DropProduct
        fields = [
            'id', 'drop', 'product', 'variant', 'drop_price',
            'initial_stock_quantity', 'current_stock_quantity',
            'is_featured', 'max_per_customer',
            'product_details', 'variant_details', # Display fields
            'created_at', 'updated_at'
        ]
        # Make 'drop' read_only if DropProducts are always created nested under a Drop
        # Make 'product' and 'variant' writable by ID for creating/updating
        # read_only_fields = ('drop',) # Example

class DropSerializer(serializers.ModelSerializer):
    drop_products = DropProductSerializer(many=True, read_only=True) # Show associated products in this drop
    # banner_image_url = serializers.ImageField(source='banner_image', read_only=True, use_url=True) # If using ImageField
    current_status_display = serializers.CharField(source='get_current_status_display', read_only=True) # For choice display
    actual_current_status = serializers.CharField(source='current_status', read_only=True) # For the property value

    class Meta:
        model = Drop
        fields = [
            'id', 'name', 'slug', 'description', 'banner_image', # 'banner_image_url',
            'start_datetime', 'end_datetime', 'status', 'current_status_display', 'actual_current_status',
            'is_public', 'drop_products',
            'created_at', 'updated_at'
        ]
        read_only_fields = ('slug', 'current_status_display', 'actual_current_status')


# For Admin/Write operations, especially for creating DropProducts:
class DropProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DropProduct
        fields = [ # 'drop' will likely be set from URL or context
            'product', 'variant', 'drop_price',
            'initial_stock_quantity', 'max_per_customer', 'is_featured'
        ]

    def validate(self, data):
        # Ensure variant belongs to product
        product = data.get('product')
        variant = data.get('variant')
        if variant and product and variant.product != product:
            raise serializers.ValidationError(
                {"variant": "Selected variant does not belong to the selected product."}
            )
        # Ensure product has no variants if variant is None, and it should have variants
        # (More complex validation: if product.variants.exists() and variant is None, is that an error?)
        return data

class DropCreateUpdateSerializer(serializers.ModelSerializer):
    # This could be used by admin for creating/updating drops
    # It might not include drop_products directly; those could be managed via separate endpoints.
    class Meta:
        model = Drop
        fields = [
            'name', 'description', 'banner_image',
            'start_datetime', 'end_datetime', 'status', 'is_public'
        ]