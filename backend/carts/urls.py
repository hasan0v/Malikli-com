# carts/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartViewSet

router = DefaultRouter()
# Registering with cart_id as the lookup.
# The 'mine' action provides a way to get the cart without knowing the ID upfront.
router.register(r'carts', CartViewSet, basename='cart')

urlpatterns = [
    path('', include(router.urls)),
]