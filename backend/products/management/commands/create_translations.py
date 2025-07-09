from django.core.management.base import BaseCommand
from django.conf import settings
from products.models import Product, Category, ProductTranslation, CategoryTranslation


class Command(BaseCommand):
    help = 'Create initial translations for existing products and categories'

    def add_arguments(self, parser):
        parser.add_argument(
            '--language',
            type=str,
            default='ru',
            help='Language code to create translations for (default: ru)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing translations',
        )

    def handle(self, *args, **options):
        language_code = options['language']
        force_update = options['force']
        
        # Check if language is supported
        supported_languages = [lang[0] for lang in settings.LANGUAGES]
        if language_code not in supported_languages:
            self.stdout.write(
                self.style.ERROR(f'Language "{language_code}" is not supported. Supported languages: {supported_languages}')
            )
            return

        self.stdout.write(f'Creating translations for language: {language_code}')
        
        # Create product translations
        products = Product.objects.all()
        product_count = 0
        
        for product in products:
            translation, created = ProductTranslation.objects.get_or_create(
                product=product,
                language_code=language_code,
                defaults={
                    'name': product.name,
                    'description': product.description
                }
            )
            
            if created:
                product_count += 1
                self.stdout.write(f'Created translation for product: {product.name}')
            elif force_update:
                translation.name = product.name
                translation.description = product.description
                translation.save()
                product_count += 1
                self.stdout.write(f'Updated translation for product: {product.name}')
        
        # Create category translations
        categories = Category.objects.all()
        category_count = 0
        
        for category in categories:
            translation, created = CategoryTranslation.objects.get_or_create(
                category=category,
                language_code=language_code,
                defaults={
                    'name': category.name,
                    'description': category.description
                }
            )
            
            if created:
                category_count += 1
                self.stdout.write(f'Created translation for category: {category.name}')
            elif force_update:
                translation.name = category.name
                translation.description = category.description
                translation.save()
                category_count += 1
                self.stdout.write(f'Updated translation for category: {category.name}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created/updated {product_count} product translations '
                f'and {category_count} category translations for language "{language_code}"'
            )
        )
        
        # Provide next steps
        self.stdout.write(
            self.style.WARNING(
                f'\nNext steps:\n'
                f'1. Go to Django Admin to edit the translations\n'
                f'2. Or use the API endpoints to manage translations programmatically\n'
                f'3. Test the API with ?lang={language_code} parameter'
            )
        )
