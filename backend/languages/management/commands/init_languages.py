from django.core.management.base import BaseCommand
from languages.models import Language

class Command(BaseCommand):
    help = 'Initialize language database with default values'

    def handle(self, *args, **options):
        self.stdout.write('Initializing languages...')
        
        # Default languages
        default_languages = [
            {
                'code': 'en',
                'name': 'English',
                'native_name': 'English',
                'is_active': True,
                'is_default': True,
                'is_rtl': False,
                'display_order': 1,
                'flag_code': 'us'
            },
            {
                'code': 'ru',
                'name': 'Russian',
                'native_name': 'Русский',
                'is_active': True,
                'is_default': False,
                'is_rtl': False,
                'display_order': 2,
                'flag_code': 'ru'
            },
            {
                'code': 'ar',
                'name': 'Arabic',
                'native_name': 'العربية',
                'is_active': True,
                'is_default': False,
                'is_rtl': True,
                'display_order': 3,
                'flag_code': 'sa'
            },
            {
                'code': 'tr',
                'name': 'Turkish',
                'native_name': 'Türkçe',
                'is_active': True,
                'is_default': False,
                'is_rtl': False,
                'display_order': 4,
                'flag_code': 'tr'
            },
            {
                'code': 'zh',
                'name': 'Chinese',
                'native_name': '中文',
                'is_active': True,
                'is_default': False,
                'is_rtl': False,
                'display_order': 5,
                'flag_code': 'cn'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for lang_data in default_languages:
            lang, created = Language.objects.update_or_create(
                code=lang_data['code'],
                defaults=lang_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created language: {lang.name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'Updated language: {lang.name}'))
        
        # Update settings.LANGUAGES
        Language.update_available_languages()
        
        self.stdout.write(self.style.SUCCESS(
            f'Successfully initialized languages. Created: {created_count}, Updated: {updated_count}'
        ))
