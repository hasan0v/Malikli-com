from django.db import models
from django.utils.text import slugify
from django.contrib.postgres.fields import ArrayField  # PostgreSQL optimized field
from .storage import CloudflareR2Storage
from django.conf import settings
from .image_utils import optimize_image_for_upload

# Get the correct storage backend
def get_storage():
    if settings.DEFAULT_FILE_STORAGE == 'products.storage.CloudflareR2Storage':
        return CloudflareR2Storage()
    return None

# Add new models for Size and Color
class Size(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g., "Small", "Medium", "Large"
    display_order = models.IntegerField(default=0)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['display_order', 'name']

class Color(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g., "Red", "Blue", "Green"
    hex_code = models.CharField(max_length=7, blank=True, null=True)  # e.g., "#FF0000"
    display_order = models.IntegerField(default=0)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['display_order', 'name']

# from users.models import User  # Uncomment if needed in future
def category_image_path(instance, filename):
    # file will be uploaded to MEDIA_ROOT/category_images/<category_slug>/<filename>
    return f'category_images/{instance.slug}/{filename}'


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True, db_index=True)  # Add index
    description = models.TextField(blank=True, null=True)
    parent_category = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subcategories',
        db_index=True  # Add index for category hierarchy queries
    )
    image = models.ImageField(
        upload_to=category_image_path, 
        blank=True, 
        null=True,
        storage=get_storage()
    )
    is_active = models.BooleanField(default=True, db_index=True)  # Add index for filtering
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # Add index for ordering
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Convert image to WebP if needed
        if self.image and hasattr(self.image, 'file'):
            self.image = optimize_image_for_upload(self.image, 'category')
        
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
        
    def get_translated_name(self, language_code=None):
        """Get translated name for the given language or fallback to default"""
        if not language_code:
            from django.utils import translation
            language_code = translation.get_language()
            print(f"DEBUG - Category.get_translated_name for {self.name} - language_code: {language_code}")
        
        try:
            translation_obj = self.translations.get(language_code=language_code)
            return translation_obj.name
        except CategoryTranslation.DoesNotExist:
            # Fallback to default name
            print(f"DEBUG - No translation found for Category {self.name} in {language_code}")
            return self.name
    def get_translated_description(self, language_code=None):
        """Get translated description for the given language or fallback to default"""
        if not language_code:
            from django.utils import translation
            language_code = translation.get_language()
            print(f"DEBUG - Category.get_translated_description for {self.name} - language_code: {language_code}")
        
        try:
            translation_obj = self.translations.get(language_code=language_code)
            return translation_obj.description or self.description
        except CategoryTranslation.DoesNotExist:
            # Fallback to default description
            print(f"DEBUG - No translation found for Category description of {self.name} in {language_code}")
            return self.description
    
    def set_translation(self, language_code, name=None, description=None):
        """Set or update translation for a specific language"""
        translation_obj, created = CategoryTranslation.objects.get_or_create(
            category=self,
            language_code=language_code,
            defaults={'name': name or self.name, 'description': description or self.description}
        )
        if not created:
            if name:
                translation_obj.name = name
            if description is not None:  # Allow empty string
                translation_obj.description = description
            translation_obj.save()
        return translation_obj

    class Meta:
        verbose_name_plural = "Categories"
        indexes = [
            models.Index(fields=['is_active', 'created_at']),
            models.Index(fields=['parent_category', 'is_active']),
            models.Index(fields=['slug']),
        ]

def product_image_path(instance, filename):
    # file will be uploaded to MEDIA_ROOT/product_images/<product_slug>/<filename>
    return f'product_images/{instance.slug}/{filename}'

class Product(models.Model):
    name = models.CharField(max_length=255, db_index=True)  # Add index for search
    slug = models.SlugField(max_length=270, unique=True, blank=True, db_index=True)  # Add index
    sku_prefix = models.CharField(max_length=50, unique=True, blank=True, null=True, db_index=True)  # Add index
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        db_index=True  # Add index for category filtering
    )
    base_price = models.DecimalField(max_digits=10, decimal_places=2, db_index=True)  # Add index for price sorting
    # Add buyNowLink field for external payment links
    buy_now_link = models.URLField(max_length=500, blank=True, null=True, help_text="External payment link for Buy Now functionality")
    tags = ArrayField(models.CharField(max_length=50), blank=True, default=list, db_index=True)  # Add index for tag filtering
    is_archived = models.BooleanField(default=False, db_index=True)  # Add index for filtering
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # Add index for ordering
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
            original_slug = self.slug
            counter = 1
            while Product.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
        
    def get_translated_name(self, language_code=None):
        """Get translated name for the given language or fallback to default"""
        if not language_code:
            from django.utils import translation
            language_code = translation.get_language()
            print(f"DEBUG - get_translated_name for {self.name} - language_code: {language_code}")
        
        try:
            translation_obj = self.translations.get(language_code=language_code)
            return translation_obj.name
        except ProductTranslation.DoesNotExist:
            # Fallback to default name
            print(f"DEBUG - No translation found for {self.name} in {language_code}")
            return self.name
    def get_translated_description(self, language_code=None):
        """Get translated description for the given language or fallback to default"""
        if not language_code:
            from django.utils import translation
            language_code = translation.get_language()
            print(f"DEBUG - get_translated_description for {self.name} - language_code: {language_code}")
        
        try:
            translation_obj = self.translations.get(language_code=language_code)
            return translation_obj.description or self.description
        except ProductTranslation.DoesNotExist:
            # Fallback to default description
            print(f"DEBUG - No translation found for description of {self.name} in {language_code}")
            return self.description
    
    def set_translation(self, language_code, name=None, description=None):
        """Set or update translation for a specific language"""
        translation_obj, created = ProductTranslation.objects.get_or_create(
            product=self,
            language_code=language_code,
            defaults={'name': name or self.name, 'description': description or self.description}
        )
        if not created:
            if name:
                translation_obj.name = name
            if description is not None:  # Allow empty string
                translation_obj.description = description
            translation_obj.save()
        return translation_obj

    def create_variants_from_options(self, sizes=None, colors=None, additional_prices=None, stock_map=None, low_stock_map=None):
        """
        Create product variants from combinations of sizes and colors.
        
        Args:
            sizes: List of Size objects or IDs
            colors: List of Color objects or IDs
            additional_prices: Dictionary mapping (size_id, color_id) tuples to additional prices
        
        Example:
            product.create_variants_from_options(
                sizes=[1, 2, 3],  # Size IDs for S, M, L
                colors=[1, 2],    # Color IDs for Red, Blue
                additional_prices={
                    (1, 1): 0,    # Small, Red - no additional price
                    (2, 1): 5,    # Medium, Red - $5 additional
                    (3, 1): 10,   # Large, Red - $10 additional
                    (1, 2): 2,    # Small, Blue - $2 additional
                    (2, 2): 7,    # Medium, Blue - $7 additional
                    (3, 2): 12,   # Large, Blue - $12 additional
                }
            )
        """
        if not sizes and not colors:
            return []
            
        if additional_prices is None:
            additional_prices = {}
        if stock_map is None:
            stock_map = {}
        if low_stock_map is None:
            low_stock_map = {}
            
        created_variants = []
            
        # Get actual Size objects if IDs were provided
        if sizes and all(isinstance(s, int) for s in sizes):
            from .models import Size
            size_objects = Size.objects.filter(id__in=sizes)
            size_map = {s.id: s for s in size_objects}
            sizes = [size_map.get(s_id) for s_id in sizes if s_id in size_map]
            
        # Get actual Color objects if IDs were provided
        if colors and all(isinstance(c, int) for c in colors):
            from .models import Color
            color_objects = Color.objects.filter(id__in=colors)
            color_map = {c.id: c for c in color_objects}
            colors = [color_map.get(c_id) for c_id in colors if c_id in color_map]
        
        # If we have both sizes and colors, create all combinations
        if sizes and colors:
            for size in sizes:
                for color in colors:
                    size_id = size.id if hasattr(size, 'id') else size
                    color_id = color.id if hasattr(color, 'id') else color
                    
                    # Get additional price from mapping or default to 0
                    add_price = additional_prices.get((size_id, color_id), 0)
                    
                    # Create a sensible SKU suffix from size and color
                    size_code = size.name[0].upper() if hasattr(size, 'name') else 'S'
                    color_code = color.name[:3].upper() if hasattr(color, 'name') else 'COL'
                    sku_suffix = f"-{size_code}-{color_code}"
                    
                    # Create the variant
                    stock_val = stock_map.get((size_id, color_id), stock_map.get(f"{size_id}-{color_id}", 0))
                    low_val = low_stock_map.get((size_id, color_id), low_stock_map.get(f"{size_id}-{color_id}", 5))
                    variant = ProductVariant.objects.create(
                        product=self,
                        size=size,
                        color=color,
                        sku_suffix=sku_suffix,
                        additional_price=add_price,
                        stock_quantity=stock_val or 0,
                        low_stock_threshold=low_val if low_val is not None else 5
                    )
                    created_variants.append(variant)
        
        # If we only have sizes, create variants for each size
        elif sizes:
            for size in sizes:
                size_id = size.id if hasattr(size, 'id') else size
                
                # Get additional price from mapping or default to 0
                add_price = additional_prices.get(size_id, 0)
                
                # Create a sensible SKU suffix from size
                size_code = size.name[0].upper() if hasattr(size, 'name') else 'S'
                sku_suffix = f"-{size_code}"
                
                # Create the variant
                stock_val = stock_map.get(size_id, 0)
                low_val = low_stock_map.get(size_id, 5)
                variant = ProductVariant.objects.create(
                    product=self,
                    size=size,
                    sku_suffix=sku_suffix,
                    additional_price=add_price,
                    stock_quantity=stock_val or 0,
                    low_stock_threshold=low_val if low_val is not None else 5
                )
                created_variants.append(variant)
        
        # If we only have colors, create variants for each color
        elif colors:
            for color in colors:
                color_id = color.id if hasattr(color, 'id') else color
                
                # Get additional price from mapping or default to 0
                add_price = additional_prices.get(color_id, 0)
                
                # Create a sensible SKU suffix from color
                color_code = color.name[:3].upper() if hasattr(color, 'name') else 'COL'
                sku_suffix = f"-{color_code}"
                
                # Create the variant
                stock_val = stock_map.get(color_id, 0)
                low_val = low_stock_map.get(color_id, 5)
                variant = ProductVariant.objects.create(
                    product=self,
                    color=color,
                    sku_suffix=sku_suffix,
                    additional_price=add_price,
                    stock_quantity=stock_val or 0,
                    low_stock_threshold=low_val if low_val is not None else 5
                )
                created_variants.append(variant)
        
        return created_variants

def product_variant_image_path(instance, filename):
    # file will be uploaded to MEDIA_ROOT/product_variant_images/<product_slug>/<variant_sku_suffix>/<filename>
    return f'product_variant_images/{instance.product.slug}/{instance.sku_suffix}/{filename}'

class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants', db_index=True)  # Add index
    sku_suffix = models.CharField(max_length=50, db_index=True)  # Add index
    name_suffix = models.CharField(max_length=100, blank=True, null=True)  # e.g., "Small", "Red"
    
    # Replace JSON field with direct relationships
    size = models.ForeignKey(Size, on_delete=models.SET_NULL, null=True, blank=True, related_name='variants', db_index=True)  # Add index
    color = models.ForeignKey(Color, on_delete=models.SET_NULL, null=True, blank=True, related_name='variants', db_index=True)  # Add index
    
    # Keep attributes for any other non-standard attributes
    attributes = models.JSONField(default=dict, blank=True, help_text="Additional attributes beyond size and color")
    
    additional_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, db_index=True)  # Add index
    image = models.ImageField(
        upload_to=product_variant_image_path, 
        blank=True, 
        null=True,
        storage=get_storage()
    )
    
    # Inventory Management Fields
    stock_quantity = models.PositiveIntegerField(default=0, help_text="Total available stock")
    reserved_quantity = models.PositiveIntegerField(default=0, help_text="Stock reserved for unpaid orders")
    low_stock_threshold = models.PositiveIntegerField(default=5, help_text="Threshold for low stock alerts")
    
    is_active = models.BooleanField(default=True, db_index=True)  # Add index
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # Add index
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Convert image to WebP if needed
        if self.image and hasattr(self.image, 'file'):
            self.image = optimize_image_for_upload(self.image, 'variant')
        super().save(*args, **kwargs)

    @property
    def available_quantity(self):
        """Calculate available stock (total - reserved)"""
        return self.stock_quantity - self.reserved_quantity

    @property
    def is_in_stock(self):
        """Check if variant has available stock"""
        return self.available_quantity > 0

    @property
    def is_low_stock(self):
        """Check if variant is below low stock threshold"""
        return self.available_quantity <= self.low_stock_threshold

    def can_reserve(self, quantity):
        """Check if we can reserve the specified quantity"""
        return self.available_quantity >= quantity

    def reserve_stock(self, quantity):
        """Reserve stock for an order. Returns True if successful."""
        from django.db import transaction
        
        with transaction.atomic():
            # Reload from database to get latest stock levels
            variant = ProductVariant.objects.select_for_update().get(pk=self.pk)
            
            if variant.available_quantity >= quantity:
                variant.reserved_quantity += quantity
                variant.save(update_fields=['reserved_quantity'])
                # Update current instance
                self.reserved_quantity = variant.reserved_quantity
                return True
            return False

    def release_reservation(self, quantity):
        """Release reserved stock (e.g., when order is cancelled)"""
        from django.db import transaction
        
        with transaction.atomic():
            variant = ProductVariant.objects.select_for_update().get(pk=self.pk)
            variant.reserved_quantity = max(0, variant.reserved_quantity - quantity)
            variant.save(update_fields=['reserved_quantity'])
            # Update current instance
            self.reserved_quantity = variant.reserved_quantity

    def fulfill_order(self, quantity):
        """Fulfill an order by reducing both reserved and total stock"""
        from django.db import transaction
        
        with transaction.atomic():
            variant = ProductVariant.objects.select_for_update().get(pk=self.pk)
            # Reduce both reserved and total stock
            variant.reserved_quantity = max(0, variant.reserved_quantity - quantity)
            variant.stock_quantity = max(0, variant.stock_quantity - quantity)
            variant.save(update_fields=['reserved_quantity', 'stock_quantity'])
            # Update current instance
            self.reserved_quantity = variant.reserved_quantity
            self.stock_quantity = variant.stock_quantity

    def __str__(self):
        variant_parts = []
        if self.size:
            variant_parts.append(str(self.size))
        if self.color:
            variant_parts.append(str(self.color))
        
        if variant_parts:
            return f"{self.product.name} - {', '.join(variant_parts)}"
        return f"{self.product.name} - {self.name_suffix or self.sku_suffix}"

    class Meta:
        unique_together = ('product', 'sku_suffix')
        indexes = [
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['size', 'color']),
            models.Index(fields=['is_active', 'created_at']),
            models.Index(fields=['stock_quantity', 'reserved_quantity']),  # For inventory queries
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(stock_quantity__gte=0),
                name='check_stock_quantity_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(reserved_quantity__gte=0),
                name='check_reserved_quantity_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(reserved_quantity__lte=models.F('stock_quantity')),
                name='check_reserved_lte_stock'
            ),
        ]

def general_product_image_path(instance, filename):
    # Define a path structure, e.g., based on product or variant
    if instance.variant:
        path_base = f'variants/{instance.variant.product.slug}/{instance.variant.sku_suffix}'
    elif instance.product:
        path_base = f'products/{instance.product.slug}'
    else:
        path_base = 'misc_images'
    return f'{path_base}/{filename}'

class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images', null=True, blank=True, db_index=True)  # Add index
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='images', null=True, blank=True, db_index=True)  # Add index
    image = models.ImageField(
        upload_to=general_product_image_path, 
        blank=True, 
        null=True,
        storage=get_storage()
    )
    alt_text = models.CharField(max_length=255, blank=True, null=True)
    display_order = models.IntegerField(default=0, db_index=True)  # Add index for ordering
    is_primary = models.BooleanField(default=False, db_index=True)  # Add index for filtering primary images
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Handle the case where created_at might be None for existing records
        if not self.created_at:
            from django.utils import timezone
            self.created_at = timezone.now()
        
        # Convert image to WebP if needed
        if self.image and hasattr(self.image, 'file'):
            self.image = optimize_image_for_upload(self.image, 'product')
        super().save(*args, **kwargs)

    def __str__(self):
        if self.product:
            return f"Image for {self.product.name}"
        elif self.variant:
            return f"Image for {self.variant.product.name} Variant"
        return "Product Image"

    class Meta:
        ordering = ['display_order']
        indexes = [
            models.Index(fields=['product', 'display_order']),
            models.Index(fields=['variant', 'display_order']),
            models.Index(fields=['is_primary']),
        ]


# Translation Models
class ProductTranslation(models.Model):
    """Model to store product translations"""
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE, 
        related_name='translations'
    )
    language_code = models.CharField(
        max_length=10, 
        choices=settings.LANGUAGES,
        db_index=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['product', 'language_code']]
        indexes = [
            models.Index(fields=['product', 'language_code']),
            models.Index(fields=['language_code']),
        ]
    
    def __str__(self):
        return f"{self.product.name} ({self.get_language_code_display()})"


class CategoryTranslation(models.Model):
    """Model to store category translations"""
    category = models.ForeignKey(
        Category, 
        on_delete=models.CASCADE, 
        related_name='translations'
    )
    language_code = models.CharField(
        max_length=10, 
        choices=settings.LANGUAGES,
        db_index=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['category', 'language_code']]
        indexes = [
            models.Index(fields=['category', 'language_code']),
            models.Index(fields=['language_code']),
        ]
    
    def __str__(self):
        return f"{self.category.name} ({self.get_language_code_display()})"
