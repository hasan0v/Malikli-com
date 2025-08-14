# carts/views.py
from rest_framework import viewsets, status, mixins, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Cart, CartItem
from drops.models import DropProduct
from .serializers import (
    CartSerializer, CartItemSerializer, CartItemAddSerializer,
    CartSyncSerializer, CartMergeSerializer, CartSyncItemSerializer
)
import uuid
import logging
from django.db import transaction

logger = logging.getLogger(__name__)

def get_or_create_cart(request, cart_id_from_request=None):
    """
    Helper function to retrieve or create a cart.
    - If user is authenticated, tries to get their existing cart.
    - If guest, uses cart_id_from_request or creates a new one.
    - Handles merging guest cart to user cart upon login (basic version).
    """
    user = request.user if request.user.is_authenticated else None
    cart = None

    if user:
        # Authenticated user
        cart, created = Cart.objects.get_or_create(user=user)
        # Basic merge: if a guest_cart_id was provided and user just logged in
        if cart_id_from_request:
            try:
                guest_cart = Cart.objects.get(cart_id=cart_id_from_request, user__isnull=True)
                # Merge items from guest_cart to user_cart
                for guest_item in guest_cart.items.all():
                    user_item, item_created = CartItem.objects.get_or_create(
                        cart=cart,
                        drop_product=guest_item.drop_product,
                        product_variant=guest_item.product_variant,
                        color=guest_item.color,
                        color_code=guest_item.color_code,
                        size=guest_item.size,
                        defaults={'quantity': guest_item.quantity}
                    )
                    if not item_created: # Item already exists, update quantity (or sum)
                        if guest_item.drop_product:
                            user_item.quantity = min(user_item.quantity + guest_item.quantity, guest_item.drop_product.current_stock_quantity)
                        else:
                            # For regular products, just combine quantities
                            user_item.quantity = user_item.quantity + guest_item.quantity
                        # Consider max_per_customer logic here
                        user_item.save()
                guest_cart.delete() # Delete guest cart after merging
            except Cart.DoesNotExist:
                pass # Guest cart not found or already merged
        return cart
    else:
        # Guest user
        if cart_id_from_request:
            try:
                return Cart.objects.get(cart_id=cart_id_from_request, user__isnull=True)
            except Cart.DoesNotExist:
                pass # Invalid cart_id or it became a user cart, create new
        return Cart.objects.create() # Creates a new guest cart with a new UUID

class CartViewSet(mixins.RetrieveModelMixin,
                  # mixins.DestroyModelMixin, # For clearing cart
                  viewsets.GenericViewSet):
    queryset = Cart.objects.all().prefetch_related(
        'items__drop_product__product',
        'items__drop_product__variant',
        'items__product_variant__product',
        'items__product_variant__size',
        'items__product_variant__color'
    ).select_related('user')
    serializer_class = CartSerializer
    permission_classes = [AllowAny] # Anyone can interact with a cart
    lookup_field = 'cart_id' # Use cart_id (UUID) for lookup

    def get_object(self):
        """
        Override to use our helper. The 'pk' from URL will be the cart_id.
        If no pk, it means we need to get/create based on user or new guest.
        This is more for a single "/cart/" endpoint.
        For a ViewSet based on cart_id, the default lookup should work if pk is cart_id.
        """
        cart_id_from_url = self.kwargs.get(self.lookup_field)
        # cart_id_from_header_or_session = request.headers.get('X-Cart-ID') # Alternative to URL param for guest
        return get_or_create_cart(self.request, cart_id_from_url)

    @action(detail=False, methods=['get'], url_path='mine') # /api/v1/carts/mine/
    def retrieve_my_cart(self, request):
        """
        A dedicated endpoint to get the current user's or guest's cart.
        Frontend would send X-Cart-ID header for guests if that's the strategy.
        """
        cart_id_from_header = request.headers.get('X-Cart-ID')
        cart = get_or_create_cart(request, cart_id_from_header)
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='add-item', serializer_class=CartItemAddSerializer)
    def add_item(self, request, cart_id=None):
        cart = self.get_object() # cart_id is the pk for this viewset instance
        serializer = CartItemAddSerializer(data=request.data)
        if serializer.is_valid():
            drop_product_id = serializer.validated_data['drop_product_id']
            quantity = serializer.validated_data['quantity']
            color = serializer.validated_data.get('color')
            color_code = serializer.validated_data.get('color_code')
            size = serializer.validated_data.get('size')
            
            try:
                drop_product = DropProduct.objects.get(id=drop_product_id)
            except DropProduct.DoesNotExist: # Should be caught by serializer, but good practice
                return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

            # Check stock (again, defensive)
            if quantity > drop_product.current_stock_quantity:
                return Response(
                    {"quantity": f"Only {drop_product.current_stock_quantity} items in stock."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get or create the cart item with all variant information
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                drop_product=drop_product,
                color=color,
                color_code=color_code,
                size=size,
                defaults={'quantity': quantity}
            )
            if not created:
                new_quantity = cart_item.quantity + quantity
                if new_quantity > drop_product.current_stock_quantity:
                     return Response(
                        {"quantity": f"Cannot add {quantity} more. Total {new_quantity} would exceed stock of {drop_product.current_stock_quantity}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                cart_item.quantity = new_quantity
                cart_item.save()

            cart_serializer = self.get_serializer(cart) # Return the whole cart
            return Response(cart_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], url_path='items/(?P<item_pk>[^/.]+)', serializer_class=CartItemSerializer)
    def update_item(self, request, cart_id=None, item_pk=None):
        cart = self.get_object()
        try:
            cart_item = CartItem.objects.get(id=item_pk, cart=cart)
        except CartItem.DoesNotExist:
            return Response({"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

        # Only allow updating quantity for now
        new_quantity = request.data.get('quantity')
        if new_quantity is None:
            return Response({"quantity": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_quantity = int(new_quantity)
            if new_quantity <= 0:
                # To remove item, use delete_item action or set quantity to 0 then remove
                return Response({"quantity": "Quantity must be positive. To remove, use delete endpoint or set to 0."}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"quantity": "Invalid quantity format."}, status=status.HTTP_400_BAD_REQUEST)


        if new_quantity > cart_item.drop_product.current_stock_quantity:
            return Response(
                {"quantity": f"Only {cart_item.drop_product.current_stock_quantity} items in stock."},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart_item.quantity = new_quantity
        cart_item.save()
        cart_serializer = self.get_serializer(cart)
        return Response(cart_serializer.data)

    @action(detail=True, methods=['delete'], url_path='items/(?P<item_pk>[^/.]+)')
    def remove_item(self, request, cart_id=None, item_pk=None):
        cart = self.get_object()
        try:
            cart_item = CartItem.objects.get(id=item_pk, cart=cart)
            cart_item.delete()
            cart_serializer = self.get_serializer(cart)
            return Response(cart_serializer.data, status=status.HTTP_200_OK)
        except CartItem.DoesNotExist:
            return Response({"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['delete'], url_path='clear')
    def clear_cart(self, request, cart_id=None):
        cart = self.get_object()
        cart.items.all().delete()
        cart_serializer = self.get_serializer(cart)
        return Response(cart_serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='sync')
    def sync_cart(self, request):
        """
        Sync cart from frontend localStorage to backend.
        For authenticated users: Updates their cart.
        For guests: Creates/updates guest cart.
        """
        serializer = CartSyncSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        items_data = serializer.validated_data['items']
        guest_cart_id = serializer.validated_data.get('guest_cart_id')
        
        try:
            with transaction.atomic():
                if request.user.is_authenticated:
                    # For authenticated users, get or create their cart
                    cart, created = Cart.objects.get_or_create(user=request.user)
                else:
                    # For guests, use provided cart ID or create new
                    if guest_cart_id:
                        try:
                            cart = Cart.objects.get(cart_id=guest_cart_id, user__isnull=True)
                        except Cart.DoesNotExist:
                            cart = Cart.objects.create()
                    else:
                        cart = Cart.objects.create()
                  # Clear existing items and add synced items
                cart.items.all().delete()
                
                item_errors = []
                for idx, item_data in enumerate(items_data):
                    drop_product_id = item_data.get('drop_product_id')
                    product_variant_id = item_data.get('product_variant_id')
                    try:
                        if drop_product_id:
                            try:
                                drop_product = DropProduct.objects.get(id=drop_product_id)
                            except DropProduct.DoesNotExist:
                                raise ValueError('drop_product_not_found')
                            if item_data['quantity'] > drop_product.current_stock_quantity:
                                raise ValueError('quantity_exceeds_stock')
                            CartItem.objects.create(
                                cart=cart,
                                drop_product=drop_product,
                                quantity=item_data['quantity'],
                                color=item_data.get('color'),
                                color_code=item_data.get('color_code'),
                                size=item_data.get('size')
                            )
                        elif product_variant_id:
                            try:
                                from products.models import ProductVariant
                                product_variant = ProductVariant.objects.get(id=product_variant_id)
                            except ProductVariant.DoesNotExist:
                                raise ValueError('variant_not_found')
                            CartItem.objects.create(
                                cart=cart,
                                product_variant=product_variant,
                                quantity=item_data['quantity'],
                                color=item_data.get('color'),
                                color_code=item_data.get('color_code'),
                                size=item_data.get('size')
                            )
                        else:
                            raise ValueError('missing_reference_id')
                    except ValueError as ve:
                        item_errors.append({'index': idx, 'code': str(ve), 'item': item_data})
                    except Exception as e_item:
                        item_errors.append({'index': idx, 'code':'unknown_error', 'detail': str(e_item)})

                cart_serializer = self.get_serializer(cart)
                status_code = status.HTTP_207_MULTI_STATUS if item_errors else status.HTTP_200_OK
                return Response({
                    'cart': cart_serializer.data,
                    'message': 'Cart synced successfully' + (' with some item errors' if item_errors else ''),
                    'item_errors': item_errors
                }, status=status_code)
                
        except Exception as e:
            logger.exception("Cart sync failed")
            return Response({
                'error': 'Failed to sync cart',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='merge', permission_classes=[IsAuthenticated])
    def merge_guest_cart(self, request):
        """
        Merge a guest cart with the authenticated user's cart.
        Called when user logs in and has items in localStorage.
        """
        serializer = CartMergeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        guest_cart_id = serializer.validated_data['guest_cart_id']
        merge_strategy = serializer.validated_data['merge_strategy']
        
        try:
            with transaction.atomic():
                # Get or create user cart
                user_cart, created = Cart.objects.get_or_create(user=request.user)
                
                # Get guest cart
                try:
                    guest_cart = Cart.objects.get(cart_id=guest_cart_id, user__isnull=True)
                except Cart.DoesNotExist:
                    return Response({
                        'error': 'Guest cart not found'
                    }, status=status.HTTP_404_NOT_FOUND)
                
                if merge_strategy == 'replace':
                    # Replace user cart with guest cart
                    user_cart.items.all().delete()
                    for guest_item in guest_cart.items.all():
                        CartItem.objects.create(
                            cart=user_cart,
                            drop_product=guest_item.drop_product,
                            product_variant=guest_item.product_variant,
                            quantity=guest_item.quantity,
                            color=guest_item.color,
                            color_code=guest_item.color_code,
                            size=guest_item.size
                        )
                        
                elif merge_strategy == 'merge':
                    # Merge items from guest cart to user cart
                    for guest_item in guest_cart.items.all():
                        user_item, item_created = CartItem.objects.get_or_create(
                            cart=user_cart,
                            drop_product=guest_item.drop_product,
                            product_variant=guest_item.product_variant,
                            color=guest_item.color,
                            color_code=guest_item.color_code,
                            size=guest_item.size,
                            defaults={'quantity': guest_item.quantity}
                        )
                        if not item_created:
                            # Combine quantities but respect stock limits
                            if guest_item.drop_product:
                                # For drop products, check stock
                                new_quantity = min(
                                    user_item.quantity + guest_item.quantity,
                                    guest_item.drop_product.current_stock_quantity
                                )
                            else:
                                # For regular products, just combine quantities (no stock limit check for now)
                                new_quantity = user_item.quantity + guest_item.quantity
                            user_item.quantity = new_quantity
                            user_item.save()
                
                # keep_user strategy does nothing - just delete guest cart
                
                # Delete guest cart after merging
                guest_cart.delete()
                
                cart_serializer = self.get_serializer(user_cart)
                return Response({
                    'cart': cart_serializer.data,
                    'message': f'Cart merged successfully using {merge_strategy} strategy'
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({
                'error': 'Failed to merge cart',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='bulk-add')
    def bulk_add_items(self, request):
        """
        Add multiple items to cart in a single request.
        Useful for initial cart loading or bulk operations.
        """
        cart_id_from_header = request.headers.get('X-Cart-ID')
        cart = get_or_create_cart(request, cart_id_from_header)
        
        items_serializer = CartSyncItemSerializer(data=request.data.get('items', []), many=True)
        if not items_serializer.is_valid():
            return Response(items_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                for item_data in items_serializer.validated_data:
                    drop_product_id = item_data.get('drop_product_id')
                    product_variant_id = item_data.get('product_variant_id')
                    
                    if drop_product_id:
                        drop_product = DropProduct.objects.get(id=drop_product_id)
                        
                        cart_item, created = CartItem.objects.get_or_create(
                            cart=cart,
                            drop_product=drop_product,
                            color=item_data.get('color'),
                            color_code=item_data.get('color_code'),
                            size=item_data.get('size'),
                            defaults={'quantity': item_data['quantity']}
                        )
                        
                        if not created:
                            # Update quantity if item already exists
                            new_quantity = min(
                                cart_item.quantity + item_data['quantity'],
                                drop_product.current_stock_quantity
                            )
                            cart_item.quantity = new_quantity
                            cart_item.save()
                    
                    elif product_variant_id:
                        from products.models import ProductVariant
                        product_variant = ProductVariant.objects.get(id=product_variant_id)
                        
                        cart_item, created = CartItem.objects.get_or_create(
                            cart=cart,
                            product_variant=product_variant,
                            defaults={'quantity': item_data['quantity']}
                        )
                        
                        if not created:
                            # Update quantity if item already exists
                            cart_item.quantity += item_data['quantity']
                            cart_item.save()
                
                cart_serializer = self.get_serializer(cart)
                return Response(cart_serializer.data, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({
                'error': 'Failed to add items to cart',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)