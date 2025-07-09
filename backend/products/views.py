# products/views.py
from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend # For filtering
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import translation
from django.conf import settings
from .models import Category, Product, ProductVariant, ProductImage, Size, Color
from .filters import ProductFilter # <--- IMPORT YOUR CUSTOM FILTERSET
from .serializers import (
    CategorySerializer, ProductSerializer,
    ProductVariantSerializer, ProductImageSerializer,
    SizeSerializer, ColorSerializer
)
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

class I18nMixin:
    """
    Mixin to handle language switching in API views
    """
    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Get language from request headers or query parameters
        lang = self.request.GET.get('lang')
        
        print(f"DEBUG - I18nMixin - Request lang param: {lang}")
        print(f"DEBUG - I18nMixin - Accept-Language header: {self.request.META.get('HTTP_ACCEPT_LANGUAGE', 'Not provided')}")
        
        # If lang is explicitly provided in query param, use it
        if lang and lang in dict(settings.LANGUAGES):
            translation.activate(lang)
            context['request_language'] = lang
            print(f"DEBUG - I18nMixin - Setting language from query param: {lang}")
            return context
            
        # Otherwise check Accept-Language header
        accept_lang = self.request.META.get('HTTP_ACCEPT_LANGUAGE', '')
        if accept_lang:
            # Extract base language code (e.g., 'ru' from 'ru-RU')
            for lang_entry in accept_lang.split(','):
                parts = lang_entry.split(';', 1)
                lang_code = parts[0].strip()
                
                # Try the exact language code
                if lang_code in dict(settings.LANGUAGES):
                    translation.activate(lang_code)
                    context['request_language'] = lang_code
                    print(f"DEBUG - I18nMixin - Setting language from exact Accept-Language: {lang_code}")
                    return context
                
                # Try the base language code (e.g., 'en' from 'en-US')
                base_lang = lang_code.split('-')[0]
                if base_lang in dict(settings.LANGUAGES):
                    translation.activate(base_lang)
                    context['request_language'] = base_lang
                    print(f"DEBUG - I18nMixin - Setting language from base Accept-Language: {base_lang}")
                    return context
        
        # Default to system default language
        translation.activate(settings.LANGUAGE_CODE)
        context['request_language'] = settings.LANGUAGE_CODE
        print(f"DEBUG - I18nMixin - Setting default language: {settings.LANGUAGE_CODE}")
        return context

class CategoryViewSet(I18nMixin, viewsets.ReadOnlyModelViewSet): # ReadOnly for now, admin can create via Django Admin
    queryset = Category.objects.filter(is_active=True, parent_category__isnull=True).prefetch_related('subcategories', 'translations').select_related() # Top-level categories with optimized queries
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny] # Categories are public
    lookup_field = 'slug' # Allow lookup by slug

class ProductViewSet(I18nMixin, viewsets.ReadOnlyModelViewSet): # ReadOnly for now
    queryset = Product.objects.filter(is_archived=False).select_related('category').prefetch_related(
        'variants__size', 
        'variants__color', 
        'variants__images',
        'images',
        'translations',
        'category__translations'
    )
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    # filterset_fields = ['category__slug', 'tags'] # Remove this line
    filterset_class = ProductFilter # <--- USE YOUR CUSTOM FILTERSET CLASS
    search_fields = ['name', 'description', 'category__name']
    ordering_fields = ['name', 'base_price', 'created_at']
    ordering = ['-created_at']  # Default ordering

    @action(detail=True, methods=['post'], url_path='create-variants', permission_classes=[permissions.IsAdminUser])
    def create_variants(self, request, slug=None):
        """
        Create variants for a product in bulk based on sizes and colors.
        
        POST data format:
        {
            "sizes": [1, 2, 3],  # Size IDs for S, M, L
            "colors": [1, 2],    # Color IDs for Red, Blue
            "additional_prices": {
                "1-1": 0,         # Small-Red: no additional cost
                "2-1": 5,         # Medium-Red: $5 additional
                "3-1": 10,        # Large-Red: $10 additional
                "1-2": 2,         # Small-Blue: $2 additional
                "2-2": 7,         # Medium-Blue: $7 additional
                "3-2": 12         # Large-Blue: $12 additional
            }
        }
        """
        product = self.get_object()
        sizes = request.data.get('sizes', [])
        colors = request.data.get('colors', [])
        
        # Convert string prices to a proper mapping
        additional_prices_raw = request.data.get('additional_prices', {})
        additional_prices = {}
        
        for key, price in additional_prices_raw.items():
            try:
                # Parse keys like "1-2" into (1, 2) tuples
                if '-' in key:
                    size_id, color_id = map(int, key.split('-'))
                    additional_prices[(size_id, color_id)] = float(price)
                else:
                    # Handle single value keys (for size-only or color-only variants)
                    additional_prices[int(key)] = float(price)
            except (ValueError, TypeError):
                pass
                
        try:
            variants = product.create_variants_from_options(
                sizes=sizes, 
                colors=colors,
                additional_prices=additional_prices
            )
            serializer = ProductVariantSerializer(variants, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class SizeViewSet(I18nMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Size.objects.all()
    serializer_class = SizeSerializer
    permission_classes = [permissions.AllowAny]
    ordering_fields = ['display_order', 'name']
    ordering = ['display_order', 'name']

class ColorViewSet(I18nMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Color.objects.all()
    serializer_class = ColorSerializer
    permission_classes = [permissions.AllowAny]
    ordering_fields = ['display_order', 'name']
    ordering = ['display_order', 'name']

# If you need admin to manage these via API (not just Django Admin):
# class AdminCategoryViewSet(viewsets.ModelViewSet):
#     queryset = Category.objects.all()
#     serializer_class = CategorySerializer
#     permission_classes = [permissions.IsAdminUser]
#     lookup_field = 'slug'

# class AdminProductViewSet(viewsets.ModelViewSet):
#     queryset = Product.objects.all().prefetch_related('variants', 'images')
#     serializer_class = ProductSerializer # Potentially a different one for create/update
#     permission_classes = [permissions.IsAdminUser]
#     lookup_field = 'slug'
    # Add logic for creating/updating variants and images if needed