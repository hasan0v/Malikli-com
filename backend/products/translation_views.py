from django.shortcuts import get_object_or_404
from django.utils import translation
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Product, ProductTranslation, Category, CategoryTranslation
from .serializers import ProductTranslationSerializer, CategoryTranslationSerializer

class ProductTranslationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing product translations
    """
    serializer_class = ProductTranslationSerializer
    
    def get_queryset(self):
        product_id = self.kwargs.get('product_id')
        if product_id:
            return ProductTranslation.objects.filter(product_id=product_id)
        return ProductTranslation.objects.all()
    
    def perform_create(self, serializer):
        product_id = self.kwargs.get('product_id')
        if product_id:
            product = get_object_or_404(Product, id=product_id)
            serializer.save(product=product)
        else:
            serializer.save()

class CategoryTranslationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing category translations
    """
    serializer_class = CategoryTranslationSerializer
    
    def get_queryset(self):
        category_id = self.kwargs.get('category_id')
        if category_id:
            return CategoryTranslation.objects.filter(category_id=category_id)
        return CategoryTranslation.objects.all()
    
    def perform_create(self, serializer):
        category_id = self.kwargs.get('category_id')
        if category_id:
            category = get_object_or_404(Category, id=category_id)
            serializer.save(category=category)
        else:
            serializer.save()

# Utility functions for translation management
def get_or_create_product_translation(product, language_code, name=None, description=None):
    """
    Get or create a product translation for the given language
    """
    translation_obj, created = ProductTranslation.objects.get_or_create(
        product=product,
        language_code=language_code,
        defaults={
            'name': name or product.name,
            'description': description or product.description
        }
    )
    
    if not created and (name or description):
        if name:
            translation_obj.name = name
        if description is not None:
            translation_obj.description = description
        translation_obj.save()
    
    return translation_obj

def get_or_create_category_translation(category, language_code, name=None, description=None):
    """
    Get or create a category translation for the given language
    """
    translation_obj, created = CategoryTranslation.objects.get_or_create(
        category=category,
        language_code=language_code,
        defaults={
            'name': name or category.name,
            'description': description or category.description
        }
    )
    
    if not created and (name or description):
        if name:
            translation_obj.name = name
        if description is not None:
            translation_obj.description = description
        translation_obj.save()
    
    return translation_obj
