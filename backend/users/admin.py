# users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import User, Address, WaitlistSubscriber

# This AddressInline is for displaying addresses directly within the User admin page
class AddressInline(admin.StackedInline): # Or TabularInline
    model = Address
    extra = 1 # Number of empty forms to display
    # You might want to specify fields to show in the inline for brevity
    fields = ('address_type', 'recipient_name', 'street_address', 'city', 'postal_code', 'country_code', 'is_default_shipping', 'is_default_billing')
    # raw_id_fields = ('user',) # Not needed here as user is implicit

class UserAdmin(BaseUserAdmin):
    # This part is correct and includes search_fields for User
    inlines = [AddressInline]
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'last_login')
    search_fields = ('username', 'email', 'first_name', 'last_name')

admin.site.register(User, UserAdmin)


# --- THIS IS THE NEW/MODIFIED PART ---
# We need a custom ModelAdmin for Address to define search_fields for it.
@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'recipient_name',
        'street_address',
        'city',
        'postal_code',
        'country_code',
        'address_type',
        'is_default_shipping',
        'is_default_billing'
    )
    search_fields = (
        'recipient_name',       # Search by recipient's name
        'street_address',       # Search by street address
        'city',                 # Search by city
        'postal_code',          # Search by postal code
        'user__username',       # Allows searching addresses by the associated user's username
        'user__email',          # Allows searching addresses by the associated user's email
        'user__first_name',     # Allows searching addresses by the associated user's first name
        'user__last_name'       # Allows searching addresses by the associated user's last name
    )
    list_filter = ('address_type', 'is_default_shipping', 'is_default_billing', 'user', 'city', 'country_code')
    raw_id_fields = ('user',) # Makes selecting the user easier if you have many users

@admin.register(WaitlistSubscriber)
class WaitlistSubscriberAdmin(admin.ModelAdmin):
    list_display = ('email', 'display_name', 'source', 'is_processed', 'created_at', 'processed_at', 'user_link')
    list_filter = ('is_processed', 'source', 'created_at', 'processed_at')
    search_fields = ('email', 'name', 'first_name', 'last_name')
    readonly_fields = ('created_at', 'processed_at', 'user_link', 'extracted_names')
    list_per_page = 50
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Subscriber Information', {
            'fields': ('email', 'name', 'phone_number', 'source')
        }),
        ('Extracted Name Fields', {
            'fields': ('extracted_names', 'first_name', 'last_name'),
            'description': 'These fields are automatically extracted from the name field'
        }),
        ('Processing Status', {
            'fields': ('is_processed', 'created_at', 'processed_at', 'user_link')
        }),
    )
    
    def display_name(self, obj):
        """Display the best available name."""
        return obj.get_display_name()
    display_name.short_description = 'Name'
    display_name.admin_order_field = 'name'
    
    def extracted_names(self, obj):
        """Show extracted first and last names."""
        if obj.first_name or obj.last_name:
            return f"First: {obj.first_name or 'N/A'}, Last: {obj.last_name or 'N/A'}"
        return "No names extracted"
    extracted_names.short_description = 'Extracted Names'
    
    def user_link(self, obj):
        """Show link to created user if exists."""
        if obj.is_processed:
            try:
                user = User.objects.get(email=obj.email)
                url = reverse('admin:users_user_change', args=[user.pk])
                return format_html('<a href="{}">View User Account</a>', url)
            except User.DoesNotExist:
                return 'User not found'
        return 'Not processed yet'
    user_link.short_description = 'User Account'
    user_link.admin_order_field = 'is_processed'
    
    def get_queryset(self, request):
        """Optimize queryset."""
        return super().get_queryset(request).select_related()
    
    actions = ['mark_as_processed', 'mark_as_unprocessed']
    
    def mark_as_processed(self, request, queryset):
        """Mark selected subscribers as processed."""
        updated = queryset.update(is_processed=True)
        self.message_user(request, f'{updated} subscribers marked as processed.')
    mark_as_processed.short_description = 'Mark as processed'
    
    def mark_as_unprocessed(self, request, queryset):
        """Mark selected subscribers as unprocessed."""
        updated = queryset.update(is_processed=False, processed_at=None)
        self.message_user(request, f'{updated} subscribers marked as unprocessed.')
    mark_as_unprocessed.short_description = 'Mark as unprocessed'