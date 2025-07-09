# drops/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
# from rest_framework_nested import routers # For nested resources if desired
from .views import DropViewSet, AdminDropViewSet, AdminDropProductViewSet

# Public router
public_router = DefaultRouter()
public_router.register(r'drops', DropViewSet, basename='drop')

# Admin router
admin_router = DefaultRouter()
admin_router.register(r'drops', AdminDropViewSet, basename='admin-drop')
admin_router.register(r'drop-products', AdminDropProductViewSet, basename='admin-drop-product')

# Example for nested: products within a specific drop (admin context)
# drop_products_router = routers.NestedSimpleRouter(admin_router, r'drops', lookup='drop')
# drop_products_router.register(r'products', AdminDropProductSpecificViewSet, basename='admin-drop-specific-product')


urlpatterns = [
    path('', include(public_router.urls)), # Public endpoints like /api/v1/drops/
    path('admin/', include(admin_router.urls)), # Admin endpoints like /api/v1/admin/drops/
    # path('admin/', include(drop_products_router.urls)), # If using nested router
]