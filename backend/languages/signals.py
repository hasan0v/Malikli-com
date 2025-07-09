from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Language

@receiver(post_save, sender=Language)
def language_saved(sender, instance, **kwargs):
    """Update available languages when a language is saved"""
    Language.update_available_languages()

@receiver(post_delete, sender=Language)
def language_deleted(sender, instance, **kwargs):
    """Update available languages when a language is deleted"""
    Language.update_available_languages()
