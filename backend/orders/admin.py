# orders/admin.py
from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.urls import reverse
from .models import ShippingMethod, Order, OrderItem, Payment, InventoryReservation
from .inventory import InventoryManager


@admin.register(InventoryReservation)
class InventoryReservationAdmin(admin.ModelAdmin):
    list_display = [
        'reservation_id_short', 'order_link', 'product_info', 'quantity', 
        'status_display', 'expires_at', 'time_remaining_display'
    ]
    list_filter = ['reservation_type', 'is_active', 'created_at', 'expires_at']
    search_fields = [
        'order__order_number', 'product_variant__product__name', 
        'drop_product__product__name'
    ]
    readonly_fields = [
        'reservation_id', 'created_at', 'fulfilled_at', 'cancelled_at', 
        'time_remaining_display', 'is_expired_display'
    ]
    actions = ['cancel_selected_reservations', 'cleanup_expired_reservations']
    
    def reservation_id_short(self, obj):
        return str(obj.reservation_id)[:8]
    reservation_id_short.short_description = 'ID (Short)'
    
    def order_link(self, obj):
        url = reverse('admin:orders_order_change', args=[obj.order.order_id])
        return format_html('<a href="{}">{}</a>', url, obj.order.order_number)
    order_link.short_description = 'Order'
    
    def product_info(self, obj):
        if obj.product_variant:
            return f"{obj.product_variant.product.name} - {obj.product_variant}"
        elif obj.drop_product:
            return f"{obj.drop_product.product.name} (Drop: {obj.drop_product.drop.name})"
        return "Unknown Product"
    product_info.short_description = 'Product'
    
    def status_display(self, obj):
        if obj.fulfilled_at:
            return format_html('<span style="color: green;">✅ Fulfilled</span>')
        elif obj.cancelled_at:
            return format_html('<span style="color: red;">❌ Cancelled</span>')
        elif obj.is_expired:
            return format_html('<span style="color: orange;">⏰ Expired</span>')
        elif obj.is_active:
            return format_html('<span style="color: blue;">🔒 Active</span>')
        else:
            return format_html('<span style="color: gray;">❓ Unknown</span>')
    status_display.short_description = 'Status'
    
    def time_remaining_display(self, obj):
        if obj.is_expired:
            time_diff = timezone.now() - obj.expires_at
            return format_html('<span style="color: red;">Expired {} ago</span>', time_diff)
        else:
            return f"{obj.time_remaining}"
    time_remaining_display.short_description = 'Time Remaining'
    
    def is_expired_display(self, obj):
        return obj.is_expired
    is_expired_display.boolean = True
    is_expired_display.short_description = 'Expired'
    
    def cancel_selected_reservations(self, request, queryset):
        cancelled_count = 0
        for reservation in queryset.filter(is_active=True):
            if reservation.cancel():
                cancelled_count += 1
        
        self.message_user(
            request, 
            f"Successfully cancelled {cancelled_count} reservation(s)."
        )
    cancel_selected_reservations.short_description = "Cancel selected reservations"
    
    def cleanup_expired_reservations(self, request, queryset):
        cleaned_count = InventoryManager.cleanup_expired_reservations()
        self.message_user(
            request,
            f"Cleaned up {cleaned_count} expired reservation(s)."
        )
    cleanup_expired_reservations.short_description = "Clean up all expired reservations"


class InventoryReservationInline(admin.TabularInline):
    model = InventoryReservation
    extra = 0
    readonly_fields = ['reservation_id', 'expires_at', 'is_active', 'fulfilled_at', 'cancelled_at']
    
    def has_add_permission(self, request, obj=None):
        return False

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
        'payment_status', 'has_reservations', 'shipping_method', 'created_at'
    )
    list_filter = ('order_status', 'payment_status', 'shipping_method', 'created_at', 'user')
    search_fields = ('order_number', 'user__username', 'user__email', 'email_for_guest', 'shipping_address__recipient_name')
    readonly_fields = (
        'order_id', 'order_number', 'user', 'email_for_guest',
        'subtotal_amount', 'discount_amount', 'tax_amount', 'total_amount',
        'created_at', 'updated_at', 'shipped_at', 'delivered_at'
    )
    inlines = [OrderItemInline, PaymentInline, InventoryReservationInline]
    autocomplete_fields = ['user', 'shipping_address', 'billing_address', 'shipping_method']
    actions = ['fulfill_selected_orders', 'cancel_selected_orders']
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
    
    def has_reservations(self, obj):
        return obj.reservations.filter(is_active=True).exists()
    has_reservations.boolean = True
    has_reservations.short_description = 'Active Reservations'
    
    def fulfill_selected_orders(self, request, queryset):
        fulfilled_count = 0
        for order in queryset.filter(payment_status='paid', order_status='processing'):
            try:
                InventoryManager.fulfill_order(order)
                fulfilled_count += 1
            except Exception as e:
                self.message_user(
                    request,
                    f"Error fulfilling order {order.order_number}: {e}",
                    level='ERROR'
                )
        
        self.message_user(
            request,
            f"Successfully fulfilled {fulfilled_count} order(s)."
        )
    fulfill_selected_orders.short_description = "Fulfill selected paid orders"
    
    def cancel_selected_orders(self, request, queryset):
        cancelled_count = 0
        for order in queryset.filter(order_status__in=['pending_payment', 'processing']):
            try:
                InventoryManager.cancel_order_reservations(order)
                order.order_status = 'cancelled'
                order.save()
                cancelled_count += 1
            except Exception as e:
                self.message_user(
                    request,
                    f"Error cancelling order {order.order_number}: {e}",
                    level='ERROR'
                )
        
        self.message_user(
            request,
            f"Successfully cancelled {cancelled_count} order(s)."
        )
    cancel_selected_orders.short_description = "Cancel selected orders"

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