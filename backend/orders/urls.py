# orders/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ShippingMethodViewSet, OrderViewSet, CreateOrderView, CreateDirectOrderView, 
    PaymentCallbackView, AdminOrderViewSet, InitiatePaymentView, PayProWebhookView,
    CreatePaymentSessionView, ProcessPaymentView, CheckPaymentStatusView,
    CreateRecurringPaymentView, CreateOneClickPaymentView,
    PaymentSuccessView, PaymentCancelView, PaymentFailedView
)
from .currency_api_views import (
    get_exchange_rate, convert_eur_to_byn, 
    get_exchange_rate_simple, convert_eur_to_byn_simple
)

router = DefaultRouter()
router.register(r'shipping-methods', ShippingMethodViewSet, basename='shipping-method')
router.register(r'orders', OrderViewSet, basename='order') # For listing/retrieving user's orders

# Admin router
admin_router = DefaultRouter()
admin_router.register(r'orders', AdminOrderViewSet, basename='admin-order')

urlpatterns = [
    # Currency API endpoints
    path('currency/rate/', get_exchange_rate, name='get-exchange-rate'),
    path('currency/convert/', convert_eur_to_byn, name='convert-eur-to-byn'),
    
    # Order creation endpoints
    path('orders/create/', CreateOrderView.as_view(), name='create-order'),
    path('orders/create-direct/', CreateDirectOrderView.as_view(), name='create-direct-order'),
    
    # Payment initiation endpoints
    path('payments/initiate/', InitiatePaymentView.as_view(), name='initiate-payment'),
    path('payments/session/', CreatePaymentSessionView.as_view(), name='create-payment-session'),
    path('payments/process/', ProcessPaymentView.as_view(), name='process-payment'),
    path('payments/status/', CheckPaymentStatusView.as_view(), name='check-payment-status'),
    path('payments/recurring/', CreateRecurringPaymentView.as_view(), name='create-recurring-payment'),
    path('payments/oneclick/', CreateOneClickPaymentView.as_view(), name='create-oneclick-payment'),
    
    # Payment return/callback endpoints (called by PayPro after hosted checkout)
    path('payment/success/', PaymentSuccessView.as_view(), name='payment-success'),
    path('payment/cancelled/', PaymentCancelView.as_view(), name='payment-cancelled'),
    path('payment/failed/', PaymentFailedView.as_view(), name='payment-failed'),
    path('payment/declined/', PaymentFailedView.as_view(), name='payment-declined'),  # Alias for failed
    
    # Legacy payment callback (for non-PayPro payments)
    path('orders/payment-callback/', PaymentCallbackView.as_view(), name='payment-callback'),
    
    # Admin endpoints
    path('admin/', include(admin_router.urls)),
    
    # Standard endpoints
    path('', include(router.urls)), # Includes shipping-methods and orders list/detail
]

# Webhook endpoints (separate for easier management)
webhook_patterns = [
    path('webhooks/paypro/', PayProWebhookView.as_view(), name='paypro-webhook'),
]

urlpatterns += webhook_patterns