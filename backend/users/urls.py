# users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, 
    UserProfileView, 
    AddressViewSet,
    GuestAddressViewSet,
    ChangePasswordView,
    password_reset_request,
    password_reset_confirm,
    send_verification_email_view,
    verify_email,
    AdminUserViewSet,
    convert_waitlist_subscriber
)
from .authentication import CustomTokenObtainPairView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'admin-users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # JWT Login
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # JWT Refresh
    path('login/verify/', TokenVerifyView.as_view(), name='token_verify'),   # JWT Verify
    path('profile/', UserProfileView.as_view(), name='user_profile'),    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('password-reset/', password_reset_request, name='password_reset_request'),
    path('password-reset/confirm/', password_reset_confirm, name='password_reset_confirm'),
    path('send-verification-email/', send_verification_email_view, name='send_verification_email'),
    path('verify-email/', verify_email, name='verify_email'),
    path('guest-address/', GuestAddressViewSet.as_view(), name='guest_address_create'),
    path('convert-waitlist/', convert_waitlist_subscriber, name='convert_waitlist'),
    path('', include(router.urls)), # Includes AddressViewSet URLs
]