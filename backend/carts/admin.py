# carts/admin.py
from django.contrib import admin
from .models import Cart, CartItem

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0 # Don't show empty forms by default
    autocomplete_fields = ['drop_product']
    readonly_fields = ('added_at',)
    fields = ('drop_product', 'quantity', 'added_at')

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('cart_id_short', 'user_display', 'total_items_admin', 'subtotal_admin', 'created_at', 'updated_at')
    list_filter = ('user', 'created_at', 'updated_at')
    search_fields = ('cart_id', 'user__username', 'user__email')
    inlines = [CartItemInline]
    readonly_fields = ('cart_id', 'created_at', 'updated_at')

    def cart_id_short(self, obj):
        return str(obj.cart_id)[:8]
    cart_id_short.short_description = 'Cart ID (Short)'

    def user_display(self, obj):
        return obj.user.username if obj.user else "Guest"
    user_display.short_description = 'User'

    def total_items_admin(self, obj):
        return obj.total_items # Uses the property
    total_items_admin.short_description = 'Total Items'

    def subtotal_admin(self, obj):
        return obj.subtotal # Uses the property
    subtotal_admin.short_description = 'Subtotal'


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart_id_short', 'drop_product_display', 'quantity', 'unit_price_admin', 'total_price_admin', 'added_at')
    list_filter = ('cart__user', 'drop_product__drop', 'added_at')
    search_fields = ('cart__cart_id', 'drop_product__product__name', 'drop_product__variant__name_suffix')
    autocomplete_fields = ['cart', 'drop_product']

    def cart_id_short(self, obj):
        return str(obj.cart.cart_id)[:8]
    cart_id_short.short_description = 'Cart ID (Short)'

    def drop_product_display(self, obj):
        return str(obj.drop_product)
    drop_product_display.short_description = 'Drop Product'

    def unit_price_admin(self, obj):
        return obj.unit_price # Uses the property
    unit_price_admin.short_description = 'Unit Price'

    def total_price_admin(self, obj):
        return obj.total_price # Uses the property
    total_price_admin.short_description = 'Total Price'