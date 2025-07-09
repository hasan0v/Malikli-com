# notifications_app/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message_summary', 'notification_type', 'related_object_link', 'is_read', 'created_at')
    list_filter = ('is_read', 'notification_type', 'created_at', 'user')
    search_fields = ('user__username', 'user__email', 'message', 'notification_type')
    readonly_fields = ('user', 'message', 'notification_type', 'content_type', 'object_id', 'related_object', 'created_at', 'read_at')
    # For direct creation in admin (less common for programmatic notifications):
    # fields = ('user', 'message', 'notification_type', ('content_type', 'object_id'), 'is_read')
    # raw_id_fields = ('user',) # If selecting user

    def message_summary(self, obj):
        return obj.message[:75] + '...' if len(obj.message) > 75 else obj.message
    message_summary.short_description = 'Message'

    def related_object_link(self, obj):
        if obj.related_object:
            # Get the admin URL for the related object
            try:
                app_label = obj.content_type.app_label
                model_name = obj.content_type.model
                admin_url = reverse(f"admin:{app_label}_{model_name}_change", args=(obj.object_id,))
                return format_html('<a href="{}">{} ({})</a>', admin_url, str(obj.related_object)[:30], obj.content_type.name.capitalize())
            except Exception: # Handle if admin URL cannot be resolved
                return f"{str(obj.related_object)[:30]} ({obj.content_type.name.capitalize()})"
        return "N/A"
    related_object_link.short_description = 'Related To'

    # Do not allow adding/changing notifications directly via admin if they are purely programmatic
    # def has_add_permission(self, request):
    #     return False
    # def has_change_permission(self, request, obj=None):
    #      # Allow changing 'is_read' for debugging?
    #      return True # Or False if strictly programmatic
    # def has_delete_permission(self, request, obj=None):
    #     return True # Or False