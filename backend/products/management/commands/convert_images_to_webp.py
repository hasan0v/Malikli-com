"""
Django management command to convert existing images to WebP format.
Usage: python manage.py convert_images_to_webp
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Category, ProductVariant, ProductImage
from drops.models import Drop
from products.image_utils import optimize_image_for_upload, should_convert_image
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Convert existing images to WebP format'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be converted without actually converting',
        )
        parser.add_argument(
            '--model',
            type=str,
            choices=['category', 'variant', 'image', 'drop', 'all'],
            default='all',
            help='Which model to process (default: all)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        model_type = options['model']
        
        self.stdout.write(self.style.SUCCESS('Starting WebP conversion process...'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        stats = {
            'categories': 0,
            'variants': 0,
            'images': 0,
            'drops': 0,
            'errors': 0
        }
        
        try:
            if model_type in ['category', 'all']:
                stats['categories'] = self.convert_category_images(dry_run)
            
            if model_type in ['variant', 'all']:
                stats['variants'] = self.convert_variant_images(dry_run)
            
            if model_type in ['image', 'all']:
                stats['images'] = self.convert_product_images(dry_run)
            
            if model_type in ['drop', 'all']:
                stats['drops'] = self.convert_drop_images(dry_run)
            
            # Summary
            self.stdout.write(self.style.SUCCESS('\n--- Conversion Summary ---'))
            self.stdout.write(f"Categories processed: {stats['categories']}")
            self.stdout.write(f"Variants processed: {stats['variants']}")
            self.stdout.write(f"Product images processed: {stats['images']}")
            self.stdout.write(f"Drop banners processed: {stats['drops']}")
            self.stdout.write(f"Errors: {stats['errors']}")
            
            if dry_run:
                self.stdout.write(self.style.WARNING('\nNo changes were made (dry run mode)'))
            else:
                self.stdout.write(self.style.SUCCESS('\n✅ Conversion completed!'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during conversion: {str(e)}'))
            logger.error(f'WebP conversion error: {str(e)}')

    def convert_category_images(self, dry_run=False):
        """Convert category images to WebP."""
        converted = 0
        categories = Category.objects.filter(image__isnull=False)
        
        self.stdout.write(f"\nProcessing {categories.count()} categories...")
        
        for category in categories:
            if category.image and should_convert_image(category.image):
                try:
                    if not dry_run:
                        # Save the category - this will trigger the save method with WebP conversion
                        category.save()
                    
                    converted += 1
                    self.stdout.write(f"  ✓ Category: {category.name}")
                    
                except Exception as e:
                    self.stdout.write(f"  ❌ Category {category.name}: {str(e)}")
                    logger.error(f'Category {category.name} conversion error: {str(e)}')
        
        return converted

    def convert_variant_images(self, dry_run=False):
        """Convert product variant images to WebP."""
        converted = 0
        variants = ProductVariant.objects.filter(image__isnull=False)
        
        self.stdout.write(f"\nProcessing {variants.count()} product variants...")
        
        for variant in variants:
            if variant.image and should_convert_image(variant.image):
                try:
                    if not dry_run:
                        # Save the variant - this will trigger the save method with WebP conversion
                        variant.save()
                    
                    converted += 1
                    self.stdout.write(f"  ✓ Variant: {variant}")
                    
                except Exception as e:
                    self.stdout.write(f"  ❌ Variant {variant}: {str(e)}")
                    logger.error(f'Variant {variant} conversion error: {str(e)}')
        
        return converted

    def convert_product_images(self, dry_run=False):
        """Convert product images to WebP."""
        converted = 0
        images = ProductImage.objects.filter(image__isnull=False)
        
        self.stdout.write(f"\nProcessing {images.count()} product images...")
        
        for img in images:
            if img.image and should_convert_image(img.image):
                try:
                    if not dry_run:
                        # Save the image - this will trigger the save method with WebP conversion
                        img.save()
                    
                    converted += 1
                    product_name = img.product.name if img.product else (img.variant.product.name if img.variant else 'Unknown')
                    self.stdout.write(f"  ✓ Image for: {product_name}")
                    
                except Exception as e:
                    self.stdout.write(f"  ❌ Image conversion error: {str(e)}")
                    logger.error(f'Product image conversion error: {str(e)}')
        
        return converted

    def convert_drop_images(self, dry_run=False):
        """Convert drop banner images to WebP."""
        converted = 0
        drops = Drop.objects.filter(banner_image__isnull=False)
        
        self.stdout.write(f"\nProcessing {drops.count()} drop banners...")
        
        for drop in drops:
            if drop.banner_image and should_convert_image(drop.banner_image):
                try:
                    if not dry_run:
                        # Save the drop - this will trigger the save method with WebP conversion
                        drop.save()
                    
                    converted += 1
                    self.stdout.write(f"  ✓ Drop: {drop.name}")
                    
                except Exception as e:
                    self.stdout.write(f"  ❌ Drop {drop.name}: {str(e)}")
                    logger.error(f'Drop {drop.name} conversion error: {str(e)}')
        
        return converted
