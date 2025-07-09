"""
Utility functions for the drops app.
"""
from django.conf import settings

def drop_banner_image_path(instance, filename):
    """
    Define a path structure for drop banner images.
    Returns a path like 'drop_banners/<drop_slug>/<filename>'
    """
    return f'drop_banners/{instance.slug}/{filename}'
