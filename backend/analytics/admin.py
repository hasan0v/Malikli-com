from django.contrib import admin
from .models import WebsiteEvent


@admin.register(WebsiteEvent)
class WebsiteEventAdmin(admin.ModelAdmin):
    list_display = ("id", "event_type", "path", "user", "session_id", "created_at")
    list_filter = ("event_type", "created_at")
    search_fields = ("path", "session_id", "user__email")
    readonly_fields = ("created_at",)
