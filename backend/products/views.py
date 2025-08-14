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
import csv, io
from orders.inventory import InventoryManager
from rest_framework import parsers

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

    @action(detail=True, methods=['get'], url_path='check-stock')
    def check_stock(self, request, slug=None):
        """
        Check stock levels for all variants of a product.
        Returns inventory status for each variant.
        """
        product = self.get_object()
        variants = product.variants.all()
        
        stock_data = []
        for variant in variants:
            stock_data.append({
                'variant_id': variant.id,
                'sku': f"{product.sku_prefix}-{variant.sku_suffix}",
                'size': variant.size.name if variant.size else None,
                'color': variant.color.name if variant.color else None,
                'stock_quantity': variant.stock_quantity,
                'reserved_quantity': variant.reserved_quantity,
                'available_quantity': variant.available_quantity,
                'low_stock_threshold': variant.low_stock_threshold,
                'is_in_stock': variant.is_in_stock,
                'is_low_stock': variant.is_low_stock,
                'additional_price': variant.additional_price,
            })
        
        return Response({
            'product_id': product.id,
            'product_name': product.name,
            'variants': stock_data
        })

    @action(detail=False, methods=['get'], url_path='low-stock-alerts')
    def low_stock_alerts(self, request):
        """
        Get all products with low stock variants.
        Only accessible to admin users.
        """
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        low_stock_data = InventoryManager.get_low_stock_items()
        
        # Format the response for frontend consumption
        low_stock_variants = []
        for variant in low_stock_data['variants']:
            low_stock_variants.append({
                'variant_id': variant.id,
                'product_id': variant.product.id,
                'product_name': variant.product.name,
                'product_slug': variant.product.slug,
                'variant_name': str(variant),
                'sku': f"{variant.product.sku_prefix}-{variant.sku_suffix}",
                'available_quantity': variant.available_quantity,
                'low_stock_threshold': variant.low_stock_threshold,
                'reserved_quantity': variant.reserved_quantity,
                'stock_quantity': variant.stock_quantity,
            })
        
        low_stock_drops = []
        for drop in low_stock_data['drop_products']:
            low_stock_drops.append({
                'drop_id': drop.id,
                'product_name': drop.product.name,
                'drop_price': drop.drop_price,
                'available_quantity': drop.available_quantity,
                'low_stock_threshold': drop.low_stock_threshold,
                'reserved_quantity': drop.reserved_quantity,
                'stock_quantity': drop.stock_quantity,
            })
        
        return Response({
            'low_stock_variants': low_stock_variants,
            'low_stock_drop_products': low_stock_drops,
            'total_count': len(low_stock_variants) + len(low_stock_drops)
        })

    @action(detail=False, methods=['get'], url_path='low-stock-export', permission_classes=[permissions.IsAdminUser])
    def low_stock_export(self, request):
        """Export low stock variants/drop products as CSV."""
        low_stock_data = InventoryManager.get_low_stock_items()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['type','product_id','product_name','variant_or_drop_id','sku','available_quantity','low_stock_threshold','reserved_quantity','stock_quantity'])
        for variant in low_stock_data['variants']:
            writer.writerow([
                'variant',
                variant.product.id,
                variant.product.name,
                variant.id,
                f"{variant.product.sku_prefix}-{variant.sku_suffix}",
                variant.available_quantity,
                variant.low_stock_threshold,
                variant.reserved_quantity,
                variant.stock_quantity
            ])
        for drop in low_stock_data['drop_products']:
            writer.writerow([
                'drop_product',
                drop.product.id,
                drop.product.name,
                drop.id,
                '',
                drop.available_quantity,
                drop.low_stock_threshold,
                drop.reserved_quantity,
                drop.stock_quantity
            ])
        resp = Response(output.getvalue(), content_type='text/csv')
        resp['Content-Disposition'] = 'attachment; filename="low_stock_export.csv"'
        return resp

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
        sizes = request.data.get('sizes', []) or []
        colors = request.data.get('colors', []) or []

        # Normalize to lists of ints (ignore invalid entries silently)
        def to_int_list(seq):
            out = []
            for v in seq:
                try:
                    out.append(int(v))
                except (ValueError, TypeError):
                    continue
            return out

        sizes = to_int_list(sizes)
        colors = to_int_list(colors)

        # Raw mappings from request
        additional_prices_raw = request.data.get('additional_prices', {}) or {}
        stock_raw = request.data.get('stock', {}) or {}
        low_raw = request.data.get('low_stock_thresholds', {}) or {}

        additional_prices = {}
        stock_map = {}
        low_map = {}

        # Helper to parse mapping dictionaries (keys may be "size-color" or single id)
        def parse_mapping(src_dict, cast_func=float):
            parsed = {}
            for key, val in src_dict.items():
                try:
                    if '-' in str(key):
                        size_id, color_id = map(int, str(key).split('-', 1))
                        parsed[(size_id, color_id)] = cast_func(val)
                    else:
                        parsed[int(key)] = cast_func(val)
                except (ValueError, TypeError):
                    # Skip malformed entries
                    continue
            return parsed

        additional_prices = parse_mapping(additional_prices_raw, cast_func=float)
        stock_map = parse_mapping(stock_raw, cast_func=int)
        low_map = parse_mapping(low_raw, cast_func=int)

        try:
            variants = product.create_variants_from_options(
                sizes=sizes,
                colors=colors,
                additional_prices=additional_prices,
                stock_map=stock_map,
                low_stock_map=low_map
            )
            serializer = ProductVariantSerializer(variants, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='archive', permission_classes=[permissions.IsAdminUser])
    def archive_product(self, request, slug=None):
        """Archive (soft delete) a product by setting is_archived=True"""
        product = self.get_object()
        if product.is_archived:
            return Response({'detail':'Already archived'}, status=200)
        product.is_archived = True
        product.save(update_fields=['is_archived','updated_at'])
        return Response({'status':'archived','product_id':product.id})

    @action(detail=True, methods=['post'], url_path='unarchive', permission_classes=[permissions.IsAdminUser])
    def unarchive_product(self, request, slug=None):
        """Unarchive a product (set is_archived False)"""
        product = self.get_object()
        if not product.is_archived:
            return Response({'detail':'Not archived'}, status=200)
        product.is_archived = False
        product.save(update_fields=['is_archived','updated_at'])
        return Response({'status':'unarchived','product_id':product.id})

    @action(detail=False, methods=['get'], url_path='export-csv', permission_classes=[permissions.IsAdminUser])
    def export_csv(self, request):
        """Export all (non-archived) products with basic info as CSV."""
        products = self.filter_queryset(self.get_queryset())  # apply filters if provided
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['id','name','slug','category','base_price','is_archived','variant_count','created_at'])
        for p in products:
            writer.writerow([
                p.id,
                p.name,
                p.slug,
                p.category.name if p.category else '',
                p.base_price,
                p.is_archived,
                p.variants.count(),
                p.created_at.isoformat()
            ])
        resp = Response(output.getvalue(), content_type='text/csv')
        resp['Content-Disposition'] = 'attachment; filename="products_export.csv"'
        return resp

class AdminProductViewSet(viewsets.ModelViewSet):
    """Full CRUD for products for admin usage"""
    queryset = Product.objects.all().select_related('category').prefetch_related('variants','translations')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'slug'

    @action(detail=True, methods=['post'], url_path='add-translation', permission_classes=[permissions.IsAdminUser])
    def add_translation(self, request, slug=None):
        """Add or update a translation for this product.

        Expected JSON body: {"language_code": "en", "name": "Name", "description": "Desc"}
        """
        product = self.get_object()
        language_code = request.data.get('language_code')
        name = request.data.get('name')
        description = request.data.get('description')
        if not language_code:
            return Response({'error':'language_code required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            product.set_translation(language_code, name=name, description=description)
            # refresh serializer to include new translations
            serializer = self.get_serializer(product)
            return Response(serializer.data.get('translations', []), status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='upload-image', permission_classes=[permissions.IsAdminUser], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def upload_image(self, request, slug=None):
        """Upload a product-level or variant-level image.

        Multipart form fields:
        - image: file (required)
        - alt_text: str (optional)
        - display_order: int (optional, default 0)
        - is_primary: bool (optional)
        - variant_id: int (optional) if attaching to a variant
        """
        product = self.get_object()
        file = request.FILES.get('image')
        if not file:
            return Response({'error':'image file required'}, status=400)
        alt_text = request.data.get('alt_text') or ''
        display_order = request.data.get('display_order') or 0
        try:
            display_order = int(display_order)
        except (ValueError, TypeError):
            display_order = 0
        is_primary = str(request.data.get('is_primary', '')).lower() in ['1','true','yes','on']
        variant_id = request.data.get('variant_id')
        variant = None
        if variant_id:
            try:
                variant = product.variants.get(id=variant_id)
            except ProductVariant.DoesNotExist:
                return Response({'error':'Variant not found for this product'}, status=404)
        img = ProductImage(product=product if not variant else None, variant=variant if variant else None, image=file, alt_text=alt_text, display_order=display_order, is_primary=is_primary)
        img.save()
        # ensure only one primary per scope
        if is_primary:
            scope_qs = ProductImage.objects.filter(variant=variant) if variant else ProductImage.objects.filter(product=product, variant__isnull=True)
            scope_qs.exclude(id=img.id).update(is_primary=False)
        serializer = ProductSerializer(product, context=self.get_serializer_context())
        return Response({'images': serializer.data.get('images', [])}, status=201)

    @action(detail=True, methods=['delete'], url_path='images/(?P<image_id>[^/.]+)', permission_classes=[permissions.IsAdminUser])
    def delete_image(self, request, slug=None, image_id=None):
        """Delete an image belonging to this product (product-level or variant-level)."""
        product = self.get_object()
        img = get_object_or_404(ProductImage, id=image_id)
        # ensure association
        if not (img.product_id == product.id or (img.variant and img.variant.product_id == product.id)):
            return Response({'error':'Image not associated with this product'}, status=400)
        img.delete()
        serializer = ProductSerializer(product, context=self.get_serializer_context())
        return Response({'images': serializer.data.get('images', [])}, status=200)

    @action(detail=True, methods=['post'], url_path='images/(?P<image_id>[^/.]+)/set-primary', permission_classes=[permissions.IsAdminUser])
    def set_primary_image(self, request, slug=None, image_id=None):
        """Set an existing image as primary within its scope (product-level or variant-level)."""
        product = self.get_object()
        img = get_object_or_404(ProductImage, id=image_id)
        # validate association with this product
        if not (img.product_id == product.id or (img.variant and img.variant.product_id == product.id)):
            return Response({'error': 'Image not associated with this product'}, status=400)
        # set primary for scope
        img.is_primary = True
        img.save(update_fields=["is_primary"])
        if img.variant_id:
            ProductImage.objects.filter(variant_id=img.variant_id).exclude(id=img.id).update(is_primary=False)
        else:
            ProductImage.objects.filter(product_id=product.id, variant__isnull=True).exclude(id=img.id).update(is_primary=False)
        serializer = ProductSerializer(product, context=self.get_serializer_context())
        return Response({'images': serializer.data.get('images', [])}, status=200)

    @action(detail=True, methods=['post'], url_path='reorder-images', permission_classes=[permissions.IsAdminUser])
    def reorder_images(self, request, slug=None):
        """Bulk reorder product-level images (and optionally variant-level if variant_id provided per item).

        Expected JSON body:
        {"orders": [ {"id": 12, "display_order": 0}, {"id": 15, "display_order": 1} ] }
        Only updates images belonging to this product (or its variants)."""
        product = self.get_object()
        items = request.data.get('orders', []) or []
        updated_ids = []
        for entry in items:
            try:
                img_id = int(entry.get('id'))
                disp = int(entry.get('display_order', 0))
            except (TypeError, ValueError):
                continue
            try:
                img = ProductImage.objects.get(id=img_id)
            except ProductImage.DoesNotExist:
                continue
            # association check
            if not (img.product_id == product.id or (img.variant and img.variant.product_id == product.id)):
                continue
            if img.display_order != disp:
                img.display_order = disp
                img.save(update_fields=['display_order'])
            updated_ids.append(img.id)
        serializer = ProductSerializer(product, context=self.get_serializer_context())
        return Response({'updated': updated_ids, 'images': serializer.data.get('images', [])})

    @action(detail=True, methods=['post'], url_path='images/(?P<image_id>[^/.]+)/update-alt', permission_classes=[permissions.IsAdminUser])
    def update_image_alt(self, request, slug=None, image_id=None):
        """Update alt_text for a product or variant image."""
        product = self.get_object()
        img = get_object_or_404(ProductImage, id=image_id)
        if not (img.product_id == product.id or (img.variant and img.variant.product_id == product.id)):
            return Response({'error':'Image not associated with this product'}, status=400)
        alt = request.data.get('alt_text','')[:255]
        img.alt_text = alt
        img.save(update_fields=['alt_text'])
        serializer = ProductSerializer(product, context=self.get_serializer_context())
        return Response({'images': serializer.data.get('images', [])})

class AdminProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.all().select_related('product','size','color')
    serializer_class = ProductVariantSerializer
    permission_classes = [permissions.IsAdminUser]

class AdminSizeViewSet(viewsets.ModelViewSet):
    queryset = Size.objects.all().order_by('display_order', 'name')
    serializer_class = SizeSerializer
    permission_classes = [permissions.IsAdminUser]

class AdminColorViewSet(viewsets.ModelViewSet):
    queryset = Color.objects.all().order_by('display_order', 'name')
    serializer_class = ColorSerializer
    permission_classes = [permissions.IsAdminUser]

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