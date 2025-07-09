from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Language(models.Model):
    """
    Model for storing available languages in the system
    """
    code = models.CharField(max_length=10, unique=True, db_index=True,
                           help_text=_("Language code (e.g., 'en', 'ru', 'ar')"))
    name = models.CharField(max_length=100,
                           help_text=_("Language name in English (e.g., 'English', 'Russian')"))
    native_name = models.CharField(max_length=100,
                                  help_text=_("Language name in its native form (e.g., 'English', 'Русский')"))
    is_active = models.BooleanField(default=True,
                                   help_text=_("Whether this language is active and available for users"))
    is_default = models.BooleanField(default=False,
                                    help_text=_("Whether this is the default language"))
    is_rtl = models.BooleanField(default=False,
                                help_text=_("Whether this language is written right-to-left"))
    display_order = models.PositiveSmallIntegerField(default=0,
                                                   help_text=_("Order in which to display this language in the switcher"))
    flag_code = models.CharField(max_length=2, blank=True, null=True,
                                help_text=_("Two-letter country code for the flag (e.g., 'us', 'ru')"))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = _("Language")
        verbose_name_plural = _("Languages")
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def save(self, *args, **kwargs):
        # Only one language can be default
        if self.is_default:
            Language.objects.filter(is_default=True).update(is_default=False)
        
        # If no default language exists, make this one default
        if not Language.objects.filter(is_default=True).exists():
            self.is_default = True
            
        super().save(*args, **kwargs)
        
        # Update Django settings.LANGUAGES
        self.update_available_languages()
    
    @classmethod
    def update_available_languages(cls):
        """
        Update the settings.LANGUAGES tuple based on active languages in the database
        """
        languages = cls.objects.filter(is_active=True).order_by('display_order', 'name')
        if languages.exists():
            settings.LANGUAGES = [(lang.code, lang.native_name) for lang in languages]
            
            # Update default language if needed
            default_lang = cls.objects.filter(is_default=True, is_active=True).first()
            if default_lang:
                settings.LANGUAGE_CODE = default_lang.code
