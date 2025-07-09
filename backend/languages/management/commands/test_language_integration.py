from django.core.management.base import BaseCommand
from languages.models import Language
from django.conf import settings

class Command(BaseCommand):
    help = 'Test language settings integration'

    def handle(self, *args, **options):
        self.stdout.write('Testing language settings integration...')
        
        # Print current settings
        self.stdout.write(f'Current LANGUAGE_CODE: {settings.LANGUAGE_CODE}')
        self.stdout.write('Current LANGUAGES:')
        for code, name in settings.LANGUAGES:
            self.stdout.write(f'  - {code}: {name}')
        
        # Get current languages from database
        languages = Language.objects.all().order_by('display_order')
        self.stdout.write('\nLanguages in database:')
        for lang in languages:
            self.stdout.write(f'  - {lang.code}: {lang.native_name} (Default: {lang.is_default}, Active: {lang.is_active})')
        
        # Test adding a new language
        self.stdout.write('\nAdding a test language...')
        test_lang, created = Language.objects.get_or_create(
            code='fr',
            defaults={
                'name': 'French',
                'native_name': 'Français',
                'is_active': True,
                'is_default': False,
                'is_rtl': False,
                'display_order': 10,
                'flag_code': 'fr'
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Created new test language: French'))
        else:
            self.stdout.write(self.style.WARNING('French language already exists, updating...'))
            test_lang.name = 'French'
            test_lang.native_name = 'Français'
            test_lang.save()
        
        # Print updated settings
        self.stdout.write('\nUpdated LANGUAGE_CODE: {}'.format(settings.LANGUAGE_CODE))
        self.stdout.write('Updated LANGUAGES:')
        for code, name in settings.LANGUAGES:
            self.stdout.write(f'  - {code}: {name}')
        
        # Test deactivating a language
        self.stdout.write('\nDeactivating French language...')
        test_lang.is_active = False
        test_lang.save()
        
        # Print updated settings after deactivation
        self.stdout.write('\nAfter deactivation, LANGUAGES:')
        for code, name in settings.LANGUAGES:
            self.stdout.write(f'  - {code}: {name}')
        
        # Clean up test language
        self.stdout.write('\nCleaning up test language...')
        test_lang.delete()
        
        # Print final settings
        self.stdout.write('\nFinal LANGUAGES:')
        for code, name in settings.LANGUAGES:
            self.stdout.write(f'  - {code}: {name}')
        
        self.stdout.write(self.style.SUCCESS('\nLanguage settings integration test completed.'))
