#!/usr/bin/env python
"""
Script to update existing order items with missing product data for direct orders.
This fixes order items that were created before we added the new fields.
"""

import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from orders.models import OrderItem
from products.models import Product, ProductVariant
import re

def extract_variant_info_from_sku(sku_snapshot):
    """Extract variant info from SKU snapshot"""
    # Example SKU: "-WHI-S" means color=WHITE, size=S
    color = None
    size = None
    
    if not sku_snapshot:
        return color, size
    
    # Remove leading dash
    sku_parts = sku_snapshot.lstrip('-').split('-')
    
    # Common color codes mapping
    color_map = {
        'WHI': 'White',
        'BLA': 'Black',
        'RED': 'Red',
        'BLU': 'Blue',
        'GRE': 'Green',
        'YEL': 'Yellow',
        'PIN': 'Pink',
        'PUR': 'Purple',
        'ORA': 'Orange',
        'GRA': 'Gray',
        'BRO': 'Brown',
    }
    
    # Common size codes
    size_codes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    
    for part in sku_parts:
        if part in color_map:
            color = color_map[part]
        elif part in size_codes:
            size = part
    
    return color, size

def fix_order_items():
    """Fix order items with missing product data"""
    
    # Find order items that are direct orders (no drop_product) but missing data
    direct_order_items = OrderItem.objects.filter(
        drop_product=None,
        product_id=None  # Missing product_id indicates it needs fixing
    )
    
    print(f"Found {direct_order_items.count()} order items to fix")
    
    for item in direct_order_items:
        print(f"\nProcessing OrderItem {item.id}: {item.product_name_snapshot}")
        
        # Try to find the product by name
        try:
            product = Product.objects.filter(name=item.product_name_snapshot).first()
            if not product:
                print(f"  ❌ Product not found: {item.product_name_snapshot}")
                continue
            
            print(f"  ✓ Found product: {product.name} (ID: {product.id})")
            
            # Extract color and size from SKU or variant name
            color, size = extract_variant_info_from_sku(item.sku_snapshot)
              # Try to find variant if we have variant name
            variant = None
            if item.variant_name_snapshot:
                print(f"  🔍 Parsing variant: '{item.variant_name_snapshot}'")
                
                # Extract size and color from variant name snapshot
                # Format: "Product Name - Size, Color"
                variant_part = item.variant_name_snapshot.replace(product.name, '').strip()
                if variant_part.startswith(' - '):
                    variant_part = variant_part[3:]  # Remove " - "
                
                variant_color = None
                variant_size = None
                
                # Parse "Size, Color" format
                if ', ' in variant_part:
                    parts = variant_part.split(', ')
                    variant_size = parts[0].strip()
                    variant_color = parts[1].strip()
                else:
                    # Just size or just color
                    variant_size = variant_part.strip()
                
                print(f"  📋 Extracted - Size: '{variant_size}', Color: '{variant_color}'")
                
                # Try to find the variant by matching size and color
                variant_query = ProductVariant.objects.filter(product=product)
                
                if variant_size:
                    # Try to find size by name
                    from products.models import Size
                    size_obj = Size.objects.filter(name__iexact=variant_size).first()
                    if size_obj:
                        variant_query = variant_query.filter(size=size_obj)
                        print(f"  ✓ Found size: {size_obj.name}")
                
                if variant_color:
                    # Try to find color by name
                    from products.models import Color
                    color_obj = Color.objects.filter(name__iexact=variant_color).first()
                    if color_obj:
                        variant_query = variant_query.filter(color=color_obj)
                        print(f"  ✓ Found color: {color_obj.name}")
                
                variant = variant_query.first()
                if variant:
                    print(f"  ✅ Found variant: {variant.name_suffix} (ID: {variant.id})")
                    # Update color and size from the variant
                    if variant.color:
                        color = variant.color.name
                    if variant.size:
                        size = variant.size.name
                else:
                    print(f"  ⚠️ Could not find matching variant")
            else:
                print(f"  ℹ️ No variant name snapshot available")
            
            # Get product image
            product_image_url = None
            if variant and hasattr(variant, 'image') and variant.image:
                product_image_url = variant.image.url
            elif product.images.exists():
                primary_image = product.images.filter(is_primary=True).first()
                if primary_image:
                    product_image_url = primary_image.image.url
                else:
                    first_image = product.images.first()
                    if first_image:
                        product_image_url = first_image.image.url
            
            # Update the order item
            update_data = {
                'product_id': product.id,
                'product_slug': product.slug,
                'product_image_url': product_image_url,
                'color': color,
                'size': size,
            }
            
            if variant:
                update_data['product_variant_id'] = variant.id
            
            # Apply updates
            OrderItem.objects.filter(id=item.id).update(**update_data)
            
            print(f"  ✓ Updated with:")
            print(f"    - product_id: {product.id}")
            print(f"    - product_slug: {product.slug}")
            print(f"    - product_image_url: {product_image_url}")
            print(f"    - color: {color}")
            print(f"    - size: {size}")
            if variant:
                print(f"    - product_variant_id: {variant.id}")
            
        except Exception as e:
            print(f"  ❌ Error processing item {item.id}: {str(e)}")
            continue
    
    print(f"\n✅ Finished processing order items")

if __name__ == "__main__":
    fix_order_items()
