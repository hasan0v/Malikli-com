# products/management/commands/setup_product_attributes.py
from django.core.management.base import BaseCommand
from products.models import Size, Color
from django.db import transaction

class Command(BaseCommand):
    help = 'Set up default product attributes like sizes and colors'

    def handle(self, *args, **kwargs):
        with transaction.atomic():
            # Create default sizes
            self.setup_sizes()
            
            # Create default colors
            self.setup_colors()
            
        self.stdout.write(self.style.SUCCESS('Successfully set up product attributes'))
    
    def setup_sizes(self):
        # Common clothing sizes
        sizes = [
            {'name': 'XS', 'display_order': 10},
            {'name': 'S', 'display_order': 20},
            {'name': 'M', 'display_order': 30},
            {'name': 'L', 'display_order': 40},
            {'name': 'XL', 'display_order': 50},
            {'name': 'XXL', 'display_order': 60},
        ]
        
        for size_data in sizes:
            Size.objects.get_or_create(
                name=size_data['name'],
                defaults={'display_order': size_data['display_order']}
            )
        
        self.stdout.write(f'Created {len(sizes)} default sizes')
    
    def setup_colors(self):
        # Common colors with hex codes
        colors = [
            {'name': 'White', 'hex_code': '#FFFFFF', 'display_order': 10},
            {'name': 'Black', 'hex_code': '#000000', 'display_order': 20},
            {'name': 'Red', 'hex_code': '#FF0000', 'display_order': 30},
            {'name': 'Blue', 'hex_code': '#0000FF', 'display_order': 40},
            {'name': 'Green', 'hex_code': '#008000', 'display_order': 50},
            {'name': 'Yellow', 'hex_code': '#FFFF00', 'display_order': 60},
            {'name': 'Orange', 'hex_code': '#FFA500', 'display_order': 70},
            {'name': 'Purple', 'hex_code': '#800080', 'display_order': 80},
            {'name': 'Pink', 'hex_code': '#FFC0CB', 'display_order': 90},
            {'name': 'Gray', 'hex_code': '#808080', 'display_order': 100},
        ]
        
        for color_data in colors:
            Color.objects.get_or_create(
                name=color_data['name'],
                defaults={
                    'hex_code': color_data['hex_code'],
                    'display_order': color_data['display_order']
                }
            )
        
        self.stdout.write(f'Created {len(colors)} default colors')
