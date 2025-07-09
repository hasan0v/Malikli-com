# orders/views.py
import uuid
import logging
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import viewsets, generics, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import ShippingMethod, Order, Payment
from .serializers import (
    ShippingMethodSerializer, OrderSerializer, OrderCreateSerializer,
    PaymentSerializer, DirectOrderCreateSerializer
)
from drops.models import DropProduct
from rest_framework.views import APIView
from .paypro_service import PayProService
from .currency_service import currency_converter
from decimal import Decimal

class ShippingMethodViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ShippingMethod.objects.filter(is_active=True)
    serializer_class = ShippingMethodSerializer
    permission_classes = [permissions.AllowAny] # Publicly viewable

class OrderViewSet(mixins.ListModelMixin,
                   mixins.RetrieveModelMixin,
                   # mixins.CreateModelMixin, # Handled by dedicated CreateOrderView
                   viewsets.GenericViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated] # Users can only see their own orders
    lookup_field = 'order_id' # Use UUID for lookup

    def get_queryset(self):
        # Users can only see their own orders. Admins can see all (if IsAdminUser perm added).
        user = self.request.user
        if user.is_staff: # Or use IsAdminUser permission class
            return Order.objects.all().prefetch_related(
                'items__drop_product__product__images', 'items__drop_product__variant',
                'payments', 'shipping_address', 'billing_address', 'shipping_method'
            )
        return Order.objects.filter(user=user).prefetch_related(
            'items__drop_product__product__images', 'items__drop_product__variant',
            'payments', 'shipping_address', 'billing_address', 'shipping_method'
        )

    @action(detail=True, methods=['post'])
    def cancel(self, request, order_id=None):
        """Cancel an order if it's in a cancellable state"""
        order = self.get_object()
        
        # Check if order can be cancelled
        if order.order_status not in ['pending_payment', 'processing']:
            return Response(
                {'detail': 'Order cannot be cancelled at this stage.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update order status
        order.order_status = 'cancelled'
        order.payment_status = 'refunded' if order.payment_status == 'paid' else order.payment_status
        order.save()
        
        # TODO: Restore stock quantities
        for item in order.items.all():
            DropProduct.objects.filter(id=item.drop_product.id).update(
                current_stock_quantity=models.F('current_stock_quantity') + item.quantity
            )
        
        # TODO: Process refund if payment was made
        
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reorder(self, request, order_id=None):
        """Add all items from this order back to the user's cart"""
        order = self.get_object()
        
        from carts.models import Cart, CartItem
        
        # Get or create user's cart
        cart, created = Cart.objects.get_or_create(
            user=request.user,
            defaults={'cart_id': uuid.uuid4()}
        )
        
        items_added = 0
        items_unavailable = []
        
        for order_item in order.items.all():
            drop_product = order_item.drop_product
            
            # Check if product is still available
            if drop_product.current_stock_quantity < order_item.quantity:
                items_unavailable.append({
                    'name': order_item.product_name_snapshot,
                    'requested': order_item.quantity,
                    'available': drop_product.current_stock_quantity
                })
                continue
            
            # Add to cart or update existing cart item
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                drop_product=drop_product,
                defaults={'quantity': order_item.quantity}
            )
            
            if not created:
                # Update quantity if item already in cart
                new_quantity = cart_item.quantity + order_item.quantity
                if new_quantity <= drop_product.current_stock_quantity:
                    cart_item.quantity = new_quantity
                    cart_item.save()
                else:
                    items_unavailable.append({
                        'name': order_item.product_name_snapshot,
                        'requested': order_item.quantity,
                        'available': max(0, drop_product.current_stock_quantity - cart_item.quantity)
                    })
                    continue
            
            items_added += 1
        
        message = f'{items_added} items added to cart'
        if items_unavailable:
            message += f'. {len(items_unavailable)} items unavailable or insufficient stock.'
        
        return Response({
            'success': True,
            'message': message,
            'items_added': items_added,
            'items_unavailable': items_unavailable,
            'cart_id': str(cart.cart_id)
        })

class CreateOrderView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.AllowAny] # Allow guests or authenticated users
                                               # Permissions on cart/address ownership handled in serializer    
    def perform_create(self, serializer):
        # Serializer's create method handles the actual object creation and logic
        order = serializer.save()
        # Optionally, trigger email notifications, etc. here or with signals
        # The response will be the created order, using OrderSerializer
        # Need to pass the created order instance to OrderSerializer
        # This is tricky because the create method of this view expects to return the output of serializer.save()
        # One way is to override create method of this view entirely.

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save() # This calls OrderCreateSerializer.create()
        
        # Send order confirmation email
        self._send_order_confirmation_email(order, request)
        
        # Now serialize the created order for the response using OrderSerializer
        response_serializer = OrderSerializer(order, context={'request': request})
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def _send_order_confirmation_email(self, order, request):
        """Send order confirmation email to user or guest"""
        from users.email_utils import send_order_confirmation_email
        
        try:
            # For guest orders, get email from request data
            user_email = None
            if not order.user and hasattr(request, 'data'):
                # Try both field names for compatibility
                user_email = request.data.get('email_for_guest') or request.data.get('guest_email')
            
            success = send_order_confirmation_email(order, user_email)
            if success:
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Order confirmation email sent for order {order.order_number}")
            else:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to send order confirmation email for order {order.order_number}")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending order confirmation email for order {order.order_number}: {e}")

class CreateDirectOrderView(generics.CreateAPIView):
    """
    Create an order directly from product information without requiring a cart.
    Used for single-item purchases like Buy Now functionality.
    """
    serializer_class = DirectOrderCreateSerializer
    permission_classes = [permissions.AllowAny] # Allow guests or authenticated users

    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"=== CREATE DIRECT ORDER REQUEST ===")
        logger.info(f"Request data: {request.data}")
        logger.info(f"User authenticated: {request.user.is_authenticated}")
        logger.info(f"User: {request.user}")
        
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            logger.error(f"=== VALIDATION ERROR ===")
            logger.error(f"Validation errors: {serializer.errors}")
            logger.error(f"Exception: {str(e)}")
            return Response(
                {'error': 'Validation failed', 'details': serializer.errors}, 
                status=status.HTTP_400_BAD_REQUEST            )
        
        try:
            order = serializer.save() # This calls DirectOrderCreateSerializer.create()
            logger.info(f"=== ORDER CREATED SUCCESSFULLY ===")
            logger.info(f"Order ID: {order.order_id}")
            
            # Send order confirmation email
            self._send_order_confirmation_email(order, request)
            
            # Serialize the created order for the response using OrderSerializer
            response_serializer = OrderSerializer(order, context={'request': request})
            headers = self.get_success_headers(response_serializer.data)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            logger.error(f"=== ORDER CREATION ERROR ===")
            logger.error(f"Exception: {str(e)}")
            logger.error(f"Exception type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': 'Order creation failed', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _send_order_confirmation_email(self, order, request):
        """Send order confirmation email to user or guest"""
        from users.email_utils import send_order_confirmation_email
        
        try:
            # For guest orders, get email from request data
            user_email = None
            if not order.user and hasattr(request, 'data'):
                # Try both field names for compatibility
                user_email = request.data.get('email_for_guest') or request.data.get('guest_email')
            
            success = send_order_confirmation_email(order, user_email)
            if success:
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Order confirmation email sent for order {order.order_number}")
            else:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to send order confirmation email for order {order.order_number}")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending order confirmation email for order {order.order_number}: {e}")

@method_decorator(csrf_exempt, name='dispatch')
class PaymentCallbackView(APIView):
    """
    Handle payment callbacks from external banking systems.
    This endpoint should NOT require authentication since it's called by external systems.
    CSRF is disabled since this is called by external systems.
    """
    permission_classes = [permissions.AllowAny]  # Allow unauthenticated access
    def post(self, request):
        """Process payment callback"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"Payment callback received: {request.data}")
            
            status_param = request.data.get('status')
            uid = request.data.get('uid')
            token = request.data.get('token')
            
            if not uid:
                logger.error("Missing UID parameter in payment callback")
                return Response(
                    {'success': False, 'message': 'Missing required parameter: uid'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Find the order by UID
            try:
                order = Order.objects.get(order_id=uid)
            except Order.DoesNotExist:                return Response(
                    {'success': False, 'message': 'Order not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update order status based on payment result
            if status == 'success':
                order.order_status = 'processing'
                order.payment_status = 'paid'
                
                # Create a payment record
                Payment.objects.create(
                    order=order,
                    payment_method_type='bank_transfer',
                    gateway_transaction_id=token or f'bank_{uid}',
                    amount=order.total_amount,
                    status='succeeded'
                )
                
                message = 'Payment successful, order confirmed'
            
            elif status == 'failed':
                order.order_status = 'failed'
                order.payment_status = 'failed'
                
                # Restore stock quantities
                for item in order.items.all():
                    DropProduct.objects.filter(id=item.drop_product.id).update(
                        current_stock_quantity=models.F('current_stock_quantity') + item.quantity
                    )
                
                # Create a failed payment record
                Payment.objects.create(
                    order=order,
                    payment_method_type='bank_transfer',
                    gateway_transaction_id=token or f'bank_{uid}',
                    amount=order.total_amount,
                    status='failed'
                )
                
                message = 'Payment failed, order cancelled'
            
            else:                return Response(
                    {'success': False, 'message': 'Invalid status parameter'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            order.save()
            
            return Response({
                'success': True,
                'orderId': order.order_id,
                'order_number': order.order_number,
                'status': order.order_status,
                'payment_status': order.payment_status,
                'message': message
            })
            
        except Exception as e:            return Response(
                {'success': False, 'message': f'Internal server error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminOrderViewSet(viewsets.ModelViewSet):
    """
    Admin-only viewset for managing all orders
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    lookup_field = 'order_id'  # Use UUID for lookup
    filterset_fields = ['order_status', 'payment_status', 'created_at']
    search_fields = ['order_number', 'user__email', 'user__username']
    ordering_fields = ['created_at', 'total_amount', 'order_status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return all orders for admin users"""
        return Order.objects.all().select_related('user', 'shipping_method').prefetch_related('items__drop_product')
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, order_id=None):
        """Update order status - admin only"""
        order = self.get_object()
        new_status = request.data.get('order_status')
        
        if new_status not in dict(Order.ORDER_STATUS_CHOICES).keys():
            return Response(
                {'detail': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.order_status = new_status
        order.save()
        
        serializer = self.get_serializer(order)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_payment_status(self, request, order_id=None):
        """Update payment status - admin only"""
        order = self.get_object()
        new_status = request.data.get('payment_status')
        
        if new_status not in dict(Order.PAYMENT_STATUS_CHOICES).keys():
            return Response(
                {'detail': 'Invalid payment status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.payment_status = new_status
        order.save()
        
        serializer = self.get_serializer(order)
        return Response(serializer.data)

class CreatePaymentSessionView(APIView):
    """
    Create a PayPro payment session/token for an order
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        logger = logging.getLogger(__name__)
        try:
            order_id = request.data.get('order_id')
            if not order_id:
                return Response({
                    'error': 'Missing required field: order_id'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                return Response({
                    'error': 'Order not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            if order.payment_status != 'pending':
                return Response({
                    'error': 'Order payment already processed or not in pending state'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            customer_email = order.user.email if order.user else order.email_for_guest
            if not customer_email:
                return Response({
                    'error': 'Customer email not found'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Prepare order data for PayPro
            order_data = {
                'order_id': str(order.order_id),
                'amount': str(order.total_amount),
                'currency': getattr(settings, 'PAYMENT_CURRENCY', 'EUR'),
                'customer_email': customer_email,
                'customer_first_name': order.user.first_name if order.user else 'Name',
                'customer_last_name': order.user.last_name if order.user else 'Surname',
                'description': f"Payment for Order #{order.order_number}",
                'language': request.data.get('language', 'en')
            }
            
            # Add optional receipt text if provided
            if request.data.get('receipt_text'):
                order_data['receipt_text'] = request.data['receipt_text']
            
            paypro_service = PayProService()
            success, response_data = paypro_service.create_payment_token(order_data)
            
            if success:
                # Return payment session data
                return Response({
                    'success': True,
                    'token': response_data.get('token'),
                    'session_id': response_data.get('session_id'),  # For backward compatibility
                    'payment_url': response_data.get('payment_url'),
                    'redirect_url': response_data.get('redirect_url'),
                    'amount': order.total_amount,
                    'currency': order_data['currency'],
                    'order_id': str(order.order_id)
                }, status=status.HTTP_200_OK)
            else:
                error_code = response_data.get('error_code', 'UNKNOWN_ERROR')
                error_message = response_data.get('error_message', 'Unknown error occurred')
                
                logger.error(f"PayPro payment token creation failed for order {order_id}: {error_code} - {error_message}")
                
                return Response({
                    'success': False,
                    'error_code': error_code,
                    'error_message': error_message,
                    'error_details': response_data.get('error_details', [])
                }, status=status.HTTP_400_BAD_REQUEST if error_code == 'VALIDATION_ERROR' else status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Unexpected error in payment session creation: {e}")
            return Response({
                'success': False,
                'error': 'Internal server error',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProcessPaymentView(APIView):
    """
    Process payment or check payment status using PayPro
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        logger = logging.getLogger(__name__)
        try:
            # Check if this is a status check or payment processing request
            token = request.data.get('token') or request.data.get('session_id')
            order_id = request.data.get('order_id')
            
            if not token and not order_id:
                return Response({
                    'error': 'Either token or order_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # If order_id is provided, validate the order
            if order_id:
                try:
                    order = Order.objects.get(order_id=order_id)
                except Order.DoesNotExist:
                    return Response({
                        'error': 'Order not found'
                    }, status=status.HTTP_404_NOT_FOUND)
                
                if order.payment_status == 'paid':
                    return Response({
                        'success': True,
                        'status': 'already_paid',
                        'message': 'Order payment already completed',
                        'order_id': str(order.order_id)
                    }, status=status.HTTP_200_OK)
            
            paypro_service = PayProService()
            
            if token:
                # Check payment status using token
                success, response_data = paypro_service.get_payment_status(token)
            else:
                # This shouldn't happen given our validation above, but handle it
                return Response({
                    'error': 'Token is required for payment status check'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if success:
                # Parse PayPro response to determine payment status
                checkout_data = response_data.get('checkout', {})
                transaction_data = response_data.get('transaction', {})
                
                payment_status = (transaction_data.get('status') or 
                                checkout_data.get('status') or 
                                'unknown')
                
                transaction_id = (transaction_data.get('id') or 
                                checkout_data.get('token'))
                
                tracking_id = (checkout_data.get('order', {}).get('tracking_id') or 
                              transaction_data.get('tracking_id'))
                
                # Update order if payment is completed and we have order context
                if order_id and payment_status in ['completed', 'succeeded', 'success', 'paid']:
                    try:
                        order = Order.objects.get(order_id=order_id)
                        if order.payment_status == 'pending':
                            # Create payment record
                            Payment.objects.create(
                                order=order,
                                payment_method_type='paypro_card',
                                gateway_transaction_id=transaction_id,
                                amount=order.total_amount,
                                currency_code=getattr(settings, 'PAYMENT_CURRENCY', 'EUR'),
                                status='succeeded',
                                payment_details=response_data
                            )
                            
                            # Update order status
                            order.payment_status = 'paid'
                            order.order_status = 'processing'
                            order.save()
                            
                            logger.info(f"Order {order_id} payment completed via PayPro")
                    except Order.DoesNotExist:
                        pass  # Order not found, continue with status response
                
                return Response({
                    'success': True,
                    'status': payment_status,
                    'transaction_id': transaction_id,
                    'tracking_id': tracking_id,
                    'order_id': order_id,
                    'message': f'Payment status: {payment_status}',
                    'payment_data': response_data
                }, status=status.HTTP_200_OK)
            else:
                error_code = response_data.get('error_code', 'UNKNOWN_ERROR')
                error_message = response_data.get('error_message', 'Payment status check failed')
                
                logger.error(f"PayPro payment status check failed: {error_code} - {error_message}")
                
                return Response({
                    'success': False,
                    'error_code': error_code,
                    'error_message': error_message
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Unexpected error in payment processing: {e}")
            return Response({
                'success': False,
                'error': 'Internal server error',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InitiatePaymentView(APIView):
    """
    Initiate payment by creating a PayPro token and returning redirect URL
    This replaces the local payment form with PayPro's hosted checkout
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        logger = logging.getLogger(__name__)
        try:
            order_id = request.data.get('order_id')
            if not order_id:
                return Response({
                    'success': False,
                    'error': 'Missing required field: order_id'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Order not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            if order.payment_status != 'pending':
                return Response({
                    'success': False,
                    'error': 'Order payment already processed or not in pending state',
                    'current_status': order.payment_status
                }, status=status.HTTP_400_BAD_REQUEST)
            
            customer_email = order.user.email if order.user else order.email_for_guest
            if not customer_email:
                return Response({
                    'success': False,
                    'error': 'Customer email not found'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Prepare order data for PayPro hosted checkout with currency conversion
            original_amount = Decimal(str(order.total_amount))
            currency_info = currency_converter.get_display_amounts(original_amount)
            
            order_data = {
                'order_id': str(order.order_id),
                'amount': str(original_amount),  # Keep original EUR amount
                'currency': 'EUR',  # Original currency
                'customer_email': customer_email,
                'customer_first_name': order.user.first_name if order.user else 'Name',
                'customer_last_name': order.user.last_name if order.user else 'Surname',
                'description': f"Payment for Order #{order.order_number}",
                'language': request.data.get('language', 'en')
            }
            
            # Create PayPro payment token
            paypro_service = PayProService()
            success, response_data = paypro_service.create_payment_token(order_data)
            
            if success:
                # Create initial payment record with pending status
                payment, created = Payment.objects.get_or_create(
                    order=order,
                    gateway_transaction_id=response_data.get('token'),
                    defaults={
                        'payment_method_type': 'paypro_hosted',
                        'amount': currency_info['byn'],  # Store BYN amount (actual payment amount)
                        'currency_code': 'BYN',  # PayPro payment currency
                        'status': 'pending',
                        'payment_details': {
                            'token': response_data.get('token'),
                            'payment_url': response_data.get('payment_url'),
                            'original_amount_eur': str(currency_info['eur']),
                            'amount_byn': str(currency_info['byn']),
                            'exchange_rate': str(currency_info['rate']),
                            'original_currency': 'EUR',
                            'payment_currency': 'BYN',
                            'created_at': timezone.now().isoformat()
                        }
                    }
                )
                
                if not created:
                    # Update existing payment record
                    payment.payment_details.update({
                        'token': response_data.get('token'),
                        'payment_url': response_data.get('payment_url'),
                        'original_amount_eur': str(currency_info['eur']),
                        'amount_byn': str(currency_info['byn']),
                        'exchange_rate': str(currency_info['rate']),
                        'updated_at': timezone.now().isoformat()
                    })
                    payment.save()
                
                logger.info(f"Payment token created for order {order_id}, redirecting to PayPro hosted checkout")
                
                return Response({
                    'success': True,
                    'payment_url': response_data.get('payment_url'),
                    'redirect_url': response_data.get('redirect_url'),
                    'token': response_data.get('token'),
                    'order_id': str(order.order_id),
                    'amount': str(currency_info['eur']),  # Original EUR amount
                    'amount_byn': str(currency_info['byn']),  # BYN amount for payment
                    'currency': 'EUR',  # Original currency
                    'payment_currency': 'BYN',  # PayPro payment currency
                    'exchange_rate': str(currency_info['rate']),
                    'message': 'Redirect user to payment_url for hosted checkout'
                }, status=status.HTTP_200_OK)
            else:
                error_code = response_data.get('error_code', 'UNKNOWN_ERROR')
                error_message = response_data.get('error_message', 'Payment token creation failed')
                
                logger.error(f"PayPro token creation failed for order {order_id}: {error_code} - {error_message}")
                
                return Response({
                    'success': False,
                    'error_code': error_code,
                    'error_message': error_message,
                    'error_details': response_data.get('error_details', [])
                }, status=status.HTTP_400_BAD_REQUEST if error_code == 'VALIDATION_ERROR' else status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Unexpected error in payment initiation: {e}")
            return Response({
                'success': False,
                'error': 'Internal server error',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class PayProWebhookView(APIView):
    """
    Handle PayPro webhook notifications
    
    PayPro BPC sends webhook notifications when payment status changes.
    This endpoint processes those notifications and updates order status accordingly.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"PayPro webhook received")
            logger.debug(f"Webhook headers: {dict(request.headers)}")
            logger.debug(f"Webhook data: {request.data}")
            
            # TODO: Implement webhook signature verification when PayPro provides documentation
            # For now, we'll process all webhooks but this should be secured in production
            
            webhook_data = request.data
            if not webhook_data:
                logger.warning("Empty webhook data received")
                return Response({'status': 'error', 'message': 'Empty webhook data'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Process webhook using PayPro service
            paypro_service = PayProService()
            success, message = paypro_service.handle_webhook(webhook_data)
            
            # Extract order information from webhook
            checkout_data = webhook_data.get('checkout', {})
            transaction_data = webhook_data.get('transaction', {})
            
            tracking_id = (checkout_data.get('order', {}).get('tracking_id') or 
                          transaction_data.get('tracking_id') or 
                          webhook_data.get('tracking_id'))
            
            token = (checkout_data.get('token') or 
                    webhook_data.get('token'))
            
            status_value = (transaction_data.get('status') or 
                           checkout_data.get('status') or 
                           webhook_data.get('status'))
            
            transaction_id = (transaction_data.get('id') or 
                            webhook_data.get('transaction_id'))
            
            logger.info(f"Webhook processed - tracking_id: {tracking_id}, status: {status_value}, success: {success}")
            
            # Find and update the order if tracking_id is available
            if tracking_id:
                try:
                    order = Order.objects.get(order_id=tracking_id)
                    
                    if status_value in ['completed', 'succeeded', 'success', 'paid', 'successful']:
                        if order.payment_status == 'pending':
                            # Create or update payment record
                            payment, created = Payment.objects.get_or_create(
                                order=order,
                                gateway_transaction_id=transaction_id or token or f'paypro_{order.order_id}',
                                defaults={
                                    'payment_method_type': 'paypro_card',
                                    'amount': order.total_amount,
                                    'currency_code': getattr(settings, 'PAYMENT_CURRENCY', 'EUR'),
                                    'status': 'succeeded',
                                    'payment_details': webhook_data
                                }
                            )
                            
                            if not created:
                                payment.status = 'succeeded'
                                payment.payment_details = webhook_data
                                payment.save()
                            
                            # Update order status
                            order.payment_status = 'paid'
                            order.order_status = 'processing'
                            order.save()
                            
                            logger.info(f"Order {tracking_id} payment completed via webhook")
                            
                    elif status_value in ['failed', 'declined', 'error']:
                        if order.payment_status == 'pending':
                            # Create failed payment record
                            Payment.objects.update_or_create(
                                order=order,
                                gateway_transaction_id=transaction_id or token or f'failed_paypro_{order.order_id}',
                                defaults={
                                    'payment_method_type': 'paypro_card',
                                    'amount': order.total_amount,
                                    'currency_code': getattr(settings, 'PAYMENT_CURRENCY', 'EUR'),
                                    'status': 'failed',
                                    'payment_details': webhook_data
                                }
                            )
                            
                            # Update order status
                            order.payment_status = 'failed'
                            order.order_status = 'failed'
                            order.save()
                            
                            # Restore stock quantities
                            for item in order.items.all():
                                DropProduct.objects.filter(id=item.drop_product.id).update(
                                    current_stock_quantity=models.F('current_stock_quantity') + item.quantity
                                )
                            
                            logger.warning(f"Order {tracking_id} payment failed via webhook")
                            
                    elif status_value in ['cancelled', 'canceled']:
                        if order.payment_status == 'pending':
                            order.payment_status = 'cancelled'
                            order.order_status = 'cancelled'
                            order.save()
                            
                            # Restore stock quantities
                            for item in order.items.all():
                                DropProduct.objects.filter(id=item.drop_product.id).update(
                                    current_stock_quantity=models.F('current_stock_quantity') + item.quantity
                                )
                            
                            logger.info(f"Order {tracking_id} payment cancelled via webhook")
                            
                except Order.DoesNotExist:
                    logger.warning(f"Order with tracking_id {tracking_id} not found")
                except Exception as e:
                    logger.error(f"Error updating order {tracking_id}: {e}")
            
            # Return success response to PayPro
            return Response({
                'status': 'received',
                'message': message,
                'tracking_id': tracking_id,
                'processed': success
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error processing PayPro webhook: {e}")
            logger.error(f"Webhook data: {request.data}")
            
            # Return success to avoid PayPro retries, but log the error
            return Response({
                'status': 'error',
                'message': f'Webhook processing error: {str(e)}'
            }, status=status.HTTP_200_OK)  # Return 200 to prevent retries

class CheckPaymentStatusView(APIView):
    """
    Check payment status using PayPro token or order ID
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        logger = logging.getLogger(__name__)
        try:
            token = request.query_params.get('token')
            order_id = request.query_params.get('order_id')
            
            if not token and not order_id:
                return Response({
                    'error': 'Either token or order_id parameter is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Try to find order by order_id first, then by token
            order = None
            if order_id:
                try:
                    order = Order.objects.get(order_id=order_id)
                    # Get the payment token for this order
                    payment = Payment.objects.filter(
                        order=order,
                        payment_method_type__in=['paypro_hosted', 'paypro_card']
                    ).first()
                    if payment and payment.gateway_transaction_id:
                        token = payment.gateway_transaction_id
                except Order.DoesNotExist:
                    pass
            elif token:
                # Find order by payment token
                payment = Payment.objects.filter(gateway_transaction_id=token).first()
                if payment:
                    order = payment.order
            
            if not token:
                return Response({
                    'error': 'Payment token not found for this order'
                }, status=status.HTTP_404_NOT_FOUND)
            
            paypro_service = PayProService()
            success, response_data = paypro_service.get_payment_status(token)
            
            if success:
                # Parse payment status
                checkout_data = response_data.get('checkout', {})
                transaction_data = response_data.get('transaction', {})
                
                payment_status = (transaction_data.get('status') or 
                                checkout_data.get('status') or 
                                'unknown')
                
                tracking_id = (checkout_data.get('order', {}).get('tracking_id') or 
                              transaction_data.get('tracking_id'))
                
                transaction_id = (transaction_data.get('id') or 
                                checkout_data.get('token'))
                
                # Update order status if needed and order exists
                updated = False
                if order and order.payment_status == 'pending':
                    if payment_status in ['completed', 'succeeded', 'success', 'paid', 'successful']:
                        # Update payment record
                        if payment:
                            payment.status = 'succeeded'
                            payment.payment_details.update({
                                'completion_status': payment_status,
                                'completed_at': timezone.now().isoformat(),
                                'real_time_check_at': timezone.now().isoformat(),
                                'paypro_response': response_data
                            })
                            payment.save()
                        
                        # Update order status
                        order.payment_status = 'paid'
                        order.order_status = 'processing'
                        order.save()
                        updated = True
                        
                        logger.info(f"Real-time update: Order {order.order_id} marked as paid")
                        
                    elif payment_status in ['failed', 'declined', 'error']:
                        # Update payment record
                        if payment:
                            payment.status = 'failed'
                            payment.payment_details.update({
                                'failure_status': payment_status,
                                'failed_at': timezone.now().isoformat(),
                                'real_time_check_at': timezone.now().isoformat(),
                                'paypro_response': response_data
                            })
                            payment.save()
                        
                        # Update order status
                        order.payment_status = 'failed'
                        order.order_status = 'failed'
                        order.save()
                        
                        # Restore stock quantities
                        for item in order.items.all():
                            DropProduct.objects.filter(id=item.drop_product.id).update(
                                current_stock_quantity=models.F('current_stock_quantity') + item.quantity
                            )
                        
                        updated = True
                        logger.warning(f"Real-time update: Order {order.order_id} marked as failed")
                        
                    elif payment_status in ['cancelled', 'canceled']:
                        # Update order status
                        order.payment_status = 'cancelled'
                        order.order_status = 'cancelled'
                        order.save()
                        
                        # Restore stock quantities
                        for item in order.items.all():
                            DropProduct.objects.filter(id=item.drop_product.id).update(
                                current_stock_quantity=models.F('current_stock_quantity') + item.quantity
                            )
                        
                        updated = True
                        logger.info(f"Real-time update: Order {order.order_id} marked as cancelled")
                
                # Get order information if available
                order_info = None
                if order:
                    order_info = {
                        'order_id': str(order.order_id),
                        'order_number': order.order_number,
                        'total_amount': str(order.total_amount),
                        'order_status': order.order_status,
                        'payment_status': order.payment_status,
                        'updated': updated
                    }
                
                return Response({
                    'success': True,
                    'payment_status': payment_status,
                    'transaction_id': transaction_id,
                    'tracking_id': tracking_id,
                    'order': order_info,
                    'updated': updated,
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_200_OK)
            else:
                error_code = response_data.get('error_code', 'UNKNOWN_ERROR')
                error_message = response_data.get('error_message', 'Status check failed')
                
                return Response({
                    'success': False,
                    'error_code': error_code,
                    'error_message': error_message
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error checking payment status: {e}")
            return Response({
                'success': False,
                'error': 'Internal server error',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreateRecurringPaymentView(APIView):
    """
    Create a payment token for recurring payments
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        logger = logging.getLogger(__name__)
        try:
            order_id = request.data.get('order_id')
            if not order_id:
                return Response({
                    'error': 'Missing required field: order_id'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                return Response({
                    'error': 'Order not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            customer_email = order.user.email if order.user else order.email_for_guest
            if not customer_email:
                return Response({
                    'error': 'Customer email not found'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            order_data = {
                'order_id': str(order.order_id),
                'amount': str(order.total_amount),
                'currency': getattr(settings, 'PAYMENT_CURRENCY', 'EUR'),
                'customer_email': customer_email,
                'customer_first_name': order.user.first_name if order.user else 'Name',
                'customer_last_name': order.user.last_name if order.user else 'Surname',
                'description': f"Recurring payment setup for Order #{order.order_number}"
            }
            
            paypro_service = PayProService()
            success, response_data = paypro_service.create_recurring_token(order_data)
            
            if success:
                return Response({
                    'success': True,
                    'token': response_data.get('token'),
                    'payment_url': response_data.get('payment_url'),
                    'order_id': str(order.order_id)
                }, status=status.HTTP_200_OK)
            else:
                error_code = response_data.get('error_code', 'UNKNOWN_ERROR')
                error_message = response_data.get('error_message', 'Recurring payment setup failed')
                
                return Response({
                    'success': False,
                    'error_code': error_code,
                    'error_message': error_message
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating recurring payment: {e}")
            return Response({
                'success': False,
                'error': 'Internal server error',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreateOneClickPaymentView(APIView):
    """
    Create a payment token for one-click payments with saved card
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        logger = logging.getLogger(__name__)
        try:
            order_id = request.data.get('order_id')
            card_token = request.data.get('card_token')
            
            if not order_id or not card_token:
                return Response({
                    'error': 'Missing required fields: order_id and card_token'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                return Response({
                    'error': 'Order not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            customer_email = order.user.email if order.user else order.email_for_guest
            if not customer_email:
                return Response({
                    'error': 'Customer email not found'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            order_data = {
                'order_id': str(order.order_id),
                'amount': str(order.total_amount),
                'currency': getattr(settings, 'PAYMENT_CURRENCY', 'EUR'),
                'customer_email': customer_email,
                'customer_first_name': order.user.first_name if order.user else 'Name',
                'customer_last_name': order.user.last_name if order.user else 'Surname',
                'description': f"One-click payment for Order #{order.order_number}"
            }
            
            paypro_service = PayProService()
            success, response_data = paypro_service.create_oneclick_token(order_data, card_token)
            
            if success:
                return Response({
                    'success': True,
                    'token': response_data.get('token'),
                    'payment_url': response_data.get('payment_url'),
                    'order_id': str(order.order_id)
                }, status=status.HTTP_200_OK)
            else:
                error_code = response_data.get('error_code', 'UNKNOWN_ERROR')
                error_message = response_data.get('error_message', 'One-click payment setup failed')
                
                return Response({
                    'success': False,
                    'error_code': error_code,
                    'error_message': error_message
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating one-click payment: {e}")
            return Response({
                'success': False,
                'error': 'Internal server error',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PaymentSuccessView(APIView):
    """
    Handle successful payment returns from PayPro hosted checkout
    This is called when user completes payment successfully
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        from django.shortcuts import redirect
        logger = logging.getLogger(__name__)
        try:
            # PayPro may return token and other parameters
            token = request.query_params.get('token')
            order_id = request.query_params.get('order_id')
            
            logger.info(f"Payment success callback received - token: {token}, order_id: {order_id}")
            
            if token:
                # Check payment status with PayPro
                paypro_service = PayProService()
                success, status_data = paypro_service.get_payment_status(token)
                
                if success:
                    # Parse PayPro response
                    checkout_data = status_data.get('checkout', {})
                    transaction_data = status_data.get('transaction', {})
                    
                    payment_status = (transaction_data.get('status') or 
                                    checkout_data.get('status') or 
                                    'unknown')
                    
                    tracking_id = (checkout_data.get('order', {}).get('tracking_id') or 
                                  transaction_data.get('tracking_id') or 
                                  order_id)
                    
                    transaction_id = (transaction_data.get('id') or 
                                    checkout_data.get('token') or 
                                    token)
                    
                    logger.info(f"Payment status check - status: {payment_status}, tracking_id: {tracking_id}")
                    
                    # Find and update order
                    if tracking_id:
                        try:
                            order = Order.objects.get(order_id=tracking_id)
                            
                            if payment_status in ['completed', 'succeeded', 'success', 'paid', 'successful']:
                                if order.payment_status == 'pending':
                                    # Update payment record
                                    payment = Payment.objects.filter(
                                        order=order,
                                        gateway_transaction_id=token
                                    ).first()
                                    
                                    if payment:
                                        payment.status = 'succeeded'
                                        payment.gateway_transaction_id = transaction_id
                                        payment.payment_details.update({
                                            'completion_status': payment_status,
                                            'completed_at': timezone.now().isoformat(),
                                            'success_callback_at': timezone.now().isoformat(),
                                            'paypro_response': status_data
                                        })
                                        payment.save()
                                    else:
                                        # Create new payment record if not exists
                                        Payment.objects.create(
                                            order=order,
                                            payment_method_type='paypro_hosted',
                                            gateway_transaction_id=transaction_id,
                                            amount=order.total_amount,
                                            currency_code=getattr(settings, 'PAYMENT_CURRENCY', 'EUR'),
                                            status='succeeded',
                                            payment_details={
                                                'token': token,
                                                'completion_status': payment_status,
                                                'completed_at': timezone.now().isoformat(),
                                                'success_callback_at': timezone.now().isoformat(),
                                                'paypro_response': status_data
                                            }
                                        )
                                    
                                    # Update order status
                                    order.payment_status = 'paid'
                                    order.order_status = 'processing'
                                    order.save()
                                    
                                    logger.info(f"Order {tracking_id} payment completed successfully via success callback")
                                    
                                    # Redirect to frontend success page
                                    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
                                    success_url = f"{frontend_url}/payment/success?order_id={order.order_id}&status=success"
                                    
                                    return redirect(success_url)
                                else:
                                    logger.warning(f"Order {tracking_id} payment already processed (status: {order.payment_status})")
                                    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
                                    
                                    # Redirect based on current status
                                    if order.payment_status == 'paid':
                                        success_url = f"{frontend_url}/payment/success?order_id={order.order_id}&status=already_paid"
                                        return redirect(success_url)
                                    elif order.payment_status == 'failed':
                                        failed_url = f"{frontend_url}/payment/failed?order_id={order.order_id}&status=already_failed"
                                        return redirect(failed_url)
                                    else:
                                        pending_url = f"{frontend_url}/payment/pending?order_id={order.order_id}&status={order.payment_status}"
                                        return redirect(pending_url)
                            else:
                                logger.warning(f"Payment not completed - status: {payment_status}")
                                frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
                                pending_url = f"{frontend_url}/payment/pending?order_id={order.order_id}&status={payment_status}"
                                
                                return redirect(pending_url)
                                
                        except Order.DoesNotExist:
                            logger.error(f"Order not found for tracking_id: {tracking_id}")
                            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
                            error_url = f"{frontend_url}/payment/error?error=order_not_found"
                            
                            return redirect(error_url)
                    else:
                        logger.error("No tracking_id found in payment status response")
                        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
                        error_url = f"{frontend_url}/payment/error?error=invalid_response"
                        
                        return redirect(error_url)
                else:
                    logger.error(f"Failed to check payment status: {status_data.get('error_message')}")
                    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
                    error_url = f"{frontend_url}/payment/error?error=status_check_failed"
                    
                    return redirect(error_url)
            else:
                logger.error("No token provided in success callback")
                frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
                error_url = f"{frontend_url}/payment/error?error=missing_token"
                
                return redirect(error_url)
                
        except Exception as e:
            logger.error(f"Error in payment success callback: {e}")
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
            error_url = f"{frontend_url}/payment/error?error=processing_error"
            
            return redirect(error_url)

class PaymentCancelView(APIView):
    """
    Handle cancelled payments from PayPro hosted checkout
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        from django.shortcuts import redirect
        logger = logging.getLogger(__name__)
        try:
            token = request.query_params.get('token')
            order_id = request.query_params.get('order_id')
            
            logger.info(f"Payment cancel callback received - token: {token}, order_id: {order_id}")
            
            # Try to find order by token or order_id
            order = None
            if token:
                payment = Payment.objects.filter(gateway_transaction_id=token).first()
                if payment:
                    order = payment.order
            elif order_id:
                try:
                    order = Order.objects.get(order_id=order_id)
                except Order.DoesNotExist:
                    pass
            
            if order and order.payment_status == 'pending':
                # Mark payment as cancelled
                payment = Payment.objects.filter(
                    order=order,
                    gateway_transaction_id=token or f'cancelled_{order.order_id}'
                ).first()
                
                if payment:
                    payment.status = 'cancelled'
                    payment.payment_details.update({
                        'cancelled_at': timezone.now().isoformat(),
                        'cancellation_reason': 'user_cancelled'
                    })
                    payment.save()
                
                # Update order status
                order.payment_status = 'cancelled'
                order.order_status = 'cancelled'
                order.save()
                
                # Restore stock quantities
                for item in order.items.all():
                    DropProduct.objects.filter(id=item.drop_product.id).update(
                        current_stock_quantity=models.F('current_stock_quantity') + item.quantity
                    )
                
                logger.info(f"Order {order.order_id} payment cancelled by user")
            
            # Redirect to frontend cancel page
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
            cancel_url = f"{frontend_url}/payment/cancelled"
            if order:
                cancel_url += f"?order_id={order.order_id}&status=cancelled"
            else:
                cancel_url += f"?status=cancelled&token={token or 'unknown'}"
            
            return redirect(cancel_url)
            
        except Exception as e:
            logger.error(f"Error in payment cancel callback: {e}")
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
            cancel_url = f"{frontend_url}/payment/cancelled?error=processing_error&status=error"
            
            return redirect(cancel_url)

class PaymentFailedView(APIView):
    """
    Handle failed payments from PayPro hosted checkout
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        from django.shortcuts import redirect
        logger = logging.getLogger(__name__)
        try:
            token = request.query_params.get('token')
            order_id = request.query_params.get('order_id')
            error_code = request.query_params.get('error_code', 'unknown')
            
            logger.info(f"Payment failed callback received - token: {token}, order_id: {order_id}, error: {error_code}")
            
            # Try to find order
            order = None
            if token:
                payment = Payment.objects.filter(gateway_transaction_id=token).first()
                if payment:
                    order = payment.order
            elif order_id:
                try:
                    order = Order.objects.get(order_id=order_id)
                except Order.DoesNotExist:
                    pass
            
            if order and order.payment_status == 'pending':
                # Mark payment as failed
                payment = Payment.objects.filter(
                    order=order,
                    gateway_transaction_id=token or f'failed_{order.order_id}'
                ).first()
                
                if payment:
                    payment.status = 'failed'
                    payment.payment_details.update({
                        'failed_at': timezone.now().isoformat(),
                        'failure_reason': error_code,
                        'failure_details': dict(request.query_params)
                    })
                    payment.save()
                
                # Update order status
                order.payment_status = 'failed'
                order.order_status = 'failed'
                order.save()
                
                # Restore stock quantities
                for item in order.items.all():
                    DropProduct.objects.filter(id=item.drop_product.id).update(
                        current_stock_quantity=models.F('current_stock_quantity') + item.quantity
                    )
                
                logger.warning(f"Order {order.order_id} payment failed: {error_code}")
            
            # Redirect to frontend failed page
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
            failed_url = f"{frontend_url}/payment/failed"
            if order:
                failed_url += f"?order_id={order.order_id}&error={error_code}&status=failed"
            else:
                failed_url += f"?error={error_code}&status=failed&token={token or 'unknown'}"
            
            return redirect(failed_url)
            
        except Exception as e:
            logger.error(f"Error in payment failed callback: {e}")
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://malikli1992.com')
            failed_url = f"{frontend_url}/payment/failed?error=processing_error&status=error"
            
            return redirect(failed_url)