# orders/admin.py
from django.contrib import admin
from .models import ShippingMethod, Order, OrderItem, Payment

@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):
    list_display = ('name', 'cost', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = (
        'drop_product', 'product_name_snapshot', 'variant_name_snapshot',
        'sku_snapshot', 'quantity', 'price_per_unit', 'subtotal'
    ) # OrderItems are generally not editable after order creation
    can_delete = False # Usually don't delete individual items from a placed order
    # autocomplete_fields = ['drop_product'] # Could be useful if manually adding, but typically read-only

class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = (
        'gateway_transaction_id', 'payment_method_type', 'amount',
        'currency_code', 'status', 'payment_details', 'created_at', 'updated_at'
    )
    can_delete = False

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_number', 'user_display', 'total_amount', 'order_status',
        'payment_status', 'shipping_method', 'created_at'
    )
    list_filter = ('order_status', 'payment_status', 'shipping_method', 'created_at', 'user')
    search_fields = ('order_number', 'user__username', 'user__email', 'email_for_guest', 'shipping_address__recipient_name')
    readonly_fields = (
        'order_id', 'order_number', 'user', 'email_for_guest',
        'subtotal_amount', 'discount_amount', 'tax_amount', 'total_amount',
        'created_at', 'updated_at', 'shipped_at', 'delivered_at'
    )
    inlines = [OrderItemInline, PaymentInline]
    autocomplete_fields = ['user', 'shipping_address', 'billing_address', 'shipping_method']
    fieldsets = (
        ("Order Information", {
            'fields': ('order_id', 'order_number', 'user', 'email_for_guest', 'customer_notes')
        }),
        ("Amounts & Shipping", {
            'fields': ('subtotal_amount', 'discount_amount', 'tax_amount', 'shipping_cost', 'total_amount', 'shipping_method')
        }),
        ("Addresses", {
            'fields': ('shipping_address', 'billing_address')
        }),
        ("Status & Tracking", {
            'fields': ('order_status', 'payment_status', 'tracking_number', 'shipped_at', 'delivered_at')
        }),
        ("Timestamps", {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def user_display(self, obj):
        return obj.user.username if obj.user else obj.email_for_guest or "Guest"
    user_display.short_description = 'Customer'

@admin.register(OrderItem) # Mainly for viewing, not direct manipulation
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product_name_snapshot', 'quantity', 'price_per_unit', 'subtotal')
    search_fields = ('order__order_number', 'product_name_snapshot', 'sku_snapshot')
    readonly_fields = [f.name for f in OrderItem._meta.fields] # All fields readonly
    # autocomplete_fields = ['order', 'drop_product']

    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False # Or True for specific admin fixes
    # def has_delete_permission(self, request, obj=None): return False


@admin.register(Payment) # Mainly for viewing
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'gateway_transaction_id', 'amount', 'status', 'payment_method_type', 'created_at')
    list_filter = ('status', 'payment_method_type', 'created_at')
    search_fields = ('order__order_number', 'gateway_transaction_id')
    readonly_fields = [f.name for f in Payment._meta.fields]

    def has_add_permission(self, request): return False
    # def has_change_permission(self, request, obj=None): return False
    # def has_delete_permission(self, request, obj=None): return False