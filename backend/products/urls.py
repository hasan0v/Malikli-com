# products/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ProductViewSet, SizeViewSet, ColorViewSet,
    AdminProductViewSet, AdminProductVariantViewSet, AdminSizeViewSet, AdminColorViewSet
)
from .translation_views import ProductTranslationViewSet, CategoryTranslationViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'sizes', SizeViewSet, basename='size')
router.register(r'colors', ColorViewSet, basename='color')
router.register(r'product-translations', ProductTranslationViewSet, basename='product-translation')
router.register(r'category-translations', CategoryTranslationViewSet, basename='category-translation')

# For Admin (if created)
admin_router = DefaultRouter()
admin_router.register(r'products', AdminProductViewSet, basename='admin-product')
admin_router.register(r'variants', AdminProductVariantViewSet, basename='admin-product-variant')
admin_router.register(r'sizes', AdminSizeViewSet, basename='admin-size')
admin_router.register(r'colors', AdminColorViewSet, basename='admin-color')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', include(admin_router.urls)), # Admin-specific endpoints (canonical)
    
    # R2 Storage Test Routes have been removed.
]