# products/migrations/data_migration.py
from django.db import migrations

def migrate_attributes_to_relations(apps, schema_editor):
    """
    Migrate data from attributes JSONField to the new Size and Color relationships.
    """
    ProductVariant = apps.get_model('products', 'ProductVariant')
    Size = apps.get_model('products', 'Size')
    Color = apps.get_model('products', 'Color')
    
    # Collect all unique sizes and colors from the attributes
    unique_sizes = set()
    unique_colors = set()
    
    for variant in ProductVariant.objects.all():
        attributes = variant.attributes or {}
        if 'size' in attributes and attributes['size']:
            unique_sizes.add(str(attributes['size']).strip())
        if 'color' in attributes and attributes['color']:
            unique_colors.add(str(attributes['color']).strip())
    
    # Create size objects for any sizes that don't exist yet
    size_map = {}
    for i, size_name in enumerate(sorted(unique_sizes)):
        size, created = Size.objects.get_or_create(
            name=size_name, 
            defaults={'display_order': (i+1)*10}
        )
        size_map[size_name.lower()] = size
    
    # Create color objects for any colors that don't exist yet
    color_map = {}
    for i, color_name in enumerate(sorted(unique_colors)):
        color, created = Color.objects.get_or_create(
            name=color_name,
            defaults={'display_order': (i+1)*10}
        )
        color_map[color_name.lower()] = color
    
    # Update variants with the new relationships
    for variant in ProductVariant.objects.all():
        attributes = variant.attributes or {}
        updated = False
        
        if 'size' in attributes and attributes['size']:
            size_name = str(attributes['size']).strip().lower()
            if size_name in size_map:
                variant.size = size_map[size_name]
                updated = True
        
        if 'color' in attributes and attributes['color']:
            color_name = str(attributes['color']).strip().lower()
            if color_name in color_map:
                variant.color = color_map[color_name]
                updated = True
        
        if updated:
            # Create a new attributes dict without size and color
            new_attributes = {}
            for key, value in attributes.items():
                if key not in ['size', 'color']:
                    new_attributes[key] = value
            
            variant.attributes = new_attributes
            variant.save()

class Migration(migrations.Migration):
    dependencies = [
        ('products', '0004_color_size_alter_productvariant_attributes_and_more'),
    ]

    operations = [
        migrations.RunPython(migrate_attributes_to_relations, migrations.RunPython.noop),
    ]
