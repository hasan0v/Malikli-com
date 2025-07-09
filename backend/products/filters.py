# products/filters.py
from django_filters import rest_framework as filters
from .models import Product

class ProductFilter(filters.FilterSet):
    # Custom filter for tags: allows filtering by a single tag contained in the JSON array
    # Example URL: /api/v1/products/?tags=electronics
    tags = filters.CharFilter(method='filter_tags_contains')

    class Meta:
        model = Product
        fields = {
            'category__slug': ['exact'],
            # 'base_price': ['exact', 'lt', 'gt', 'lte', 'gte'], # Example for other fields
        }

    def filter_tags_contains(self, queryset, name, value):
        # This method assumes 'tags' is a JSONField storing a list of strings.
        # For PostgreSQL ArrayField, you might use different lookups like __contains=[value]
        # or __overlap=[value] if 'value' can be a comma-separated list.
        if value:
            # If value is a single tag string:
            return queryset.filter(tags__contains=[value]) # JSONField __contains a list with the item
            # If you want to pass multiple tags like ?tags=tag1,tag2 and check if any match:
            # tags_list = [tag.strip() for tag in value.split(',') if tag.strip()]
            # if tags_list:
            #     return queryset.filter(tags__overlap=tags_list) # For ArrayField
            #     # For JSONField, you might need a more complex Q object query or loop
        return queryset

# products/filters.py (or a new core/filter_backends.py)
from django_filters.rest_framework import DjangoFilterBackend

class SimpleDjangoFilterBackend(DjangoFilterBackend):
    # This will prevent it from trying to render the full form if the template is missing
    # It might just show input boxes without a surrounding form tag or submit button
    # in the browsable API, or you can set it to a template that only shows field names.
    template = 'rest_framework/filters/base.html' # DRF's base template for filters (might still need some context)
                                                   # Or an even simpler custom template.
