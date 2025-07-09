from django.db import models
from django.conf import settings

class ProductTranslation(models.Model):
    """Model to store product translations"""
    product = models.ForeignKey(
        'Product', 
        on_delete=models.CASCADE, 
        related_name='translations'
    )
    language_code = models.CharField(
        max_length=10, 
        choices=settings.LANGUAGES,
        db_index=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['product', 'language_code']]
        indexes = [
            models.Index(fields=['product', 'language_code']),
            models.Index(fields=['language_code']),
        ]
    
    def __str__(self):
        return f"{self.product.name} ({self.get_language_code_display()})"


class CategoryTranslation(models.Model):
    """Model to store category translations"""
    category = models.ForeignKey(
        'Category', 
        on_delete=models.CASCADE, 
        related_name='translations'
    )
    language_code = models.CharField(
        max_length=10, 
        choices=settings.LANGUAGES,
        db_index=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['category', 'language_code']]
        indexes = [
            models.Index(fields=['category', 'language_code']),
            models.Index(fields=['language_code']),
        ]
    
    def __str__(self):
        return f"{self.category.name} ({self.get_language_code_display()})"
