from django.contrib import admin
from .models import Language

@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'native_name', 'is_active', 'is_default', 'is_rtl', 'display_order')
    list_filter = ('is_active', 'is_default', 'is_rtl')
    search_fields = ('code', 'name', 'native_name')
    ordering = ('display_order', 'name')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'native_name', 'display_order')
        }),
        ('Configuration', {
            'fields': ('is_active', 'is_default', 'is_rtl', 'flag_code')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """
        When saving a language through the admin interface
        """
        super().save_model(request, obj, form, change)
        
        # Ensure LANGUAGES setting is updated
        Language.update_available_languages()
