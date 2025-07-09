"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('users.urls')),
    path('api/v1/', include('products.urls')), # Your products app URLs (root for products and categories)
    path('api/v1/', include('drops.urls')),    # Add this for public and admin drop endpoints
    path('api/v1/', include('carts.urls')),    # Add this for cart endpoints
    path('api/v1/', include('orders.urls')),   # Uncomment when orders app is ready
    path('api/v1/', include('notifications_app.urls')), # Uncomment when notifications app is ready
    path('api/v1/', include('languages.urls')), # Language management API
]

# Only add this in development for serving media files locally
# This is NOT for production use - in production, your web server or CDN should handle static/media files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)