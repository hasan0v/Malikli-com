# drops/admin.py
from django.contrib import admin
from .models import Drop, DropProduct

class DropProductInline(admin.TabularInline):
    model = DropProduct
    extra = 1
    autocomplete_fields = ['product', 'variant'] # Makes selecting products/variants easier
    # Define fields to show in the inline
    fields = ('product', 'variant', 'drop_price', 'initial_stock_quantity', 'current_stock_quantity', 'max_per_customer', 'is_featured')
    # You might want current_stock_quantity to be read-only in the inline if managed by orders
    readonly_fields = ('current_stock_quantity',) # Example

@admin.register(Drop)
class DropAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'start_datetime', 'end_datetime', 'status', 'is_public', 'created_at')
    list_filter = ('status', 'is_public', 'start_datetime')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [DropProductInline]
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'description', 'banner_image')
        }),
        ('Timing & Status', {
            'fields': ('start_datetime', 'end_datetime', 'status', 'is_public')
        }),
    )

@admin.register(DropProduct)
class DropProductAdmin(admin.ModelAdmin):
    list_display = ('drop', 'product_name', 'variant_name', 'drop_price', 'initial_stock_quantity', 'current_stock_quantity', 'is_featured')
    list_filter = ('drop', 'is_featured', 'product__category')
    search_fields = ('drop__name', 'product__name', 'variant__sku_suffix', 'variant__name_suffix')
    autocomplete_fields = ['drop', 'product', 'variant']
    # Make current_stock_quantity editable carefully, or readonly if managed by orders
    # readonly_fields = ('current_stock_quantity',) # If managed strictly by order logic

    def product_name(self, obj):
        return obj.product.name
    product_name.short_description = 'Product'

    def variant_name(self, obj):
        return str(obj.variant) if obj.variant else "N/A"
    variant_name.short_description = 'Variant'