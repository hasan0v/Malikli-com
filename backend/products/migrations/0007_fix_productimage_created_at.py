# Generated by Django 5.2.1 on 2025-06-15 09:12

from django.db import migrations
from django.utils import timezone


def fix_null_created_at(apps, schema_editor):
    """Fix null created_at values in ProductImage model."""
    ProductImage = apps.get_model('products', 'ProductImage')
    
    # Update all ProductImage records that have null created_at
    null_records = ProductImage.objects.filter(created_at__isnull=True)
    count = null_records.count()
    
    if count > 0:
        # Set created_at to current time for all null records
        null_records.update(created_at=timezone.now())
        print(f"Fixed {count} ProductImage records with null created_at values")


def reverse_fix_null_created_at(apps, schema_editor):
    """Reverse migration - not needed as we're fixing data, not structure."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_product_buy_now_link'),
    ]

    operations = [
        migrations.RunPython(fix_null_created_at, reverse_fix_null_created_at),
    ]
