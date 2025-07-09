"""
Django management command to test currency conversion and ExchangeRate-API integration
Usage: python manage.py test_currency_api
"""

from django.core.management.base import BaseCommand
from django.core.cache import cache
from decimal import Decimal
from orders.currency_service import currency_converter
import requests
from django.conf import settings

class Command(BaseCommand):
    help = 'Test ExchangeRate-API.com integration and currency conversion'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-cache',
            action='store_true',
            help='Clear currency exchange rate cache before testing',
        )
        parser.add_argument(
            '--amount',
            type=float,
            default=100.0,
            help='EUR amount to test conversion (default: 100.0)',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🚀 Testing ExchangeRate-API.com Integration')
        )
        self.stdout.write('=' * 60)

        if options['clear_cache']:
            cache.delete('eur_to_byn_rate')
            self.stdout.write(
                self.style.WARNING('🗑️  Cleared exchange rate cache')
            )

        # Test settings
        self._test_settings()
        
        # Test API connection
        self._test_api_connection()
        
        # Test currency conversion
        self._test_currency_conversion(options['amount'])
        
        self.stdout.write(
            self.style.SUCCESS('\n✅ Currency API testing completed!')
        )

    def _test_settings(self):
        """Test Django settings configuration"""
        self.stdout.write('\n📋 Testing Django Settings:')
        
        api_key = getattr(settings, 'EXCHANGE_RATE_API_KEY', None)
        if api_key:
            self.stdout.write(
                self.style.SUCCESS(f'  ✅ API Key: {api_key[:8]}...')
            )
        else:
            self.stdout.write(
                self.style.ERROR('  ❌ No API Key found')
            )
        
        fallback_rate = getattr(settings, 'EUR_TO_BYN_FALLBACK_RATE', '3.2')
        self.stdout.write(
            self.style.SUCCESS(f'  ✅ Fallback Rate: {fallback_rate}')
        )
        
        currency = getattr(settings, 'PAYMENT_CURRENCY', 'EUR')
        self.stdout.write(
            self.style.SUCCESS(f'  ✅ Payment Currency: {currency}')
        )

    def _test_api_connection(self):
        """Test direct API connection"""
        self.stdout.write('\n🔗 Testing API Connection:')
        
        api_key = getattr(settings, 'EXCHANGE_RATE_API_KEY', None)
        if not api_key:
            self.stdout.write(
                self.style.ERROR('  ❌ Cannot test API - no key provided')
            )
            return
        
        try:
            url = f"https://v6.exchangerate-api.com/v6/{api_key}/pair/EUR/BYN"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('result') == 'success':
                    rate = data.get('conversion_rate')
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✅ API Response: 1 EUR = {rate} BYN')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f'  ❌ API Error: {data.get("error-type", "Unknown")}')
                    )
            else:
                self.stdout.write(
                    self.style.ERROR(f'  ❌ HTTP Error: {response.status_code}')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ❌ Connection Error: {e}')
            )

    def _test_currency_conversion(self, amount):
        """Test currency conversion service"""
        self.stdout.write(f'\n💱 Testing Currency Conversion (€{amount}):')
        
        try:
            eur_amount = Decimal(str(amount))
            
            # Get exchange rate
            rate = currency_converter.get_eur_to_byn_rate()
            self.stdout.write(
                self.style.SUCCESS(f'  📈 Current Rate: 1 EUR = {rate} BYN')
            )
            
            # Convert EUR to BYN
            byn_amount = currency_converter.convert_eur_to_byn(eur_amount)
            self.stdout.write(
                self.style.SUCCESS(f'  💰 {eur_amount} EUR = {byn_amount} BYN')
            )
            
            # Convert back to EUR
            eur_back = currency_converter.convert_byn_to_eur(byn_amount)
            self.stdout.write(
                self.style.SUCCESS(f'  🔄 {byn_amount} BYN = {eur_back} EUR')
            )
            
            # Test display amounts
            amounts = currency_converter.get_display_amounts(eur_amount)
            self.stdout.write(
                self.style.SUCCESS(f'  📊 Display Format:')
            )
            self.stdout.write(f'     EUR: {amounts["eur"]}')
            self.stdout.write(f'     BYN: {amounts["byn"]}')
            self.stdout.write(f'     Rate: {amounts["rate"]}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ❌ Conversion Error: {e}')
            )
