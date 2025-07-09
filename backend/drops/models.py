# drops/models.py
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from products.models import Product, ProductVariant # Import from your products app
from products.storage import CloudflareR2Storage
from products.image_utils import optimize_image_for_upload
from django.conf import settings
from .utils import drop_banner_image_path

# Get the correct storage backend like in products/models.py
def get_storage():
    if settings.DEFAULT_FILE_STORAGE == 'products.storage.CloudflareR2Storage':
        return CloudflareR2Storage()
    return None

class Drop(models.Model):
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('cancelled', 'Cancelled'),
    ]    
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=270, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    banner_image = models.ImageField(
        upload_to=drop_banner_image_path, 
        blank=True, 
        null=True,
        storage=get_storage()
    )
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='upcoming')
    is_public = models.BooleanField(default=False) # Control visibility before launch
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Convert banner image to WebP if needed
        if self.banner_image and hasattr(self.banner_image, 'file'):
            self.banner_image = optimize_image_for_upload(self.banner_image, 'banner')
        
        if not self.slug:
            self.slug = slugify(self.name)
            # Ensure slug uniqueness
            counter = 1
            original_slug = self.slug
            while Drop.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def current_status(self):
        """
        Dynamically determine status based on dates,
        but allow manual override via 'status' field.
        This could be used for display, while 'status' is the source of truth
        for filtering unless explicitly overridden.
        Or, you could have a scheduled task update the 'status' field.
        """
        now = timezone.now()
        if self.status == 'cancelled':
            return 'cancelled'
        if now < self.start_datetime and self.status != 'ended': # check not ended if dates overlap
            return 'upcoming'
        elif self.start_datetime <= now < self.end_datetime:
            return 'active'
        else: # now >= self.end_datetime or status is 'ended'
            return 'ended'

    class Meta:
        ordering = ['-start_datetime']

class DropProduct(models.Model):
    drop = models.ForeignKey(Drop, on_delete=models.CASCADE, related_name='drop_products')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='in_drops')
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE,
        null=True, blank=True, related_name='in_drops'
    ) # Null if the product has no variants or this drop applies to base product
    drop_price = models.DecimalField(max_digits=10, decimal_places=2)
    initial_stock_quantity = models.PositiveIntegerField(default=0)
    current_stock_quantity = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False) # Highlight this product within the drop
    max_per_customer = models.PositiveIntegerField(null=True, blank=True) # Limit quantity per customer
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        item_name = self.product.name
        if self.variant:
            item_name += f" - {self.variant.name_suffix or self.variant.sku_suffix}"
        return f"{item_name} in {self.drop.name}"

    def clean(self):
        from django.core.exceptions import ValidationError
        # Ensure variant belongs to the product if a variant is specified
        if self.variant and self.variant.product != self.product:
            raise ValidationError("The selected variant does not belong to the selected product.")
        # Ensure product has variants if variant is null, but product normally has variants
        # This logic can be complex depending on your rules.
        # For now, we assume admin/data entry is correct.

    def save(self, *args, **kwargs):
        if self.pk is None and self.current_stock_quantity == 0 and self.initial_stock_quantity > 0:
            # Set current_stock to initial_stock on first save if not explicitly set
            self.current_stock_quantity = self.initial_stock_quantity
        elif self.current_stock_quantity > self.initial_stock_quantity:
            # Prevent current stock from exceeding initial stock
            self.current_stock_quantity = self.initial_stock_quantity
        super().save(*args, **kwargs)


    class Meta:
        unique_together = ('drop', 'product', 'variant') # Ensures a product/variant is only in a drop once
        ordering = ['-is_featured', 'product__name']
        constraints = [
            models.CheckConstraint(check=models.Q(current_stock_quantity__gte=0), name='check_current_stock_non_negative'),
            models.CheckConstraint(
                check=models.Q(current_stock_quantity__lte=models.F('initial_stock_quantity')),
                name='check_current_stock_lte_initial'
            )
        ]