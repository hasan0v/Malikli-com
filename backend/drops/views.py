# drops/views.py
from rest_framework import viewsets, permissions, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from .models import Drop, DropProduct
from .serializers import (
    DropSerializer, DropProductSerializer,
    DropCreateUpdateSerializer, DropProductCreateSerializer
)

class DropViewSet(viewsets.ReadOnlyModelViewSet): # Public read-only view
    queryset = Drop.objects.filter(is_public=True).prefetch_related(
        'drop_products__product__category',
        'drop_products__variant'
    ).order_by('-start_datetime')
    serializer_class = DropSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'status': ['exact', 'in'],
        'start_datetime': ['gte', 'lte', 'exact'],
        'end_datetime': ['gte', 'lte', 'exact'],
    }

    @action(detail=False, methods=['get'], url_path='active-drops')
    def active_drops(self, request):
        now = timezone.now()
        active = Drop.objects.filter(
            is_public=True,
            status='active', # Rely on the status field
            # Or use dynamic calculation:
            # start_datetime__lte=now,
            # end_datetime__gte=now
        ).prefetch_related('drop_products__product', 'drop_products__variant')
        serializer = self.get_serializer(active, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='upcoming-drops')
    def upcoming_drops(self, request):
        # Similar to active_drops but for 'upcoming'
        now = timezone.now()
        upcoming = Drop.objects.filter(
            is_public=True,
            status='upcoming',
            # Or: start_datetime__gt=now
        ).prefetch_related('drop_products__product', 'drop_products__variant')
        serializer = self.get_serializer(upcoming, many=True)
        return Response(serializer.data)


# For Admin to manage Drops and their products
class AdminDropViewSet(viewsets.ModelViewSet):
    queryset = Drop.objects.all().prefetch_related(
        'drop_products__product',
        'drop_products__variant'
    )
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DropCreateUpdateSerializer
        return DropSerializer

    # Nested endpoint to manage products within a drop
    @action(detail=True, methods=['post'], url_path='add-product', serializer_class=DropProductCreateSerializer)
    def add_product_to_drop(self, request, slug=None):
        drop = self.get_object()
        serializer = DropProductCreateSerializer(data=request.data)
        if serializer.is_valid():
            # Check if already exists to prevent duplicates by unique_together
            # This check can also be done in serializer's validate method
            if DropProduct.objects.filter(
                drop=drop,
                product=serializer.validated_data.get('product'),
                variant=serializer.validated_data.get('variant')
            ).exists():
                return Response(
                    {"detail": "This product/variant is already in this drop."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            drop_product = serializer.save(drop=drop)
            return Response(DropProductSerializer(drop_product).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # You might also want list/retrieve/update/delete for DropProducts specific to a drop
    # e.g., /api/v1/admin/drops/{drop_slug}/products/{drop_product_id}/
    # This can be done with a separate ViewSet for DropProducts, filtered by drop_id.


class AdminDropProductViewSet(viewsets.ModelViewSet):
    """
    Manages individual DropProduct items.
    Access typically via /api/v1/admin/drop-products/ or nested under a specific drop for context.
    """
    queryset = DropProduct.objects.all().select_related('drop', 'product', 'variant')
    serializer_class = DropProductSerializer # Use the detailed one for retrieve/list
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            # For create, you'd typically want 'drop' to be specified.
            # If this ViewSet is only accessed nested under a drop, 'drop' can be from URL.
            return DropProductCreateSerializer # Or a more comprehensive one
        return DropProductSerializer

    # Example: If nested, filter by the drop from URL
    # def get_queryset(self):
    #     queryset = super().get_queryset()
    #     drop_slug = self.kwargs.get('drop_slug_from_url') # if using nested routers
    #     if drop_slug:
    #         return queryset.filter(drop__slug=drop_slug)
    #     return queryset

    # def perform_create(self, serializer):
    #     drop_slug = self.kwargs.get('drop_slug_from_url')
    #     if drop_slug:
    #         drop = Drop.objects.get(slug=drop_slug) # Add error handling
    #         serializer.save(drop=drop)
    #     else:
    #         # Require drop_id in request data if not nested
    #         serializer.save()